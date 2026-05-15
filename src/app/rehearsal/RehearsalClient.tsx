'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RehearsalSessionWithSongs, HarmonyPattern } from '@/types';
import { deleteRehearsalSession, addHarmonyPattern, deleteHarmonyPattern } from '@/lib/actions';

type Tab = 'sessions' | 'harmony';

export default function RehearsalClient({
  initialSessions,
  initialHarmonies,
}: {
  initialSessions: RehearsalSessionWithSongs[];
  initialHarmonies: HarmonyPattern[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('sessions');
  const [search, setSearch] = useState('');
  const [showAddHarmony, setShowAddHarmony] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return initialSessions;
    const q = search.toLowerCase();
    return initialSessions.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.date.includes(q) ||
        s.rehearsal_songs.some((song) => song.song_title.toLowerCase().includes(q)),
    );
  }, [initialSessions, search]);

  function handleDeleteSession(id: string, name: string) {
    if (!confirm(`Delete session "${name}"? This will also remove all songs in it.`)) return;
    startTransition(async () => {
      await deleteRehearsalSession(id);
      router.refresh();
    });
  }

  function handleDeleteHarmony(id: string, name: string) {
    if (!confirm(`Delete harmony pattern "${name}"?`)) return;
    startTransition(async () => {
      await deleteHarmonyPattern(id);
      router.refresh();
    });
  }

  async function handleAddHarmony(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await addHarmonyPattern(formData);
      router.refresh();
      setShowAddHarmony(false);
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Rehearsal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {initialSessions.length} session{initialSessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        {tab === 'sessions' && (
          <Link
            href="/rehearsal/new"
            className="bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm"
          >
            + New Session
          </Link>
        )}
        {tab === 'harmony' && (
          <button
            onClick={() => setShowAddHarmony((v) => !v)}
            className="bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm"
          >
            {showAddHarmony ? 'Cancel' : '+ Add Pattern'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['sessions', 'harmony'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tab === t
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-300'
            }`}
          >
            {t === 'sessions' ? '🎼 Sessions' : '🎵 Harmony Patterns'}
          </button>
        ))}
      </div>

      {/* Sessions tab */}
      {tab === 'sessions' && (
        <div>
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by name, date, or song…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
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

          {filteredSessions.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🎼</p>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
                {initialSessions.length === 0 ? 'No sessions yet' : 'No sessions match your search'}
              </p>
              {initialSessions.length === 0 && (
                <Link
                  href="/rehearsal/new"
                  className="inline-block mt-4 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
                >
                  Start your first session
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onDelete={handleDeleteSession}
                  isPending={isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Harmony tab */}
      {tab === 'harmony' && (
        <div>
          {showAddHarmony && (
            <form
              onSubmit={handleAddHarmony}
              className="bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 rounded-2xl p-4 mb-4 space-y-3"
            >
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">New Harmony Pattern</p>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Pattern Name
                </label>
                <input
                  name="name"
                  required
                  placeholder="e.g. SAT Harmony"
                  className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  placeholder="e.g. Soprano takes melody, alto harmonises a third below, tenor holds the fifth"
                  className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                Save Pattern
              </button>
            </form>
          )}

          {initialHarmonies.length === 0 && !showAddHarmony ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🎵</p>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">No harmony patterns saved</p>
              <button
                onClick={() => setShowAddHarmony(true)}
                className="inline-block mt-4 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
              >
                Add your first pattern
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {initialHarmonies.map((harmony) => (
                <HarmonyCard
                  key={harmony.id}
                  harmony={harmony}
                  onDelete={handleDeleteHarmony}
                  isPending={isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SessionCard({
  session,
  onDelete,
  isPending,
}: {
  session: RehearsalSessionWithSongs;
  onDelete: (id: string, name: string) => void;
  isPending: boolean;
}) {
  const formattedDate = new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const songs = [...session.rehearsal_songs].sort((a, b) => a.position - b.position);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      <Link href={`/rehearsal/${session.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug">{session.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formattedDate}</p>
            {session.notes && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic line-clamp-1">{session.notes}</p>
            )}
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
            {songs.length} song{songs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Key progression preview */}
        {songs.some((s) => s.key_used) && (
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {songs.slice(0, 6).map((song, i) => (
              <span key={song.id} className="flex items-center gap-0.5">
                {song.key_used ? (
                  <span className="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {song.key_used}
                  </span>
                ) : (
                  <span className="bg-slate-100 dark:bg-slate-700 text-slate-400 text-[10px] px-1.5 py-0.5 rounded">—</span>
                )}
                {i < Math.min(songs.length, 6) - 1 && (
                  <span className="text-slate-300 dark:text-slate-600 text-[10px]">→</span>
                )}
              </span>
            ))}
            {songs.length > 6 && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">+{songs.length - 6} more</span>
            )}
          </div>
        )}

        {/* Song titles preview */}
        {songs.length > 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 line-clamp-1">
            {songs.map((s) => s.song_title).join(' · ')}
          </p>
        )}
      </Link>

      <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2 flex justify-end">
        <button
          onClick={() => onDelete(session.id, session.name)}
          disabled={isPending}
          className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-50"
        >
          Delete session
        </button>
      </div>
    </div>
  );
}

function HarmonyCard({
  harmony,
  onDelete,
  isPending,
}: {
  harmony: HarmonyPattern;
  onDelete: (id: string, name: string) => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setExpanded((v) => !v)} className="flex-1 text-left">
          <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{harmony.name}</p>
          {!expanded && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{harmony.description}</p>
          )}
        </button>
        <button
          onClick={() => onDelete(harmony.id, harmony.name)}
          disabled={isPending}
          className="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors text-lg leading-none shrink-0 disabled:opacity-50"
          title="Delete pattern"
        >
          ×
        </button>
      </div>
      {expanded && (
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
          {harmony.description}
        </p>
      )}
    </div>
  );
}
