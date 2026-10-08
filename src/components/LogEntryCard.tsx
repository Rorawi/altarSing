'use client';

import { useState } from 'react';
import type { ServiceLog, LogSong } from '@/types';
import LyricsModal from '@/components/LyricsModal';

export default function LogEntryCard({ log }: { log: ServiceLog }) {
  const formattedDate = new Date(`${log.service_date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const displaySongs: LogSong[] = log.songs?.length
    ? log.songs
    : [{ title: log.song_title, key: log.musical_key, song_id: log.song_id }];
  const displayLeaders = log.lead_singers?.length
    ? log.lead_singers
    : log.lead_singer ? [log.lead_singer] : [];
  const [lyricsTarget, setLyricsTarget] = useState<{ title: string; songId: string | null } | null>(null);

  return (
    <article className="grid grid-cols-1 gap-3 border-b border-slate-200 px-4 py-4 last:border-b-0 hover:bg-white dark:border-slate-800 dark:hover:bg-slate-900 sm:px-5 md:grid-cols-[150px_minmax(0,1fr)] md:gap-6">
      <div className="flex items-center gap-3 text-xs md:block md:pt-0.5">
        <span className="font-medium text-slate-700 dark:text-slate-200">{formattedDate}</span>
        <span className="hidden text-slate-300 dark:text-slate-700 md:inline">·</span>
        <span className="text-slate-500 dark:text-slate-400 md:mt-1 md:block">{log.service_moment}</span>
      </div>

      <div className="min-w-0">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {displaySongs.map((song, index) => (
            <div key={`${song.song_id ?? song.title}-${index}`} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 py-1.5 first:pt-0 last:pb-0 sm:grid-cols-[28px_minmax(0,1fr)_auto]">
              {displaySongs.length > 1 && <span className="pt-0.5 font-mono text-[11px] tabular-nums text-slate-400">{String(index + 1).padStart(2, '0')}</span>}
              {displaySongs.length === 1 && <span />}
              <div className="min-w-0">
                <p className="break-words text-sm font-medium leading-snug text-slate-900 dark:text-slate-100">{song.title}</p>
                {song.tags?.length ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{song.tags.join(' · ')}</p> : null}
              </div>
              <div className="flex items-center gap-3 pl-2">
                {song.key && <span className="min-w-7 text-center font-serif text-base font-semibold tabular-nums text-violet-900 dark:text-violet-200">{song.key}</span>}
                <button onClick={() => setLyricsTarget({ title: song.title, songId: song.song_id })} className="button-quiet min-h-8 px-1.5 text-xs">Lyrics</button>
              </div>
            </div>
          ))}
        </div>

        {(displayLeaders.length > 0 || log.notes) && <div className="mt-3 border-t border-slate-100 pt-2.5 dark:border-slate-800">
          {displayLeaders.length > 0 && <p className="text-xs text-slate-600 dark:text-slate-300"><span className="font-medium">Led by </span>{displayLeaders.join(', ')}</p>}
          {log.notes && <p className="mt-1 break-words text-xs leading-relaxed text-slate-500 dark:text-slate-400">{log.notes}</p>}
        </div>}
      </div>

      <LyricsModal isOpen={!!lyricsTarget} onClose={() => setLyricsTarget(null)} songTitle={lyricsTarget?.title ?? ''} songId={lyricsTarget?.songId} />
    </article>
  );
}
