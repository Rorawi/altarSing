'use client';

import { useMemo, useState } from 'react';
import { SONG_CATEGORIES } from '@/lib/constants';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';
import ExternalMediaLink from '@/components/ExternalMediaLink';

interface SongRef {
  id: string;
  title: string;
  musical_key: string | null;
  youtube_link: string | null;
  categories: string[];
  tempo: string | null;
}

export default function ReferenceClient({ songs }: { songs: SongRef[] }) {
  const [filterCategory, setFilterCategory] = useState('');

  const filtered = useMemo(() => {
    if (!filterCategory) return songs;
    return songs.filter((s) => s.categories.includes(filterCategory));
  }, [songs, filterCategory]);

  return (
    <div>
      {/* Header */}
      <div className="no-print">
        <PageHeader title="Quick reference" description={<>{filtered.length} song{filtered.length !== 1 ? 's' : ''}{filterCategory ? ` in ${filterCategory}` : ''}</>} actions={<button onClick={() => window.print()} className="button-secondary"><Icon name="report" size={16} />Print</button>} />
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 no-print scrollbar-none">
        <button
          onClick={() => setFilterCategory('')}
          className={`shrink-0 border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
            !filterCategory
              ? 'border-violet-800 text-violet-900 dark:border-violet-300 dark:text-violet-200'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          All Songs
        </button>
        {SONG_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`shrink-0 border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
              filterCategory === cat
                ? 'border-violet-800 text-violet-900 dark:border-violet-300 dark:text-violet-200'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-6 pb-3 border-b-2 border-slate-300">
        <h1 className="text-2xl font-bold">AltarSing · Song Reference Sheet</h1>
        {filterCategory && (
          <p className="text-base text-slate-600 mt-1">Category: {filterCategory}</p>
        )}
        <p className="text-sm text-slate-400 mt-1">
          {filtered.length} songs · Printed{' '}
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Songs table */}
      {filtered.length === 0 ? (
        <div className="border-y border-slate-200 py-16 text-center dark:border-slate-800">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"><Icon name="library" /></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">No songs in this category</p>
          <button
            onClick={() => setFilterCategory('')}
            className="mt-3 text-sm text-violet-600 hover:underline"
          >
            Show all songs
          </button>
        </div>
      ) : (
        <div className="overflow-hidden border-y border-slate-200 dark:border-slate-800">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((song, i) => (
              <div
                key={song.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${
                  i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-950/50'
                }`}
              >
                {/* Row number */}
                <span className="text-xs text-slate-300 dark:text-slate-600 w-5 text-right shrink-0 font-mono">
                  {i + 1}
                </span>

                {/* Title & categories */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 dark:text-slate-100 leading-tight">{song.title}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{song.categories.join(' · ')}</span>
                  </div>
                </div>

                {/* Key, Tempo, Link */}
                <div className="flex items-center gap-2 shrink-0">
                  {song.musical_key && (
                    <span className="min-w-8 border-l-2 border-violet-700 pl-2 text-sm font-semibold tabular-nums text-violet-900 dark:border-violet-300 dark:text-violet-200">
                      {song.musical_key}
                    </span>
                  )}
                  {song.tempo && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">{song.tempo}</span>
                  )}
                  {song.youtube_link && <ExternalMediaLink href={song.youtube_link} className="no-print min-h-8" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print tip */}
      {filtered.length > 0 && (
        <p className="text-xs text-slate-400 text-center mt-4 no-print">
          Tip: Use &ldquo;Print to PDF&rdquo; in your print dialog to save as a shareable file
        </p>
      )}
    </div>
  );
}
