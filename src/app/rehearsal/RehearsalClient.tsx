'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Song } from '@/types';
import SongCard from '@/components/SongCard';

type Filter = 'all' | 'rehearsing' | 'complete';

export default function RehearsalClient({ songs }: { songs: Song[] }) {
  const [filter, setFilter] = useState<Filter>('all');

  const rehearsing = songs.filter((s) => s.rehearsal_status === 'rehearsing');
  const complete = songs.filter((s) => s.rehearsal_status === 'complete');
  const displaySongs =
    filter === 'all' ? songs : songs.filter((s) => s.rehearsal_status === filter);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Rehearsal Tracker</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Track songs actively in rehearsal
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">{rehearsing.length}</p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 font-medium">Currently Rehearsing</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-green-700 dark:text-green-400">{complete.length}</p>
          <p className="text-xs text-green-600 dark:text-green-500 mt-1 font-medium">Rehearsal Complete</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'rehearsing', 'complete'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-300'
            }`}
          >
            {f === 'all' ? 'All' : f === 'rehearsing' ? '🎵 Rehearsing' : '✓ Complete'}
          </button>
        ))}
      </div>

      {/* Songs */}
      {displaySongs.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🎼</p>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
            {songs.length === 0
              ? 'No songs in rehearsal'
              : 'No songs match this filter'}
          </p>
          {songs.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
              Mark songs as &ldquo;Rehearsing&rdquo; from your{' '}
              <Link href="/library" className="text-violet-600 hover:underline font-medium">
                Song Library
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displaySongs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}
    </div>
  );
}
