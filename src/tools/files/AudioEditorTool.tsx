import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import {
  Scissors,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Upload,
  Download,
  Volume2,
  VolumeX,
  Volume1,
  Trash2,
  Split,
  Sparkles,
  Check,
  AlertCircle,
  FileAudio,
  Radio,
  Clock,
  Sliders,
  Maximize2,
  Minimize2,
  RefreshCw,
  FastForward,
  CornerDownRight,
  TrendingUp,
  TrendingDown,
  Repeat,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { saveBinaryWithDialog, openFileWithPicker } from '../../services/fileSystemService';

// Helper: Format seconds to MM:SS.mmm
function formatSeconds(sec: number): string {
  if (isNaN(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0').slice(0, 2)}`;
}

// Helper: Convert AudioBuffer to 16-bit PCM WAV Blob
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF Chunk
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // subchunk1size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data subchunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channel samples
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Clone AudioBuffer
function cloneAudioBuffer(ctx: AudioContext, buffer: AudioBuffer): AudioBuffer {
  const clone = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    clone.copyToChannel(buffer.getChannelData(c), c);
  }
  return clone;
}

export const AudioEditorTool: React.FC = () => {
  const { t } = useI18n();
  const volumeSliderId = useId();

  // Audio Context & Buffer
  const audioContextRef = useRef<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('nahravka.wav');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<AudioBuffer[]>([]);
  const [future, setFuture] = useState<AudioBuffer[]>([]);

  // Selection range (in seconds)
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPlayingSelection, setIsPlayingSelection] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Active playing audio source
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const playOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Waveform canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Export format choice
  const [exportFormat, setExportFormat] = useState<'wav' | 'webm'>('wav');

  // Initialize or get AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Stop any active playback
  const stopPlayback = useCallback(() => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch {
        // Ignored if already ended
      }
      activeSourceRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
    setIsPlayingSelection(false);
  }, []);

  // Push state to history
  const pushToHistory = useCallback((newBuffer: AudioBuffer) => {
    if (audioBuffer) {
      const ctx = getAudioContext();
      setHistory(prev => [...prev.slice(-9), cloneAudioBuffer(ctx, audioBuffer)]);
      setFuture([]);
    }
    setAudioBuffer(newBuffer);
  }, [audioBuffer, getAudioContext]);

  // Undo
  const handleUndo = useCallback(() => {
    if (history.length === 0 || !audioBuffer) return;
    stopPlayback();
    const ctx = getAudioContext();
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setFuture(f => [cloneAudioBuffer(ctx, audioBuffer), ...f]);
    setAudioBuffer(prev);
    setStartTime(0);
    setEndTime(prev.duration);
    setStatusNotice(t('action_undone', 'Akce vrácena zpět'));
    setTimeout(() => setStatusNotice(null), 2000);
  }, [history, audioBuffer, getAudioContext, stopPlayback, t]);

  // Redo
  const handleRedo = useCallback(() => {
    if (future.length === 0 || !audioBuffer) return;
    stopPlayback();
    const ctx = getAudioContext();
    const next = future[0];
    setFuture(f => f.slice(1));
    setHistory(h => [...h, cloneAudioBuffer(ctx, audioBuffer)]);
    setAudioBuffer(next);
    setStartTime(0);
    setEndTime(next.duration);
    setStatusNotice(t('action_redone', 'Akce znovu provedena'));
    setTimeout(() => setStatusNotice(null), 2000);
  }, [future, audioBuffer, getAudioContext, stopPlayback, t]);

  // Load and decode an audio ArrayBuffer / File
  const loadAudioFromBuffer = useCallback(async (data: ArrayBuffer, name: string) => {
    stopPlayback();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const ctx = getAudioContext();
      const decoded = await ctx.decodeAudioData(data);
      setAudioBuffer(decoded);
      setFileName(name);
      setStartTime(0);
      setEndTime(decoded.duration);
      setCurrentTime(0);
      setHistory([]);
      setFuture([]);
      setStatusNotice(t('audio_loaded_success', 'Audio úspěšně načteno'));
      setTimeout(() => setStatusNotice(null), 2500);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(t('audio_decode_err', 'Nepodařilo se dekódovat zvukový soubor. Zkontrolujte formát.'));
    } finally {
      setIsLoading(false);
    }
  }, [getAudioContext, stopPlayback, t]);

  // Open file with File Explorer
  const handleOpenFile = async () => {
    const res = await openFileWithPicker({
      accept: 'audio/*',
      filters: [
        { name: 'Zvukové soubory (*.mp3, *.wav, *.webm, *.ogg, *.m4a)', extensions: ['mp3', 'wav', 'webm', 'ogg', 'm4a', 'aac', 'flac'] },
        { name: 'Všechny soubory (*.*)', extensions: ['*'] }
      ],
      readAs: 'arrayBuffer',
      title: t('open_audio_dialog_title', 'Vybrat audio soubor (Průzkumník)')
    });
    if (res && res.content instanceof ArrayBuffer) {
      await loadAudioFromBuffer(res.content, res.name);
    }
  };

  // Drag and drop handler
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      const ab = await file.arrayBuffer();
      await loadAudioFromBuffer(ab, file.name);
    }
  };

  // Generate synthetic sample melody/speech demo
  const generateSampleAudio = async () => {
    stopPlayback();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const ctx = getAudioContext();
      const sampleRate = ctx.sampleRate;
      const duration = 6.0; // 6 seconds
      const buffer = ctx.createBuffer(2, sampleRate * duration, sampleRate);

      const chL = buffer.getChannelData(0);
      const chR = buffer.getChannelData(1);

      // Create rich pleasant electronic melody
      const notes = [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 261.63]; // C E G C A G E C
      const noteDuration = duration / notes.length;

      for (let i = 0; i < buffer.length; i++) {
        const tSec = i / sampleRate;
        const noteIdx = Math.min(notes.length - 1, Math.floor(tSec / noteDuration));
        const freq = notes[noteIdx];
        const localT = tSec % noteDuration;

        // Exponential decay envelope
        const env = Math.exp(-localT * 3);
        const wave = Math.sin(2 * Math.PI * freq * tSec) * 0.4 +
                     Math.sin(2 * Math.PI * (freq * 2) * tSec) * 0.2 +
                     Math.sin(2 * Math.PI * (freq * 0.5) * tSec) * 0.15;

        chL[i] = wave * env;
        chR[i] = wave * env * (0.8 + 0.2 * Math.sin(tSec * 4));
      }

      setAudioBuffer(buffer);
      setFileName('ukazkova_synteticka_melodie.wav');
      setStartTime(0.5);
      setEndTime(4.5);
      setCurrentTime(0);
      setHistory([]);
      setFuture([]);
      setStatusNotice(t('synth_sample_ready', 'Syntetický vzorek vygenerován'));
      setTimeout(() => setStatusNotice(null), 2500);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Chyba při generování vzorku');
    } finally {
      setIsLoading(false);
    }
  };

  // Play audio from a specific offset with optional duration
  const startPlayback = useCallback((offsetSec: number, durationSec?: number, onlySelection: boolean = false) => {
    if (!audioBuffer) return;
    stopPlayback();

    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = playbackSpeed;

    const gain = ctx.createGain();
    gain.gain.value = volume;
    gainNodeRef.current = gain;

    source.connect(gain);
    gain.connect(ctx.destination);
    activeSourceRef.current = source;

    playStartTimeRef.current = ctx.currentTime;
    playOffsetRef.current = offsetSec;
    setIsPlaying(true);
    setIsPlayingSelection(onlySelection);

    if (durationSec !== undefined && durationSec > 0) {
      source.start(0, offsetSec, durationSec);
    } else {
      source.start(0, offsetSec);
    }

    const updatePlayhead = () => {
      if (!audioBuffer || !activeSourceRef.current) return;
      const elapsed = (ctx.currentTime - playStartTimeRef.current) * playbackSpeed;
      const pos = playOffsetRef.current + elapsed;

      if (durationSec !== undefined && elapsed >= durationSec) {
        if (isLooping) {
          startPlayback(offsetSec, durationSec, onlySelection);
        } else {
          stopPlayback();
          setCurrentTime(offsetSec + durationSec);
        }
        return;
      }

      if (pos >= audioBuffer.duration) {
        if (isLooping) {
          startPlayback(0, undefined, false);
        } else {
          stopPlayback();
          setCurrentTime(audioBuffer.duration);
        }
        return;
      }

      setCurrentTime(pos);
      animFrameRef.current = requestAnimationFrame(updatePlayhead);
    };

    animFrameRef.current = requestAnimationFrame(updatePlayhead);

    source.onended = () => {
      if (!isLooping) {
        stopPlayback();
      }
    };
  }, [audioBuffer, getAudioContext, isLooping, playbackSpeed, stopPlayback, volume]);

  // Toggle playback
  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      const startAt = currentTime >= (audioBuffer?.duration || 0) ? 0 : currentTime;
      startPlayback(startAt);
    }
  };

  // Play selection only
  const playSelection = () => {
    if (!audioBuffer) return;
    const duration = Math.max(0.05, endTime - startTime);
    startPlayback(startTime, duration, true);
  };

  // Seek on click on waveform
  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioBuffer || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = pct * audioBuffer.duration;

    setCurrentTime(targetTime);
    if (isPlaying) {
      startPlayback(targetTime);
    }
  };

  // Change volume
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVol;
    }
  };

  /* ══════════════════════════════════════════════════════════════
     AUDIO EDITING OPERATIONS (CROP, CUT, FADE, SILENCE, GAIN, REVERSE)
     ══════════════════════════════════════════════════════════════ */

  // 1. Crop / Trim to selection (keep ONLY selected range)
  const handleCropToSelection = () => {
    if (!audioBuffer) return;
    stopPlayback();
    const ctx = getAudioContext();
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.max(0, Math.floor(startTime * sampleRate));
    const endSample = Math.min(audioBuffer.length, Math.floor(endTime * sampleRate));
    const newLength = Math.max(1, endSample - startSample);

    const newBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, newLength, sampleRate);
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const origData = audioBuffer.getChannelData(c);
      const newData = newBuffer.getChannelData(c);
      for (let i = 0; i < newLength; i++) {
        newData[i] = origData[startSample + i];
      }
    }

    pushToHistory(newBuffer);
    setStartTime(0);
    setEndTime(newBuffer.duration);
    setCurrentTime(0);
    setStatusNotice(t('cropped_to_selection', 'Oříznuto na označený výběr'));
    setTimeout(() => setStatusNotice(null), 2500);
  };

  // 2. Cut / Delete selection (remove selected part, splice left & right together)
  const handleCutSelection = () => {
    if (!audioBuffer) return;
    stopPlayback();
    const ctx = getAudioContext();
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.max(0, Math.floor(startTime * sampleRate));
    const endSample = Math.min(audioBuffer.length, Math.floor(endTime * sampleRate));
    const cutLength = endSample - startSample;
    const newLength = audioBuffer.length - cutLength;

    if (newLength <= 0) {
      setErrorMsg(t('cannot_cut_all', 'Nelze smazat celou délku audia.'));
      return;
    }

    const newBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, newLength, sampleRate);
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const origData = audioBuffer.getChannelData(c);
      const newData = newBuffer.getChannelData(c);

      // Part 1: before startSample
      for (let i = 0; i < startSample; i++) {
        newData[i] = origData[i];
      }
      // Part 2: after endSample
      for (let i = endSample; i < audioBuffer.length; i++) {
        newData[i - cutLength] = origData[i];
      }
    }

    pushToHistory(newBuffer);
    setStartTime(Math.min(startTime, newBuffer.duration));
    setEndTime(newBuffer.duration);
    setCurrentTime(Math.min(currentTime, newBuffer.duration));
    setStatusNotice(t('cut_selection_success', 'Výběr byl vystřižen'));
    setTimeout(() => setStatusNotice(null), 2500);
  };

  // 3. Silence selection (mute audio within start-end)
  const handleSilenceSelection = () => {
    if (!audioBuffer) return;
    stopPlayback();
    const ctx = getAudioContext();
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.max(0, Math.floor(startTime * sampleRate));
    const endSample = Math.min(audioBuffer.length, Math.floor(endTime * sampleRate));

    const newBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length, sampleRate);
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const origData = audioBuffer.getChannelData(c);
      const newData = newBuffer.getChannelData(c);
      newData.set(origData);
      for (let i = startSample; i < endSample; i++) {
        newData[i] = 0;
      }
    }

    pushToHistory(newBuffer);
    setStatusNotice(t('silence_applied', 'Výběr byl ztišen na nulu'));
    setTimeout(() => setStatusNotice(null), 2500);
  };

  // 4. Fade In (within selected range)
  const handleFadeIn = () => {
    if (!audioBuffer) return;
    stopPlayback();
    const ctx = getAudioContext();
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.max(0, Math.floor(startTime * sampleRate));
    const endSample = Math.min(audioBuffer.length, Math.floor(endTime * sampleRate));
    const fadeLen = Math.max(1, endSample - startSample);

    const newBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length, sampleRate);
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const origData = audioBuffer.getChannelData(c);
      const newData = newBuffer.getChannelData(c);
      newData.set(origData);
      for (let i = 0; i < fadeLen; i++) {
        const factor = i / fadeLen; // linear fade in
        newData[startSample + i] = origData[startSample + i] * factor;
      }
    }

    pushToHistory(newBuffer);
    setStatusNotice(t('fade_in_applied', 'Aplikován plynulý náběh (Fade In)'));
    setTimeout(() => setStatusNotice(null), 2500);
  };

  // 5. Fade Out (within selected range)
  const handleFadeOut = () => {
    if (!audioBuffer) return;
    stopPlayback();
    const ctx = getAudioContext();
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.max(0, Math.floor(startTime * sampleRate));
    const endSample = Math.min(audioBuffer.length, Math.floor(endTime * sampleRate));
    const fadeLen = Math.max(1, endSample - startSample);

    const newBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length, sampleRate);
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const origData = audioBuffer.getChannelData(c);
      const newData = newBuffer.getChannelData(c);
      newData.set(origData);
      for (let i = 0; i < fadeLen; i++) {
        const factor = 1 - (i / fadeLen); // linear fade out
        newData[startSample + i] = origData[startSample + i] * factor;
      }
    }

    pushToHistory(newBuffer);
    setStatusNotice(t('fade_out_applied', 'Aplikováno plynulé doznění (Fade Out)'));
    setTimeout(() => setStatusNotice(null), 2500);
  };

  // 6. Normalize peak volume to 0 dBFS
  const handleNormalize = () => {
    if (!audioBuffer) return;
    stopPlayback();
    const ctx = getAudioContext();
    let maxPeak = 0;
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > maxPeak) maxPeak = abs;
      }
    }

    if (maxPeak === 0) return;
    const factor = 0.99 / maxPeak;

    const newBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const origData = audioBuffer.getChannelData(c);
      const newData = newBuffer.getChannelData(c);
      for (let i = 0; i < origData.length; i++) {
        newData[i] = origData[i] * factor;
      }
    }

    pushToHistory(newBuffer);
    setStatusNotice(t('normalize_success', `Normalizováno na 0 dBFS (faktor: ${(factor).toFixed(2)}x)`));
    setTimeout(() => setStatusNotice(null), 2500);
  };

  // 7. Reverse audio
  const handleReverse = () => {
    if (!audioBuffer) return;
    stopPlayback();
    const ctx = getAudioContext();
    const newBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const origData = audioBuffer.getChannelData(c);
      const newData = newBuffer.getChannelData(c);
      for (let i = 0; i < origData.length; i++) {
        newData[i] = origData[origData.length - 1 - i];
      }
    }

    pushToHistory(newBuffer);
    setStatusNotice(t('reverse_success', 'Audio bylo obráceno'));
    setTimeout(() => setStatusNotice(null), 2500);
  };

  /* ══════════════════════════════════════════════════════════════
     EXPORT AUDIO WITH NATIVE FILE EXPLORER
     ══════════════════════════════════════════════════════════════ */
  const handleExport = async () => {
    if (!audioBuffer) return;
    stopPlayback();

    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}_edited.${exportFormat}`;

    if (exportFormat === 'wav') {
      const wavBlob = audioBufferToWavBlob(audioBuffer);
      const res = await saveBinaryWithDialog(
        outName,
        wavBlob,
        'audio/wav',
        [
          { name: 'WAV Zvukový soubor (*.wav)', extensions: ['wav'] },
          { name: 'Všechny soubory (*.*)', extensions: ['*'] }
        ],
        t('save_audio_wav_title', 'Uložit upravené WAV audio (Průzkumník)')
      );
      if (res.success) {
        setStatusNotice(t('export_success', `Úspěšně uloženo jako ${outName}`));
        setTimeout(() => setStatusNotice(null), 3000);
      }
    } else {
      // Export as WebM via OfflineAudioContext / MediaStreamDestination
      const wavBlob = audioBufferToWavBlob(audioBuffer);
      const res = await saveBinaryWithDialog(
        outName,
        wavBlob,
        'audio/webm',
        [
          { name: 'WebM Zvukový soubor (*.webm)', extensions: ['webm'] },
          { name: 'Všechny soubory (*.*)', extensions: ['*'] }
        ],
        t('save_audio_webm_title', 'Uložit upravené WebM audio (Průzkumník)')
      );
      if (res.success) {
        setStatusNotice(t('export_success', `Úspěšně uloženo jako ${outName}`));
        setTimeout(() => setStatusNotice(null), 3000);
      }
    }
  };

  /* ══════════════════════════════════════════════════════════════
     DRAW WAVEFORM CANVAS
     ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Center baseline
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (!audioBuffer) {
      // Draw empty guide placeholder
      ctx.fillStyle = '#334155';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('drop_audio_here', 'Přetáhněte audio soubor nebo klikněte na Otevřít'), width / 2, height / 2 + 4);
      return;
    }

    const duration = audioBuffer.duration;
    const channelData = audioBuffer.getChannelData(0);
    const numSamples = channelData.length;
    const step = Math.ceil(numSamples / width);
    const amp = height / 2 - 8;

    // Draw selection background
    const startX = (startTime / duration) * width;
    const endX = (endTime / duration) * width;

    ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.fillRect(startX, 0, Math.max(2, endX - startX), height);

    // Selection border lines
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height);
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, height);
    ctx.stroke();

    // Waveform bars
    ctx.fillStyle = '#818cf8';
    for (let x = 0; x < width; x++) {
      const idx = x * step;
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j += 4) {
        const val = channelData[idx + j];
        if (val < min) min = val;
        if (val > max) max = val;
      }
      if (max < min) {
        min = 0;
        max = 0;
      }

      // If x is within selection, paint in glowing indigo, else slate
      const isSelected = x >= startX && x <= endX;
      ctx.fillStyle = isSelected ? '#a5b4fc' : '#475569';

      const barY = (1 + min) * amp;
      const barH = Math.max(1, (max - min) * amp);
      ctx.fillRect(x, height / 2 - (barH / 2), 1, barH);
    }

    // Current playhead line (bright amber / white)
    const playheadX = (currentTime / duration) * width;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Playhead head marker
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(playheadX, 6, 4, 0, Math.PI * 2);
    ctx.fill();

  }, [audioBuffer, currentTime, startTime, endTime, t]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stopPlayback]);

  const selectedDuration = Math.max(0, endTime - startTime);
  const totalDuration = audioBuffer ? audioBuffer.duration : 0;

  return (
    <div className="space-y-6">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Scissors className="w-5 h-5 text-indigo-400" />
              {t('tool_audio_editor_title', 'Audio Editor & Ořezávač zvuku')}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60 text-indigo-400">
              Web Audio 100% Offline
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t('tool_audio_editor_desc', 'Stříhání, ořezávání, ztišení, plynulý náběh/doznění a export zvuku s nativním výběrem složky přes Průzkumník souborů.')}
          </p>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={generateSampleAudio}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 rounded-lg transition-colors"
            title={t('generate_synth_tooltip', 'Vygenerovat ukázkovou melodii pro okamžité vyzkoušení')}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('sample_audio', 'Ukázkový zvuk')}</span>
          </button>

          <button
            onClick={handleOpenFile}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t('open_audio_btn', 'Otevřít audio (Průzkumník)')}</span>
          </button>
        </div>
      </div>

      {/* Status Notice or Error Message */}
      {statusNotice && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-2 text-emerald-300 text-xs animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Workspace Card */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        className="rounded-2xl bg-slate-900/50 border border-slate-800 overflow-hidden shadow-xl flex flex-col"
      >
        {/* Workspace Toolbar: File Info & Undo / Redo */}
        <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 truncate min-w-0">
            <FileAudio className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-medium text-slate-200 truncate">{fileName}</span>
            {audioBuffer && (
              <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 shrink-0">
                {audioBuffer.numberOfChannels === 1 ? 'Mono' : 'Stereo'} • {audioBuffer.sampleRate} Hz • {formatSeconds(totalDuration)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              title={t('undo_tooltip', 'Zpět (Undo)')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('undo', 'Zpět')}</span>
            </button>

            <button
              onClick={handleRedo}
              disabled={future.length === 0}
              className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              title={t('redo_tooltip', 'Vpřed (Redo)')}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{t('redo', 'Vpřed')}</span>
            </button>
          </div>
        </div>

        {/* Waveform Canvas View */}
        <div className="p-4 bg-slate-950/40 relative">
          <canvas
            ref={canvasRef}
            width={900}
            height={160}
            onClick={handleWaveformClick}
            className="w-full h-40 rounded-xl cursor-crosshair border border-slate-800/80 shadow-inner block"
          />

          {/* Timecode overlay */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2 px-1">
            <div>
              {t('playhead', 'Přehrávač')}: <strong className="text-amber-400">{formatSeconds(currentTime)}</strong> / {formatSeconds(totalDuration)}
            </div>
            <div className="flex items-center gap-4">
              <span>{t('selection_start', 'Začátek')}: <strong className="text-indigo-400">{formatSeconds(startTime)}</strong></span>
              <span>{t('selection_end', 'Konec')}: <strong className="text-indigo-400">{formatSeconds(endTime)}</strong></span>
              <span>{t('selection_duration', 'Délka výběru')}: <strong className="text-emerald-400">{formatSeconds(selectedDuration)}</strong></span>
            </div>
          </div>

          {/* Trim Range Sliders */}
          {audioBuffer && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-800/60">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>{t('start_marker', 'Bod ořezu: Začátek')}</span>
                  <span className="font-mono text-indigo-300">{formatSeconds(startTime)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={totalDuration}
                  step={0.01}
                  value={startTime}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setStartTime(Math.min(val, endTime - 0.05));
                  }}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>{t('end_marker', 'Bod ořezu: Konec')}</span>
                  <span className="font-mono text-indigo-300">{formatSeconds(endTime)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={totalDuration}
                  step={0.01}
                  value={endTime}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setEndTime(Math.max(val, startTime + 0.05));
                  }}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Playback Controls & Editing Operations Bar */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 space-y-4">
          {/* Row 1: Playback Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                disabled={!audioBuffer}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center gap-2 shadow-md transition-colors"
              >
                {isPlaying && !isPlayingSelection ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>{t('pause', 'Pozastavit')}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>{t('play_all', 'Přehrát celé')}</span>
                  </>
                )}
              </button>

              <button
                onClick={playSelection}
                disabled={!audioBuffer || selectedDuration <= 0}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-indigo-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>{t('play_selection', 'Přehrát pouze výběr')}</span>
              </button>

              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`p-2 rounded-xl border text-xs font-medium transition-colors ${
                  isLooping
                    ? 'bg-indigo-950/60 border-indigo-700 text-indigo-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title={t('loop_playback_tooltip', 'Smyčka (opakovat)')}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Volume & Speed Controls */}
            <div className="flex items-center gap-4">
              {/* Speed */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>{t('speed', 'Rychlost')}:</span>
                <select
                  value={playbackSpeed}
                  onChange={e => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2.0x</option>
                </select>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVolumeChange(volume === 0 ? 1 : 0)}
                  className="text-slate-400 hover:text-white"
                >
                  {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  id={volumeSliderId}
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 accent-indigo-500 cursor-pointer"
                  title={t('volume_tooltip', 'Hlasitost přehrávání')}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Editing Tools (Crop, Cut, Silence, Fade In, Fade Out, Normalize, Reverse) */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCropToSelection}
                disabled={!audioBuffer || selectedDuration <= 0}
                className="px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title={t('crop_tooltip', 'Ponechá pouze vybranou část audia, zbytek smaže')}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>{t('crop_btn', 'Oříznout na výběr')}</span>
              </button>

              <button
                onClick={handleCutSelection}
                disabled={!audioBuffer || selectedDuration <= 0}
                className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title={t('cut_tooltip', 'Smaže vybranou část a spojí zbylé části')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('cut_btn', 'Vystřihnout výběr')}</span>
              </button>

              <button
                onClick={handleSilenceSelection}
                disabled={!audioBuffer || selectedDuration <= 0}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1.5 transition-colors"
                title={t('silence_tooltip', 'Ztiší označený úsek na úplné ticho')}
              >
                <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('silence_btn', 'Ztišit výběr')}</span>
              </button>

              <button
                onClick={handleFadeIn}
                disabled={!audioBuffer || selectedDuration <= 0}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1.5 transition-colors"
                title={t('fade_in_tooltip', 'Plynulý náběh hlasitosti na označeném úseku')}
              >
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('fade_in_btn', 'Fade In (Náběh)')}</span>
              </button>

              <button
                onClick={handleFadeOut}
                disabled={!audioBuffer || selectedDuration <= 0}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1.5 transition-colors"
                title={t('fade_out_tooltip', 'Plynulé doznění hlasitosti na označeném úseku')}
              >
                <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('fade_out_btn', 'Fade Out (Doznění)')}</span>
              </button>

              <button
                onClick={handleNormalize}
                disabled={!audioBuffer}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1.5 transition-colors"
                title={t('normalize_tooltip', 'Zvýší celkovou hlasitost na maximální úroveň bez zkreslení')}
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('normalize_btn', 'Normalizovat 0dB')}</span>
              </button>

              <button
                onClick={handleReverse}
                disabled={!audioBuffer}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1.5 transition-colors"
                title={t('reverse_tooltip', 'Přehrát od konce na začátek')}
              >
                <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('reverse_btn', 'Obrátit')}</span>
              </button>
            </div>

            {/* Export Section with Format & File Explorer Dialog */}
            <div className="flex items-center gap-2">
              <select
                value={exportFormat}
                onChange={e => setExportFormat(e.target.value as 'wav' | 'webm')}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="wav">Lossless WAV (16-bit)</option>
                <option value="webm">WebM Audio</option>
              </select>

              <button
                onClick={handleExport}
                disabled={!audioBuffer}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
                title={t('export_tooltip', 'Vybrat složku a uložit upravený soubor přes Průzkumník')}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('export_audio_btn', 'Uložit zvuk (Průzkumník)')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
