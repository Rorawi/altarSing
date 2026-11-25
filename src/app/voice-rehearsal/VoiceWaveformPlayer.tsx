'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import Icon from '@/components/Icon';
import { decodeVoiceTakeForWaveform } from './VoiceAudioEngine';
import VoiceWaveformSeek from './VoiceWaveformSeek';

const WAVEFORM_BARS = 76;

export default function VoiceWaveformPlayer({
  takeId,
  src,
  waveformSrc,
  durationSeconds,
  label,
  diagnosticUrl,
  audioRef,
}: {
  takeId?: string;
  src: string;
  waveformSrc: string;
  durationSeconds: number;
  label: string;
  diagnosticUrl?: string;
  audioRef?: RefObject<HTMLAudioElement | null>;
}) {
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const playerRef = audioRef ?? localAudioRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadWaveform() {
      try {
        const response = await fetch(waveformSrc, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) {
          const result = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(result?.error ?? 'The recording waveform could not be loaded.');
        }
        const decoded = await decodeVoiceTakeForWaveform(takeId ?? waveformSrc, await response.arrayBuffer());
        const channelCount = decoded.numberOfChannels;
        const frameCount = decoded.length;
        const stride = Math.max(1, Math.floor(frameCount / WAVEFORM_BARS));
        const rawPeaks = Array.from({ length: WAVEFORM_BARS }, (_, bar) => {
          const start = bar * stride;
          const end = Math.min(frameCount, start + stride);
          let peak = 0;
          for (let channel = 0; channel < channelCount; channel += 1) {
            const samples = decoded.getChannelData(channel);
            for (let frame = start; frame < end; frame += 1) peak = Math.max(peak, Math.abs(samples[frame]));
          }
          return peak;
        });
        const maximum = Math.max(...rawPeaks, 0.001);
        if (active) setPeaks(rawPeaks.map((peak) => Math.max(0.08, peak / maximum)));
      } catch (cause) {
        if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return;
        setError(cause instanceof Error ? cause.message : 'The recording waveform could not be loaded.');
      }
    }

    const element = containerRef.current;
    if (element && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void loadWaveform();
        }
      }, { rootMargin: '120px' });
      observer.observe(element);
      return () => { active = false; controller.abort(); observer.disconnect(); };
    }
    void loadWaveform();
    return () => { active = false; controller.abort(); };
  }, [takeId, waveformSrc]);

  function syncAudioState() {
    const audio = playerRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime || 0);
    setPlaying(!audio.paused && !audio.ended);
  }

  async function explainPlaybackFailure(cause?: unknown) {
    const failureName = typeof cause === 'object' && cause !== null && 'name' in cause && typeof cause.name === 'string'
      ? cause.name
      : '';
    if (failureName === 'NotAllowedError') {
      setError('Playback needs a direct tap to start. Press the play button again.');
      return;
    }

    if (diagnosticUrl) {
      try {
        const response = await fetch(diagnosticUrl, { cache: 'no-store' });
        const result = await response.json() as { error?: string };
        if (!response.ok && result.error) {
          setError(result.error);
          return;
        }
      } catch {
        // Show the media error below if the diagnostic request is unavailable.
      }
    }

    const mediaCode = playerRef.current?.error?.code;
    setError(mediaCode === 3
      ? 'This browser could not decode the recording. Try another browser or device.'
      : mediaCode === 4
        ? 'This browser does not support this recording format.'
        : mediaCode === 2
          ? 'The recording could not be downloaded. Check your connection and try again.'
          : 'The recording could not start. Press play to try again.');
  }

  function togglePlayback() {
    const audio = playerRef.current;
    if (!audio) return;
    setError('');
    if (!audio.paused) {
      audio.pause();
      return;
    }
    setBusy(true);
    // Call play directly inside the click handler so browsers retain the user's gesture.
    void audio.play().then(() => setBusy(false)).catch((cause: unknown) => {
      setBusy(false);
      void explainPlaybackFailure(cause);
    });
  }

  function seekTo(seconds: number) {
    const audio = playerRef.current;
    if (!audio) return;
    const nextTime = Math.max(0, Math.min(durationSeconds, seconds));
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  const fallbackPeaks = peaks.length > 0 ? peaks : Array.from({ length: WAVEFORM_BARS }, (_, index) => {
    const center = (WAVEFORM_BARS - 1) / 2;
    const envelope = 0.3 + 0.7 * Math.sin(Math.PI * (index + 1) / (WAVEFORM_BARS + 2));
    return envelope * (0.26 + 0.54 * Math.abs(Math.sin(index * 2.17 + Math.cos(index * 0.41)))) * (index === Math.round(center) ? 0.95 : 1);
  });

  return (
    <div ref={containerRef} className="min-w-0 flex-1" aria-label={`${label} audio waveform player`}>
      <audio
        ref={playerRef}
        src={src}
        preload="none"
        className="hidden"
        onTimeUpdate={syncAudioState}
        onPlay={syncAudioState}
        onPause={syncAudioState}
        onEnded={syncAudioState}
        onError={() => { setBusy(false); void explainPlaybackFailure(playerRef.current?.error); }}
      />
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={togglePlayback} className="icon-button h-10 w-10 shrink-0 border border-slate-300 dark:border-slate-700" aria-label={playing ? `Pause ${label}` : `Play ${label}`}>
          <Icon name={playing ? 'pause' : 'play'} size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <VoiceWaveformSeek
            peaks={fallbackPeaks}
            position={currentTime}
            duration={durationSeconds}
            label={label}
            onSeek={seekTo}
            progressClassName="bg-violet-700 dark:bg-violet-300"
            faded={peaks.length === 0}
          />
        </div>
        <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">{formatDuration(playing || currentTime > 0 ? currentTime : durationSeconds)}</span>
      </div>
      {busy && <p role="status" className="mt-1 text-xs text-slate-500 dark:text-slate-400">Starting playback…</p>}
      {error && <p role="alert" className="mt-1 text-xs text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
