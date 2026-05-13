'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ServiceLog } from '@/types';
import { deleteServiceLog } from '@/lib/actions';

export default function LogEntryCard({ log }: { log: ServiceLog }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDelete, setShowDelete] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteServiceLog(log.id);
      router.refresh();
    });
  }

  const formattedDate = new Date(log.service_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 transition-opacity ${isPending ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{log.song_title}</h3>

          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {log.musical_key && (
              <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                {log.musical_key}
              </span>
            )}
            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-lg">
              {log.service_moment}
            </span>
          </div>

          {log.lead_singer && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              <span className="mr-1">👤</span>
              {log.lead_singer}
            </p>
          )}

          {log.notes && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic leading-relaxed">{log.notes}</p>
          )}
        </div>

        {/* Delete control */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {showDelete ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDelete(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDelete(true)}
              className="text-slate-300 hover:text-red-400 transition-colors leading-none text-lg"
              title="Delete entry"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
