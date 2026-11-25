'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import type { VoiceRehearsalTake } from '@/types/voice-rehearsal';
import VoiceWaveformSeek from './VoiceWaveformSeek';
import {
  activateVoiceAudioFromGesture,
  getDecodedVoiceTake,
  getSharedVoiceAudioContext,
  registerVoiceMixStopper,
  unregisterVoiceMixStopper,
} from './VoiceAudioEngine';

const MIX_WAVEFORM_BARS = 84;
const AUDIO_RESUME_TIMEOUT_MS = 2500;

export default function VoiceTakeMixer({ takes }: { takes: VoiceRehearsalTake[] }) {
  const decodedBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const playRequestRef = useRef(0);
  const stopHandlerRef = useRef<(() => void) | null>(null);
  const releaseActivationRef = useRef<(() => void) | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [error, setError] = useState('');
  const playbackStartAtRef = useRef(0);
  const playbackBasePositionRef = useRef(0);
  const totalDurationRef = useRef(0);
  const earliestOffsetRef = useRef(0);

  function clearScheduledPlayback() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    for (const source of sourcesRef.current) {
      try { source.stop(); } catch { /* The source may already have ended. */ }
      source.disconnect();
    }
    sourcesRef.current = [];
    masterGainRef.current?.disconnect();
    masterGainRef.current = null;
  }

  function stopPlayback() {
    playRequestRef.current += 1;
    releaseActivationRef.current?.();
    releaseActivationRef.current = null;
    if (stopHandlerRef.current) unregisterVoiceMixStopper(stopHandlerRef.current);
    stopHandlerRef.current = null;
    clearScheduledPlayback();
    setLoading(false);
    setPlaying(false);
    setPosition(0);
  }

  useEffect(() => () => {
    releaseActivationRef.current?.();
    releaseActivationRef.current = null;
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

  async function waitForAudioContext(context: AudioContext, resumePromise: Promise<void>) {
    let timeoutId: number | null = null;
    try {
      await Promise.race([
        resumePromise,
        new Promise<void>((_, reject) => {
          timeoutId = window.setTimeout(() => reject(new Error('The audio engine did not start. Tap Play all to try again. If this iPhone app was reopened from the background, close and reopen it.')), AUDIO_RESUME_TIMEOUT_MS);
        }),
      ]);
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    }
    if (context.state !== 'running') {
      throw new Error('The audio engine is still paused. Tap Play all to try again.');
    }
  }

  function createWaveform(buffers: Map<string, AudioBuffer>, earliestOffset: number, totalDuration: number) {
    const takesWithBuffers = takes.flatMap((take) => {
      const buffer = buffers.get(take.id);
      return buffer ? [{ buffer, start: take.offset_ms / 1000 - earliestOffset }] : [];
    });
    const rawPeaks = Array.from({ length: MIX_WAVEFORM_BARS }, (_, bar) => {
      const barStart = (bar / MIX_WAVEFORM_BARS) * totalDuration;
      const barEnd = ((bar + 1) / MIX_WAVEFORM_BARS) * totalDuration;
      let peak = 0;
      for (const { buffer, start } of takesWithBuffers) {
        const overlapStart = Math.max(barStart, start);
        const overlapEnd = Math.min(barEnd, start + buffer.duration);
        if (overlapEnd <= overlapStart) continue;
        const sampleCount = 24;
        for (let sample = 0; sample < sampleCount; sample += 1) {
          const timelineTime = overlapStart + ((sample + 0.5) / sampleCount) * (overlapEnd - overlapStart);
          const frame = Math.min(buffer.length - 1, Math.max(0, Math.floor((timelineTime - start) * buffer.sampleRate)));
          for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
            peak = Math.max(peak, Math.abs(buffer.getChannelData(channel)[frame]));
          }
        }
      }
      return peak;
    });
    const maximum = Math.max(...rawPeaks, 0.001);
    return rawPeaks.map((peak) => Math.max(0.08, peak / maximum));
  }

  function startSourcesAt(context: AudioContext, startPosition: number, totalDuration: number) {
    clearScheduledPlayback();
    const playbackStartAt = context.currentTime + 0.15;
    const sources: AudioBufferSourceNode[] = [];
    const master = context.createGain();
    master.gain.setValueAtTime(1, context.currentTime);
    master.connect(context.destination);
    masterGainRef.current = master;
    sourcesRef.current = sources;
    playbackStartAtRef.current = playbackStartAt;
    playbackBasePositionRef.current = startPosition;
    totalDurationRef.current = totalDuration;

    for (const take of takes) {
      const buffer = decodedBuffersRef.current.get(take.id);
      if (!buffer) continue;
      const takeStart = take.offset_ms / 1000 - earliestOffsetRef.current;
      const takeEnd = takeStart + buffer.duration;
      if (takeEnd <= startPosition) continue;

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(master);
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
          setPosition(totalDurationRef.current);
        }
      };
      sources.push(source);
      const startTime = playbackStartAt + Math.max(0, takeStart - startPosition);
      const offsetWithinTake = Math.max(0, startPosition - takeStart);
      source.start(startTime, offsetWithinTake);
    }

    if (sources.length === 0) {
      master.disconnect();
      masterGainRef.current = null;
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
      if (stopHandlerRef.current) unregisterVoiceMixStopper(stopHandlerRef.current);
      stopHandlerRef.current = null;
      setPlaying(false);
      setPosition(totalDuration);
      return;
    }

    setPlaying(true);
    timerRef.current = window.setInterval(() => {
      const nextPosition = playbackBasePositionRef.current + context.currentTime - playbackStartAtRef.current;
      setPosition(Math.min(totalDurationRef.current, Math.max(0, nextPosition)));
    }, 80);
  }

  async function playAll() {
    const requestedStart = duration > 0 && position < duration ? position : 0;
    setError('');
    stopPlayback();
    const requestId = playRequestRef.current;
    const stopHandler = () => stopPlayback();
    stopHandlerRef.current = stopHandler;
    registerVoiceMixStopper(stopHandler);
    setLoading(true);
    try {
      const context = getSharedVoiceAudioContext();
      // Unlock Web Audio in the tap and keep its silent source alive while
      // missing takes download/decode. This prevents iOS PWAs from pausing the
      // output between the gesture and the first scheduled voice source.
      const activation = activateVoiceAudioFromGesture(context);
      releaseActivationRef.current = activation.release;
      await waitForAudioContext(context, activation.resumePromise);
      const buffers = await getBuffers(context);
      if (requestId !== playRequestRef.current) return;
      if (takes.length === 0) return;
      if (context.state !== 'running') await waitForAudioContext(context, context.resume());

      const takeOffsets = takes.map((take) => take.offset_ms / 1000);
      const earliestOffset = Math.min(0, ...takeOffsets);
      const endTime = takes.reduce((latest, take) => {
        const buffer = buffers.get(take.id);
        return buffer ? Math.max(latest, take.offset_ms / 1000 + buffer.duration) : latest;
      }, Number.NEGATIVE_INFINITY);
      const totalDuration = Math.max(0, endTime - earliestOffset);
      if (totalDuration <= 0) throw new Error('There are no playable parts in this project.');
      earliestOffsetRef.current = earliestOffset;
      setWaveform(createWaveform(buffers, earliestOffset, totalDuration));
      setDuration(totalDuration);
      const startPosition = Math.min(requestedStart, totalDuration);
      setPosition(startPosition);
      startSourcesAt(context, startPosition, totalDuration);
      activation.release();
      if (releaseActivationRef.current === activation.release) releaseActivationRef.current = null;
    } catch (cause) {
      if (requestId === playRequestRef.current) {
        stopPlayback();
        setError(cause instanceof Error ? cause.message : 'The parts could not be mixed in this browser.');
      }
    } finally {
      if (requestId === playRequestRef.current) setLoading(false);
    }
  }

  function seekTo(seconds: number) {
    const nextPosition = Math.max(0, Math.min(duration, seconds));
    setPosition(nextPosition);
    if (playing) {
      try {
        startSourcesAt(getSharedVoiceAudioContext(), nextPosition, duration);
      } catch (cause) {
        stopPlayback();
        setError(cause instanceof Error ? cause.message : 'The mix could not seek to that position.');
      }
    }
  }

  if (takes.length === 0) return null;

  return (
    <section aria-labelledby="mixer-heading" className="mb-8 border-y border-slate-200 py-4 dark:border-slate-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="mixer-heading" className="font-serif text-lg font-semibold text-slate-950 dark:text-white">Listen to all parts</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Combined playback with saved timing adjustments. Tap or drag the waveform to seek.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {playing || loading ? (
            <button type="button" onClick={stopPlayback} className="button-secondary">
              <span className="h-3 w-3 bg-slate-500" />{loading ? 'Cancel' : 'Stop'}
            </button>
          ) : (
            <button type="button" onClick={playAll} className="button-primary">
              <Icon name="play" size={16} />Play all
            </button>
          )}
        </div>
      </div>
      {(loading || loadedCount > 0) && (
        <p role="status" className="mt-3 text-xs text-slate-500 dark:text-slate-400">{loading ? `Preparing ${takes.length} parts…` : `${loadedCount} part${loadedCount === 1 ? '' : 's'} decoded and cached for this session`}</p>
      )}
      {duration > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <span className="font-mono text-xs tabular-nums text-slate-500">{formatDuration(position)}</span>
          <div className="min-w-0 flex-1">
            <VoiceWaveformSeek
              peaks={waveform.length ? waveform : Array.from({ length: MIX_WAVEFORM_BARS }, (_, index) => 0.2 + 0.55 * Math.abs(Math.sin(index * 1.7)))}
              position={position}
              duration={duration}
              label="all voice parts"
              onSeek={seekTo}
            />
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
