'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import type { VoiceRehearsalTake } from '@/types/voice-rehearsal';
import {
  getDecodedVoiceTake,
  getSharedVoiceAudioContext,
  registerVoiceMixStopper,
  unregisterVoiceMixStopper,
} from './VoiceAudioEngine';

export default function VoiceTakeMixer({ takes }: { takes: VoiceRehearsalTake[] }) {
  const decodedBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const playRequestRef = useRef(0);
  const stopHandlerRef = useRef<(() => void) | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');

  function stopPlayback() {
    playRequestRef.current += 1;
    if (stopHandlerRef.current) unregisterVoiceMixStopper(stopHandlerRef.current);
    stopHandlerRef.current = null;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    for (const source of sourcesRef.current) {
      try { source.stop(); } catch { /* The source may already have ended. */ }
      source.disconnect();
    }
    sourcesRef.current = [];
    masterGainRef.current?.disconnect();
    masterGainRef.current = null;
    setLoading(false);
    setPlaying(false);
    setPosition(0);
  }

  useEffect(() => () => {
    if (stopHandlerRef.current) unregisterVoiceMixStopper(stopHandlerRef.current);
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    for (const source of sourcesRef.current) {
      try { source.stop(); } catch { /* The source may already have ended. */ }
      source.disconnect();
    }
    masterGainRef.current?.disconnect();
    masterGainRef.current = null;
  }, []);

  async function getBuffers(context: AudioContext) {
    const missingTakes = takes.filter((take) => !decodedBuffersRef.current.has(take.id));
    await Promise.all(missingTakes.map(async (take) => {
      const decoded = await getDecodedVoiceTake(take, context);
      decodedBuffersRef.current.set(take.id, decoded);
      setLoadedCount(takes.filter((item) => decodedBuffersRef.current.has(item.id)).length);
    }));
    setLoadedCount(takes.filter((take) => decodedBuffersRef.current.has(take.id)).length);
    return decodedBuffersRef.current;
  }

  async function playAll() {
    setError('');
    stopPlayback();
    const requestId = playRequestRef.current;
    const stopHandler = () => stopPlayback();
    stopHandlerRef.current = stopHandler;
    registerVoiceMixStopper(stopHandler);
    setLoading(true);
    try {
      const context = getSharedVoiceAudioContext();
      await context.resume();
      const buffers = await getBuffers(context);
      if (requestId !== playRequestRef.current) return;
      if (takes.length === 0) return;

      const takeOffsets = takes.map((take) => take.offset_ms / 1000);
      const earliestOffset = Math.min(0, ...takeOffsets);
      const commonOrigin = context.currentTime + 0.15 - earliestOffset;
      const playbackStartAt = commonOrigin + earliestOffset;
      const master = context.createGain();
      master.gain.setValueAtTime(1, playbackStartAt);
      master.connect(context.destination);
      masterGainRef.current = master;
      let endTime = Number.NEGATIVE_INFINITY;
      let totalDuration = 0;
      const sources: AudioBufferSourceNode[] = [];
      sourcesRef.current = sources;

      for (const take of takes) {
        const buffer = buffers.get(take.id);
        if (!buffer) continue;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(master);
        const correctionSeconds = take.offset_ms / 1000;
        const scheduledStart = commonOrigin + correctionSeconds;
        endTime = Math.max(endTime, correctionSeconds + buffer.duration);
        source.onended = () => {
          if (!sourcesRef.current.includes(source)) return;
          source.disconnect();
          sourcesRef.current = sourcesRef.current.filter((activeSource) => activeSource !== source);
          if (sourcesRef.current.length === 0) {
            masterGainRef.current?.disconnect();
            masterGainRef.current = null;
            if (timerRef.current !== null) window.clearInterval(timerRef.current);
            timerRef.current = null;
            if (stopHandlerRef.current) unregisterVoiceMixStopper(stopHandlerRef.current);
            stopHandlerRef.current = null;
            setPlaying(false);
            setPosition(totalDuration);
          }
        };
        sources.push(source);
        source.start(scheduledStart);
      }

      if (sources.length === 0) throw new Error('There are no playable parts in this project.');
      totalDuration = Math.max(0, endTime - earliestOffset);
      setDuration(totalDuration);
      setPosition(0);
      setPlaying(true);
      timerRef.current = window.setInterval(() => {
        setPosition(Math.min(totalDuration, Math.max(0, context.currentTime - playbackStartAt)));
      }, 100);
    } catch (cause) {
      if (requestId === playRequestRef.current) {
        stopPlayback();
        setError(cause instanceof Error ? cause.message : 'The parts could not be mixed in this browser.');
      }
    } finally {
      if (requestId === playRequestRef.current) setLoading(false);
    }
  }

  if (takes.length === 0) return null;

  return (
    <section aria-labelledby="mixer-heading" className="mb-8 border-y border-slate-200 py-4 dark:border-slate-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="mixer-heading" className="font-serif text-lg font-semibold text-slate-950 dark:text-white">Listen to all parts</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Parts are decoded in your browser and scheduled together.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={playAll} disabled={loading || playing} className="button-primary">
            <Icon name="play" size={16} />{loading ? 'Loading parts…' : 'Play all'}
          </button>
          <button type="button" onClick={stopPlayback} disabled={!playing} className="button-secondary">
            <span className="h-3 w-3 bg-slate-500" />Stop
          </button>
        </div>
      </div>
      {(loading || loadedCount > 0) && (
        <p role="status" className="mt-3 text-xs text-slate-500 dark:text-slate-400">{loading ? `Preparing ${takes.length} parts…` : `${loadedCount} part${loadedCount === 1 ? '' : 's'} decoded and cached for this session`}</p>
      )}
      {duration > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <span className="font-mono text-xs tabular-nums text-slate-500">{formatDuration(position)}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-label="Mix playback progress" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(position)}>
            <div className="h-full bg-violet-700 transition-[width] dark:bg-violet-300" style={{ width: `${Math.min(100, (position / duration) * 100)}%` }} />
          </div>
          <span className="font-mono text-xs tabular-nums text-slate-500">{formatDuration(duration)}</span>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    </section>
  );
}

function formatDuration(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}
