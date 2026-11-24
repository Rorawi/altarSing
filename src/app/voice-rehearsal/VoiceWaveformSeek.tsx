'use client';

import { useRef, type KeyboardEvent, type PointerEvent } from 'react';

export default function VoiceWaveformSeek({
  peaks,
  position,
  duration,
  label,
  onSeek,
  progressClassName = 'bg-violet-700 dark:bg-violet-300',
  faded = false,
}: {
  peaks: number[];
  position: number;
  duration: number;
  label: string;
  onSeek: (seconds: number) => void;
  progressClassName?: string;
  faded?: boolean;
}) {
  const activePointerRef = useRef<number | null>(null);
  const progress = duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0;

  function seekFromPointer(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    onSeek(ratio * duration);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (duration <= 0 || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (event.pointerType === 'mouse') event.preventDefault();
    activePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromPointer(event);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (activePointerRef.current === event.pointerId) seekFromPointer(event);
  }

  function finishPointer(event: PointerEvent<HTMLDivElement>) {
    if (activePointerRef.current !== event.pointerId) return;
    activePointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (duration <= 0) return;
    const step = event.shiftKey ? 15 : 5;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      onSeek(Math.max(0, position - step));
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      onSeek(Math.min(duration, position + step));
    } else if (event.key === 'Home') {
      event.preventDefault();
      onSeek(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      onSeek(duration);
    }
  }

  return (
    <div
      role="slider"
      tabIndex={duration > 0 ? 0 : -1}
      aria-disabled={duration <= 0}
      aria-label={`Seek ${label}`}
      aria-valuemin={0}
      aria-valuemax={Math.ceil(duration)}
      aria-valuenow={Math.min(Math.ceil(duration), Math.floor(position))}
      aria-valuetext={`${formatDuration(position)} of ${formatDuration(duration)}. Tap or drag the waveform to seek.`}
      aria-orientation="horizontal"
      title="Tap or drag the waveform to seek"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onLostPointerCapture={() => { activePointerRef.current = null; }}
      onKeyDown={handleKeyDown}
      className="relative flex h-12 w-full cursor-ew-resize select-none items-center gap-[2px] overflow-hidden rounded-sm outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 dark:focus-visible:ring-violet-300 dark:focus-visible:ring-offset-slate-950"
      style={{ touchAction: 'pan-y' }}
    >
      {peaks.map((peak, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`min-w-[2px] flex-1 rounded-sm ${index / peaks.length <= progress ? progressClassName : 'bg-slate-300 dark:bg-slate-600'} ${faded ? 'opacity-60' : ''}`}
          style={{ height: `${Math.max(12, peak * 100)}%` }}
        />
      ))}
    </div>
  );
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
