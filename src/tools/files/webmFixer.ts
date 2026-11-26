/**
 * Pure, zero-dependency, 100% offline WebM / EBML container fixer & remuxer.
 *
 * Chromium's MediaRecorder outputs streaming-style WebM files with:
 *   - Unknown Segment size (0x01FFFFFFFFFFFFFF)
 *   - Unknown Cluster sizes (0x01FFFFFFFFFFFFFF)
 *   - Missing Duration (0x4489) in Segment > Info
 *   - Missing Cues (0x1C53BB6B) seek index table
 *   - Missing SeekHead (0x114D9B74)
 *
 * That causes two major issues:
 *   1. Video players cannot scrub/seek along the timeline.
 *   2. Strict media validators and upload pipelines reject the WebM as invalid/malformed.
 *
 * `fixWebmBytes()` parses the EBML stream, calculates exact Duration from block
 * timestamps, normalizes start timestamps to 0, rewrites every Cluster with its exact
 * finite VINT size, generates accurate Cues for every keyframe (supporting both
 * SimpleBlock 0xA3 and BlockGroup 0xA0), prepends a SeekHead pointing to Info/Tracks/Cues,
 * and writes an exact finite Segment size.
 */

const ID_EBML = 0x1a45dfa3;
const ID_SEGMENT = 0x18538067;
const ID_SEEK_HEAD = 0x114d9b74;
const ID_SEEK = 0x4dbb;
const ID_SEEK_ID = 0x53ab;
const ID_SEEK_POSITION = 0x53ac;
const ID_INFO = 0x1549a966;
const ID_TIMESTAMP_SCALE = 0x2ad7b1;
const ID_DURATION = 0x4489;
const ID_TRACKS = 0x1654ae6b;
const ID_TRACK_ENTRY = 0xae;
const ID_TRACK_NUMBER = 0xd7;
const ID_TRACK_TYPE = 0x83;
const ID_CLUSTER = 0x1f43b675;
const ID_CLUSTER_TIMESTAMP = 0xe7;
const ID_SIMPLE_BLOCK = 0xa3;
const ID_BLOCK_GROUP = 0xa0;
const ID_BLOCK = 0xa1;
const ID_BLOCK_DURATION = 0x9b;
const ID_REFERENCE_BLOCK = 0xfb;
const ID_CUES = 0x1c53bb6b;
const ID_CUE_POINT = 0xbb;
const ID_CUE_TIME = 0xb3;
const ID_CUE_TRACK_POSITIONS = 0xb7;
const ID_CUE_TRACK = 0xf7;
const ID_CUE_CLUSTER_POSITION = 0xf1;
const ID_CUE_RELATIVE_POSITION = 0xf0;

const CLUSTER_CHILD_IDS = new Set<number>([
  0xe7, // Timestamp
  0x5854, // SilentTracks
  0xa7, // Position
  0xab, // PrevSize
  0xa3, // SimpleBlock
  0xa0, // BlockGroup
  0xec, // Void
]);

interface VintReadResult {
  value: number;
  length: number;
  isUnknown: boolean;
}

interface ParsedClusterBlockCue {
  time: number;
  relativeOffset: number;
  isKeyframe: boolean;
}

interface ParsedCluster {
  originalTimestamp: number;
  normalizedTimestamp: number;
  /** Raw children bytes AFTER Timestamp (or full rebuilt payload if timestamp was shifted) */
  payload: Uint8Array;
  /** Cue points inside this cluster relative to cluster payload */
  cues: ParsedClusterBlockCue[];
}

export interface WebmMetadataReport {
  isWebm: boolean;
  hasFiniteSegmentSize: boolean;
  hasDuration: boolean;
  durationMs: number | null;
  hasSeekHead: boolean;
  hasCues: boolean;
  clusterCount: number;
  cuePointCount: number;
  hasAudioTrack: boolean;
  hasVideoTrack: boolean;
}

function readElementId(data: Uint8Array, offset: number): { id: number; length: number } | null {
  if (offset >= data.length) return null;
  const first = data[offset];
  if (first === 0) return null;

  let length = 1;
  let mask = 0x80;
  while (length <= 4 && (first & mask) === 0) {
    length++;
    mask >>= 1;
  }
  if (length > 4 || offset + length > data.length) return null;

  let id = 0;
  for (let i = 0; i < length; i++) {
    id = id * 256 + data[offset + i];
  }
  return { id, length };
}

function readVintValue(data: Uint8Array, offset: number): VintReadResult | null {
  if (offset >= data.length) return null;
  const first = data[offset];
  if (first === 0) return null;

  let length = 1;
  let mask = 0x80;
  while (length <= 8 && (first & mask) === 0) {
    length++;
    mask >>= 1;
  }
  if (length > 8 || offset + length > data.length) return null;

  const firstPayload = first & (mask - 1);
  let allOnes = firstPayload === mask - 1;
  let value = firstPayload;

  for (let i = 1; i < length; i++) {
    const b = data[offset + i];
    if (b !== 0xff) allOnes = false;
    value = value * 256 + b;
  }

  return {
    value: allOnes ? -1 : value,
    length,
    isUnknown: allOnes,
  };
}

function readUintBigEndian(data: Uint8Array, offset: number, length: number): number {
  let val = 0;
  for (let i = 0; i < length; i++) {
    val = val * 256 + data[offset + i];
  }
  return val;
}

function readFloatBigEndian(data: Uint8Array, offset: number, length: number): number | null {
  if (length === 4 && offset + 4 <= data.length) {
    const view = new DataView(data.buffer, data.byteOffset + offset, 4);
    return view.getFloat32(0, false);
  }
  if (length === 8 && offset + 8 <= data.length) {
    const view = new DataView(data.buffer, data.byteOffset + offset, 8);
    return view.getFloat64(0, false);
  }
  return null;
}

function encodeElementId(id: number): Uint8Array {
  if (id <= 0xff) return new Uint8Array([id]);
  if (id <= 0xffff) return new Uint8Array([(id >> 8) & 0xff, id & 0xff]);
  if (id <= 0xffffff) return new Uint8Array([(id >> 16) & 0xff, (id >> 8) & 0xff, id & 0xff]);
  return new Uint8Array([(id >>> 24) & 0xff, (id >>> 16) & 0xff, (id >>> 8) & 0xff, id & 0xff]);
}

function encodeVintSize(size: number, fixedLength?: number): Uint8Array {
  const safe = BigInt(Math.max(0, Math.floor(size)));
  let width = fixedLength ?? 1;
  if (!fixedLength) {
    // Max usable value for width w is (2^(7*w)) - 2 (all-ones is reserved for unknown size)
    while (width < 8) {
      const maxForWidth = (1n << BigInt(7 * width)) - 2n;
      if (safe <= maxForWidth) break;
      width++;
    }
  }
  const out = new Uint8Array(width);
  let remaining = safe;
  for (let i = width - 1; i >= 0; i--) {
    out[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  out[0] |= 1 << (8 - width);
  return out;
}

function encodeUint(value: number): Uint8Array {
  const safe = BigInt(Math.max(0, Math.floor(value)));
  if (safe === 0n) return new Uint8Array([0]);
  const bytes: number[] = [];
  let rem = safe;
  while (rem > 0n) {
    bytes.unshift(Number(rem & 0xffn));
    rem >>= 8n;
  }
  return new Uint8Array(bytes);
}

function encodeFloat64(value: number): Uint8Array {
  const out = new Uint8Array(8);
  const view = new DataView(out.buffer);
  view.setFloat64(0, value, false);
  return out;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.byteLength;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.byteLength;
  }
  return out;
}

function buildElement(id: number, payload: Uint8Array, fixedSizeWidth?: number): Uint8Array {
  const idBytes = encodeElementId(id);
  const sizeBytes = encodeVintSize(payload.byteLength, fixedSizeWidth);
  return concatBytes([idBytes, sizeBytes, payload]);
}

function parseTracksInfo(tracksPayload: Uint8Array): {
  videoTrackNumber: number | null;
  audioTrackNumber: number | null;
} {
  let videoTrackNumber: number | null = null;
  let audioTrackNumber: number | null = null;

  let pos = 0;
  while (pos < tracksPayload.length) {
    const idRes = readElementId(tracksPayload, pos);
    if (!idRes) break;
    const sizeRes = readVintValue(tracksPayload, pos + idRes.length);
    if (!sizeRes || sizeRes.isUnknown) break;
    const bodyStart = pos + idRes.length + sizeRes.length;
    const bodyEnd = Math.min(tracksPayload.length, bodyStart + sizeRes.value);

    if (idRes.id === ID_TRACK_ENTRY) {
      let trackNumber: number | null = null;
      let trackType: number | null = null;
      let cPos = bodyStart;
      while (cPos < bodyEnd) {
        const cId = readElementId(tracksPayload, cPos);
        if (!cId) break;
        const cSize = readVintValue(tracksPayload, cPos + cId.length);
        if (!cSize || cSize.isUnknown) break;
        const cDataStart = cPos + cId.length + cSize.length;
        const cDataEnd = Math.min(bodyEnd, cDataStart + cSize.value);

        if (cId.id === ID_TRACK_NUMBER && cSize.value > 0 && cSize.value <= 8) {
          trackNumber = readUintBigEndian(tracksPayload, cDataStart, cSize.value);
        } else if (cId.id === ID_TRACK_TYPE && cSize.value > 0 && cSize.value <= 8) {
          trackType = readUintBigEndian(tracksPayload, cDataStart, cSize.value);
        }
        cPos = cDataEnd;
      }

      if (trackNumber !== null && trackType === 1 && videoTrackNumber === null) {
        videoTrackNumber = trackNumber;
      } else if (trackNumber !== null && trackType === 2 && audioTrackNumber === null) {
        audioTrackNumber = trackNumber;
      }
    }

    pos = bodyEnd;
  }

  return { videoTrackNumber, audioTrackNumber };
}

function parseBlockHeader(
  data: Uint8Array,
  offset: number,
  end: number
): { trackNumber: number; relativeTimecode: number; flags: number } | null {
  if (offset + 4 > end) return null;
  const trk = readVintValue(data, offset);
  if (!trk || trk.isUnknown) return null;
  const tcOffset = offset + trk.length;
  if (tcOffset + 3 > end) return null;
  const rawTc = (data[tcOffset] << 8) | data[tcOffset + 1];
  const relativeTimecode = rawTc >= 0x8000 ? rawTc - 0x10000 : rawTc;
  const flags = data[tcOffset + 2];
  return { trackNumber: trk.value, relativeTimecode, flags };
}

function parseBlockGroupInfo(
  data: Uint8Array,
  start: number,
  end: number
): {
  trackNumber: number;
  relativeTimecode: number;
  blockDuration: number;
  hasReferenceBlock: boolean;
} | null {
  let trackNumber: number | null = null;
  let relativeTimecode = 0;
  let blockDuration = 0;
  let hasReferenceBlock = false;

  let pos = start;
  while (pos < end) {
    const idRes = readElementId(data, pos);
    if (!idRes) break;
    const sizeRes = readVintValue(data, pos + idRes.length);
    if (!sizeRes || sizeRes.isUnknown) break;
    const dataStart = pos + idRes.length + sizeRes.length;
    const dataEnd = Math.min(end, dataStart + sizeRes.value);

    if (idRes.id === ID_BLOCK) {
      const hdr = parseBlockHeader(data, dataStart, dataEnd);
      if (hdr) {
        trackNumber = hdr.trackNumber;
        relativeTimecode = hdr.relativeTimecode;
      }
    } else if (idRes.id === ID_BLOCK_DURATION && sizeRes.value > 0 && sizeRes.value <= 8) {
      blockDuration = readUintBigEndian(data, dataStart, sizeRes.value);
    } else if (idRes.id === ID_REFERENCE_BLOCK) {
      hasReferenceBlock = true;
    }

    pos = dataEnd;
  }

  if (trackNumber === null) return null;
  return { trackNumber, relativeTimecode, blockDuration, hasReferenceBlock };
}

function buildInfoElement(originalInfoPayload: Uint8Array | null, durationUnits: number): Uint8Array {
  const parts: Uint8Array[] = [];
  let hasTimestampScale = false;

  if (originalInfoPayload) {
    let pos = 0;
    while (pos < originalInfoPayload.length) {
      const idRes = readElementId(originalInfoPayload, pos);
      if (!idRes) break;
      const sizeRes = readVintValue(originalInfoPayload, pos + idRes.length);
      if (!sizeRes || sizeRes.isUnknown) break;
      const elemEnd = Math.min(
        originalInfoPayload.length,
        pos + idRes.length + sizeRes.length + sizeRes.value
      );

      if (idRes.id === ID_TIMESTAMP_SCALE) {
        hasTimestampScale = true;
        parts.push(originalInfoPayload.subarray(pos, elemEnd));
      } else if (idRes.id !== ID_DURATION) {
        parts.push(originalInfoPayload.subarray(pos, elemEnd));
      }
      pos = elemEnd;
    }
  }

  if (!hasTimestampScale) {
    parts.unshift(buildElement(ID_TIMESTAMP_SCALE, encodeUint(1_000_000)));
  }

  parts.push(buildElement(ID_DURATION, encodeFloat64(durationUnits)));
  return buildElement(ID_INFO, concatBytes(parts));
}

function buildSeekHead(entries: Array<{ id: number; position: number }>): Uint8Array {
  const seeks = entries.map(entry => {
    const seekIdEl = buildElement(ID_SEEK_ID, encodeElementId(entry.id));
    const seekPosEl = buildElement(ID_SEEK_POSITION, encodeUint(entry.position));
    return buildElement(ID_SEEK, concatBytes([seekIdEl, seekPosEl]));
  });
  return buildElement(ID_SEEK_HEAD, concatBytes(seeks));
}

function buildCuesElement(
  entries: Array<{ time: number; track: number; clusterPos: number; relativePos: number }>
): Uint8Array {
  const cuePoints = entries.map(entry => {
    const posParts: Uint8Array[] = [
      buildElement(ID_CUE_TRACK, encodeUint(entry.track)),
      buildElement(ID_CUE_CLUSTER_POSITION, encodeUint(entry.clusterPos)),
    ];
    if (entry.relativePos > 0) {
      posParts.push(buildElement(ID_CUE_RELATIVE_POSITION, encodeUint(entry.relativePos)));
    }
    const trackPositionsEl = buildElement(ID_CUE_TRACK_POSITIONS, concatBytes(posParts));
    const cueTimeEl = buildElement(ID_CUE_TIME, encodeUint(entry.time));
    return buildElement(ID_CUE_POINT, concatBytes([cueTimeEl, trackPositionsEl]));
  });
  return buildElement(ID_CUES, concatBytes(cuePoints));
}

function shiftClusterTimestamp(
  clusterPayload: Uint8Array,
  newTimestamp: number
): { payload: Uint8Array; byteDelta: number } {
  let pos = 0;
  while (pos < clusterPayload.length) {
    const idRes = readElementId(clusterPayload, pos);
    if (!idRes) break;
    const sizeRes = readVintValue(clusterPayload, pos + idRes.length);
    if (!sizeRes || sizeRes.isUnknown) break;
    const elemEnd = pos + idRes.length + sizeRes.length + sizeRes.value;
    if (idRes.id === ID_CLUSTER_TIMESTAMP) {
      const replacement = buildElement(ID_CLUSTER_TIMESTAMP, encodeUint(newTimestamp));
      const before = clusterPayload.subarray(0, pos);
      const after = clusterPayload.subarray(elemEnd);
      const byteDelta = replacement.byteLength - (elemEnd - pos);
      return { payload: concatBytes([before, replacement, after]), byteDelta };
    }
    pos = elemEnd;
  }
  const inserted = buildElement(ID_CLUSTER_TIMESTAMP, encodeUint(newTimestamp));
  return { payload: concatBytes([inserted, clusterPayload]), byteDelta: inserted.byteLength };
}

/**
 * Inspects a WebM byte buffer and returns a diagnostic summary of its container metadata.
 */
export function inspectWebmMetadata(input: Uint8Array): WebmMetadataReport {
  const empty: WebmMetadataReport = {
    isWebm: false,
    hasFiniteSegmentSize: false,
    hasDuration: false,
    durationMs: null,
    hasSeekHead: false,
    hasCues: false,
    clusterCount: 0,
    cuePointCount: 0,
    hasAudioTrack: false,
    hasVideoTrack: false,
  };

  const ebmlId = readElementId(input, 0);
  if (!ebmlId || ebmlId.id !== ID_EBML) return empty;
  const ebmlSize = readVintValue(input, ebmlId.length);
  if (!ebmlSize || ebmlSize.isUnknown) return empty;

  let pos = ebmlId.length + ebmlSize.length + ebmlSize.value;
  const segId = readElementId(input, pos);
  if (!segId || segId.id !== ID_SEGMENT) return empty;
  const segSize = readVintValue(input, pos + segId.length);
  if (!segSize) return empty;

  const segPayloadStart = pos + segId.length + segSize.length;
  const segEnd = segSize.isUnknown
    ? input.length
    : Math.min(input.length, segPayloadStart + segSize.value);

  const report: WebmMetadataReport = {
    ...empty,
    isWebm: true,
    hasFiniteSegmentSize: !segSize.isUnknown,
  };

  let timestampScale = 1_000_000;
  let rawDuration: number | null = null;
  pos = segPayloadStart;

  while (pos < segEnd) {
    const idRes = readElementId(input, pos);
    if (!idRes) break;
    const sizeRes = readVintValue(input, pos + idRes.length);
    if (!sizeRes) break;
    const dataStart = pos + idRes.length + sizeRes.length;

    if (idRes.id === ID_SEEK_HEAD) {
      report.hasSeekHead = true;
      if (sizeRes.isUnknown) break;
      pos = dataStart + sizeRes.value;
    } else if (idRes.id === ID_INFO) {
      if (sizeRes.isUnknown) break;
      const infoEnd = Math.min(segEnd, dataStart + sizeRes.value);
      let iPos = dataStart;
      while (iPos < infoEnd) {
        const cId = readElementId(input, iPos);
        if (!cId) break;
        const cSize = readVintValue(input, iPos + cId.length);
        if (!cSize || cSize.isUnknown) break;
        const cDataStart = iPos + cId.length + cSize.length;
        if (cId.id === ID_TIMESTAMP_SCALE && cSize.value > 0 && cSize.value <= 8) {
          timestampScale = readUintBigEndian(input, cDataStart, cSize.value);
        } else if (cId.id === ID_DURATION) {
          rawDuration = readFloatBigEndian(input, cDataStart, cSize.value);
          if (rawDuration !== null && Number.isFinite(rawDuration) && rawDuration > 0) {
            report.hasDuration = true;
          }
        }
        iPos = cDataStart + cSize.value;
      }
      pos = infoEnd;
    } else if (idRes.id === ID_TRACKS) {
      if (sizeRes.isUnknown) break;
      const tracksEnd = Math.min(segEnd, dataStart + sizeRes.value);
      const tracksInfo = parseTracksInfo(input.subarray(dataStart, tracksEnd));
      report.hasVideoTrack = tracksInfo.videoTrackNumber !== null;
      report.hasAudioTrack = tracksInfo.audioTrackNumber !== null;
      pos = tracksEnd;
    } else if (idRes.id === ID_CUES) {
      report.hasCues = true;
      if (sizeRes.isUnknown) break;
      const cuesEnd = Math.min(segEnd, dataStart + sizeRes.value);
      let cPos = dataStart;
      while (cPos < cuesEnd) {
        const cId = readElementId(input, cPos);
        if (!cId) break;
        const cSize = readVintValue(input, cPos + cId.length);
        if (!cSize || cSize.isUnknown) break;
        if (cId.id === ID_CUE_POINT) report.cuePointCount++;
        cPos = cPos + cId.length + cSize.length + cSize.value;
      }
      pos = cuesEnd;
    } else if (idRes.id === ID_CLUSTER) {
      report.clusterCount++;
      if (!sizeRes.isUnknown) {
        pos = dataStart + sizeRes.value;
      } else {
        let cPos = dataStart;
        while (cPos < segEnd) {
          const cId = readElementId(input, cPos);
          if (!cId || !CLUSTER_CHILD_IDS.has(cId.id)) break;
          const cSize = readVintValue(input, cPos + cId.length);
          if (!cSize || cSize.isUnknown) break;
          cPos = cPos + cId.length + cSize.length + cSize.value;
        }
        pos = cPos;
      }
    } else {
      if (sizeRes.isUnknown) break;
      pos = dataStart + sizeRes.value;
    }
  }

  if (rawDuration !== null && Number.isFinite(rawDuration) && rawDuration > 0) {
    report.durationMs = (rawDuration * timestampScale) / 1_000_000;
  }

  return report;
}

/**
 * Remuxes a MediaRecorder/streaming WebM buffer into a fully compliant, seekable WebM
 * with finite Segment/Cluster sizes, exact Info > Duration, Cues index, and SeekHead.
 */
export function fixWebmBytes(input: Uint8Array, fallbackDurationMs?: number): Uint8Array {
  const ebmlId = readElementId(input, 0);
  if (!ebmlId || ebmlId.id !== ID_EBML) return input;
  const ebmlSize = readVintValue(input, ebmlId.length);
  if (!ebmlSize || ebmlSize.isUnknown) return input;

  const ebmlEnd = ebmlId.length + ebmlSize.length + ebmlSize.value;
  if (ebmlEnd >= input.length) return input;
  const ebmlElement = input.subarray(0, ebmlEnd);

  const segId = readElementId(input, ebmlEnd);
  if (!segId || segId.id !== ID_SEGMENT) return input;
  const segSize = readVintValue(input, ebmlEnd + segId.length);
  if (!segSize) return input;

  const segPayloadStart = ebmlEnd + segId.length + segSize.length;
  const segEnd = segSize.isUnknown
    ? input.length
    : Math.min(input.length, segPayloadStart + segSize.value);

  let infoPayload: Uint8Array | null = null;
  let tracksElement: Uint8Array | null = null;
  let timestampScale = 1_000_000;
  let videoTrackNumber: number | null = null;
  let audioTrackNumber: number | null = null;

  const rawClusters: Array<{
    payloadStart: number;
    payloadEnd: number;
    clusterTimestamp: number;
  }> = [];

  // Pass 1: Locate Info, Tracks, and every Cluster slice
  let pos = segPayloadStart;
  while (pos < segEnd) {
    const idRes = readElementId(input, pos);
    if (!idRes) break;
    const sizeRes = readVintValue(input, pos + idRes.length);
    if (!sizeRes) break;
    const dataStart = pos + idRes.length + sizeRes.length;

    if (idRes.id === ID_INFO && !sizeRes.isUnknown) {
      const dataEnd = Math.min(segEnd, dataStart + sizeRes.value);
      infoPayload = input.subarray(dataStart, dataEnd);
      // Extract TimestampScale if present
      let iPos = dataStart;
      while (iPos < dataEnd) {
        const cId = readElementId(input, iPos);
        if (!cId) break;
        const cSize = readVintValue(input, iPos + cId.length);
        if (!cSize || cSize.isUnknown) break;
        const cDataStart = iPos + cId.length + cSize.length;
        if (cId.id === ID_TIMESTAMP_SCALE && cSize.value > 0 && cSize.value <= 8) {
          const parsedScale = readUintBigEndian(input, cDataStart, cSize.value);
          if (parsedScale > 0) timestampScale = parsedScale;
        }
        iPos = cDataStart + cSize.value;
      }
      pos = dataEnd;
    } else if (idRes.id === ID_TRACKS && !sizeRes.isUnknown) {
      const dataEnd = Math.min(segEnd, dataStart + sizeRes.value);
      const tracksPayload = input.subarray(dataStart, dataEnd);
      tracksElement = buildElement(ID_TRACKS, tracksPayload);
      const parsed = parseTracksInfo(tracksPayload);
      videoTrackNumber = parsed.videoTrackNumber;
      audioTrackNumber = parsed.audioTrackNumber;
      pos = dataEnd;
    } else if (idRes.id === ID_CLUSTER) {
      let clusterEnd = dataStart;
      let clusterTimestamp = 0;

      if (!sizeRes.isUnknown) {
        clusterEnd = Math.min(segEnd, dataStart + sizeRes.value);
        let cPos = dataStart;
        while (cPos < clusterEnd) {
          const cId = readElementId(input, cPos);
          if (!cId) break;
          const cSize = readVintValue(input, cPos + cId.length);
          if (!cSize || cSize.isUnknown) break;
          const cDataStart = cPos + cId.length + cSize.length;
          if (cId.id === ID_CLUSTER_TIMESTAMP && cSize.value > 0 && cSize.value <= 8) {
            clusterTimestamp = readUintBigEndian(input, cDataStart, cSize.value);
            break;
          }
          cPos = cDataStart + cSize.value;
        }
      } else {
        let cPos = dataStart;
        while (cPos < segEnd) {
          const cId = readElementId(input, cPos);
          if (!cId || !CLUSTER_CHILD_IDS.has(cId.id)) break;
          const cSize = readVintValue(input, cPos + cId.length);
          if (!cSize || cSize.isUnknown) break;
          const cDataStart = cPos + cId.length + cSize.length;
          const cDataEnd = cDataStart + cSize.value;
          // Stop cleanly if trailing block was truncated by MediaRecorder stop
          if (cDataEnd > segEnd) break;
          if (cId.id === ID_CLUSTER_TIMESTAMP && cSize.value > 0 && cSize.value <= 8) {
            clusterTimestamp = readUintBigEndian(input, cDataStart, cSize.value);
          }
          cPos = cDataEnd;
        }
        clusterEnd = cPos;
      }

      if (clusterEnd > dataStart) {
        rawClusters.push({
          payloadStart: dataStart,
          payloadEnd: clusterEnd,
          clusterTimestamp,
        });
      }
      pos = clusterEnd > dataStart ? clusterEnd : segEnd;
    } else {
      if (sizeRes.isUnknown) break;
      pos = Math.min(segEnd, dataStart + sizeRes.value);
    }
  }

  if (!tracksElement || rawClusters.length === 0) {
    return input;
  }

  const primaryTrack = videoTrackNumber ?? audioTrackNumber ?? 1;
  const isVideoPrimary = videoTrackNumber !== null;
  const timeOffset = rawClusters[0].clusterTimestamp > 0 ? rawClusters[0].clusterTimestamp : 0;

  // Pass 2: Inspect blocks in every cluster for exact Duration & Cue points
  const parsedClusters: ParsedCluster[] = [];
  const primaryTimestamps: number[] = [];
  let maxBlockTimestamp = 0;
  let maxBlockEnd = 0;

  for (const rc of rawClusters) {
    const normalizedTs = Math.max(0, rc.clusterTimestamp - timeOffset);
    let payload = input.subarray(rc.payloadStart, rc.payloadEnd);
    if (timeOffset > 0) {
      payload = shiftClusterTimestamp(payload, normalizedTs).payload;
    }

    const cues: ParsedClusterBlockCue[] = [];
    let hasAddedAudioClusterCue = false;
    let cPos = 0;

    while (cPos < payload.length) {
      const cId = readElementId(payload, cPos);
      if (!cId) break;
      const cSize = readVintValue(payload, cPos + cId.length);
      if (!cSize || cSize.isUnknown) break;
      const cDataStart = cPos + cId.length + cSize.length;
      const cDataEnd = cDataStart + cSize.value;
      if (cDataEnd > payload.length) break;

      if (cId.id === ID_SIMPLE_BLOCK) {
        const hdr = parseBlockHeader(payload, cDataStart, cDataEnd);
        if (hdr) {
          const absTime = Math.max(0, normalizedTs + hdr.relativeTimecode);
          if (absTime > maxBlockTimestamp) maxBlockTimestamp = absTime;
          if (absTime > maxBlockEnd) maxBlockEnd = absTime;

          if (hdr.trackNumber === primaryTrack) {
            primaryTimestamps.push(absTime);
            const isKeyframe = isVideoPrimary
              ? (hdr.flags & 0x80) !== 0
              : !hasAddedAudioClusterCue;
            if (isKeyframe) {
              if (!isVideoPrimary) hasAddedAudioClusterCue = true;
              cues.push({
                time: absTime,
                relativeOffset: cPos,
                isKeyframe: true,
              });
            }
          }
        }
      } else if (cId.id === ID_BLOCK_GROUP) {
        const bg = parseBlockGroupInfo(payload, cDataStart, cDataEnd);
        if (bg) {
          const absTime = Math.max(0, normalizedTs + bg.relativeTimecode);
          if (absTime > maxBlockTimestamp) maxBlockTimestamp = absTime;
          if (absTime + bg.blockDuration > maxBlockEnd) {
            maxBlockEnd = absTime + bg.blockDuration;
          }

          if (bg.trackNumber === primaryTrack) {
            primaryTimestamps.push(absTime);
            const isKeyframe = isVideoPrimary
              ? !bg.hasReferenceBlock
              : !hasAddedAudioClusterCue;
            if (isKeyframe) {
              if (!isVideoPrimary) hasAddedAudioClusterCue = true;
              cues.push({
                time: absTime,
                relativeOffset: cPos,
                isKeyframe: true,
              });
            }
          }
        }
      }

      cPos = cDataEnd;
    }

    parsedClusters.push({
      originalTimestamp: rc.clusterTimestamp,
      normalizedTimestamp: normalizedTs,
      payload,
      cues,
    });
  }

  // Estimate last frame duration in TimestampScale units
  const unitsPerMs = 1_000_000 / timestampScale;
  let frameStepUnits = Math.round((isVideoPrimary ? 33.333 : 20) * unitsPerMs);
  if (primaryTimestamps.length >= 2) {
    const deltas: number[] = [];
    for (let i = 1; i < primaryTimestamps.length; i++) {
      const d = primaryTimestamps[i] - primaryTimestamps[i - 1];
      if (d > 0 && d <= Math.round(250 * unitsPerMs)) {
        deltas.push(d);
      }
    }
    if (deltas.length > 0) {
      deltas.sort((a, b) => a - b);
      frameStepUnits = deltas[Math.floor(deltas.length / 2)];
    }
  }

  let durationUnits = Math.max(maxBlockEnd, maxBlockTimestamp + frameStepUnits);
  if (durationUnits <= 0 && fallbackDurationMs && fallbackDurationMs > 0) {
    durationUnits = fallbackDurationMs * unitsPerMs;
  }
  if (durationUnits <= 0) {
    durationUnits = 1000 * unitsPerMs;
  }

  // Build Info element (with exact Duration) and finite Cluster elements
  const infoElement = buildInfoElement(infoPayload, durationUnits);
  const clusterElements = parsedClusters.map(c => buildElement(ID_CLUSTER, c.payload));

  // Determine whether any explicit keyframes were found; if not, index every cluster
  const totalExplicitCues = parsedClusters.reduce((sum, c) => sum + c.cues.length, 0);

  // Pass 3: Converge SeekHead byte length -> exact Info, Tracks, Cluster, and Cues positions
  let seekHeadSize = 0;
  let seekHeadElement: Uint8Array = new Uint8Array(0);
  let cuesElement: Uint8Array = new Uint8Array(0);

  for (let iter = 0; iter < 5; iter++) {
    const infoPos = seekHeadSize;
    const tracksPos = infoPos + infoElement.byteLength;
    let cursor = tracksPos + tracksElement.byteLength;

    const cueEntries: Array<{
      time: number;
      track: number;
      clusterPos: number;
      relativePos: number;
    }> = [];
    const seenCueTimes = new Set<number>();

    for (let i = 0; i < parsedClusters.length; i++) {
      const clusterPos = cursor;
      const cluster = parsedClusters[i];

      if (totalExplicitCues > 0) {
        if (cluster.cues.length > 0) {
          for (const cue of cluster.cues) {
            if (!seenCueTimes.has(cue.time)) {
              seenCueTimes.add(cue.time);
              cueEntries.push({
                time: cue.time,
                track: primaryTrack,
                clusterPos,
                relativePos: cue.relativeOffset,
              });
            }
          }
        } else if (i === 0 && !seenCueTimes.has(cluster.normalizedTimestamp)) {
          seenCueTimes.add(cluster.normalizedTimestamp);
          cueEntries.push({
            time: cluster.normalizedTimestamp,
            track: primaryTrack,
            clusterPos,
            relativePos: 0,
          });
        }
      } else if (!seenCueTimes.has(cluster.normalizedTimestamp)) {
        seenCueTimes.add(cluster.normalizedTimestamp);
        cueEntries.push({
          time: cluster.normalizedTimestamp,
          track: primaryTrack,
          clusterPos,
          relativePos: 0,
        });
      }

      cursor += clusterElements[i].byteLength;
    }

    const cuesPos = cursor;
    cuesElement = buildCuesElement(cueEntries);

    const nextSeekHead = buildSeekHead([
      { id: ID_INFO, position: infoPos },
      { id: ID_TRACKS, position: tracksPos },
      { id: ID_CUES, position: cuesPos },
    ]);

    if (nextSeekHead.byteLength === seekHeadSize) {
      seekHeadElement = nextSeekHead;
      break;
    }
    seekHeadSize = nextSeekHead.byteLength;
    seekHeadElement = nextSeekHead;
  }

  // Assemble final Segment with exact finite 8-byte VINT size
  const segmentPayloadParts: Uint8Array[] = [
    seekHeadElement,
    infoElement,
    tracksElement,
    ...clusterElements,
    cuesElement,
  ];
  let segmentPayloadSize = 0;
  for (const part of segmentPayloadParts) {
    segmentPayloadSize += part.byteLength;
  }

  const segmentHeader = concatBytes([
    encodeElementId(ID_SEGMENT),
    encodeVintSize(segmentPayloadSize, 8),
  ]);

  return concatBytes([ebmlElement, segmentHeader, ...segmentPayloadParts]);
}

/**
 * Convenience Blob wrapper for `fixWebmBytes`.
 */
export async function fixWebmBlob(
  blob: Blob,
  fallbackDurationMs?: number,
  mimeType = 'video/webm'
): Promise<Blob> {
  try {
    const raw = new Uint8Array(await blob.arrayBuffer());
    const fixed = fixWebmBytes(raw, fallbackDurationMs);
    return new Blob([fixed as unknown as BlobPart], { type: mimeType });
  } catch {
    return blob;
  }
}

/**
 * Fast, low-RAM check for whether a media container file contains an audio track.
 * Inspects ISO BMFF (MP4/MOV/M4V) `hdlr` atoms for `soun` and WebM/MKV `Tracks`
 * for TrackType=2 without decoding the whole file into PCM.
 */
export async function detectContainerHasAudioTrack(
  file: File,
  videoElement?: HTMLVideoElement
): Promise<boolean> {
  if (videoElement) {
    const vAny = videoElement as HTMLVideoElement & {
      mozHasAudio?: boolean;
      audioTracks?: { length: number };
    };
    if (typeof vAny.mozHasAudio === 'boolean') return vAny.mozHasAudio;
    if (vAny.audioTracks && typeof vAny.audioTracks.length === 'number') {
      return vAny.audioTracks.length > 0;
    }
  }

  try {
    const chunkSize = 2 * 1024 * 1024; // 2 MB head + 2 MB tail covers moov boxes even on huge MP4s
    const headBytes = new Uint8Array(await file.slice(0, Math.min(file.size, chunkSize)).arrayBuffer());

    // Check WebM / MKV EBML magic (0x1A45DFA3)
    if (
      headBytes.length >= 4 &&
      headBytes[0] === 0x1a &&
      headBytes[1] === 0x45 &&
      headBytes[2] === 0xdf &&
      headBytes[3] === 0xa3
    ) {
      const report = inspectWebmMetadata(headBytes);
      if (report.isWebm) return report.hasAudioTrack;
    }

    // Check ISO BMFF (MP4 / MOV / M4V / 3GP): `ftyp` or `moov` / `mdat` / `free` box signature at bytes 4..7
    const isIsoBmff =
      headBytes.length >= 12 &&
      ((headBytes[4] === 0x66 && headBytes[5] === 0x74 && headBytes[6] === 0x79 && headBytes[7] === 0x70) ||
        (headBytes[4] === 0x6d && headBytes[5] === 0x6f && headBytes[6] === 0x6f && headBytes[7] === 0x76) ||
        (headBytes[4] === 0x6d && headBytes[5] === 0x64 && headBytes[6] === 0x61 && headBytes[7] === 0x74) ||
        (headBytes[4] === 0x66 && headBytes[5] === 0x72 && headBytes[6] === 0x65 && headBytes[7] === 0x65));

    if (isIsoBmff) {
      const hasSounHandler = (buf: Uint8Array): boolean => {
        // In ISO BMFF HandlerBox (`hdlr`):
        // [hdlr (4)] [version+flags (4)] [pre_defined (4)] [handler_type (4) == 'soun']
        const limit = buf.length - 16;
        for (let i = 0; i <= limit; i++) {
          if (
            buf[i] === 0x68 && // 'h'
            buf[i + 1] === 0x64 && // 'd'
            buf[i + 2] === 0x6c && // 'l'
            buf[i + 3] === 0x72 && // 'r'
            buf[i + 12] === 0x73 && // 's'
            buf[i + 13] === 0x6f && // 'o'
            buf[i + 14] === 0x75 && // 'u'
            buf[i + 15] === 0x6e // 'n'
          ) {
            return true;
          }
        }
        return false;
      };

      if (hasSounHandler(headBytes)) return true;

      if (file.size > chunkSize) {
        const tailStart = Math.max(0, file.size - chunkSize);
        const tailBytes = new Uint8Array(await file.slice(tailStart, file.size).arrayBuffer());
        if (hasSounHandler(tailBytes)) return true;
      }

      return false;
    }
  } catch {
    // Fall through to safe default
  }

  return true;
}
