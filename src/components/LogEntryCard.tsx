'use client';

import type { ServiceLog } from '@/types';

export default function LogEntryCard({ log }: { log: ServiceLog }) {
  const formattedDate = new Date(log.service_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
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

        <p className="text-xs text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">{formattedDate}</p>
      </div>
    </div>
  );
}
