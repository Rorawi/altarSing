'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
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
import type { RehearsalSession, RehearsalSong, RehearsalMedleyGroup } from '@/types';
import {
  addRehearsalSong,
  deleteRehearsalSong,
  updateRehearsalSong,
  reorderSessionItems,
  updateSessionProgramDate,
  addMedleyGroup,
  deleteMedleyGroup,
  renameMedleyGroup,
  addSongToMedley,
  reorderSongsInMedley,
} from '@/lib/actions';
import { MUSICAL_KEYS } from '@/lib/constants';

// ─── Types & Helpers ──────────────────────────────────────────────────────────

type LibrarySong = { id: string; title: string; musical_key: string | null };
type MedleyData = RehearsalMedleyGroup & { songs: RehearsalSong[] };
type SessionItem =
  | { itemType: 'song'; id: string; position: number; data: RehearsalSong }
  | { itemType: 'medley'; id: string; position: number; data: MedleyData };

function buildSessionItems(
  songs: RehearsalSong[],
  medleyGroups: RehearsalMedleyGroup[],
): SessionItem[] {
  const standalone = songs
    .filter((s) => !s.medley_group_id)
    .map((s) => ({ itemType: 'song' as const, id: s.id, position: s.position, data: s }));
  const medleys = medleyGroups.map((g) => ({
    itemType: 'medley' as const,
    id: g.id,
    position: g.position,
    data: {
      ...g,
      songs: songs
        .filter((s) => s.medley_group_id === g.id)
        .sort((a, b) => a.position - b.position),
    },
  }));
  return [...standalone, ...medleys].sort((a, b) => a.position - b.position);
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export default function SessionDetailClient({
  session,
  songs,
  medleyGroups,
  librarySongs,
}: {
  session: RehearsalSession;
  songs: RehearsalSong[];
  medleyGroups: RehearsalMedleyGroup[];
  librarySongs: LibrarySong[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingProgramDate, setEditingProgramDate] = useState(false);
  const [programDateInput, setProgramDateInput] = useState(session.program_date ?? '');

  const [sessionItems, setSessionItems] = useState<SessionItem[]>(() =>
    buildSessionItems(songs, medleyGroups),
  );

  // Sync state when server refreshes (after router.refresh())
  useEffect(() => {
    setSessionItems(buildSessionItems(songs, medleyGroups));
  }, [songs, medleyGroups]);

  type AddMode = 'picker' | 'single' | 'medley-create' | null;
  const [addMode, setAddMode] = useState<AddMode>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  function handleSessionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sessionItems.findIndex((i) => i.id === active.id);
    const newIndex = sessionItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(sessionItems, oldIndex, newIndex);
    setSessionItems(reordered);
    startTransition(async () => {
      await reorderSessionItems(
        session.id,
        reordered.map((item) => ({ type: item.itemType, id: item.id })),
      );
      router.refresh();
    });
  }

  function handleSaveProgramDate() {
    startTransition(async () => {
      await updateSessionProgramDate(session.id, programDateInput || null);
      setEditingProgramDate(false);
      router.refresh();
    });
  }

  function handleClearProgramDate() {
    setProgramDateInput('');
    startTransition(async () => {
      await updateSessionProgramDate(session.id, null);
      setEditingProgramDate(false);
      router.refresh();
    });
  }

  function handleDeleteSong(id: string, title: string) {
    if (!confirm(`Remove "${title}" from this session?`)) return;
    startTransition(async () => {
      await deleteRehearsalSong(id, session.id);
      setSessionItems((prev) =>
        prev.filter((item) => !(item.itemType === 'song' && item.id === id)),
      );
      router.refresh();
    });
  }

  function handleDeleteSongFromMedley(songId: string, songTitle: string, medleyId: string) {
    if (!confirm(`Remove "${songTitle}" from this medley?`)) return;
    startTransition(async () => {
      await deleteRehearsalSong(songId, session.id);
      setSessionItems((prev) =>
        prev.map((item) => {
          if (item.itemType !== 'medley' || item.id !== medleyId) return item;
          return {
            ...item,
            data: { ...item.data, songs: item.data.songs.filter((s) => s.id !== songId) },
          };
        }),
      );
      router.refresh();
    });
  }

  function handleDeleteMedley(id: string, name: string) {
    if (!confirm(`Delete medley "${name}" and all its songs?`)) return;
    startTransition(async () => {
      await deleteMedleyGroup(id, session.id);
      setSessionItems((prev) =>
        prev.filter((item) => !(item.itemType === 'medley' && item.id === id)),
      );
      router.refresh();
    });
  }

  function handleMedleySongsReorder(medleyId: string, reorderedSongs: RehearsalSong[]) {
    setSessionItems((prev) =>
      prev.map((item) => {
        if (item.itemType !== 'medley' || item.id !== medleyId) return item;
        return { ...item, data: { ...item.data, songs: reorderedSongs } };
      }),
    );
    startTransition(async () => {
      await reorderSongsInMedley(
        medleyId,
        session.id,
        reorderedSongs.map((s) => s.id),
      );
      router.refresh();
    });
  }

  const formattedDate = new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const totalSongCount = songs.length;
  const nextSessionPosition = sessionItems.length + 1;
  const isEmpty = sessionItems.length === 0 && !addMode;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <Link
          href="/rehearsal"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 -ml-1 mt-0.5 shrink-0"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {session.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{formattedDate}</p>
          {session.notes && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 italic leading-relaxed">
              {session.notes}
            </p>
          )}
        </div>
      </div>

      {/* Program Date card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">
              Program Date
            </p>
            {session.program_converted ? (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                ✓ Auto-logged on{' '}
                {new Date(session.program_date! + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            ) : session.program_date ? (
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                📅{' '}
                {new Date(session.program_date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">Not scheduled</p>
            )}
          </div>
          {!session.program_converted && (
            <button
              onClick={() => setEditingProgramDate((v) => !v)}
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline shrink-0"
            >
              {session.program_date ? 'Change' : 'Set date'}
            </button>
          )}
        </div>

        {editingProgramDate && (
          <div className="mt-3 flex gap-2 items-center">
            <input
              type="date"
              value={programDateInput}
              onChange={(e) => setProgramDateInput(e.target.value)}
              className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button
              onClick={handleSaveProgramDate}
              disabled={isPending}
              className="bg-violet-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 shrink-0"
            >
              Save
            </button>
            {session.program_date && (
              <button
                onClick={handleClearProgramDate}
                disabled={isPending}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors shrink-0"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      {/* Song count + Add button */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {totalSongCount} song{totalSongCount !== 1 ? 's' : ''} in this session
        </p>
        <button
          onClick={() => setAddMode(addMode ? null : 'picker')}
          className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm"
        >
          {addMode ? 'Cancel' : '+ Add Song'}
        </button>
      </div>

      {/* ─── Add type picker ─── */}
      {addMode === 'picker' && (
        <div className="mb-4 bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 rounded-2xl p-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 text-center">
            What would you like to add?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAddMode('single')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-violet-200 dark:border-violet-700 hover:border-violet-500 dark:hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
            >
              <span className="text-2xl">🎵</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Single Song
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-tight">
                One standalone song
              </span>
            </button>
            <button
              onClick={() => setAddMode('medley-create')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-amber-200 dark:border-amber-700 hover:border-amber-500 dark:hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              <span className="text-2xl">🎼</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Medley
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-tight">
                Named group of songs
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Add standalone song form ─── */}
      {addMode === 'single' && (
        <div className="mb-4">
          <AddSongForm
            sessionId={session.id}
            librarySongs={librarySongs}
            nextPosition={nextSessionPosition}
            onAdded={() => {
              setAddMode(null);
              router.refresh();
            }}
          />
        </div>
      )}

      {/* ─── Create medley form ─── */}
      {addMode === 'medley-create' && (
        <div className="mb-4">
          <CreateMedleyForm
            sessionId={session.id}
            onCreated={() => {
              setAddMode(null);
              router.refresh();
            }}
          />
        </div>
      )}

      {/* ─── Empty state ─── */}
      {isEmpty && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎶</p>
          <p className="text-slate-500 dark:text-slate-400 font-medium">No songs yet</p>
          <button
            onClick={() => setAddMode('picker')}
            className="mt-4 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            Add first song
          </button>
        </div>
      )}

      {/* ─── Session items list ─── */}
      {sessionItems.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSessionDragEnd}
        >
          <SortableContext
            items={sessionItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {sessionItems.map((item, index) => {
                if (item.itemType === 'song') {
                  return (
                    <SortableStandaloneSongCard
                      key={item.id}
                      song={item.data}
                      position={index + 1}
                      sessionId={session.id}
                      onDelete={handleDeleteSong}
                      onEdited={() => router.refresh()}
                      isPending={isPending}
                    />
                  );
                } else {
                  return (
                    <SortableMedleyGroupCard
                      key={item.id}
                      group={item.data}
                      position={index + 1}
                      sessionId={session.id}
                      librarySongs={librarySongs}
                      onDeleteGroup={handleDeleteMedley}
                      onDeleteSong={(songId, songTitle) =>
                        handleDeleteSongFromMedley(songId, songTitle, item.id)
                      }
                      onEdited={() => router.refresh()}
                      onSongsReorder={(reordered) =>
                        handleMedleySongsReorder(item.id, reordered)
                      }
                      isPending={isPending}
                    />
                  );
                }
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ─── Sortable wrappers ────────────────────────────────────────────────────────

function SortableStandaloneSongCard(props: {
  song: RehearsalSong;
  position: number;
  sessionId: string;
  onDelete: (id: string, title: string) => void;
  onEdited: () => void;
  isPending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.song.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <StandaloneSongCard {...props} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  );
}

function SortableMedleyGroupCard(props: {
  group: MedleyData;
  position: number;
  sessionId: string;
  librarySongs: LibrarySong[];
  onDeleteGroup: (id: string, name: string) => void;
  onDeleteSong: (songId: string, songTitle: string) => void;
  onEdited: () => void;
  onSongsReorder: (reordered: RehearsalSong[]) => void;
  isPending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.group.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <MedleyGroupCard {...props} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  );
}

// ─── Standalone Song Card ─────────────────────────────────────────────────────

function StandaloneSongCard({
  song,
  position,
  sessionId,
  onDelete,
  onEdited,
  isPending,
  dragListeners,
  dragAttributes,
}: {
  song: RehearsalSong;
  position: number;
  sessionId: string;
  onDelete: (id: string, title: string) => void;
  onEdited: () => void;
  isPending: boolean;
  dragListeners?: object;
  dragAttributes?: object;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const hasDetails = song.harmony_notes || song.arrangement_notes;

  if (editing) {
    return (
      <EditSongForm
        song={song}
        sessionId={sessionId}
        onDone={() => { setEditing(false); onEdited(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            {...dragListeners}
            {...dragAttributes}
            className="shrink-0 mt-0.5 cursor-grab active:cursor-grabbing touch-none text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500 p-0.5"
            title="Drag to reorder"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
              <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
            </svg>
          </button>
          <span className="shrink-0 w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs font-bold flex items-center justify-center mt-0.5">
            {position}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug">
              {song.song_title}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {song.key_used && (
                <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                  {song.key_used}
                </span>
              )}
              {song.run_throughs > 1 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  × {song.run_throughs} run-throughs
                </span>
              )}
              {song.run_throughs === 1 && (
                <span className="text-xs text-slate-400 dark:text-slate-500">× 1 run-through</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasDetails && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
              >
                {expanded ? 'Less' : 'Details'}
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              title="Edit song"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(song.id, song.song_title)}
              disabled={isPending}
              className="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors text-lg leading-none disabled:opacity-50"
              title="Remove from session"
            >
              ×
            </button>
          </div>
        </div>

        {expanded && hasDetails && (
          <div className="mt-3 pl-10 space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
            {song.harmony_notes && (
              <div>
                <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-0.5">Harmony</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{song.harmony_notes}</p>
              </div>
            )}
            {song.arrangement_notes && (
              <div>
                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">Arrangement</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{song.arrangement_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Medley Group Card ────────────────────────────────────────────────────────

function MedleyGroupCard({
  group,
  position,
  sessionId,
  librarySongs,
  onDeleteGroup,
  onDeleteSong,
  onEdited,
  onSongsReorder,
  isPending,
  dragListeners,
  dragAttributes,
}: {
  group: MedleyData;
  position: number;
  sessionId: string;
  librarySongs: LibrarySong[];
  onDeleteGroup: (id: string, name: string) => void;
  onDeleteSong: (songId: string, songTitle: string) => void;
  onEdited: () => void;
  onSongsReorder: (reordered: RehearsalSong[]) => void;
  isPending: boolean;
  dragListeners?: object;
  dragAttributes?: object;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  function handleInnerDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = group.songs.findIndex((s) => s.id === active.id);
    const newIndex = group.songs.findIndex((s) => s.id === over.id);
    onSongsReorder(arrayMove(group.songs, oldIndex, newIndex));
  }

  const lastMedleyKey =
    group.songs.length > 0 ? group.songs[group.songs.length - 1].key_used : null;

  return (
    <div className="border-2 border-amber-200 dark:border-amber-700 rounded-2xl overflow-hidden bg-amber-50/50 dark:bg-amber-950/20">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700">
        <button
          type="button"
          {...dragListeners}
          {...dragAttributes}
          className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-amber-300 dark:text-amber-700 hover:text-amber-500 p-0.5"
          title="Drag to reorder"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
            <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
          </svg>
        </button>
        <span className="shrink-0 w-7 h-7 rounded-full bg-amber-200 dark:bg-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center">
          {position}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block leading-tight">
            Medley
          </span>
          {editingName ? (
            <EditMedleyNameForm
              group={group}
              sessionId={sessionId}
              onDone={() => { setEditingName(false); onEdited(); }}
              onCancel={() => setEditingName(false)}
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-amber-700 dark:hover:text-amber-300 transition-colors text-left leading-snug"
              title="Rename medley"
            >
              {group.name}
            </button>
          )}
        </div>
        <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
          {group.songs.length} song{group.songs.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0 text-amber-500 dark:text-amber-400 hover:text-amber-700 transition-colors p-0.5"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg
            className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          onClick={() => onDeleteGroup(group.id, group.name)}
          disabled={isPending}
          className="shrink-0 text-amber-300 dark:text-amber-700 hover:text-red-400 transition-colors text-lg leading-none disabled:opacity-50"
          title="Delete medley"
        >
          ×
        </button>
      </div>

      {/* Expanded content */}
      {!collapsed && (
        <div className="p-3">
          {group.songs.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleInnerDragEnd}
            >
              <SortableContext
                items={group.songs.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0">
                  {group.songs.map((song, index) => {
                    const prevSong = index > 0 ? group.songs[index - 1] : null;
                    const prevKey = prevSong?.key_used ?? null;
                    const currKey = song.key_used ?? null;
                    const keyChanged = prevSong !== null && currKey !== null && prevKey !== currKey;
                    return (
                      <div key={song.id}>
                        {index > 0 && (
                          <div className="flex flex-col items-center py-0.5">
                            {keyChanged ? (
                              <div className="flex items-center gap-1.5 py-1">
                                <div className="w-px h-3 bg-amber-300 dark:bg-amber-600" />
                                <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700">
                                  {prevKey && currKey ? `${prevKey} → ${currKey}` : 'key change'}
                                </span>
                                <div className="w-px h-3 bg-amber-300 dark:bg-amber-600" />
                              </div>
                            ) : (
                              <div className="w-px h-4 bg-amber-200 dark:bg-amber-700/50" />
                            )}
                          </div>
                        )}
                        <SortableMedleySongCard
                          song={song}
                          position={index + 1}
                          sessionId={sessionId}
                          onDelete={onDeleteSong}
                          onEdited={onEdited}
                          isPending={isPending}
                        />
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {group.songs.length === 0 && !showAddForm && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">
              No songs in this medley yet
            </p>
          )}

          {showAddForm ? (
            <div className="mt-2">
              {group.songs.length > 0 && (
                <div className="w-px h-3 bg-amber-200 dark:bg-amber-700/50 mx-auto" />
              )}
              <AddSongToMedleyForm
                medleyGroupId={group.id}
                sessionId={sessionId}
                librarySongs={librarySongs}
                lastKey={lastMedleyKey}
                nextPosition={group.songs.length + 1}
                onAdded={() => { setShowAddForm(false); onEdited(); }}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-2 w-full py-2 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              + Add song to medley
            </button>
          )}
        </div>
      )}

      {/* Collapsed song preview */}
      {collapsed && group.songs.length > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-1.5">
          {group.songs.map((s) => (
            <span
              key={s.id}
              className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full"
            >
              {s.song_title}
              {s.key_used && <span className="ml-1 font-bold opacity-70">{s.key_used}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sortable Medley Song Card wrapper ────────────────────────────────────────

function SortableMedleySongCard(props: {
  song: RehearsalSong;
  position: number;
  sessionId: string;
  onDelete: (id: string, title: string) => void;
  onEdited: () => void;
  isPending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.song.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <MedleySongCard {...props} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  );
}

// ─── Medley Song Card (inner) ─────────────────────────────────────────────────

function MedleySongCard({
  song,
  position,
  sessionId,
  onDelete,
  onEdited,
  isPending,
  dragListeners,
  dragAttributes,
}: {
  song: RehearsalSong;
  position: number;
  sessionId: string;
  onDelete: (id: string, title: string) => void;
  onEdited: () => void;
  isPending: boolean;
  dragListeners?: object;
  dragAttributes?: object;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const hasDetails = song.harmony_notes || song.arrangement_notes;

  if (editing) {
    return (
      <EditSongForm
        song={song}
        sessionId={sessionId}
        onDone={() => { setEditing(false); onEdited(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-amber-100 dark:border-amber-800/40 rounded-xl overflow-hidden">
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...dragListeners}
            {...dragAttributes}
            className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-amber-200 dark:text-amber-800 hover:text-amber-400 p-0.5"
            title="Drag to reorder"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
              <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
            </svg>
          </button>
          <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center justify-center">
            {position}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-snug truncate">
              {song.song_title}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {song.key_used && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  {song.key_used}
                </span>
              )}
              {song.run_throughs > 0 && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  × {song.run_throughs}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasDetails && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
              >
                {expanded ? 'Less' : 'Details'}
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="text-slate-300 dark:text-slate-600 hover:text-amber-500 transition-colors"
              title="Edit song"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(song.id, song.song_title)}
              disabled={isPending}
              className="text-slate-200 dark:text-slate-700 hover:text-red-400 transition-colors text-base leading-none disabled:opacity-50"
              title="Remove from medley"
            >
              ×
            </button>
          </div>
        </div>

        {expanded && hasDetails && (
          <div className="mt-2 pl-8 space-y-1.5 border-t border-amber-50 dark:border-amber-900/30 pt-2">
            {song.harmony_notes && (
              <div>
                <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-0.5">Harmony</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{song.harmony_notes}</p>
              </div>
            )}
            {song.arrangement_notes && (
              <div>
                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">Arrangement</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{song.arrangement_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit Medley Name Form ────────────────────────────────────────────────────

function EditMedleyNameForm({
  group,
  sessionId,
  onDone,
  onCancel,
}: {
  group: RehearsalMedleyGroup;
  sessionId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(group.name);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await renameMedleyGroup(group.id, sessionId, name);
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5 mt-0.5">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        required
        className="flex-1 min-w-0 border border-amber-300 dark:border-amber-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
      <button
        type="submit"
        disabled={isPending}
        className="text-xs text-amber-700 dark:text-amber-300 font-semibold hover:underline disabled:opacity-50"
      >
        Save
      </button>
      <button type="button" onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600">
        ✕
      </button>
    </form>
  );
}

// ─── Create Medley Form ───────────────────────────────────────────────────────

function CreateMedleyForm({
  sessionId,
  onCreated,
}: {
  sessionId: string;
  onCreated: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await addMedleyGroup(sessionId, name);
      onCreated();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-2xl p-4 space-y-3"
    >
      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
        New Medley
      </p>
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          Medley Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="e.g. Praise Medley, Carol Medley…"
          className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="w-full bg-amber-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Creating…' : 'Create Medley'}
      </button>
    </form>
  );
}

// ─── Inline Edit Song Form ────────────────────────────────────────────────────

function EditSongForm({
  song,
  sessionId,
  onDone,
  onCancel,
}: {
  song: RehearsalSong;
  sessionId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(song.song_title);
  const [key, setKey] = useState(song.key_used ?? '');
  const [runThroughs, setRunThroughs] = useState(song.run_throughs);
  const [harmonyNotes, setHarmonyNotes] = useState(song.harmony_notes ?? '');
  const [arrangementNotes, setArrangementNotes] = useState(song.arrangement_notes ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      await updateRehearsalSong(song.id, sessionId, {
        song_title: title.trim(),
        key_used: key || null,
        run_throughs: runThroughs,
        harmony_notes: harmonyNotes.trim() || null,
        arrangement_notes: arrangementNotes.trim() || null,
      });
      onDone();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-200 dark:border-violet-700 rounded-2xl p-4 space-y-3"
    >
      <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide">Edit Song</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Song title"
          className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <select
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-20 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 shrink-0"
        >
          <option value="">Key</option>
          {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Run-throughs</label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setRunThroughs((v) => Math.max(1, v - 1))}
            className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700">−</button>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-4 text-center">{runThroughs}</span>
          <button type="button" onClick={() => setRunThroughs((v) => v + 1)}
            className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700">+</button>
        </div>
      </div>
      <textarea value={harmonyNotes} onChange={(e) => setHarmonyNotes(e.target.value)}
        placeholder="Harmony notes…" rows={2}
        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
      <textarea value={arrangementNotes} onChange={(e) => setArrangementNotes(e.target.value)}
        placeholder="Arrangement notes…" rows={2}
        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">
          Cancel
        </button>
        <button type="submit" disabled={isPending}
          className="flex-1 bg-violet-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-violet-700 disabled:opacity-60">
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

// ─── Add Standalone Song Form ─────────────────────────────────────────────────

function AddSongForm({
  sessionId,
  librarySongs,
  nextPosition,
  onAdded,
}: {
  sessionId: string;
  librarySongs: LibrarySong[];
  nextPosition: number;
  onAdded: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [useLibrary, setUseLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedSong, setSelectedSong] = useState<LibrarySong | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [keyUsed, setKeyUsed] = useState('');
  const [runThroughs, setRunThroughs] = useState(1);
  const [harmonyNotes, setHarmonyNotes] = useState('');
  const [arrangementNotes, setArrangementNotes] = useState('');

  const filteredLibrary = librarySearch.trim()
    ? librarySongs.filter((s) => s.title.toLowerCase().includes(librarySearch.toLowerCase()))
    : librarySongs;

  function handleSelectLibrarySong(song: LibrarySong) {
    setSelectedSong(song);
    setLibrarySearch(song.title);
    if (song.musical_key && !keyUsed) setKeyUsed(song.musical_key);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = useLibrary ? (selectedSong?.title ?? librarySearch.trim()) : manualTitle.trim();
    if (!title) return;
    startTransition(async () => {
      await addRehearsalSong(sessionId, {
        song_title: title,
        song_id: useLibrary ? (selectedSong?.id ?? null) : null,
        key_used: keyUsed || null,
        has_modulation: false,
        modulation_from: null,
        modulation_to: null,
        harmony_notes: harmonyNotes.trim() || null,
        arrangement_notes: arrangementNotes.trim() || null,
        run_throughs: runThroughs,
      });
      onAdded();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 rounded-2xl p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          #{nextPosition} — Add Song
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-slate-500 dark:text-slate-400">From library</span>
          <button
            type="button"
            onClick={() => { setUseLibrary((v) => !v); setSelectedSong(null); setLibrarySearch(''); }}
            className={`relative w-9 h-5 rounded-full transition-colors ${useLibrary ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${useLibrary ? 'translate-x-4' : ''}`} />
          </button>
        </label>
      </div>

      {useLibrary ? (
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Search Library</label>
          <input type="text" value={librarySearch}
            onChange={(e) => { setLibrarySearch(e.target.value); setSelectedSong(null); }}
            placeholder="Type to search your song library…"
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          {librarySearch && !selectedSong && filteredLibrary.length > 0 && (
            <div className="mt-1 border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {filteredLibrary.slice(0, 8).map((song) => (
                <button key={song.id} type="button" onClick={() => handleSelectLibrarySong(song)}
                  className="w-full text-left px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-violet-900/20 border-b border-slate-100 dark:border-slate-700 last:border-0 flex items-center justify-between">
                  <span>{song.title}</span>
                  {song.musical_key && (
                    <span className="text-xs text-violet-600 dark:text-violet-400 font-medium ml-2 shrink-0">{song.musical_key}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {selectedSong && (
            <div className="mt-1.5 flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl px-3 py-2">
              <span className="text-sm text-violet-700 dark:text-violet-300 font-medium flex-1">{selectedSong.title}</span>
              <button type="button" onClick={() => { setSelectedSong(null); setLibrarySearch(''); }}
                className="text-violet-400 hover:text-violet-600 text-sm">✕</button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Song Title</label>
          <input type="text" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)}
            required={!useLibrary} placeholder="Enter song title…"
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          Key Used <span className="text-slate-400 font-normal">(for this session)</span>
        </label>
        <select value={keyUsed} onChange={(e) => setKeyUsed(e.target.value)}
          className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option value="">Select key…</option>
          {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Run-throughs</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setRunThroughs((v) => Math.max(1, v - 1))}
            className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center text-lg">−</button>
          <span className="text-slate-900 dark:text-slate-100 font-semibold w-6 text-center">{runThroughs}</span>
          <button type="button" onClick={() => setRunThroughs((v) => v + 1)}
            className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center text-lg">+</button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          Harmony Notes <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea value={harmonyNotes} onChange={(e) => setHarmonyNotes(e.target.value)} rows={2}
          placeholder="e.g. Soprano takes melody, alto a third below, tenor holds the fifth…"
          className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none placeholder-slate-400" />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          Arrangement Notes <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea value={arrangementNotes} onChange={(e) => setArrangementNotes(e.target.value)} rows={2}
          placeholder="e.g. Drum break after second verse, slow down for final chorus…"
          className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none placeholder-slate-400" />
      </div>

      <button type="submit"
        disabled={isPending || (useLibrary ? !selectedSong && !librarySearch.trim() : !manualTitle.trim())}
        className="w-full bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
        {isPending ? 'Adding…' : `Add Song #${nextPosition}`}
      </button>
    </form>
  );
}

// ─── Add Song To Medley Form ──────────────────────────────────────────────────

function AddSongToMedleyForm({
  medleyGroupId,
  sessionId,
  librarySongs,
  lastKey,
  nextPosition,
  onAdded,
}: {
  medleyGroupId: string;
  sessionId: string;
  librarySongs: LibrarySong[];
  lastKey: string | null;
  nextPosition: number;
  onAdded: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [useLibrary, setUseLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedSong, setSelectedSong] = useState<LibrarySong | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [keyUsed, setKeyUsed] = useState('');
  const [runThroughs, setRunThroughs] = useState(1);
  const [harmonyNotes, setHarmonyNotes] = useState('');
  const [arrangementNotes, setArrangementNotes] = useState('');

  const filteredLibrary = librarySearch.trim()
    ? librarySongs.filter((s) => s.title.toLowerCase().includes(librarySearch.toLowerCase()))
    : librarySongs;

  function handleSelectLibrarySong(song: LibrarySong) {
    setSelectedSong(song);
    setLibrarySearch(song.title);
    if (song.musical_key && !keyUsed) setKeyUsed(song.musical_key);
  }

  const keyChanged = lastKey && keyUsed && lastKey !== keyUsed;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = useLibrary ? (selectedSong?.title ?? librarySearch.trim()) : manualTitle.trim();
    if (!title) return;
    startTransition(async () => {
      await addSongToMedley(medleyGroupId, sessionId, {
        song_title: title,
        song_id: useLibrary ? (selectedSong?.id ?? null) : null,
        key_used: keyUsed || null,
        harmony_notes: harmonyNotes.trim() || null,
        arrangement_notes: arrangementNotes.trim() || null,
        run_throughs: runThroughs,
      });
      onAdded();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          Song #{nextPosition} in medley
        </p>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Library</span>
          <button type="button"
            onClick={() => { setUseLibrary((v) => !v); setSelectedSong(null); setLibrarySearch(''); }}
            className={`relative w-8 h-4 rounded-full transition-colors ${useLibrary ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
            <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${useLibrary ? 'translate-x-4' : ''}`} />
          </button>
        </label>
      </div>

      {useLibrary ? (
        <div>
          <input type="text" value={librarySearch}
            onChange={(e) => { setLibrarySearch(e.target.value); setSelectedSong(null); }}
            placeholder="Search library…"
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {librarySearch && !selectedSong && filteredLibrary.length > 0 && (
            <div className="mt-1 border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
              {filteredLibrary.slice(0, 6).map((song) => (
                <button key={song.id} type="button" onClick={() => handleSelectLibrarySong(song)}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-b border-slate-100 dark:border-slate-700 last:border-0 flex items-center justify-between">
                  <span>{song.title}</span>
                  {song.musical_key && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium ml-2 shrink-0">{song.musical_key}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {selectedSong && (
            <div className="mt-1 flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg px-2.5 py-1.5">
              <span className="text-sm text-amber-800 dark:text-amber-200 font-medium flex-1">{selectedSong.title}</span>
              <button type="button" onClick={() => { setSelectedSong(null); setLibrarySearch(''); }}
                className="text-amber-400 hover:text-amber-600 text-sm">✕</button>
            </div>
          )}
        </div>
      ) : (
        <input type="text" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)}
          required={!useLibrary} placeholder="Song title…"
          className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      )}

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Key</label>
          <select value={keyUsed} onChange={(e) => setKeyUsed(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
            <option value="">—</option>
            {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Runs</label>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setRunThroughs((v) => Math.max(1, v - 1))}
              className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center">−</button>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-5 text-center">{runThroughs}</span>
            <button type="button" onClick={() => setRunThroughs((v) => v + 1)}
              className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center">+</button>
          </div>
        </div>
      </div>

      {keyChanged && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
          Key change: {lastKey} → {keyUsed}
        </div>
      )}

      <textarea value={harmonyNotes} onChange={(e) => setHarmonyNotes(e.target.value)}
        placeholder="Harmony notes… (optional)" rows={2}
        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />

      <textarea value={arrangementNotes} onChange={(e) => setArrangementNotes(e.target.value)}
        placeholder="Arrangement notes… (optional)" rows={2}
        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />

      <button type="submit"
        disabled={isPending || (useLibrary ? !selectedSong && !librarySearch.trim() : !manualTitle.trim())}
        className="w-full bg-amber-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50">
        {isPending ? 'Adding…' : 'Add to Medley'}
      </button>
    </form>
  );
}
