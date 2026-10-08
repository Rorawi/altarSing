'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateBirthdates } from '@/lib/actions';
import type { MemberWithAttendance } from '@/types';
import Icon from '@/components/Icon';

interface Props {
  members: MemberWithAttendance[] | any[];
  isOpen: boolean;
  onClose: () => void;
}

export default function EditBirthdaysModal({ members, isOpen, onClose }: Props) {
  const router = useRouter();
  const [birthdates, setBirthdates] = useState<Record<string, string>>(
    () => Object.fromEntries(members.map((member) => [member.id, member.birth_date || ''])),
  );
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setBirthdates(Object.fromEntries(members.map((member) => [member.id, member.birth_date || ''])));
    setSearch('');
  }, [isOpen, members]);

  if (!isOpen) return null;

  async function handleSave() {
    setIsSaving(true);
    try {
      const updates = members.map((member) => ({
        id: member.id,
        birth_date: birthdates[member.id] || null,
      }));
      await updateBirthdates(updates);
      router.refresh();
      onClose();
    } catch (err) {
      alert(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }

  const membersSorted = [...members].sort((a, b) => a.name.localeCompare(b.name));
  const filteredMembers = membersSorted.filter((member) =>
    member.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 backdrop-blur-[1px] sm:items-center sm:p-4"
      onClick={() => { if (!isSaving) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-birthdays-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-[#fbfaf7] shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-violet-200 text-violet-800 dark:border-violet-800 dark:text-violet-300">
            <Icon name="birthday" size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="edit-birthdays-title" className="font-serif text-lg font-semibold text-slate-950 dark:text-slate-100">Member birthdays</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Set or update a choir member’s date of birth.</p>
          </div>
          <button onClick={onClose} disabled={isSaving} className="icon-button -mr-1 -mt-1" aria-label="Close birthday editor">
            <Icon name="close" size={17} />
          </button>
        </header>

        <div className="shrink-0 px-4 py-3 sm:px-6">
          <label className="relative block">
            <span className="sr-only">Search choir members</span>
            <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a choir member…"
              className="field-control pl-9"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            <span>Member</span>
            <span className="pr-1">Birthday</span>
          </div>
          {filteredMembers.length > 0 ? (
            <div className="border-y border-slate-200 dark:border-slate-800">
              {filteredMembers.map((member) => (
                <div key={member.id} className="grid grid-cols-[minmax(0,1fr)_minmax(8.5rem,10.5rem)] items-center gap-3 border-b border-slate-100 py-2.5 last:border-b-0 dark:border-slate-800">
                  <span className="min-w-0 truncate text-sm font-medium text-slate-800 dark:text-slate-200">{member.name}</span>
                  <input
                    type="date"
                    aria-label={`Birthday for ${member.name}`}
                    value={birthdates[member.id] || ''}
                    onChange={(event) => setBirthdates((prev) => ({ ...prev, [member.id]: event.target.value }))}
                    disabled={isSaving}
                    className="field-control min-w-0 px-2 text-xs"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="border-y border-slate-200 py-10 text-center dark:border-slate-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No members found</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Try another name.</p>
            </div>
          )}
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-[#fbfaf7] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">{filteredMembers.length} of {members.length} members</p>
          <div className="flex gap-2 sm:justify-end">
            <button onClick={onClose} disabled={isSaving} className="button-secondary flex-1 sm:flex-none">Cancel</button>
            <button onClick={handleSave} disabled={isSaving} className="button-primary flex-1 sm:flex-none">
              {isSaving ? 'Saving…' : 'Save birthdays'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
