'use client';

import { useEffect, useMemo, useState } from 'react';

interface Member {
  id: string;
  name: string;
}

const SEGMENT_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#0891b2',
  '#059669',
  '#ca8a04',
  '#ea580c',
  '#dc2626',
  '#db2777',
  '#4f46e5',
  '#0d9488',
];

export default function WheelClient({ members }: { members: Member[] }) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [activeMemberIds, setActiveMemberIds] = useState<Set<string>>(
    () => new Set(members.map((m) => m.id)),
  );

  useEffect(() => {
    setActiveMemberIds(new Set(members.map((m) => m.id)));
  }, [members]);

  const activeMembers = useMemo(
    () => members.filter((m) => activeMemberIds.has(m.id) && m.name.trim()),
    [members, activeMemberIds],
  );

  const names = useMemo(() => activeMembers.map((m) => m.name), [activeMembers]);
  const count = names.length;
  const segmentAngle = count > 0 ? 360 / count : 0;

  const wheelBackground = useMemo(() => {
    if (count === 0) return 'conic-gradient(#334155 0deg 360deg)';

    const slices = names.map((_, i) => {
      const start = i * segmentAngle;
      const end = start + segmentAngle;
      return `${SEGMENT_COLORS[i % SEGMENT_COLORS.length]} ${start}deg ${end}deg`;
    });

    return `conic-gradient(${slices.join(', ')})`;
  }, [count, names, segmentAngle]);

  function spinWheel() {
    if (isSpinning || count === 0) return;

    setIsSpinning(true);
    setWinnerIndex(null);

    const chosen = Math.floor(Math.random() * count);
    const centerOfChosen = (chosen * segmentAngle) + (segmentAngle / 2);

    const currentMod = ((rotation % 360) + 360) % 360;
    const targetMod = ((360 - centerOfChosen) % 360 + 360) % 360;
    const deltaToTarget = (targetMod - currentMod + 360) % 360;

    const extraTurns = 360 * 7;
    const finalRotation = rotation + extraTurns + deltaToTarget;

    setRotation(finalRotation);

    window.setTimeout(() => {
      setWinnerIndex(chosen);
      setIsSpinning(false);
    }, 4400);
  }

  function toggleMember(memberId: string) {
    if (isSpinning) return;
    setWinnerIndex(null);
    setActiveMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }

  function selectAll() {
    if (isSpinning) return;
    setWinnerIndex(null);
    setActiveMemberIds(new Set(members.map((m) => m.id)));
  }

  function clearAll() {
    if (isSpinning) return;
    setWinnerIndex(null);
    setActiveMemberIds(new Set());
  }

  const hasMembers = members.length > 0;
  const hasActiveMembers = count > 0;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Spin The Wheel</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pick a choir member at random.</p>
      </div>

      {!hasMembers ? (
        <div className="text-center py-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-slate-600 dark:text-slate-300 font-medium">No choir members found</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add members in Attendance first.</p>
        </div>
      ) : (
        <>
          <div className="relative mx-auto w-full max-w-90 aspect-square select-none">
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-20 w-0 h-0 border-l-4 border-r-4 border-t-0 border-b-10 border-l-transparent border-r-transparent border-b-amber-400" />

            <div
              className="w-full h-full rounded-full border-10 border-slate-900 dark:border-slate-700 shadow-xl relative overflow-hidden"
              style={{
                background: wheelBackground,
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 4.4s cubic-bezier(0.18, 0.82, 0.19, 1)' : 'none',
              }}
            >
              {names.map((name, i) => {
                const angle = (i * segmentAngle) + (segmentAngle / 2);
                const labelSize = count > 16 ? 'text-[9px]' : count > 10 ? 'text-[10px]' : 'text-[11px]';
                return (
                  <div
                    key={`${i}-${name}`}
                    className="absolute left-1/2 top-1/2"
                    style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
                  >
                    <div
                      className={`text-white font-semibold drop-shadow-md ${labelSize} whitespace-nowrap`}
                      style={{ transform: 'translateY(-120px) rotate(90deg)', maxWidth: 92, overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={name}
                    >
                      {name}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={spinWheel}
                disabled={isSpinning || !hasActiveMembers}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-slate-900/90 dark:bg-slate-950/90 border-2 border-white/60 text-white flex items-center justify-center text-xs font-bold disabled:opacity-50"
              >
                GO
              </button>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={spinWheel}
              disabled={isSpinning || !hasActiveMembers}
              className="flex-1 bg-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
              {isSpinning ? 'Spinning...' : hasActiveMembers ? 'Spin' : 'Select at least one member'}
            </button>
          </div>

          {winnerIndex !== null && (
            <div className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-center">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-semibold">Selected Member</p>
              <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">{names[winnerIndex]}</p>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Wheel Members ({count} active of {members.length})
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  disabled={isSpinning}
                  className="text-[11px] px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-400 disabled:opacity-50"
                >
                  Select all
                </button>
                <button
                  onClick={clearAll}
                  disabled={isSpinning}
                  className="text-[11px] px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-400 disabled:opacity-50"
                >
                  Clear all
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {members.map((member) => {
                const isActive = activeMemberIds.has(member.id);
                return (
                  <button
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    disabled={isSpinning}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors disabled:opacity-50 ${
                      isActive
                        ? 'bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
                        : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 line-through'
                    }`}
                    title={isActive ? 'Remove from wheel' : 'Add back to wheel'}
                  >
                    {member.name}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
