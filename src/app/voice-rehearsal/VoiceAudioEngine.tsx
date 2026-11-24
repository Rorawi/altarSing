'use client';

import type { VoiceRehearsalTake } from '@/types/voice-rehearsal';

let sharedContext: AudioContext | null = null;
const decodedTakes = new Map<string, AudioBuffer>();
let activeMixStopper: (() => void) | null = null;

export function getSharedVoiceAudioContext() {
  if (typeof window === 'undefined') throw new Error('Web Audio is only available in a browser.');
  if (sharedContext && sharedContext.state !== 'closed') return sharedContext;
  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('This browser does not support Web Audio.');
  sharedContext = new AudioContextConstructor();
  return sharedContext;
}

export function activateVoiceAudioFromGesture(context: AudioContext) {
  // iOS home-screen apps can leave Web Audio suspended until playback is
  // started directly from a tap. A silent one-sample source primes that path.
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, 1, context.sampleRate);
  source.connect(context.destination);
  source.onended = () => source.disconnect();
  source.start();
  return context.resume();
}

export function closeSharedVoiceAudioContext() {
  const context = sharedContext;
  sharedContext = null;
  decodedTakes.clear();
  activeMixStopper = null;
  if (context && context.state !== 'closed') void context.close().catch(() => undefined);
}

export async function getDecodedVoiceTake(take: VoiceRehearsalTake, context: AudioContext) {
  const cached = decodedTakes.get(take.id);
  if (cached) return cached;

  const audioResponse = await fetch(`/api/voice-rehearsal/takes/${take.id}/playback?download=1`, { cache: 'no-store' });
  if (!audioResponse.ok) {
    const result = await audioResponse.json().catch(() => null) as { error?: string } | null;
    throw new Error(result?.error ?? `Could not download the ${take.part_label} take.`);
  }
  const decoded = await context.decodeAudioData(await audioResponse.arrayBuffer());
  decodedTakes.set(take.id, decoded);
  return decoded;
}

export function forgetDecodedVoiceTake(takeId: string) {
  decodedTakes.delete(takeId);
}

export function registerVoiceMixStopper(stop: () => void) {
  activeMixStopper = stop;
}

export function unregisterVoiceMixStopper(stop: () => void) {
  if (activeMixStopper === stop) activeMixStopper = null;
}

export function stopActiveVoiceMix() {
  activeMixStopper?.();
}
