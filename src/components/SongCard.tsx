'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Song } from '@/types';
import {
  REHEARSAL_STATUS_LABELS,
  REHEARSAL_STATUS_COLORS,
  CATEGORY_COLORS,
} from '@/lib/constants';
import { updateRehearsalStatus, deleteSong } from '@/lib/actions';

export default function SongCard({ song }: { song: Song }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const statusColor = REHEARSAL_STATUS_COLORS[song.rehearsal_status] ?? 'bg-gray-100 text-gray-500';
  const statusLabel = REHEARSAL_STATUS_LABELS[song.rehearsal_status] ?? song.rehearsal_status;

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-slate-900 text-base leading-snug flex-1 min-w-0">
            {song.title}
          </h3>
          <Link
            href={`/library/${song.id}`}
            className="shrink-0 text-slate-300 hover:text-violet-500 transition-colors p-1 -mr-1"
            title="Edit song"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {song.musical_key && (
            <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
              {song.musical_key}
            </span>
          )}
          {song.tempo && (
            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-lg">
              {song.tempo}
            </span>
          )}
          {song.categories.map((cat) => (
            <span
              key={cat}
              className={`text-xs px-2 py-0.5 rounded-lg ${CATEGORY_COLORS[cat] ?? 'bg-indigo-50 text-indigo-700'}`}
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Notes preview */}
        {song.notes && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">{song.notes}</p>
        )}

        {/* YouTube link */}
        {song.youtube_link && (
          <a
            href={song.youtube_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium mb-3"
          >
            <span>▶</span> Play on YouTube
          </a>
        )}

        {/* Rehearsal status row */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>
            {statusLabel}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {song.rehearsal_status !== 'rehearsing' && (
              <button
                onClick={() => handleStatusChange('rehearsing')}
                disabled={isPending}
                className="text-xs text-amber-600 hover:text-amber-800 font-medium disabled:opacity-50 transition-colors"
              >
                Rehearsing
              </button>
            )}
            {song.rehearsal_status === 'rehearsing' && (
              <button
                onClick={() => handleStatusChange('complete')}
                disabled={isPending}
                className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50 transition-colors"
              >
                ✓ Complete
              </button>
            )}
            {song.rehearsal_status !== 'none' && (
              <button
                onClick={() => handleStatusChange('none')}
                disabled={isPending}
                className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete area */}
      {showDeleteConfirm ? (
        <div className="px-4 pb-4 flex gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="flex-1 text-xs border border-slate-300 rounded-xl py-2 text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex-1 text-xs bg-red-600 text-white rounded-xl py-2 font-medium hover:bg-red-700 disabled:opacity-50"
          >
            Yes, Delete
          </button>
        </div>
      ) : (
        <div className="px-4 pb-3 border-t border-slate-50 pt-2 flex justify-end">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-slate-300 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
