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

  const linkResponse = await fetch(`/api/voice-rehearsal/takes/${take.id}/playback`);
  const linkResult = await linkResponse.json();
  if (!linkResponse.ok) throw new Error(linkResult.error ?? `Could not load ${take.part_label}.`);

  const audioResponse = await fetch(linkResult.url, { cache: 'force-cache' });
  if (!audioResponse.ok) throw new Error(`Could not download the ${take.part_label} take.`);
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
