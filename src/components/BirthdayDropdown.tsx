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
        className="icon-button relative"
      >
        <Icon name="birthday" size={18} />
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-violet-700 dark:bg-violet-300" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Birthdays today</p>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {todayBirthdays.map((m) => {
              const age = m.birth_date ? getAge(m.birth_date) : null;
              return (
                <li key={m.id} className="px-4 py-3 flex items-center gap-3">
                  <Icon name="birthday" size={17} className="text-violet-700 dark:text-violet-300" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {m.name}
                    </p>
                    {age !== null && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Turning {age} today!
                      </p>
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
