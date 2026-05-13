'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Song, SortOption } from '@/types';
import { SONG_CATEGORIES, MUSICAL_KEYS } from '@/lib/constants';
import SongCard from '@/components/SongCard';

export default function SongLibraryClient({ initialSongs }: { initialSongs: Song[] }) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterKey, setFilterKey] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  const filtered = useMemo(() => {
    let list = [...initialSongs];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) || s.notes?.toLowerCase().includes(q),
      );
    }
    if (filterCategory) {
      list = list.filter((s) => s.categories.includes(filterCategory));
    }
    if (filterKey) {
      list = list.filter((s) => s.musical_key === filterKey);
    }

    list.sort((a, b) => {
      if (sortBy === 'date_desc')
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'date_asc')
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
      if (sortBy === 'title_desc') return b.title.localeCompare(a.title);
      return 0;
    });

    return list;
  }, [initialSongs, search, filterCategory, filterKey, sortBy]);

  const hasFilters = search || filterCategory || filterKey;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Song Library</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {initialSongs.length} song{initialSongs.length !== 1 ? 's' : ''}
            {hasFilters ? ` · ${filtered.length} shown` : ''}
          </p>
        </div>
        <Link
          href="/library/new"
          className="bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          + Add Song
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search songs or notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="shrink-0 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-600"
        >
          <option value="">All Categories</option>
          {SONG_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={filterKey}
          onChange={(e) => setFilterKey(e.target.value)}
          className="shrink-0 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-600"
        >
          <option value="">All Keys</option>
          {MUSICAL_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="shrink-0 border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-600"
        >
          <option value="date_desc">Newest First</option>
          <option value="date_asc">Oldest First</option>
          <option value="title_asc">A → Z</option>
          <option value="title_desc">Z → A</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => {
              setSearch('');
              setFilterCategory('');
              setFilterKey('');
            }}
            className="shrink-0 text-xs text-violet-600 hover:text-violet-800 px-2 font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Song list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🎵</p>
          <p className="text-slate-500 font-medium text-lg">
            {initialSongs.length === 0 ? 'Your library is empty' : 'No songs match your filters'}
          </p>
          {initialSongs.length === 0 ? (
            <div className="mt-4 space-y-3">
              <Link
                href="/library/new"
                className="inline-block bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
              >
                Add your first song
              </Link>
              <p className="text-sm text-slate-400">or use</p>
              <Link href="/quick-add" className="inline-block text-violet-600 text-sm hover:underline">
                ⚡ Quick Add — paste a YouTube link
              </Link>
            </div>
          ) : (
            <button
              onClick={() => {
                setSearch('');
                setFilterCategory('');
                setFilterKey('');
              }}
              className="mt-3 text-sm text-violet-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}
    </div>
  );
}
