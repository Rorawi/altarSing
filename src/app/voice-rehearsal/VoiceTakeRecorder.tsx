'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import type { VoiceRehearsalProject, VoiceRehearsalTake } from '@/types/voice-rehearsal';
import { getDecodedVoiceTake, getSharedVoiceAudioContext, stopActiveVoiceMix } from './VoiceAudioEngine';

const MAX_TAKE_SECONDS = 10 * 60;
const COUNT_IN_INTERVAL_MS = 1000;

type RecorderMode = 'ready' | 'preparing' | 'counting-in' | 'recording' | 'stopping' | 'review' | 'uploading';
type LocalTake = { blob: Blob; url: string; durationSeconds: number; mimeType: string; offsetMs: number };
type CaptureDiagnostics = {
  capturedAt: string;
  browser: string;
  partLabel: string;
  backingParts: string[];
  inputSampleRate: number | null;
  inputLatencyMs: number | null;
  inputChannels: number | null;
  echoCancellation: boolean | string | null;
  noiseSuppression: boolean | null;
  autoGainControl: boolean | null;
  contextSampleRate: number;
  baseLatencyMs: number | null;
  outputLatencyMs: number | null;
  estimatedOffsetMs: number;
  mimeType: string;
  recorderStartEventDelayMs: number | null;
  takeDurationSeconds: number | null;
};

export default function VoiceTakeRecorder({
  project,
  backingTakes,
  onSaved,
}: {
  project: VoiceRehearsalProject;
  backingTakes: VoiceRehearsalTake[];
  onSaved: () => void;
}) {
  const [mode, setModeState] = useState<RecorderMode>('ready');
  const modeRef = useRef<RecorderMode>('ready');
  const [partLabel, setPartLabel] = useState('Soprano');
  const [countInEnabled, setCountInEnabled] = useState(true);
  const [backingEnabled, setBackingEnabled] = useState(true);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [countdownDisplay, setCountdownDisplay] = useState<'3' | '2' | '1' | 'GO' | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [take, setTake] = useState<LocalTake | null>(null);
  const takeRef = useRef<LocalTake | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [preparationStatus, setPreparationStatus] = useState('');
  const [diagnostics, setDiagnostics] = useState<CaptureDiagnostics | null>(null);
  const [diagnosticsCopyStatus, setDiagnosticsCopyStatus] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const clickNodesRef = useRef<Set<OscillatorNode>>(new Set());
  const backingBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const backingSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const backingGainRef = useRef<GainNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const latencyOffsetMsRef = useRef(0);
  const countInTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const maxLengthTimerRef = useRef<number | null>(null);
  const metronomeTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const captureRequestRef = useRef(0);
  const recorderStartRequestedAtRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  function setMode(next: RecorderMode) {
    modeRef.current = next;
    if (mountedRef.current) setModeState(next);
  }

  function clearTimers() {
    if (countInTimerRef.current !== null) window.clearTimeout(countInTimerRef.current);
    if (elapsedTimerRef.current !== null) window.clearInterval(elapsedTimerRef.current);
    if (maxLengthTimerRef.current !== null) window.clearTimeout(maxLengthTimerRef.current);
    if (metronomeTimerRef.current !== null) window.clearInterval(metronomeTimerRef.current);
    countInTimerRef.current = null;
    elapsedTimerRef.current = null;
    maxLengthTimerRef.current = null;
    metronomeTimerRef.current = null;
  }

  function releaseAudio() {
    stopBackingPlayback();
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    streamRef.current?.getTracks().forEach((trackItem) => trackItem.stop());
    streamRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    for (const node of clickNodesRef.current) {
      try { node.stop(); } catch { /* The click may already have ended. */ }
    }
    clickNodesRef.current.clear();
    contextRef.current = null;
    analyserRef.current = null;
    if (mountedRef.current) setLevel(0);
  }

  function stopBackingPlayback() {
    for (const source of backingSourcesRef.current) {
      source.onended = null;
      try { source.stop(); } catch { /* The source may already have ended. */ }
      source.disconnect();
    }
    backingSourcesRef.current = [];
    backingGainRef.current?.disconnect();
    backingGainRef.current = null;
  }

  function startBackingPlayback(context: AudioContext) {
    if (!backingEnabled || backingTakes.length === 0) return;
    stopBackingPlayback();
    try {
      const offsets = backingTakes.map((item) => item.offset_ms / 1000);
      const earliestOffset = Math.min(0, ...offsets);
      const commonOrigin = context.currentTime + 0.02 - earliestOffset;
      const gain = context.createGain();
      gain.gain.setValueAtTime(1, context.currentTime);
      gain.connect(context.destination);
      backingGainRef.current = gain;

      for (const backingTake of backingTakes) {
        const buffer = backingBuffersRef.current.get(backingTake.id);
        if (!buffer) continue;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);
        source.onended = () => {
          source.disconnect();
          backingSourcesRef.current = backingSourcesRef.current.filter((activeSource) => activeSource !== source);
          if (backingSourcesRef.current.length === 0) {
            backingGainRef.current?.disconnect();
            backingGainRef.current = null;
          }
        };
        backingSourcesRef.current.push(source);
        source.start(commonOrigin + backingTake.offset_ms / 1000);
      }
    } catch {
      stopBackingPlayback();
      setNotice('The recording started, but the backing parts could not play.');
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden' && modeRef.current === 'recording') {
        setNotice('Recording stopped because this tab moved to the background. Preview or retry the saved local take below.');
        stopCapture();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimers();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try { recorder.stop(); } catch { /* The stream is released below. */ }
      }
      releaseAudio();
      if (takeRef.current) URL.revokeObjectURL(takeRef.current.url);
    };
  }, []);

  function scheduleClick(context: AudioContext, at: number, accented: boolean) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(accented ? 1180 : 820, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(accented ? 0.22 : 0.13, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.075);
    oscillator.connect(gain);
    gain.connect(context.destination);
    clickNodesRef.current.add(oscillator);
    oscillator.onended = () => clickNodesRef.current.delete(oscillator);
    oscillator.start(at);
    oscillator.stop(at + 0.08);
  }

  function startMeter(analyser: AnalyserNode) {
    const samples = new Uint8Array(analyser.fftSize);
    const measure = () => {
      analyser.getByteTimeDomainData(samples);
      let total = 0;
      for (const sample of samples) {
        const normalized = (sample - 128) / 128;
        total += normalized * normalized;
      }
      const rms = Math.sqrt(total / samples.length);
      setLevel(Math.min(1, rms * 4));
      animationFrameRef.current = requestAnimationFrame(measure);
    };
    animationFrameRef.current = requestAnimationFrame(measure);
  }

  function stopCapture() {
    clearTimers();
    setCountdownDisplay(null);
    if (modeRef.current === 'preparing') {
      captureRequestRef.current += 1;
      releaseAudio();
      setPreparationStatus('');
      setMode('ready');
      return;
    }
    const recorder = recorderRef.current;
    if (modeRef.current === 'counting-in') {
      recorderRef.current = null;
      releaseAudio();
      setMode('ready');
      setCountdownDisplay(null);
      setElapsed(0);
      return;
    }
    if (recorder && recorder.state === 'recording') {
      setMode('stopping');
      try { recorder.stop(); } catch { releaseAudio(); setMode('ready'); }
    }
  }

  function beginRecording(recorder: MediaRecorder, beatMilliseconds: number | null) {
    if (modeRef.current !== 'counting-in' && modeRef.current !== 'ready' && modeRef.current !== 'preparing') return;
    try {
      recorderStartRequestedAtRef.current = performance.now();
      recorder.start(1000);
      startedAtRef.current = Date.now();
      setElapsed(0);
      setNotice('');
      setMode('recording');
      if (contextRef.current) startBackingPlayback(contextRef.current);
      elapsedTimerRef.current = window.setInterval(() => {
        const seconds = Math.min(MAX_TAKE_SECONDS, (Date.now() - startedAtRef.current) / 1000);
        setElapsed(seconds);
        if (seconds >= MAX_TAKE_SECONDS) {
          setNotice('The 10-minute take limit was reached. Review the saved take below.');
          stopCapture();
        }
      }, 200);
      maxLengthTimerRef.current = window.setTimeout(() => {
        setNotice('The 10-minute take limit was reached. Review the saved take below.');
        stopCapture();
      }, MAX_TAKE_SECONDS * 1000);
      if (metronomeEnabled && beatMilliseconds && contextRef.current) {
        metronomeTimerRef.current = window.setInterval(
          () => scheduleClick(contextRef.current!, contextRef.current!.currentTime, false),
          beatMilliseconds,
        );
      }
    } catch {
      setError('Recording could not start on this browser. Try refreshing the page or using a different browser.');
      clearTimers();
      releaseAudio();
      setMode('ready');
    }
  }

  async function startCapture() {
    setError('');
    setUploadError('');
    setNotice('');
    setDiagnostics(null);
    setDiagnosticsCopyStatus('');
    if (!partLabel.trim()) {
      setError('Enter a name for this voice part.');
      return;
    }
    if (!window.isSecureContext) {
      setError('Microphone access requires a secure HTTPS connection.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('This browser does not support microphone recording. Try the latest Safari, Chrome, or Firefox.');
      return;
    }

    const supportedMimeType = ['audio/webm;codecs=opus', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
    if (!supportedMimeType) {
      setError('This browser does not support WebM/Opus or MP4 audio recording.');
      return;
    }

    const requestId = ++captureRequestRef.current;
    stopActiveVoiceMix();
    backingBuffersRef.current.clear();
    setMode('preparing');
    setPreparationStatus('Requesting microphone access…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 1 },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      if (requestId !== captureRequestRef.current) {
        stream.getTracks().forEach((trackItem) => trackItem.stop());
        return;
      }
      streamRef.current = stream;

      const context = getSharedVoiceAudioContext();
      contextRef.current = context;
      await context.resume();
      if (requestId !== captureRequestRef.current) {
        releaseAudio();
        return;
      }
      if (backingEnabled && backingTakes.length > 0) {
        setPreparationStatus(`Preparing ${backingTakes.length} backing part${backingTakes.length === 1 ? '' : 's'}…`);
        await Promise.all(backingTakes.map(async (backingTake) => {
          const buffer = await getDecodedVoiceTake(backingTake, context);
          backingBuffersRef.current.set(backingTake.id, buffer);
        }));
        if (requestId !== captureRequestRef.current) {
          releaseAudio();
          return;
        }
      }
      setPreparationStatus('Starting recorder…');
      const source = context.createMediaStreamSource(stream);
      sourceRef.current = source;
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      startMeter(analyser);
      const outputLatency = (context as AudioContext & { outputLatency?: number }).outputLatency ?? 0;
      const inputSettings = stream.getAudioTracks()[0]?.getSettings();
      const reportedInputLatency = (inputSettings as (MediaTrackSettings & { latency?: number }) | undefined)?.latency;
      const inputLatency = typeof reportedInputLatency === 'number' ? reportedInputLatency : 0;
      latencyOffsetMsRef.current = Math.max(-5000, Math.min(0, -Math.round((context.baseLatency + outputLatency + inputLatency) * 1000)));

      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
        audioBitsPerSecond: 64_000,
      });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstart = () => {
        const requestedAt = recorderStartRequestedAtRef.current;
        if (requestedAt === null || !mountedRef.current) return;
        const eventDelayMs = Math.round((performance.now() - requestedAt) * 10) / 10;
        setDiagnostics((current) => current ? { ...current, recorderStartEventDelayMs: eventDelayMs } : current);
      };
      recorder.onerror = () => {
        setError('The browser encountered an audio recording problem. Any audio already captured is being kept for preview.');
      };
      recorder.onstop = () => {
        const durationSeconds = startedAtRef.current
          ? Math.min(MAX_TAKE_SECONDS, (Date.now() - startedAtRef.current) / 1000)
          : 0;
        if (mountedRef.current) {
          setDiagnostics((current) => current ? { ...current, takeDurationSeconds: Math.round(durationSeconds * 1000) / 1000 } : current);
        }
        const mimeType = (recorder.mimeType || supportedMimeType).split(';', 1)[0].toLowerCase();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        clearTimers();
        releaseAudio();
        recorderRef.current = null;
        if (blob.size > 0 && durationSeconds > 0) {
          if (!mountedRef.current) return;
          const nextTake = {
            blob,
            url: URL.createObjectURL(blob),
            durationSeconds,
            mimeType,
            offsetMs: latencyOffsetMsRef.current,
          };
          if (takeRef.current) URL.revokeObjectURL(takeRef.current.url);
          takeRef.current = nextTake;
          if (mountedRef.current) {
            setTake(nextTake);
            setElapsed(durationSeconds);
            setMode('review');
          }
        } else if (mountedRef.current) {
          setMode('ready');
        }
      };

      setDiagnostics({
        capturedAt: new Date().toISOString(),
        browser: navigator.userAgent,
        partLabel: partLabel.trim(),
        backingParts: backingEnabled ? backingTakes.map((item) => item.part_label) : [],
        inputSampleRate: inputSettings?.sampleRate ?? null,
        inputLatencyMs: typeof reportedInputLatency === 'number' ? Math.round(reportedInputLatency * 1000 * 10) / 10 : null,
        inputChannels: inputSettings?.channelCount ?? null,
        echoCancellation: inputSettings?.echoCancellation ?? null,
        noiseSuppression: inputSettings?.noiseSuppression ?? null,
        autoGainControl: inputSettings?.autoGainControl ?? null,
        contextSampleRate: context.sampleRate,
        baseLatencyMs: Number.isFinite(context.baseLatency) ? Math.round(context.baseLatency * 1000 * 10) / 10 : null,
        outputLatencyMs: Number.isFinite(outputLatency) ? Math.round(outputLatency * 1000 * 10) / 10 : null,
        estimatedOffsetMs: latencyOffsetMsRef.current,
        mimeType: recorder.mimeType || supportedMimeType,
        recorderStartEventDelayMs: null,
        takeDurationSeconds: null,
      });

      setPreparationStatus('');
      const beatMilliseconds = 60_000 / (project.bpm ?? 120);
      if (countInEnabled) {
        setMode('counting-in');
        const showCount = (step: number) => {
          if (modeRef.current !== 'counting-in') return;
          if (step < 3) {
            setCountdownDisplay(String(3 - step) as '3' | '2' | '1');
            scheduleClick(context, context.currentTime + 0.01, step === 0);
            countInTimerRef.current = window.setTimeout(() => showCount(step + 1), COUNT_IN_INTERVAL_MS);
            return;
          }
          setCountdownDisplay('GO');
          scheduleClick(context, context.currentTime + 0.01, true);
          beginRecording(recorder, beatMilliseconds);
          countInTimerRef.current = window.setTimeout(() => setCountdownDisplay(null), 900);
        };
        showCount(0);
      } else {
        setCountdownDisplay(null);
        beginRecording(recorder, beatMilliseconds);
      }
    } catch (cause) {
      if (requestId !== captureRequestRef.current) return;
      releaseAudio();
      recorderRef.current = null;
      setMode('ready');
      setPreparationStatus('');
      setCountdownDisplay(null);
      const name = cause instanceof DOMException ? cause.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('Microphone access was denied. Allow microphone access in this site’s browser settings, then try again.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No microphone was found. Connect a microphone and try again.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setError('The microphone is unavailable. Close other apps using it and try again.');
      } else {
        setError(cause instanceof Error ? cause.message : 'The microphone could not be started. Check browser permissions and try again.');
      }
    }
  }

  function discardTake() {
    if (takeRef.current) URL.revokeObjectURL(takeRef.current.url);
    takeRef.current = null;
    setTake(null);
    setElapsed(0);
    setUploadError('');
    setNotice('');
    setPreparationStatus('');
    setMode('ready');
  }

  async function saveTake() {
    if (!takeRef.current) return;
    setMode('uploading');
    setUploadError('');
    const extension = takeRef.current.mimeType === 'audio/mp4' ? 'mp4' : 'webm';
    const audioFile = new File([takeRef.current.blob], `voice-part.${extension}`, { type: takeRef.current.mimeType });
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('partLabel', partLabel.trim());
    formData.append('durationSeconds', String(takeRef.current.durationSeconds));
    formData.append('offsetMs', String(takeRef.current.offsetMs));

    try {
      const response = await fetch(`/api/voice-rehearsal/projects/${project.id}/takes`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'The recording could not be saved.');
      discardTake();
      onSaved();
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : 'The recording could not be saved. Your local copy is still available to retry.');
      setMode('review');
    }
  }

  async function copyDiagnostics() {
    if (!diagnostics) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      setDiagnosticsCopyStatus('Timing report copied. Paste it into the chat.');
    } catch {
      setDiagnosticsCopyStatus('Copy was blocked. Open the details to inspect the readings.');
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="border-l-2 border-amber-500 bg-amber-50 px-3 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-semibold">Use headphones while recording.</p>
        <p className="mt-1">The recording is stored in AltarSing and can be heard by anyone who can access this site.</p>
        <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">Bluetooth headphones can add timing delay; wired headphones are more reliable. Recording needs microphone permission over HTTPS.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-end">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Voice part
          <input list="voice-part-labels" value={partLabel} onChange={(event) => setPartLabel(event.target.value)} disabled={mode !== 'ready' && mode !== 'review'} className="field-control mt-1" placeholder="e.g. Soprano or Lead" />
          <datalist id="voice-part-labels">
            <option value="Soprano" /><option value="Alto" /><option value="Tenor" /><option value="Bass" /><option value="Lead" /><option value="Beatbox" />
          </datalist>
        </label>
        <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">Tempo</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">{project.bpm ? `${project.bpm} BPM` : 'Not set'}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={countInEnabled} onChange={(event) => setCountInEnabled(event.target.checked)} disabled={mode !== 'ready'} className="accent-violet-800" />
          3, 2, 1, GO count-in · 1 second per count
        </label>
        {backingTakes.length > 0 && (
          <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={backingEnabled} onChange={(event) => setBackingEnabled(event.target.checked)} disabled={mode !== 'ready'} className="accent-violet-800" />
            Play existing parts while recording
          </label>
        )}
        <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={metronomeEnabled} onChange={(event) => setMetronomeEnabled(event.target.checked)} disabled={mode !== 'ready'} className="accent-violet-800" />
          Click during recording
        </label>
      </div>

      {mode === 'preparing' && (
        <div role="status" className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
          <span className="text-slate-700 dark:text-slate-200">{preparationStatus || 'Preparing recording…'}</span>
          <button type="button" onClick={stopCapture} className="button-secondary">Cancel</button>
        </div>
      )}

      {(mode === 'recording' || mode === 'stopping' || mode === 'counting-in') && (
        <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className={`h-2.5 w-2.5 rounded-full ${mode === 'recording' ? 'animate-pulse bg-red-600' : 'bg-amber-500'}`} />
              {mode === 'counting-in' ? 'Get ready' : mode === 'stopping' ? 'Finalizing take…' : 'Recording'}
            </div>
            <span className="font-mono text-lg tabular-nums text-slate-900 dark:text-white">{formatDuration(elapsed)} <span className="text-sm text-slate-500">/ 10:00</span></span>
          </div>
          {countdownDisplay && (
            <div role="status" aria-live="assertive" className="mt-4 flex h-28 items-center justify-center rounded-md bg-slate-50 dark:bg-slate-900">
              <span className={`font-serif text-6xl font-bold tabular-nums ${countdownDisplay === 'GO' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>{countdownDisplay}</span>
            </div>
          )}
          <div role="meter" aria-label="Microphone input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full bg-emerald-600 transition-[width] duration-75 dark:bg-emerald-400" style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Input level · max take length 10:00</p>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="border-l-2 border-amber-500 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">{notice}</p>}

      {diagnostics && (
        <details className="border-y border-slate-200 py-3 dark:border-slate-800">
          <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-200">Audio timing diagnostics</summary>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">These are browser and device readings to help diagnose timing. The estimated playback adjustment is not a measurement of how the singing aligns.</p>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
            <DiagnosticReading label="Microphone-reported latency" value={formatMilliseconds(diagnostics.inputLatencyMs)} />
            <DiagnosticReading label="Audio output latency" value={formatMilliseconds(diagnostics.outputLatencyMs)} />
            <DiagnosticReading label="Audio context base latency" value={formatMilliseconds(diagnostics.baseLatencyMs)} />
            <DiagnosticReading label="Saved playback adjustment" value={formatSignedMilliseconds(diagnostics.estimatedOffsetMs)} />
            <DiagnosticReading label="Input sample rate" value={diagnostics.inputSampleRate ? `${diagnostics.inputSampleRate} Hz` : 'Not reported'} />
            <DiagnosticReading label="Audio context sample rate" value={`${diagnostics.contextSampleRate} Hz`} />
            <DiagnosticReading label="Recorder start event delay" value={diagnostics.recorderStartEventDelayMs === null ? 'Waiting for start' : `${diagnostics.recorderStartEventDelayMs.toFixed(1)} ms`} />
            <DiagnosticReading label="Take duration" value={diagnostics.takeDurationSeconds === null ? 'Recording' : formatDuration(diagnostics.takeDurationSeconds)} />
          </dl>
          <p className="mt-2 break-all text-[11px] text-slate-500 dark:text-slate-400">{diagnostics.browser}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={copyDiagnostics} className="button-secondary">Copy timing report</button>
            {diagnosticsCopyStatus && <span role="status" className="text-xs text-slate-500 dark:text-slate-400">{diagnosticsCopyStatus}</span>}
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">The start event delay measures when the browser delivered its event, not the exact first recorded audio sample.</p>
        </details>
      )}

      {mode === 'ready' && (
        <button type="button" onClick={startCapture} disabled={!partLabel.trim()} className="button-primary min-w-40">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />Start recording
        </button>
      )}
      {mode === 'counting-in' && (
        <button type="button" onClick={stopCapture} className="button-secondary">Cancel count-in</button>
      )}
      {mode === 'recording' && (
        <button type="button" onClick={stopCapture} className="button-secondary min-w-36"><span className="h-3 w-3 bg-red-600" />Stop recording</button>
      )}

      {(mode === 'review' || mode === 'uploading') && take && (
        <div className="border-y border-slate-200 py-4 dark:border-slate-800">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div><h3 className="font-medium text-slate-900 dark:text-slate-100">Preview {partLabel}</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatDuration(take.durationSeconds)} · estimated playback adjustment {formatSignedMilliseconds(take.offsetMs)} · not uploaded yet</p></div>
          </div>
          <audio controls preload="metadata" src={take.url} className="h-10 w-full" />
          {uploadError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{uploadError} Your take is still on this device; you can retry the upload.</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={discardTake} disabled={mode === 'uploading'} className="button-secondary">Discard</button>
            <button type="button" onClick={discardTake} disabled={mode === 'uploading'} className="button-quiet">Re-record</button>
            <button type="button" onClick={saveTake} disabled={mode === 'uploading' || !partLabel.trim()} className="button-primary min-w-32">{mode === 'uploading' ? 'Uploading…' : 'Save take'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function formatMilliseconds(value: number | null) {
  return value === null ? 'Not reported' : `${value.toFixed(1)} ms`;
}

function formatSignedMilliseconds(value: number) {
  return `${value > 0 ? '+' : ''}${value} ms`;
}

function DiagnosticReading({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1 dark:border-slate-800">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-mono tabular-nums text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}
