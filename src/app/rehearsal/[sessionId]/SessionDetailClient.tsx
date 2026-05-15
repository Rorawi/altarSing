'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RehearsalSession, RehearsalSong } from '@/types';
import { addRehearsalSong, deleteRehearsalSong, updateSessionProgramDate } from '@/lib/actions';
import { MUSICAL_KEYS } from '@/lib/constants';

type LibrarySong = { id: string; title: string; musical_key: string | null };

export default function SessionDetailClient({
  session,
  songs,
  librarySongs,
}: {
  session: RehearsalSession;
  songs: RehearsalSong[];
  librarySongs: LibrarySong[];
}) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editingProgramDate, setEditingProgramDate] = useState(false);
  const [programDateInput, setProgramDateInput] = useState(session.program_date ?? '');

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

  const formattedDate = new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  function handleDeleteSong(id: string, title: string) {
    if (!confirm(`Remove "${title}" from this session?`)) return;
    startTransition(async () => {
      await deleteRehearsalSong(id, session.id);
      router.refresh();
    });
  }

  function handleSongAdded() {
    setShowAddForm(false);
    router.refresh();
  }

  const lastKey = songs.length > 0 ? songs[songs.length - 1].key_used : null;

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
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">{session.name}</h1>
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
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
            ) : session.program_date ? (
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                📅{' '}
                {new Date(session.program_date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
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

      {/* Song count summary */}
      <div className="flex items-center justify-between mb-4">        <p className="text-sm text-slate-500 dark:text-slate-400">
          {songs.length} song{songs.length !== 1 ? 's' : ''} in this session
        </p>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm"
        >
          {showAddForm ? 'Cancel' : '+ Add Song'}
        </button>
      </div>

      {/* Visual song sequence */}
      {songs.length === 0 && !showAddForm ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎶</p>
          <p className="text-slate-500 dark:text-slate-400 font-medium">No songs yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            Add first song
          </button>
        </div>
      ) : (
        <div className="space-y-0">
          {songs.map((song, index) => (
            <div key={song.id}>
              {/* Connector from previous song */}
              {index > 0 && (
                <div className="flex flex-col items-center py-1">
                  {song.has_modulation ? (
                    <div className="flex items-center gap-1.5 py-1">
                      <div className="w-px h-3 bg-amber-300 dark:bg-amber-600" />
                      <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700">
                        {song.modulation_from && song.modulation_to
                          ? `${song.modulation_from} → ${song.modulation_to}`
                          : 'key change'}
                      </span>
                      <div className="w-px h-3 bg-amber-300 dark:bg-amber-600" />
                    </div>
                  ) : (
                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
                  )}
                </div>
              )}

              <SongCard
                song={song}
                position={index + 1}
                onDelete={handleDeleteSong}
                isPending={isPending}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add Song Form */}
      {showAddForm && (
        <div className="mt-4">
          {songs.length > 0 && <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-auto mb-0" />}
          <AddSongForm
            sessionId={session.id}
            librarySongs={librarySongs}
            lastKey={lastKey}
            nextPosition={songs.length + 1}
            onAdded={handleSongAdded}
          />
        </div>
      )}
    </div>
  );
}

// ─── Song Card ─────────────────────────────────────────────────────────────────

function SongCard({
  song,
  position,
  onDelete,
  isPending,
}: {
  song: RehearsalSong;
  position: number;
  onDelete: (id: string, title: string) => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = song.harmony_notes || song.arrangement_notes;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Position badge */}
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
              onClick={() => onDelete(song.id, song.song_title)}
              disabled={isPending}
              className="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors text-lg leading-none disabled:opacity-50"
              title="Remove from session"
            >
              ×
            </button>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && hasDetails && (
          <div className="mt-3 pl-10 space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
            {song.harmony_notes && (
              <div>
                <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-0.5">
                  Harmony
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {song.harmony_notes}
                </p>
              </div>
            )}
            {song.arrangement_notes && (
              <div>
                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">
                  Arrangement
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {song.arrangement_notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Song Form ─────────────────────────────────────────────────────────────

function AddSongForm({
  sessionId,
  librarySongs,
  lastKey,
  nextPosition,
  onAdded,
}: {
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
  const [hasModulation, setHasModulation] = useState(false);
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
    const title = useLibrary
      ? (selectedSong?.title ?? librarySearch.trim())
      : manualTitle.trim();
    if (!title) return;

    startTransition(async () => {
      await addRehearsalSong(sessionId, {
        song_title: title,
        song_id: useLibrary ? (selectedSong?.id ?? null) : null,
        key_used: keyUsed || null,
        has_modulation: hasModulation,
        modulation_from: hasModulation ? (lastKey ?? null) : null,
        modulation_to: hasModulation ? (keyUsed || null) : null,
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
            onClick={() => {
              setUseLibrary((v) => !v);
              setSelectedSong(null);
              setLibrarySearch('');
            }}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              useLibrary ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                useLibrary ? 'translate-x-4' : ''
              }`}
            />
          </button>
        </label>
      </div>

      {/* Song title */}
      {useLibrary ? (
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Search Library
          </label>
          <input
            type="text"
            value={librarySearch}
            onChange={(e) => {
              setLibrarySearch(e.target.value);
              setSelectedSong(null);
            }}
            placeholder="Type to search your song library…"
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          {librarySearch && !selectedSong && filteredLibrary.length > 0 && (
            <div className="mt-1 border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {filteredLibrary.slice(0, 8).map((song) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => handleSelectLibrarySong(song)}
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
          {selectedSong && (
            <div className="mt-1.5 flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl px-3 py-2">
              <span className="text-sm text-violet-700 dark:text-violet-300 font-medium flex-1">{selectedSong.title}</span>
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
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Song Title
          </label>
          <input
            type="text"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            required={!useLibrary}
            placeholder="Enter song title…"
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
      )}

      {/* Key */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          Key Used <span className="text-slate-400 font-normal">(for this session)</span>
        </label>
        <select
          value={keyUsed}
          onChange={(e) => setKeyUsed(e.target.value)}
          className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="">Select key…</option>
          {MUSICAL_KEYS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      {/* Modulation */}
      {nextPosition > 1 && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasModulation}
            onChange={(e) => setHasModulation(e.target.checked)}
            className="w-4 h-4 accent-violet-600"
          />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            Modulated from previous song
            {lastKey && (
              <span className="text-slate-400 dark:text-slate-500"> (was {lastKey})</span>
            )}
          </span>
        </label>
      )}

      {hasModulation && lastKey && keyUsed && lastKey !== keyUsed && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
          Key change: {lastKey} → {keyUsed}
        </div>
      )}

      {/* Run-throughs */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          Run-throughs
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setRunThroughs((v) => Math.max(1, v - 1))}
            className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center text-lg"
          >
            −
          </button>
          <span className="text-slate-900 dark:text-slate-100 font-semibold w-6 text-center">{runThroughs}</span>
          <button
            type="button"
            onClick={() => setRunThroughs((v) => v + 1)}
            className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center text-lg"
          >
            +
          </button>
        </div>
      </div>

      {/* Harmony notes */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          Harmony Notes <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={harmonyNotes}
          onChange={(e) => setHarmonyNotes(e.target.value)}
          rows={2}
          placeholder="e.g. Soprano takes melody, alto a third below, tenor holds the fifth…"
          className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none placeholder-slate-400"
        />
      </div>

      {/* Arrangement notes */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          Arrangement Notes <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={arrangementNotes}
          onChange={(e) => setArrangementNotes(e.target.value)}
          rows={2}
          placeholder="e.g. Drum break after second verse, slow down for final chorus…"
          className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none placeholder-slate-400"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || (useLibrary ? (!selectedSong && !librarySearch.trim()) : !manualTitle.trim())}
        className="w-full bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Adding…' : `Add Song #${nextPosition}`}
      </button>
    </form>
  );
}
