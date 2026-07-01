'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Song, SongCollection, CollectionSong, CollectionWithSongs } from '@/types';
import {
  createCollection,
  updateCollection,
  deleteCollection,
  addSongToCollection,
  removeFromCollection,
  reorderCollectionSongs,
} from '@/lib/actions';
import { MUSICAL_KEYS } from '@/lib/constants';
import LyricsModal from '@/components/LyricsModal';

export default function CollectionsClient({
  collections,
  librarySongs,
}: {
  collections: CollectionWithSongs[];
  librarySongs: Song[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jamMode, setJamMode] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCollection, setEditingCollection] = useState<SongCollection | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [detailSearch, setDetailSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [detailSongs, setDetailSongs] = useState<CollectionSong[]>([]);
  const [lyricsTarget, setLyricsTarget] = useState<{
    title: string;
    songId: string | null;
    collectionSongId: string | null;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const selected = selectedId ? (collections.find((c) => c.id === selectedId) ?? null) : null;

  const filteredCollections = listSearch.trim()
    ? collections.filter(
        (c) =>
          c.name.toLowerCase().includes(listSearch.toLowerCase()) ||
          c.description?.toLowerCase().includes(listSearch.toLowerCase()) ||
          c.collection_songs.some((s) =>
            s.song_title.toLowerCase().includes(listSearch.toLowerCase()),
          ),
      )
    : collections;

  useEffect(() => {
    if (!selected) {
      setDetailSongs([]);
      return;
    }
    setDetailSongs([...selected.collection_songs].sort((a, b) => a.position - b.position));
  }, [selectedId, collections, selected]);

  const filteredSongs: CollectionSong[] = detailSongs.filter(
    (s) =>
      !detailSearch.trim() ||
      s.song_title.toLowerCase().includes(detailSearch.toLowerCase()),
  );

  const isReorderDisabled = !!detailSearch.trim();

  function handleBack() {
    setSelectedId(null);
    setDetailSearch('');
    setShowAddForm(false);
    setJamMode(false);
    setEditingCollection(null);
  }

  function handleDeleteCollection(id: string, name: string) {
    if (!confirm(`Delete collection "${name}"? All songs in it will be removed.`)) return;
    startTransition(async () => {
      await deleteCollection(id);
      if (selectedId === id) setSelectedId(null);
      router.refresh();
    });
  }

  function handleRemoveSong(id: string) {
    startTransition(async () => {
      await removeFromCollection(id);
      router.refresh();
    });
  }

  function handleSongDragEnd(event: DragEndEvent) {
    if (!selected || isReorderDisabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = detailSongs.findIndex((s) => s.id === active.id);
    const newIndex = detailSongs.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(detailSongs, oldIndex, newIndex);
    setDetailSongs(reordered);

    startTransition(async () => {
      await reorderCollectionSongs(selected.id, reordered.map((s) => s.id));
      router.refresh();
    });
  }

  // ─── Jam Mode ─────────────────────────────────────────────────────────────

  if (jamMode && selected) {
    return (
      <>
      <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-950">
          <div>
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-0.5">
              Jam Mode
            </p>
            <h2 className="text-white font-bold text-lg leading-tight">{selected.name}</h2>
          </div>
          <button
            onClick={() => setJamMode(false)}
            className="text-slate-400 hover:text-white text-sm border border-slate-700 px-3 py-1.5 rounded-xl transition-colors"
          >
            ✕ Exit
          </button>
        </div>
        <div className="px-5 py-6 space-y-5">
          {filteredSongs.map((song, index) => (
            <div key={song.id} className="border-b border-slate-800 pb-5">
              <div className="flex items-start gap-3">
                <span className="text-slate-600 text-sm font-mono shrink-0 pt-1 w-5 text-right">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-white text-2xl font-bold leading-tight">{song.song_title}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {song.song_key && (
                      <span className="bg-emerald-600 text-white text-sm font-bold px-3 py-1 rounded-lg">
                        {song.song_key}
                      </span>
                    )}
                    {song.song_youtube_link && (
                      <a
                        href={song.song_youtube_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-violet-400 hover:text-violet-200 flex items-center gap-1.5 transition-colors"
                      >
                        ▶ YouTube
                      </a>
                    )}
                    <button
                      onClick={() =>
                        setLyricsTarget({
                          title: song.song_title,
                          songId: song.song_id,
                          collectionSongId: song.id,
                        })
                      }
                      className="text-sm text-slate-500 hover:text-white font-medium transition-colors"
                    >
                      Lyrics
                    </button>
                  </div>
                  {song.song_notes && (
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">{song.song_notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredSongs.length === 0 && (
            <p className="text-slate-500 text-center py-12">No songs in this collection</p>
          )}
        </div>
      </div>
      <LyricsModal
        isOpen={!!lyricsTarget}
        onClose={() => setLyricsTarget(null)}
        songTitle={lyricsTarget?.title ?? ''}
        songId={lyricsTarget?.songId}
        collectionSongId={lyricsTarget?.collectionSongId}
      />
      </>
    );
  }

  // ─── Detail View ──────────────────────────────────────────────────────────

  if (selected) {
    return (
      <>
      <div>
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <button
            onClick={handleBack}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 -ml-1 shrink-0 mt-0.5 transition-colors"
            title="Back to collections"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            {editingCollection?.id === selected.id ? (
              <EditCollectionForm
                collection={editingCollection}
                onDone={() => { setEditingCollection(null); router.refresh(); }}
                onCancel={() => setEditingCollection(null)}
              />
            ) : (
              <>
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight">
                  {selected.name}
                </h2>
                {selected.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {selected.description}
                  </p>
                )}
              </>
            )}
          </div>
          {editingCollection?.id !== selected.id && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setJamMode(true)}
                className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                title="Jam Mode — fullscreen song list"
              >
                🎸 Jam
              </button>
              <button
                onClick={() => setEditingCollection(selected)}
                className="text-slate-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors p-1"
                title="Edit collection"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => handleDeleteCollection(selected.id, selected.name)}
                disabled={isPending}
                className="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors text-xl leading-none disabled:opacity-50"
                title="Delete collection"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 ml-7">
          {selected.collection_songs.length} song{selected.collection_songs.length !== 1 ? 's' : ''}
        </p>

        {/* Search */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search this collection…"
            value={detailSearch}
            onChange={(e) => setDetailSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          {detailSearch && (
            <button
              onClick={() => setDetailSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Song list */}
        {filteredSongs.length > 0 ? (
          <div className="space-y-2 mb-4">
            {isReorderDisabled ? (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 ml-1">Clear search to drag and reorder songs.</p>
            ) : (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 ml-1">Drag songs by the handle to reorder.</p>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSongDragEnd}>
              <SortableContext items={filteredSongs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {filteredSongs.map((song, index) => (
                  <SortableCollectionSongRow
                    key={song.id}
                    song={song}
                    index={index}
                    isPending={isPending}
                    dragDisabled={isReorderDisabled}
                    onOpenLyrics={() =>
                      setLyricsTarget({
                        title: song.song_title,
                        songId: song.song_id,
                        collectionSongId: song.id,
                      })
                    }
                    onRemove={() => handleRemoveSong(song.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🎵</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {detailSearch ? 'No songs match your search' : 'No songs in this collection yet'}
            </p>
          </div>
        )}

        {/* Add song */}
        {showAddForm ? (
          <AddCollectionSongForm
            collectionId={selected.id}
            librarySongs={librarySongs}
            existingSongIds={
              selected.collection_songs.map((s) => s.song_id).filter(Boolean) as string[]
            }
            onAdded={() => { setShowAddForm(false); router.refresh(); }}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-3 border-2 border-dashed border-violet-200 dark:border-violet-700 rounded-2xl text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
          >
            + Add Song
          </button>
        )}
      </div>
      <LyricsModal
        isOpen={!!lyricsTarget}
        onClose={() => setLyricsTarget(null)}
        songTitle={lyricsTarget?.title ?? ''}
        songId={lyricsTarget?.songId}
        collectionSongId={lyricsTarget?.collectionSongId}
      />
      </>
    );
  }

  // ─── List View ────────────────────────────────────────────────────────────

  return (
    <>
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {collections.length} collection{collections.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
        >
          + New Collection
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search collections or songs within them…"
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        {listSearch && (
          <button
            onClick={() => setListSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-4">
          <CreateCollectionForm
            onCreated={(id) => { setShowCreate(false); setSelectedId(id); router.refresh(); }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Collections list */}
      {filteredCollections.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {collections.length === 0
              ? 'No collections yet'
              : 'No collections match your search'}
          </p>
          {collections.length === 0 && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
            >
              Create your first collection
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCollections.map((collection) => (
            <button
              key={collection.id}
              onClick={() => setSelectedId(collection.id)}
              className="w-full text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    {collection.name}
                  </p>
                  {collection.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-1">
                      {collection.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                  {collection.collection_songs.length}
                </span>
              </div>
              {collection.collection_songs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {collection.collection_songs.slice(0, 4).map((s) => (
                    <span
                      key={s.id}
                      className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/60 px-2 py-0.5 rounded-full"
                    >
                      {s.song_title}
                    </span>
                  ))}
                  {collection.collection_songs.length > 4 && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      +{collection.collection_songs.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
    <LyricsModal
      isOpen={!!lyricsTarget}
      onClose={() => setLyricsTarget(null)}
      songTitle={lyricsTarget?.title ?? ''}
      songId={lyricsTarget?.songId}
      collectionSongId={lyricsTarget?.collectionSongId}
    />
    </>
  );
}

function SortableCollectionSongRow({
  song,
  index,
  isPending,
  dragDisabled,
  onOpenLyrics,
  onRemove,
}: {
  song: CollectionSong;
  index: number;
  isPending: boolean;
  dragDisabled: boolean;
  onOpenLyrics: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: song.id,
    disabled: dragDisabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 flex items-start gap-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={dragDisabled}
        className="shrink-0 mt-0.5 p-0.5 text-slate-300 dark:text-slate-600 hover:text-slate-500 disabled:opacity-30 cursor-grab active:cursor-grabbing touch-none"
        title={dragDisabled ? 'Clear search to reorder' : 'Drag to reorder'}
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
        </svg>
      </button>

      <span className="text-slate-400 dark:text-slate-500 text-xs font-mono shrink-0 mt-1 w-5 text-right">
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug">
          {song.song_title}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {song.song_key && (
            <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
              {song.song_key}
            </span>
          )}
          {song.song_youtube_link && (
            <a
              href={song.song_youtube_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
            >
              ▶ YouTube
            </a>
          )}
          <button
            onClick={onOpenLyrics}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-violet-500 dark:hover:text-violet-400 font-medium transition-colors"
          >
            Lyrics
          </button>
        </div>
        {song.song_notes && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
            {song.song_notes}
          </p>
        )}
      </div>

      <button
        onClick={onRemove}
        disabled={isPending}
        className="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors text-xl leading-none shrink-0 disabled:opacity-50"
        title="Remove from collection"
      >
        ×
      </button>
    </div>
  );
}

// ─── Create Collection Form ───────────────────────────────────────────────────

function CreateCollectionForm({
  onCreated,
  onCancel,
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      const id = await createCollection(name.trim(), description.trim() || null);
      onCreated(id);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-200 dark:border-violet-700 rounded-2xl p-4 space-y-3"
    >
      <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide">
        New Collection
      </p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
        placeholder="e.g. Worship Songs, High Energy Praise…"
        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        placeholder="Short description… (optional)"
        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="flex-1 bg-violet-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-violet-700 disabled:opacity-60"
        >
          {isPending ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
  );
}

// ─── Edit Collection Form ─────────────────────────────────────────────────────

function EditCollectionForm({
  collection,
  onDone,
  onCancel,
}: {
  collection: SongCollection;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await updateCollection(collection.id, name.trim(), description.trim() || null);
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 min-w-0 space-y-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description… (optional)"
        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-60"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Add Song to Collection Form ──────────────────────────────────────────────

function AddCollectionSongForm({
  collectionId,
  librarySongs,
  existingSongIds,
  onAdded,
  onCancel,
}: {
  collectionId: string;
  librarySongs: Song[];
  existingSongIds: string[];
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [useLibrary, setUseLibrary] = useState(true);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualYoutube, setManualYoutube] = useState('');

  const availableLibrarySongs = librarySongs.filter((s) => !existingSongIds.includes(s.id));
  const filteredLibrary = librarySearch.trim()
    ? availableLibrarySongs.filter((s) =>
        s.title.toLowerCase().includes(librarySearch.toLowerCase()),
      )
    : availableLibrarySongs;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (useLibrary && !selectedSong) return;
    if (!useLibrary && !manualTitle.trim()) return;
    startTransition(async () => {
      if (useLibrary && selectedSong) {
        await addSongToCollection(collectionId, {
          song_id: selectedSong.id,
          song_title: selectedSong.title,
          song_key: selectedSong.musical_key,
          song_notes: selectedSong.notes,
          song_youtube_link: selectedSong.youtube_link,
        });
      } else {
        await addSongToCollection(collectionId, {
          song_id: null,
          song_title: manualTitle.trim(),
          song_key: manualKey || null,
          song_notes: manualNotes.trim() || null,
          song_youtube_link: manualYoutube.trim() || null,
        });
      }
      onAdded();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-200 dark:border-violet-700 rounded-2xl p-4 space-y-3 mt-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide">
          Add Song
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-slate-500 dark:text-slate-400">From library</span>
          <button
            type="button"
            onClick={() => {
              setUseLibrary((v) => !v);
              setSelectedSong(null);
              setLibrarySearch('');
            }}
            className={`relative w-9 h-5 rounded-full transition-colors ${useLibrary ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${useLibrary ? 'translate-x-4' : ''}`}
            />
          </button>
        </label>
      </div>

      {useLibrary ? (
        <div>
          <input
            type="text"
            value={librarySearch}
            onChange={(e) => { setLibrarySearch(e.target.value); setSelectedSong(null); }}
            placeholder="Search your song library…"
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          {librarySearch && !selectedSong && filteredLibrary.length > 0 && (
            <div className="mt-1 border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {filteredLibrary.slice(0, 8).map((song) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => { setSelectedSong(song); setLibrarySearch(song.title); }}
                  className="w-full text-left px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-violet-900/20 border-b border-slate-100 dark:border-slate-700 last:border-0 flex items-center justify-between"
                >
                  <span>{song.title}</span>
                  {song.musical_key && (
                    <span className="text-xs text-violet-600 dark:text-violet-400 font-medium ml-2 shrink-0">
                      {song.musical_key}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {librarySearch && !selectedSong && filteredLibrary.length === 0 && (
            <p className="text-xs text-slate-400 mt-1.5 px-1">No matching songs in library</p>
          )}
          {selectedSong && (
            <div className="mt-1.5 flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl px-3 py-2">
              <span className="text-sm text-violet-700 dark:text-violet-300 font-medium flex-1">
                {selectedSong.title}
              </span>
              <button
                type="button"
                onClick={() => { setSelectedSong(null); setLibrarySearch(''); }}
                className="text-violet-400 hover:text-violet-600 text-sm"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            required={!useLibrary}
            placeholder="Song title…"
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <div className="flex gap-2">
            <select
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              className="w-24 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 shrink-0"
            >
              <option value="">Key…</option>
              {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <input
              type="url"
              value={manualYoutube}
              onChange={(e) => setManualYoutube(e.target.value)}
              placeholder="YouTube URL (optional)"
              className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <textarea
            value={manualNotes}
            onChange={(e) => setManualNotes(e.target.value)}
            rows={2}
            placeholder="Notes… (optional)"
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || (useLibrary ? !selectedSong : !manualTitle.trim())}
          className="flex-1 bg-violet-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-violet-700 disabled:opacity-60"
        >
          {isPending ? 'Adding…' : 'Add to Collection'}
        </button>
      </div>
    </form>
  );
}
