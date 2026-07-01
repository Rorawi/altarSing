'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateBirthdates } from '@/lib/actions';
import type { MemberWithAttendance } from '@/types';

interface Props {
  members: MemberWithAttendance[] | any[];
  isOpen: boolean;
  onClose: () => void;
}

export default function EditBirthdaysModal({ members, isOpen, onClose }: Props) {
  const router = useRouter();
  const [birthdates, setBirthdates] = useState<Record<string, string>>(
    members.reduce(
      (acc, m) => {
        acc[m.id] = m.birth_date || '';
        return acc;
      },
      {} as Record<string, string>,
    ),
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  async function handleSave() {
    setIsSaving(true);
    try {
      const updates = members.map((m) => ({
        id: m.id,
        birth_date: birthdates[m.id] || null,
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

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end">
      <div className="bg-white dark:bg-slate-900 w-full max-w-107.5 rounded-t-2xl p-4 pb-24 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-slate-900 pb-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Birthdays</h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 mb-4">
          {membersSorted.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">
                {member.name}
              </span>
              <input
                type="date"
                value={birthdates[member.id] || ''}
                onChange={(e) =>
                  setBirthdates((prev) => ({
                    ...prev,
                    [member.id]: e.target.value,
                  }))
                }
                disabled={isSaving}
                className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 sticky bottom-0 bg-white dark:bg-slate-900 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 py-2 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-violet-600 text-white py-2 rounded-xl font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>
    </div>
  );
}
