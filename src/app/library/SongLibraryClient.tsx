'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Song, SortOption, CollectionWithSongs } from '@/types';
import { SONG_CATEGORIES, MUSICAL_KEYS } from '@/lib/constants';
import SongCard from '@/components/SongCard';
import CollectionsClient from './CollectionsClient';
import { addSongToCollection } from '@/lib/actions';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

export default function SongLibraryClient({
  initialSongs,
  initialCollections,
}: {
  initialSongs: Song[];
  initialCollections: CollectionWithSongs[];
}) {
  const [activeTab, setActiveTab] = useState<'songs' | 'collections'>('songs');
  const [addToCollectionSong, setAddToCollectionSong] = useState<Song | null>(null);
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
      <PageHeader
        title="Song library"
        description={<>{initialSongs.length} song{initialSongs.length !== 1 ? 's' : ''}{hasFilters && activeTab === 'songs' ? ` · ${filtered.length} shown` : ''}</>}
        actions={activeTab === 'songs' ? <>
          <Link href="/quick-add" className="button-secondary"><Icon name="sparkles" size={16} />Quick add</Link>
          <Link href="/library/new" className="button-primary"><Icon name="plus" size={17} />Add song</Link>
        </> : undefined}
      />

      <div className="mb-6 flex gap-6 border-b border-slate-200 dark:border-slate-800">
        {([
          ['songs', 'Songs', initialSongs.length],
          ['collections', 'Collections', initialCollections.length],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            aria-current={activeTab === value ? 'page' : undefined}
            className={`-mb-px flex min-h-11 items-center gap-2 border-b-2 px-1 text-sm font-medium transition-colors ${activeTab === value ? 'border-violet-800 text-violet-900 dark:border-violet-300 dark:text-violet-200' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}`}
          >
            {label}<span className="text-xs tabular-nums text-slate-400">{count}</span>
          </button>
        ))}
      </div>

      {activeTab === 'collections' && (
        <CollectionsClient collections={initialCollections} librarySongs={initialSongs} />
      )}

      {activeTab === 'songs' && (
        <>
          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Search songs or notes</span>
              <Icon name="search" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search songs or notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="field-control pl-10"
              />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:flex xl:flex-nowrap">
              <select aria-label="Filter by category" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="field-control xl:w-48 xl:shrink-0">
                <option value="">All categories</option>
                {SONG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select aria-label="Filter by key" value={filterKey} onChange={(e) => setFilterKey(e.target.value)} className="field-control xl:w-32 xl:shrink-0">
                <option value="">All keys</option>
                {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <select aria-label="Sort songs" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="field-control col-span-2 sm:col-span-1 xl:w-40 xl:shrink-0">
                <option value="date_desc">Newest first</option>
                <option value="date_asc">Oldest first</option>
                <option value="title_asc">A to Z</option>
                <option value="title_desc">Z to A</option>
              </select>
              {hasFilters && (
              <button onClick={() => { setSearch(''); setFilterCategory(''); setFilterKey(''); }} className="button-quiet col-span-2 sm:col-span-1 xl:col-span-1 xl:shrink-0">
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="hidden grid-cols-[minmax(0,1.45fr)_minmax(150px,1fr)_minmax(130px,.85fr)_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 xl:grid">
              <span>Song</span><span>Musical information</span><span>Rehearsal</span><span className="text-right">Actions</span>
            </div>
            {filtered.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"><Icon name="music" size={19} /></div>
                <p className="font-medium text-slate-800 dark:text-slate-100">{initialSongs.length === 0 ? 'Your library is empty' : 'No songs match these filters'}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{initialSongs.length === 0 ? 'Add a song to begin building your repertoire.' : 'Try a different search or clear the filters.'}</p>
                {initialSongs.length === 0 ? <Link href="/quick-add" className="button-primary mt-5"><Icon name="plus" size={16} />Add your first song</Link> : hasFilters && <button onClick={() => { setSearch(''); setFilterCategory(''); setFilterKey(''); }} className="button-quiet mt-3">Clear filters</button>}
              </div>
            ) : (
              <div>
                {filtered.map((song) => <SongCard key={song.id} song={song} onAddToCollection={() => setAddToCollectionSong(song)} />)}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add to Collection modal */}
      {addToCollectionSong && (
        <AddToCollectionModal
          song={addToCollectionSong}
          collections={initialCollections}
          onClose={() => setAddToCollectionSong(null)}
        />
      )}
    </div>
  );
}

// ─── Add to Collection Modal ──────────────────────────────────────────────────

function AddToCollectionModal({
  song,
  collections,
  onClose,
}: {
  song: Song;
  collections: CollectionWithSongs[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState<Set<string>>(new Set());

  const alreadyInIds = new Set(
    collections
      .filter((c) => c.collection_songs.some((s) => s.song_id === song.id))
      .map((c) => c.id),
  );

  function handleAdd(collectionId: string) {
    startTransition(async () => {
      await addSongToCollection(collectionId, {
        song_id: song.id,
        song_title: song.title,
        song_key: song.musical_key,
        song_notes: song.notes,
        song_youtube_link: song.youtube_link,
      });
      setAdded((prev) => new Set(prev).add(collectionId));
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-t-3xl w-full max-w-md p-5 pb-24"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Add to collection</p>
            <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">{song.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none ml-4"
          >
            ×
          </button>
        </div>

        {collections.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6 leading-relaxed">
            No collections yet.<br />
            Create one in the Collections tab.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {collections.map((c) => {
              const inCollection = alreadyInIds.has(c.id) || added.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => !inCollection && handleAdd(c.id)}
                  disabled={isPending || inCollection}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between ${
                    inCollection
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 cursor-default'
                      : 'border-slate-200 dark:border-slate-600 hover:border-violet-300 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {c.collection_songs.length} songs
                    </p>
                  </div>
                  {inCollection ? (
                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold">✓ Added</span>
                  ) : (
                    <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">+ Add</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
