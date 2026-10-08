'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Song } from '@/types';
import { updateRehearsalStatus, deleteSong } from '@/lib/actions';
import LyricsModal from '@/components/LyricsModal';
import Icon from '@/components/Icon';
import ExternalMediaLink from '@/components/ExternalMediaLink';

export default function SongCard({
  song,
  onAddToCollection,
}: {
  song: Song;
  onAddToCollection?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  function handleStatusChange(status: string) {
    startTransition(async () => {
      await updateRehearsalStatus(song.id, status);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteSong(song.id);
      router.refresh();
    });
  }

  const statusLabel = song.rehearsal_status === 'complete'
    ? 'Rehearsed'
    : song.rehearsal_status === 'rehearsing'
      ? 'In rehearsal'
      : 'Not in rehearsal';
  const statusColor = song.rehearsal_status === 'complete'
    ? 'text-emerald-700 dark:text-emerald-300'
    : song.rehearsal_status === 'rehearsing'
      ? 'text-violet-800 dark:text-violet-300'
      : 'text-slate-500 dark:text-slate-400';

  return (
    <article className={`border-b border-slate-200 px-4 py-4 transition-colors last:border-b-0 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-950/60 sm:px-5 ${isPending ? 'pointer-events-none opacity-60' : ''}`}>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(150px,1fr)_minmax(130px,.85fr)_auto] xl:items-center xl:gap-4">
        <div className="min-w-0">
          <h3 className="break-words text-[15px] font-semibold leading-snug text-slate-950 dark:text-slate-100">
            <Link href={`/library/${song.id}`} className="rounded-sm hover:text-violet-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:text-violet-300">
              {song.title}
            </Link>
          </h3>
          {song.notes && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{song.notes}</p>}
          {song.youtube_link && <ExternalMediaLink href={song.youtube_link} className="mt-1" />}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300 md:block md:space-y-1">
          <p className="flex items-baseline gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">Key</span>
            <span className="font-semibold tabular-nums text-violet-900 dark:text-violet-200">{song.musical_key || '—'}</span>
            {song.tempo && <><span className="text-slate-300 dark:text-slate-700">·</span><span>{song.tempo}</span></>}
          </p>
          {song.categories.length > 0 && <p className="min-w-0 truncate text-slate-500 dark:text-slate-400">{song.categories.join(' · ')}</p>}
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${song.rehearsal_status === 'complete' ? 'bg-emerald-600' : song.rehearsal_status === 'rehearsing' ? 'bg-violet-700' : 'bg-slate-300 dark:bg-slate-600'}`} />
          <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
          {song.rehearsal_status === 'none' ? (
          <button onClick={() => handleStatusChange('rehearsing')} className="button-quiet ml-auto min-h-8 px-2 text-xs xl:ml-0" disabled={isPending}>Start</button>
          ) : song.rehearsal_status === 'rehearsing' ? (
            <button onClick={() => handleStatusChange('complete')} className="button-quiet ml-auto min-h-8 px-2 text-xs text-emerald-700 dark:text-emerald-300 xl:ml-0" disabled={isPending}>Complete</button>
          ) : (
            <button onClick={() => handleStatusChange('none')} className="button-quiet ml-auto min-h-8 px-2 text-xs xl:ml-0" disabled={isPending}>Reset</button>
          )}
        </div>

        <div className="flex items-center justify-end gap-1 border-t border-slate-100 pt-2 xl:border-0 xl:pt-0">
          {onAddToCollection && <button onClick={onAddToCollection} className="button-quiet min-h-8 px-2 text-xs" title="Add to a collection" aria-label={`Add ${song.title} to a collection`}><Icon name="plus" size={15} /><span className="xl:hidden 2xl:inline">Collection</span></button>}
          {song.lyrics && <button onClick={() => setLyricsOpen(true)} className="button-quiet min-h-8 px-2 text-xs" title="View lyrics"><Icon name="lyrics" size={15} /><span className="xl:hidden 2xl:inline">Lyrics</span></button>}
          <Link href={`/library/${song.id}`} className="icon-button h-8 w-8" title="Edit song" aria-label={`Edit ${song.title}`}><Icon name="edit" size={15} /></Link>
          <button onClick={() => setShowDeleteConfirm((value) => !value)} className="icon-button h-8 w-8 hover:text-red-700 dark:hover:text-red-300" title="Delete song" aria-label={`Delete ${song.title}`}><Icon name="trash" size={15} /></button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-red-200 pt-3 text-sm dark:border-red-900">
          <p className="text-slate-700 dark:text-slate-300">Remove <span className="font-semibold">{song.title}</span> from the library?</p>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="button-secondary min-h-9">Cancel</button>
            <button onClick={handleDelete} disabled={isPending} className="button-danger-quiet min-h-9">Delete song</button>
          </div>
        </div>
      )}

      <LyricsModal
        isOpen={lyricsOpen}
        onClose={() => setLyricsOpen(false)}
        songTitle={song.title}
        songId={song.id}
        initialLyrics={song.lyrics}
        youtubeLink={song.youtube_link}
      />
    </article>
  );
}
