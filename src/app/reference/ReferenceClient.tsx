'use client';

import { useMemo, useState } from 'react';
import { SONG_CATEGORIES, CATEGORY_COLORS } from '@/lib/constants';

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
      <div className="flex items-start justify-between gap-3 mb-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quick Reference</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} song{filtered.length !== 1 ? 's' : ''}
            {filterCategory ? ` in ${filterCategory}` : ''}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="shrink-0 bg-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <span>🖨️</span>
          <span>Print</span>
        </button>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 no-print scrollbar-none">
        <button
          onClick={() => setFilterCategory('')}
          className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !filterCategory
              ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
          }`}
        >
          All Songs
        </button>
        {SONG_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterCategory === cat
                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-6 pb-3 border-b-2 border-slate-300">
        <h1 className="text-2xl font-bold">🎵 Song Reference Sheet</h1>
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
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-slate-500 font-medium text-lg">No songs in this category</p>
          <button
            onClick={() => setFilterCategory('')}
            className="mt-3 text-sm text-violet-600 hover:underline"
          >
            Show all songs
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {filtered.map((song, i) => (
              <div
                key={song.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                }`}
              >
                {/* Row number */}
                <span className="text-xs text-slate-300 w-5 text-right shrink-0 font-mono">
                  {i + 1}
                </span>

                {/* Title & categories */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 leading-tight">{song.title}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {song.categories.map((cat) => (
                      <span
                        key={cat}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[cat] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Key, Tempo, Link */}
                <div className="flex items-center gap-2 shrink-0">
                  {song.musical_key && (
                    <span className="bg-violet-600 text-white text-xs font-bold px-2 py-1 rounded-lg min-w-[2rem] text-center">
                      {song.musical_key}
                    </span>
                  )}
                  {song.tempo && (
                    <span className="text-xs text-slate-400 hidden sm:block">{song.tempo}</span>
                  )}
                  {song.youtube_link && (
                    <a
                      href={song.youtube_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-500 hover:text-violet-700 transition-colors no-print"
                      title="Play on YouTube"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21.543 6.498C22 8.28 22 12 22 12s0 3.72-.457 5.502c-.254.985-.997 1.76-1.938 2.022C17.896 20 12 20 12 20s-5.893 0-7.605-.476c-.945-.266-1.687-1.04-1.938-2.022C2 15.72 2 12 2 12s0-3.72.457-5.502c.254-.985.997-1.76 1.938-2.022C6.107 4 12 4 12 4s5.896 0 7.605.476c.945.266 1.687 1.04 1.938 2.022zM10 15.5l6-3.5-6-3.5v7z" />
                      </svg>
                    </a>
                  )}
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
