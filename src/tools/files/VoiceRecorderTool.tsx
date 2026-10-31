import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Download,
  Trash2,
  Volume2,
  VolumeX,
  Clock,
  RotateCcw,
  Sparkles,
  AlertCircle,
  FileAudio,
  Radio,
  Edit2,
  Check,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface AudioRecord {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  duration: number; // in seconds
  timestamp: string;
  sizeBytes: number;
}

export const VoiceRecorderTool: React.FC = () => {
  const { t } = useI18n();

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordings, setRecordings] = useState<AudioRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio player state
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameVal, setEditNameVal] = useState('');

  // Volume visualization bars
  const [volumeLevel, setVolumeLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Set up AudioContext for volume visualization
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // Configure MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        const newRec: AudioRecord = {
          id: Date.now().toString(),
          name: `${t('voice_memo_default', 'Hlasový záznam')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          blob: audioBlob,
          url: audioUrl,
          duration: recordSeconds,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          sizeBytes: audioBlob.size,
        };

        setRecordings(prev => [newRec, ...prev]);

        // Clean up stream tracks
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
        }
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }
        setVolumeLevel(0);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      setRecordSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds(p => p + 1);
      }, 1000);
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      setErrorMsg(
        t(
          'microphone_permission_error',
          'Přístup k mikrofonu byl odmítnut nebo není k dispozici. Povolte prosím mikrofon ve vašem prohlížeči / systému.'
        )
      );
    }
  };

  // Pause / Resume
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds(p => p + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Playback control
  const handlePlayToggle = (rec: AudioRecord) => {
    if (activePlayingId === rec.id) {
      if (audioElementRef.current) {
        if (audioElementRef.current.paused) {
          audioElementRef.current.play();
        } else {
          audioElementRef.current.pause();
          setActivePlayingId(null);
        }
      }
    } else {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      const audio = new Audio(rec.url);
      audioElementRef.current = audio;
      setActivePlayingId(rec.id);
      audio.play();

      audio.ontimeupdate = () => {
        if (audio.duration > 0) {
          setPlaybackProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setActivePlayingId(null);
        setPlaybackProgress(0);
      };
    }
  };

  const deleteRecording = (id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
    if (activePlayingId === id && audioElementRef.current) {
      audioElementRef.current.pause();
      setActivePlayingId(null);
    }
  };

  const handleDownload = (rec: AudioRecord) => {
    const a = document.createElement('a');
    a.href = rec.url;
    a.download = `${rec.name.replace(/\s+/g, '_')}.webm`;
    a.click();
  };

  const saveRename = (id: string) => {
    if (editNameVal.trim()) {
      setRecordings(prev =>
        prev.map(r => (r.id === id ? { ...r, name: editNameVal.trim() } : r))
      );
    }
    setEditingId(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioElementRef.current) audioElementRef.current.pause();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_voice_recorder_title', 'Rychlý diktafon & Zvukové poznámky')}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5" />
              100% Offline WebM/Opus
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t(
              'tool_voice_recorder_desc',
              'Nahrávejte hlasové poznámky, rozhovory nebo nápady přímo z mikrofonu. Data se zpracovávají lokálně v paměti a lze je okamžitě stáhnout.'
            )}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Recording Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recording Studio Console */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col items-center justify-center text-center space-y-6 min-h-[380px]">
          {/* Pulsing Visualizer & Timer */}
          <div className="space-y-3">
            <div className="relative flex items-center justify-center">
              {isRecording && (
                <div
                  style={{
                    transform: `scale(${1 + volumeLevel / 120})`,
                    opacity: 0.25 + volumeLevel / 200,
                  }}
                  className="absolute w-28 h-28 rounded-full bg-rose-500 transition-transform duration-75"
                />
              )}
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all ${
                  isRecording
                    ? isPaused
                      ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                      : 'bg-rose-950/80 border-rose-500 text-rose-400 shadow-lg shadow-rose-950/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Mic className={`w-10 h-10 ${isRecording && !isPaused ? 'animate-pulse' : ''}`} />
              </div>
            </div>

            {/* Timer readout */}
            <div className="font-mono text-3xl font-bold tracking-wider text-white">
              {formatTime(recordSeconds)}
            </div>

            <div className="text-xs text-slate-400">
              {isRecording
                ? isPaused
                  ? t('recording_paused', 'Nahrávání pozastaveno')
                  : t('recording_active', 'Probíhá záznam hlasu...')
                : t('ready_to_record', 'Připraveno k nahrávání')}
            </div>
          </div>

          {/* Volume Indicator Wave */}
          {isRecording && !isPaused && (
            <div className="w-full max-w-xs h-3 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
              <div
                style={{ width: `${Math.max(4, volumeLevel)}%` }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-400 transition-all duration-75"
              />
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-xl shadow-rose-950/50 transition-all flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                <span>{t('start_recording_btn', 'Zahájit nahrávání')}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={togglePause}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isPaused ? t('resume', 'Pokračovat') : t('pause', 'Pozastavit')}</span>
                </button>

                <button
                  onClick={stopRecording}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{t('stop_and_save_btn', 'Ukončit a uložit')}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Recordings Library */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-indigo-400" />
              <span>{t('recordings_library', 'Uložené hlasové poznámky')}</span>
            </span>
            <span className="text-xs font-mono text-slate-500">
              {recordings.length} {t('records_count', 'záznamů')}
            </span>
          </div>

          {recordings.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/20 border border-slate-800/60 space-y-3">
              <FileAudio className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-sm font-medium text-slate-400">
                {t('no_recordings_yet', 'Zatím nemáte žádné nahrávky')}
              </div>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                {t('recordings_hint', 'Stiskněte tlačítko "Zahájit nahrávání" a vytvořte svou první hlasovou poznámku.')}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {recordings.map(rec => {
                const isPlaying = activePlayingId === rec.id;
                const isEditing = editingId === rec.id;

                return (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editNameVal}
                            onChange={e => setEditNameVal(e.target.value)}
                            className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white flex-1"
                            autoFocus
                          />
                          <button
                            onClick={() => saveRename(rec.id)}
                            className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-200 truncate">
                              {rec.name}
                            </span>
                            <button
                              onClick={() => {
                                setEditingId(rec.id);
                                setEditNameVal(rec.name);
                              }}
                              className="text-slate-500 hover:text-slate-300"
                              title={t('rename', 'Přejmenovat')}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {rec.timestamp} • {formatTime(rec.duration)} • {(rec.sizeBytes / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handlePlayToggle(rec)}
                          className={`p-2 rounded-xl transition-colors ${
                            isPlaying
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                          }`}
                          title={isPlaying ? t('pause', 'Pozastavit') : t('play', 'Přehrát')}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>

                        <button
                          onClick={() => handleDownload(rec)}
                          className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                          title={t('download_audio', 'Stáhnout zvukový soubor (.webm)')}
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => deleteRecording(rec.id)}
                          className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                          title={t('delete', 'Smazat')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar when playing */}
                    {isPlaying && (
                      <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${playbackProgress}%` }}
                          className="h-full bg-indigo-500 transition-all duration-100"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
