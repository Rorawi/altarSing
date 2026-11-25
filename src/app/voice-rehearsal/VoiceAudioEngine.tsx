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
  // Keep a live, near-silent source connected while the first mix downloads and
  // decodes. iOS PWAs can suspend an otherwise-unlocked context during that
  // async gap if the only gesture-started source is a one-sample silent blip.
  const oscillator = context.createOscillator();
  const mute = context.createGain();
  // A zero-gain source can be optimized as silence. Keep a non-zero signal at
  // -100 dBFS so the WebKit audio route stays active without an audible tone.
  mute.gain.setValueAtTime(0.00001, context.currentTime);
  oscillator.connect(mute);
  mute.connect(context.destination);
  oscillator.start();

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try { oscillator.stop(); } catch { /* The activation source may have stopped already. */ }
    oscillator.disconnect();
    mute.disconnect();
  };

  return { resumePromise: context.resume(), release };
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

export async function decodeVoiceTakeForWaveform(takeId: string, audioData: ArrayBuffer) {
  const cached = decodedTakes.get(takeId);
  if (cached) return cached;

  const offlineWindow = window as typeof window & {
    webkitOfflineAudioContext?: typeof OfflineAudioContext;
  };
  const OfflineContextConstructor = window.OfflineAudioContext || offlineWindow.webkitOfflineAudioContext;
  let decoded: AudioBuffer;

  if (OfflineContextConstructor) {
    // Waveform rendering is analysis only; do not create the output context
    // before the user's first playback gesture in an installed PWA.
    const decoder = new OfflineContextConstructor(1, 128, 44_100);
    decoded = await decoder.decodeAudioData(audioData);
  } else {
    // Older browsers can still draw the waveform, though their first-play
    // context must be unlocked through the play control.
    decoded = await getSharedVoiceAudioContext().decodeAudioData(audioData);
  }

  decodedTakes.set(takeId, decoded);
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
