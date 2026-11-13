import React, { useState, useRef, useEffect } from 'react';
import { Video, Monitor, Camera, Square, Download, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface RecordedClip {
  id: string;
  name: string;
  url: string;
  durationSec: number;
  sizeBytes: number;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const ScreenWebcamRecorderTool: React.FC = () => {
  const { t } = useI18n();
  const previewRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [source, setSource] = useState<'screen' | 'webcam'>('screen');
  const [includeMic, setIncludeMic] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clips, setClips] = useState<RecordedClip[]>([]);

  const cleanupStreams = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (previewRef.current) {
      previewRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupStreams();
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    if (typeof MediaRecorder === 'undefined') {
      setErrorMsg(t('svr_unsupported', 'MediaRecorder is not supported in this browser.'));
      return;
    }

    try {
      let mainStream: MediaStream;
      if (source === 'screen') {
        mainStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } else {
        mainStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: includeMic,
        });
      }

      if (source === 'screen' && includeMic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStream.getAudioTracks().forEach(track => mainStream.addTrack(track));
        } catch {
          // Proceed with screen stream even if mic unavailable
        }
      }

      streamRef.current = mainStream;
      if (previewRef.current) {
        previewRef.current.srcObject = mainStream;
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(mainStream, { mimeType });
      chunksRef.current = [];
      const startedAt = Date.now();

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const dur = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        setClips(prev => [
          {
            id: Date.now().toString(),
            name: `${source === 'screen' ? t('svr_clip_screen', 'Screen') : t('svr_clip_webcam', 'Webcam')}-${new Date().toLocaleTimeString()}`,
            url,
            durationSec: dur,
            sizeBytes: blob.size,
          },
          ...prev,
        ]);
        cleanupStreams();
        setIsRecording(false);
      };

      // Handle user stopping screen share via browser chrome
      mainStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (recorder.state !== 'inactive') recorder.stop();
      });

      recorderRef.current = recorder;
      recorder.start(500);
      setElapsedSec(0);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setElapsedSec(s => s + 1);
      }, 1000);
    } catch {
      setErrorMsg(t('svr_permission_error', 'Recording permission was denied or capture source is unavailable.'));
      cleanupStreams();
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  const deleteClip = (clip: RecordedClip) => {
    URL.revokeObjectURL(clip.url);
    setClips(prev => prev.filter(c => c.id !== clip.id));
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('svr_title', 'Quick Screen & Webcam Recorder')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('svr_subtitle', 'Record screen clips or webcam video locally in your browser with instant WebM download.')}
              </p>
            </div>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            <button
              type="button"
              disabled={isRecording}
              onClick={() => setSource('screen')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                source === 'screen' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{t('svr_source_screen', 'Screen')}</span>
            </button>
            <button
              type="button"
              disabled={isRecording}
              onClick={() => setSource('webcam')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                source === 'webcam' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{t('svr_source_webcam', 'Webcam')}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              disabled={isRecording}
              checked={includeMic}
              onChange={e => setIncludeMic(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-indigo-600"
            />
            <span>{t('svr_include_mic', 'Include microphone audio')}</span>
          </label>

          <div className="flex items-center gap-3">
            {isRecording && (
              <span className="text-sm font-mono tabular-nums text-rose-400 font-bold">
                ● {formatDuration(elapsedSec)}
              </span>
            )}
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Video className="w-3.5 h-3.5" />
                <span>{t('start_recording_btn', 'Start recording')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                <span>{t('stop_and_save_btn', 'Stop and save')}</span>
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden aspect-video max-h-[360px] flex items-center justify-center">
          <video
            ref={previewRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-contain ${isRecording ? 'block' : 'hidden'}`}
          />
          {!isRecording && (
            <div className="text-center p-6 space-y-1">
              <Video className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-xs text-slate-400">
                {t('svr_preview_idle', 'Live capture preview appears here while recording')}
              </div>
            </div>
          )}
        </div>

        {clips.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300">
              {t('svr_saved_clips', 'Recorded Clips')} ({clips.length})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clips.map(clip => (
                <div key={clip.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <video src={clip.url} controls className="w-full rounded-lg bg-black max-h-48" />
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate">{clip.name}</div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-500">
                        {formatDuration(clip.durationSec)} · {(clip.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={clip.url}
                        download={`${clip.name}.webm`}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>WebM</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteClip(clip)}
                        aria-label={t('delete_item', 'Delete item')}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
