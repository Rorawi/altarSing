'use client';

import { useState, useEffect, useRef } from 'react';
import type { ChoirMember } from '@/types';

interface Props {
  todayBirthdays: Pick<ChoirMember, 'id' | 'name' | 'birth_date'>[];
}

function getAge(birthDate: string): number | null {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function BirthdayDropdown({ todayBirthdays }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasBirthdays = todayBirthdays.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!hasBirthdays) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Birthday notifications"
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors"
      >
        {/* Pulsating ring */}
        <span className="absolute inset-0 rounded-full animate-ping bg-pink-400 opacity-30" />
        <span className="relative text-xl">🎂</span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-64 bg-white dark:bg-slate-800 border border-pink-200 dark:border-pink-700 rounded-2xl shadow-xl overflow-hidden z-50">
          <div className="bg-linear-to-r from-pink-500 to-violet-500 px-4 py-3">
            <p className="text-white font-bold text-sm">🎉 Birthdays Today!</p>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {todayBirthdays.map((m) => {
              const age = m.birth_date ? getAge(m.birth_date) : null;
              return (
                <li key={m.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">🎈</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {m.name}
                    </p>
                    {age !== null && (
                      <p className="text-xs text-pink-500 dark:text-pink-400 font-medium">
                        Turning {age} today!
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="px-4 py-2 bg-pink-50 dark:bg-pink-900/20">
            <p className="text-xs text-center text-pink-600 dark:text-pink-400 font-medium">
              🎵 Wishing them a joyful day!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
