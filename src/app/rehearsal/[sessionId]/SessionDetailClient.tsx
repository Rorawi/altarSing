'use client';

import { createContext, useContext, useEffect, useRef, useState, useTransition } from 'react';
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
import type { RehearsalSession, RehearsalSong, RehearsalMedleyGroup, CollectionForPicker } from '@/types';
import {
  addRehearsalSong,
  deleteRehearsalSong,
  updateRehearsalSong,
  reorderSessionItems,
  updateSessionProgramDate,
  setRehearsalSessionClosed,
  addMedleyGroup,
  deleteMedleyGroup,
  renameMedleyGroup,
  addSongToMedley,
  reorderSongsInMedley,
} from '@/lib/actions';
import { MUSICAL_KEYS, SERVICE_MOMENTS } from '@/lib/constants';
import LyricsModal from '@/components/LyricsModal';
import Icon from '@/components/Icon';

// ─── Types & Helpers ──────────────────────────────────────────────────────────

type LibrarySong = { id: string; title: string; musical_key: string | null };
type MedleyData = RehearsalMedleyGroup & { songs: RehearsalSong[] };
type SessionItem =
  | { itemType: 'song'; id: string; position: number; data: RehearsalSong }
  | { itemType: 'medley'; id: string; position: number; data: MedleyData };

type Member = { id: string; name: string };
const MembersContext = createContext<Member[]>([]);

const CollectionsContext = createContext<CollectionForPicker[]>([]);

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
  members,
  collections,
}: {
  session: RehearsalSession;
  songs: RehearsalSong[];
  medleyGroups: RehearsalMedleyGroup[];
  librarySongs: LibrarySong[];
  members: Member[];
  collections: CollectionForPicker[];
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

  function handleToggleSessionClosed() {
    startTransition(async () => {
      await setRehearsalSessionClosed(session.id, !session.is_closed);
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
    <MembersContext.Provider value={members}>
    <CollectionsContext.Provider value={collections}>
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start gap-3">
        <Link
          href="/rehearsal"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 -ml-1 mt-0.5 shrink-0"
        >
          <Icon name="arrow-left" size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-2xl font-semibold text-slate-950 dark:text-slate-100 leading-snug">
            {session.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{formattedDate}</p>
          {session.is_closed && <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Closed session · songs kept for review</p>}
        </div>
        <button
          onClick={handleToggleSessionClosed}
          disabled={isPending}
          className="button-secondary min-h-9 shrink-0 px-3 text-xs"
        >
          <Icon name={session.is_closed ? 'history' : 'check'} size={15} />
          {session.is_closed ? 'Reopen' : 'Close session'}
        </button>
      </div>

      {/* Song count + Add button */}
      <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
        <div>
          <h2 className="font-serif text-lg font-semibold text-slate-950 dark:text-slate-100">Rehearsal set</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {totalSongCount} song{totalSongCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setAddMode(addMode ? null : 'picker')}
          className="button-secondary"
        >
          <Icon name={addMode ? 'close' : 'plus'} size={16} />{addMode ? 'Cancel' : 'Add song'}
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
              <Icon name="music" size={21} className="text-violet-800 dark:text-violet-300" />
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
              <Icon name="music" size={21} className="text-amber-700 dark:text-amber-300" />
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
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"><Icon name="music" /></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">No songs yet</p>
          <button
            onClick={() => setAddMode('picker')}
          className="button-primary mt-4"
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
            <div className="space-y-0">
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

      {(session.program_date || editingProgramDate || session.notes || !session.program_converted) && (
        <section className="mt-7 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Service plan</p>
              {session.program_converted ? (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Logged on {new Date(session.program_date! + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              ) : session.program_date ? (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                  <Icon name="calendar" size={15} />
                  {new Date(session.program_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No service date set</p>
              )}
            </div>
            {!session.program_converted && (
              <button
                onClick={() => setEditingProgramDate((value) => !value)}
                className="button-quiet min-h-8 shrink-0 px-2 text-xs"
              >
                {editingProgramDate ? 'Cancel' : session.program_date ? 'Change date' : 'Set date'}
              </button>
            )}
          </div>

          {editingProgramDate && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={programDateInput}
                onChange={(event) => setProgramDateInput(event.target.value)}
                className="field-control max-w-xs"
              />
              <button onClick={handleSaveProgramDate} disabled={isPending} className="button-secondary min-h-10">Save date</button>
              {session.program_date && (
                <button onClick={handleClearProgramDate} disabled={isPending} className="button-danger-quiet min-h-9">Remove date</button>
              )}
            </div>
          )}

          {session.notes && <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{session.notes}</p>}
        </section>
      )}
    </div>
    </CollectionsContext.Provider>
    </MembersContext.Provider>
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
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasDetails = song.harmony_notes || song.arrangement_notes;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

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
    <div className="border-b border-slate-200 last:border-b-0 dark:border-slate-800">
      <div className="py-3">
        {/* Top row: drag, position, title, menu */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            {...dragListeners}
            {...dragAttributes}
            className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500 p-0.5"
            title="Drag to reorder"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
              <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
            </svg>
          </button>
          <span className="shrink-0 w-7 text-center font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
            {position}
          </span>
          <p className="font-serif font-medium text-slate-950 dark:text-slate-100 text-base leading-snug flex-1 min-w-0 break-words">
            {song.song_title}
          </p>
          <span className="min-w-8 shrink-0 text-right font-serif text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {song.key_used || '—'}
          </span>
          {/* Three-dot menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Song actions"
              aria-expanded={menuOpen}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 transition-colors"
              title="More options"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="popover-surface absolute right-0 top-8 z-50 min-w-40 rounded-md">
                {hasDetails && (
                  <button
                    onClick={() => { setExpanded((v) => !v); setMenuOpen(false); }}
                    className="popover-action border-b border-slate-100 dark:border-slate-800"
                  >
                    {expanded ? 'Hide Details' : 'Show Details'}
                  </button>
                )}
                <button
                  onClick={() => { setEditing(true); setMenuOpen(false); }}
                  className="popover-action border-b border-slate-100 dark:border-slate-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => { onDelete(song.id, song.song_title); setMenuOpen(false); }}
                  disabled={isPending}
                  className="popover-action-danger"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: key, run-throughs, leaders, lyrics pill */}
        <div className="flex items-center gap-x-2 gap-y-1 mt-1 ml-10 flex-wrap text-xs">
          {song.run_throughs > 1 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              × {song.run_throughs}
            </span>
          )}
          {song.run_throughs === 1 && (
            <span className="text-xs text-slate-400 dark:text-slate-500">× 1</span>
          )}
          {song.song_leaders && song.song_leaders.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Led by: <span className="font-medium text-slate-600 dark:text-slate-300">{song.song_leaders.join(', ')}</span>
            </span>
          )}
          {song.service_moment && (
            <span className="text-slate-500 dark:text-slate-400">
              {song.service_moment}
            </span>
          )}
          {/* Lyrics pill button */}
          <button
            onClick={() => setLyricsOpen(true)}
            className="button-quiet ml-auto min-h-8 shrink-0 px-2 text-xs"
            title="View lyrics"
          >
            <Icon name="lyrics" size={14} />Lyrics
          </button>
        </div>

        {expanded && hasDetails && (
          <div className="mt-3 pl-10 space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
            {song.harmony_notes && (
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Harmony</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{song.harmony_notes}</p>
              </div>
            )}
            {song.arrangement_notes && (
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Arrangement</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{song.arrangement_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <LyricsModal
        isOpen={lyricsOpen}
        onClose={() => setLyricsOpen(false)}
        songTitle={song.song_title}
        songId={song.song_id}
        rehearsalSongId={song.id}
      />
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
    <div className="border-l-2 border-amber-400 bg-amber-50/20 dark:border-amber-700 dark:bg-amber-950/10">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-amber-200/80 px-3 py-2.5 dark:border-amber-800/60">
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
        <span className="shrink-0 w-7 text-center font-mono text-xs tabular-nums text-amber-700 dark:text-amber-400">
          {position}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block leading-tight">
            Medley
          </span>
          {editingName ? (
            <span className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">{group.name}</span>
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
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${group.name}`}
          className="button-quiet min-h-11 min-w-11 shrink-0 gap-1 px-2 text-xs"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span>{collapsed ? 'Expand' : 'Collapse'}</span>
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

      {editingName && (
        <div className="border-b border-amber-200/80 px-3 py-3 dark:border-amber-800/60">
          <EditMedleyNameForm
            group={group}
            sessionId={sessionId}
            onDone={() => { setEditingName(false); onEdited(); }}
            onCancel={() => setEditingName(false)}
          />
        </div>
      )}

      {/* Expanded content */}
      {!collapsed && (
        <div className="px-3 py-2">
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
                                <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">
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
        <div className="border-t border-amber-200/70 px-4 py-3 dark:border-amber-800/50">
          <ol className="divide-y divide-amber-200/60 dark:divide-amber-800/40">
            {group.songs.slice(0, 3).map((song, index) => (
              <li key={song.id} className="grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-baseline gap-2 py-1.5 first:pt-0 last:pb-0">
                <span className="font-mono text-[10px] tabular-nums text-amber-700/70 dark:text-amber-400/70">{String(index + 1).padStart(2, '0')}</span>
                <span className="break-words text-sm font-medium text-slate-700 dark:text-slate-200">{song.song_title}</span>
                <span className="text-right font-serif text-sm font-semibold text-slate-700 dark:text-slate-200">{song.key_used || '—'}</span>
              </li>
            ))}
          </ol>
          {group.songs.length > 3 && (
            <p className="mt-2 border-t border-amber-200/60 pt-2 text-xs text-slate-500 dark:border-amber-800/40 dark:text-slate-400">
              + {group.songs.length - 3} more songs · expand the medley to see the full set
            </p>
          )}
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
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasDetails = song.harmony_notes || song.arrangement_notes;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

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
    <div className="border-b border-amber-200/70 last:border-b-0 dark:border-amber-800/40">
      <div className="py-2.5">
        {/* Top row: drag, position, title, menu */}
        <div className="flex items-center gap-2 mb-1.5">
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
          <span className="shrink-0 w-5 text-center font-mono text-[10px] tabular-nums text-amber-700 dark:text-amber-400">
            {position}
          </span>
          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-snug flex-1 min-w-0 break-words">
            {song.song_title}
          </p>
          {/* Three-dot menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Medley song actions"
              aria-expanded={menuOpen}
              className="text-amber-300 dark:text-amber-700 hover:text-amber-700 dark:hover:text-amber-400 p-0.5 transition-colors"
              title="More options"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="popover-surface absolute right-0 top-6 z-50 min-w-40 rounded-md">
                {hasDetails && (
                  <button
                    onClick={() => { setExpanded((v) => !v); setMenuOpen(false); }}
                    className="popover-action border-b border-slate-100 dark:border-slate-800"
                  >
                    {expanded ? 'Hide Details' : 'Show Details'}
                  </button>
                )}
                <button
                  onClick={() => { setEditing(true); setMenuOpen(false); }}
                  className="popover-action border-b border-slate-100 dark:border-slate-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => { onDelete(song.id, song.song_title); setMenuOpen(false); }}
                  disabled={isPending}
                  className="popover-action-danger"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: key, run-throughs, leaders, lyrics pill */}
        <div className="flex items-center gap-x-2 gap-y-1 mt-1 ml-8 flex-wrap text-xs">
          {song.key_used && (
            <span className="font-semibold tabular-nums text-amber-800 dark:text-amber-300">
              {song.key_used}
            </span>
          )}
          {song.run_throughs > 0 && (
            <span className="text-slate-500 dark:text-slate-400">
              × {song.run_throughs}
            </span>
          )}
          {song.song_leaders && song.song_leaders.length > 0 && (
            <span className="text-slate-500 dark:text-slate-400">
              Led by: <span className="font-medium text-slate-600 dark:text-slate-300">{song.song_leaders.join(', ')}</span>
            </span>
          )}
          {song.service_moment && (
            <span className="text-slate-500 dark:text-slate-400">
              {song.service_moment}
            </span>
          )}
          {/* Lyrics pill button */}
          <button
            onClick={() => setLyricsOpen(true)}
            className="button-quiet ml-auto min-h-8 shrink-0 px-2 text-xs text-amber-800 dark:text-amber-300"
            title="View lyrics"
          >
            <><Icon name="lyrics" size={14} />Lyrics</>
          </button>
        </div>

        {expanded && hasDetails && (
          <div className="mt-2 pl-8 space-y-1.5 border-t border-amber-50 dark:border-amber-900/30 pt-2">
            {song.harmony_notes && (
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Harmony</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{song.harmony_notes}</p>
              </div>
            )}
            {song.arrangement_notes && (
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Arrangement</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{song.arrangement_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <LyricsModal
        isOpen={lyricsOpen}
        onClose={() => setLyricsOpen(false)}
        songTitle={song.song_title}
        songId={song.song_id}
        rehearsalSongId={song.id}
      />
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="w-full max-w-2xl">
        <label htmlFor={`medley-name-${group.id}`} className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Rename medley
        </label>
        <input
          id={`medley-name-${group.id}`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
          className="field-control"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="button-secondary">Cancel</button>
        <button type="submit" disabled={isPending || !name.trim()} className="button-primary min-w-28">
          {isPending ? 'Saving…' : 'Save name'}
        </button>
      </div>
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
      className="space-y-4 rounded-b-md border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            New medley
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder="e.g. Praise Medley, Carol Medley…"
            className="field-control"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="button-primary sm:min-w-36"
        >
          {isPending ? 'Creating…' : 'Create medley'}
        </button>
      </div>
    </form>
  );
}

// ─── Song Leader Autocomplete Input ──────────────────────────────────────────

function SongLeaderInput({
  values,
  onChange,
}: {
  values: string[];
  onChange: (vals: string[]) => void;
}) {
  const members = useContext(MembersContext);
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = members.filter(
    (m) =>
      !values.includes(m.name) &&
      m.name.toLowerCase().includes(inputValue.toLowerCase()),
  );

  function addLeader(name: string) {
    const trimmed = name.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setInputValue('');
    setOpen(false);
  }

  function removeLeader(name: string) {
    onChange(values.filter((v) => v !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) addLeader(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      removeLeader(values[values.length - 1]);
    }
  }

  function commitTypedLeader() {
    if (inputValue.trim()) addLeader(inputValue);
  }

  return (
    <div className="relative">
      <div className="flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 focus-within:border-violet-700 focus-within:ring-2 focus-within:ring-violet-700/15 dark:border-slate-700 dark:bg-slate-900">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {v}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); removeLeader(v); }}
              aria-label={`Remove ${v}`}
              className="leading-none text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            commitTypedLeader();
            setOpen(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? 'Add leader name…' : ''}
          autoComplete="off"
          className="min-w-25 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            commitTypedLeader();
          }}
          className="button-quiet h-7 min-h-7 shrink-0 px-2 text-xs"
          title="Add typed leader"
        >
          +
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="popover-surface absolute left-0 right-0 z-20 mt-1 max-h-52 overflow-y-auto rounded-md">
          {filtered.slice(0, 6).map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={() => addLeader(m.name)}
              className="popover-action border-b border-slate-100 last:border-b-0 dark:border-slate-800"
            >
              {m.name}
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
        Pick from choir members or type any name and press Enter.
      </p>
    </div>
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
  const [serviceMoment, setServiceMoment] = useState(song.service_moment ?? '');
  const [songLeaders, setSongLeaders] = useState<string[]>(song.song_leaders ?? []);

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
        service_moment: serviceMoment || null,
        song_leaders: songLeaders,
      });
      onDone();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-b-md border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Edit song</p>
        <span className="text-xs text-slate-400 dark:text-slate-500">Update rehearsal details</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
        <div>
          <label htmlFor={`song-title-${song.id}`} className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Song title</label>
          <input
            id={`song-title-${song.id}`}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Song title"
            className="field-control"
          />
        </div>
        <div>
          <label htmlFor={`song-key-${song.id}`} className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Key</label>
          <select
            id={`song-key-${song.id}`}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="field-control"
          >
            <option value="">Unspecified</option>
            {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Run-throughs</span>
        <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          <button type="button" aria-label="Remove a run-through" onClick={() => setRunThroughs((v) => Math.max(1, v - 1))}
            className="icon-button h-8 w-8">−</button>
          <span className="w-7 text-center text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">{runThroughs}</span>
          <button type="button" aria-label="Add a run-through" onClick={() => setRunThroughs((v) => v + 1)}
            className="icon-button h-8 w-8">+</button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor={`harmony-${song.id}`} className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Harmony notes <span className="font-normal text-slate-400">(optional)</span></label>
          <textarea id={`harmony-${song.id}`} value={harmonyNotes} onChange={(e) => setHarmonyNotes(e.target.value)}
            placeholder="Voicing, entries, or parts to listen for…" rows={2}
            className="field-control resize-y" />
        </div>
        <div>
          <label htmlFor={`arrangement-${song.id}`} className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Arrangement notes <span className="font-normal text-slate-400">(optional)</span></label>
          <textarea id={`arrangement-${song.id}`} value={arrangementNotes} onChange={(e) => setArrangementNotes(e.target.value)}
            placeholder="Structure, transitions, or cues…" rows={2}
            className="field-control resize-y" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor={`service-moment-${song.id}`} className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Service moment <span className="font-normal text-slate-400">(optional)</span></label>
          <select id={`service-moment-${song.id}`} value={serviceMoment} onChange={(e) => setServiceMoment(e.target.value)} className="field-control">
            <option value="">— None —</option>
            {SERVICE_MOMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Song leaders <span className="font-normal text-slate-400">(optional)</span></label>
          <SongLeaderInput values={songLeaders} onChange={setSongLeaders} />
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        <button type="button" onClick={onCancel} className="button-secondary">Cancel</button>
        <button type="submit" disabled={isPending || !title.trim()} className="button-primary min-w-24">
          {isPending ? 'Saving…' : 'Save changes'}
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
  const [serviceMoment, setServiceMoment] = useState('');
  const [songLeaders, setSongLeaders] = useState<string[]>([]);
  const [collectionFilter, setCollectionFilter] = useState('');

  const collections = useContext(CollectionsContext);
  const activeCollection = collections.find((c) => c.id === collectionFilter) ?? null;

  const filteredLibrary = (() => {
    let list = librarySongs;
    if (activeCollection) {
      const ids = new Set(activeCollection.songs.map((s) => s.song_id).filter(Boolean));
      list = list.filter((s) => ids.has(s.id));
    }
    if (librarySearch.trim()) {
      list = list.filter((s) => s.title.toLowerCase().includes(librarySearch.toLowerCase()));
    }
    return list;
  })();

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
        service_moment: serviceMoment || null,
        song_leaders: songLeaders,
      });
      onAdded();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/30 sm:p-5"
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
          {collections.length > 0 && (
            <div className="mb-2">
              <select
                value={collectionFilter}
                onChange={(e) => { setCollectionFilter(e.target.value); setSelectedSong(null); setLibrarySearch(''); }}
            className="field-control"
              >
                <option value="">All songs</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Search Library</label>
          <input type="text" value={librarySearch}
            onChange={(e) => { setLibrarySearch(e.target.value); setSelectedSong(null); }}
            placeholder={activeCollection ? `Search in "${activeCollection.name}"…` : 'Type to search your song library…'}
            className="field-control"
          />
          {(librarySearch || activeCollection) && !selectedSong && filteredLibrary.length > 0 && (
            <div className="popover-surface mt-1 max-h-48 overflow-y-auto rounded-md">
              {filteredLibrary.slice(0, 8).map((song) => (
                <button key={song.id} type="button" onClick={() => handleSelectLibrarySong(song)}
                  className="popover-action justify-between border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <span>{song.title}</span>
                  {song.musical_key && (
                    <span className="ml-3 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{song.musical_key}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {selectedSong && (
            <div className="mt-1.5 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">{selectedSong.title}</span>
              <button type="button" onClick={() => { setSelectedSong(null); setLibrarySearch(''); }}
                aria-label="Clear selected song" className="icon-button h-7 w-7">×</button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Song Title</label>
          <input type="text" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)}
            required={!useLibrary} placeholder="Enter song title…"
            className="field-control"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          Key Used <span className="text-slate-400 font-normal">(for this session)</span>
        </label>
        <select value={keyUsed} onChange={(e) => setKeyUsed(e.target.value)}
          className="field-control">
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

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          Service Moment <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <select value={serviceMoment} onChange={(e) => setServiceMoment(e.target.value)}
          className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option value="">— None —</option>
          {SERVICE_MOMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          Song Leaders <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <SongLeaderInput
          values={songLeaders}
          onChange={setSongLeaders}
        />
      </div>

      <button type="submit"
        disabled={isPending || (useLibrary ? !selectedSong && !librarySearch.trim() : !manualTitle.trim())}
        className="button-primary w-full sm:w-auto sm:min-w-40">
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
  const [serviceMoment, setServiceMoment] = useState('');
  const [songLeaders, setSongLeaders] = useState<string[]>([]);
  const [collectionFilter, setCollectionFilter] = useState('');

  const collections = useContext(CollectionsContext);
  const activeCollection = collections.find((c) => c.id === collectionFilter) ?? null;

  const filteredLibrary = (() => {
    let list = librarySongs;
    if (activeCollection) {
      const ids = new Set(activeCollection.songs.map((s) => s.song_id).filter(Boolean));
      list = list.filter((s) => ids.has(s.id));
    }
    if (librarySearch.trim()) {
      list = list.filter((s) => s.title.toLowerCase().includes(librarySearch.toLowerCase()));
    }
    return list;
  })();

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
        service_moment: serviceMoment || null,
        song_leaders: songLeaders,
      });
      onAdded();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/30"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
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
          {collections.length > 0 && (
            <div className="mb-1.5">
              <select
                value={collectionFilter}
                onChange={(e) => { setCollectionFilter(e.target.value); setSelectedSong(null); setLibrarySearch(''); }}
                className="field-control"
              >
                <option value="">All songs</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <input type="text" value={librarySearch}
            onChange={(e) => { setLibrarySearch(e.target.value); setSelectedSong(null); }}
            placeholder={activeCollection ? `"${activeCollection.name}"…` : 'Search library…'}
            className="field-control"
          />
          {(librarySearch || activeCollection) && !selectedSong && filteredLibrary.length > 0 && (
            <div className="popover-surface mt-1 max-h-40 overflow-y-auto rounded-md">
              {filteredLibrary.slice(0, 6).map((song) => (
                <button key={song.id} type="button" onClick={() => handleSelectLibrarySong(song)}
                  className="popover-action justify-between border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <span>{song.title}</span>
                  {song.musical_key && (
                    <span className="ml-3 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{song.musical_key}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {selectedSong && (
            <div className="mt-1 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900">
              <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">{selectedSong.title}</span>
              <button type="button" onClick={() => { setSelectedSong(null); setLibrarySearch(''); }}
                aria-label="Clear selected song" className="icon-button h-7 w-7">×</button>
            </div>
          )}
        </div>
      ) : (
        <input type="text" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)}
          required={!useLibrary} placeholder="Song title…"
          className="field-control"
        />
      )}

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Key</label>
          <select value={keyUsed} onChange={(e) => setKeyUsed(e.target.value)}
            className="field-control">
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
        <div className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Key change: {lastKey} → {keyUsed}
        </div>
      )}

      <textarea value={harmonyNotes} onChange={(e) => setHarmonyNotes(e.target.value)}
        placeholder="Harmony notes… (optional)" rows={2}
        className="field-control resize-y" />

      <textarea value={arrangementNotes} onChange={(e) => setArrangementNotes(e.target.value)}
        placeholder="Arrangement notes… (optional)" rows={2}
        className="field-control resize-y" />

      <div>
        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Service moment <span className="font-normal">(optional)</span></label>
        <select value={serviceMoment} onChange={(e) => setServiceMoment(e.target.value)}
          className="field-control">
          <option value="">— None —</option>
          {SERVICE_MOMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Song Leaders <span className="font-normal">(optional)</span></label>
        <SongLeaderInput
          values={songLeaders}
          onChange={setSongLeaders}
        />
      </div>

      <button type="submit"
        disabled={isPending || (useLibrary ? !selectedSong && !librarySearch.trim() : !manualTitle.trim())}
        className="button-primary w-full sm:w-auto sm:min-w-36">
        {isPending ? 'Adding…' : 'Add to Medley'}
      </button>
    </form>
  );
}
