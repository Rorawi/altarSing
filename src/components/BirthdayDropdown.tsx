'use client';

import { useState, useEffect, useRef } from 'react';
import type { ChoirMember } from '@/types';
import Icon from '@/components/Icon';

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
        aria-expanded={open}
        aria-controls="today-birthdays-popover"
        className="icon-button relative"
      >
        <Icon name="birthday" size={18} />
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-violet-700 dark:bg-violet-300" />
      </button>

      {open && (
        <div id="today-birthdays-popover" role="dialog" aria-label="Today's birthdays" className="popover-surface absolute right-0 top-11 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-md">
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-violet-200 text-violet-800 dark:border-violet-800 dark:text-violet-300">
              <Icon name="birthday" size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Birthdays today</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{todayBirthdays.length} choir member{todayBirthdays.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {todayBirthdays.map((m) => {
              const age = m.birth_date ? getAge(m.birth_date) : null;
              const initials = m.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-slate-200 font-mono text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{m.name}</p>
                    {age !== null && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Turning {age} today</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
