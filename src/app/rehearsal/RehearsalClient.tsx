'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RehearsalSessionWithSongs, HarmonyPattern } from '@/types';
import { deleteRehearsalSession, setRehearsalSessionClosed, addHarmonyPattern, deleteHarmonyPattern } from '@/lib/actions';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';
import { useLoading } from '@/lib/loading-context';

type Tab = 'sessions' | 'harmony';

function dateValue(date: string) {
  return new Date(`${date}T00:00:00`).getTime();
}

function formatDate(date: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', options);
}

export default function RehearsalClient({
  initialSessions,
  initialHarmonies,
}: {
  initialSessions: RehearsalSessionWithSongs[];
  initialHarmonies: HarmonyPattern[];
}) {
  const router = useRouter();
  const { startLoading } = useLoading();
  const [tab, setTab] = useState<Tab>('sessions');
  const [search, setSearch] = useState('');
  const [showAddHarmony, setShowAddHarmony] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return initialSessions;
    return initialSessions.filter((session) =>
      session.name.toLowerCase().includes(query) || session.date.includes(query) || session.program_date?.includes(query) ||
      session.rehearsal_songs.some((song) => song.song_title.toLowerCase().includes(query)),
    );
  }, [initialSessions, search]);

  const { featuredSession, otherUpcomingSessions, otherPastSessions, closedSessions } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openSessions = filteredSessions.filter((session) => !session.is_closed);
    const completedSessions = filteredSessions.filter((session) => session.is_closed);
    const upcomingPlans = openSessions
      .filter((session) => session.program_date && dateValue(session.program_date) >= today.getTime())
      .sort((a, b) => dateValue(a.program_date!) - dateValue(b.program_date!) || dateValue(a.date) - dateValue(b.date));
    const pastPlans = openSessions
      .filter((session) => session.program_date && dateValue(session.program_date) < today.getTime())
      .sort((a, b) => dateValue(b.program_date!) - dateValue(a.program_date!));
    const undatedPlans = openSessions
      .filter((session) => !session.program_date)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const next = upcomingPlans[0] ?? pastPlans[0] ?? undatedPlans[0] ?? null;
    const withoutFeatured = (sessions: RehearsalSessionWithSongs[]) => sessions.filter((session) => session.id !== next?.id);
    const closed = completedSessions.sort((a, b) => {
      const aDate = a.program_date ? dateValue(a.program_date) : dateValue(a.date);
      const bDate = b.program_date ? dateValue(b.program_date) : dateValue(b.date);
      return bDate - aDate;
    });

    return {
      featuredSession: next,
      otherUpcomingSessions: withoutFeatured(upcomingPlans),
      otherPastSessions: [...withoutFeatured(pastPlans), ...withoutFeatured(undatedPlans)],
      closedSessions: closed,
    };
  }, [filteredSessions]);

  function handleDeleteSession(id: string, name: string) {
    if (!confirm(`Delete session "${name}"? This will also remove all songs in it.`)) return;
    startTransition(async () => {
      await deleteRehearsalSession(id);
      router.refresh();
    });
  }

  function handleToggleSessionClosed(id: string, isClosed: boolean) {
    startTransition(async () => {
      await setRehearsalSessionClosed(id, isClosed);
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

  async function handleAddHarmony(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await addHarmonyPattern(formData);
      router.refresh();
      setShowAddHarmony(false);
    });
  }

  const pageDescription = tab === 'sessions'
    ? `${initialSessions.length} rehearsal session${initialSessions.length !== 1 ? 's' : ''}`
    : `${initialHarmonies.length} saved harmony pattern${initialHarmonies.length !== 1 ? 's' : ''}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFeaturedProgramUpcoming = Boolean(featuredSession?.program_date && dateValue(featuredSession.program_date) >= today.getTime());
  const featuredLabel = isFeaturedProgramUpcoming
    ? 'Next rehearsal'
    : featuredSession?.program_date
      ? 'Most recent service plan'
      : 'Rehearsal plan · no program date';
  const featuredSongs = featuredSession
    ? [...featuredSession.rehearsal_songs].sort((a, b) => a.position - b.position)
    : [];
  const previewSongs = featuredSongs.slice(0, 5);
  const remainingSongCount = featuredSongs.length - previewSongs.length;

  return (
    <div>
      <PageHeader
        title="Rehearsals"
        description={pageDescription}
        actions={tab === 'sessions'
          ? <Link href="/rehearsal/new" className="button-primary"><Icon name="plus" size={16} />New session</Link>
          : <button onClick={() => setShowAddHarmony((value) => !value)} className="button-primary"><Icon name={showAddHarmony ? 'close' : 'plus'} size={16} />{showAddHarmony ? 'Cancel' : 'Add pattern'}</button>}
      />

      <div className="mb-6 flex gap-6 border-b border-slate-200 dark:border-slate-800">
        {([['sessions', 'Sessions'], ['harmony', 'Harmony patterns']] as const).map(([value, label]) => (
          <button key={value} onClick={() => setTab(value)} aria-current={tab === value ? 'page' : undefined} className={`-mb-px border-b-2 px-1 py-3 text-sm font-medium transition-colors ${tab === value ? 'border-violet-800 text-violet-900 dark:border-violet-300 dark:text-violet-200' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'sessions' ? (
        <>
          <label className="relative mb-5 block max-w-lg">
            <span className="sr-only">Search rehearsals</span>
            <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Search sessions, dates, or songs…" value={search} onChange={(event) => setSearch(event.target.value)} className="field-control pl-9" />
          </label>

          {featuredSession ? (
            <>
              <section className="mb-8 border-y border-slate-200 dark:border-slate-800">
                <div className="flex flex-col gap-4 px-1 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{featuredLabel}</p>
                    <h2 className="mt-1 break-words font-serif text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{featuredSession.name}</h2>
                    {featuredSession.program_date ? (
                      <>
                        <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">For service on {formatDate(featuredSession.program_date)}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Rehearsal session · {formatDate(featuredSession.date)}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No program date set · {formatDate(featuredSession.date)}</p>
                    )}
                  </div>
                  <Link href={`/rehearsal/${featuredSession.id}`} onNavigate={startLoading} className="button-secondary shrink-0">Open rehearsal <Icon name="chevron-right" size={15} /></Link>
                </div>
                <div className="flex items-baseline justify-between border-t border-slate-200 px-1 py-2 dark:border-slate-800 sm:px-2">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Rehearsal set</h3>
                  <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{featuredSession.rehearsal_songs.length} song{featuredSession.rehearsal_songs.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewSongs.map((song, index) => (
                    <div key={song.id} className="grid grid-cols-[32px_minmax(0,1fr)_56px] items-center gap-3 px-1 py-3 sm:grid-cols-[40px_minmax(0,1fr)_72px] sm:px-2">
                      <span className="font-mono text-xs tabular-nums text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                      <span className="min-w-0">
                        <span className="block break-words font-serif text-base font-medium text-slate-950 dark:text-slate-100">{song.song_title}</span>
                        {song.service_moment && <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{song.service_moment}</span>}
                      </span>
                      <span className="text-right font-serif text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">{song.key_used || '—'}</span>
                    </div>
                  ))}
                  {featuredSession.rehearsal_songs.length === 0 && <p className="px-1 py-6 text-sm text-slate-500 sm:px-2">No songs have been added to this rehearsal yet.</p>}
                </div>
                {remainingSongCount > 0 && (
                  <div className="flex flex-col gap-2 border-t border-slate-200 px-1 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{remainingSongCount} more song{remainingSongCount === 1 ? '' : 's'} in the full rehearsal set</p>
                    <Link href={`/rehearsal/${featuredSession.id}`} onNavigate={startLoading} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-800 hover:text-violet-950 dark:text-violet-300 dark:hover:text-violet-100">
                      Open the full set <Icon name="chevron-right" size={14} />
                    </Link>
                  </div>
                )}
                {featuredSession.notes && <div className="border-t border-slate-200 px-1 py-3 dark:border-slate-800 sm:px-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rehearsal notes</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{featuredSession.notes}</p></div>}
              </section>

            </>
          ) : (
            <div className="border-y border-slate-200 py-16 text-center dark:border-slate-800">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"><Icon name="music" /></div>
              <h2 className="font-medium text-slate-800 dark:text-slate-100">{search ? 'No open rehearsals match your search' : filteredSessions.length > 0 ? 'No open rehearsal plans' : 'No rehearsal sessions yet'}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{search ? 'Try a different date, song, or session name.' : filteredSessions.length > 0 ? 'Closed sessions remain below, with their setlists available to view.' : 'Create a plan to organize songs and notes for the choir.'}</p>
              {!search && <Link href="/rehearsal/new" className="button-primary mt-5"><Icon name="plus" size={16} />Create rehearsal</Link>}
            </div>
          )}

          <SessionRowsSection
            title="Other upcoming programs"
            sessions={otherUpcomingSessions}
            onDelete={handleDeleteSession}
            onToggleClosed={handleToggleSessionClosed}
            isPending={isPending}
          />
          <SessionRowsSection
            title="Earlier or undated sessions"
            sessions={otherPastSessions}
            onDelete={handleDeleteSession}
            onToggleClosed={handleToggleSessionClosed}
            isPending={isPending}
          />
          <SessionRowsSection
            title="Closed sessions"
            description="Setlists and notes stay available to review."
            sessions={closedSessions}
            isClosed
            onDelete={handleDeleteSession}
            onToggleClosed={handleToggleSessionClosed}
            isPending={isPending}
          />
        </>
      ) : (
        <div className="max-w-4xl">
          {showAddHarmony && <form onSubmit={handleAddHarmony} className="mb-5 border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">New harmony pattern</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Pattern name<input name="name" required placeholder="e.g. SAT harmony" className="field-control mt-1" /></label>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 sm:col-span-2">Description<textarea name="description" required rows={3} placeholder="Describe the vocal arrangement…" className="field-control mt-1 resize-y" /></label>
            </div>
            <div className="mt-4 flex justify-end"><button type="submit" disabled={isPending} className="button-primary">{isPending ? 'Saving…' : 'Save pattern'}</button></div>
          </form>}
          {initialHarmonies.length === 0 && !showAddHarmony ? (
            <div className="border-y border-slate-200 py-16 text-center dark:border-slate-800"><div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"><Icon name="music" /></div><h2 className="font-medium text-slate-800 dark:text-slate-100">No harmony patterns saved</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Save arrangements you want to reuse during rehearsals.</p><button onClick={() => setShowAddHarmony(true)} className="button-primary mt-5"><Icon name="plus" size={16} />Add pattern</button></div>
          ) : <div className="border-y border-slate-200 dark:border-slate-800">{initialHarmonies.map((harmony) => <HarmonyRow key={harmony.id} harmony={harmony} onDelete={handleDeleteHarmony} isPending={isPending} />)}</div>}
        </div>
      )}
    </div>
  );
}

function SessionRowsSection({
  title,
  description,
  sessions,
  isClosed = false,
  onDelete,
  onToggleClosed,
  isPending,
}: {
  title: string;
  description?: string;
  sessions: RehearsalSessionWithSongs[];
  isClosed?: boolean;
  onDelete: (id: string, name: string) => void;
  onToggleClosed: (id: string, isClosed: boolean) => void;
  isPending: boolean;
}) {
  if (sessions.length === 0) return null;
  return (
    <section className="mt-7">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        <span className="text-xs tabular-nums text-slate-400">{sessions.length}</span>
      </div>
      {description && <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      <div className="border-y border-slate-200 dark:border-slate-800">
        {sessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            isClosed={isClosed}
            onDelete={onDelete}
            onToggleClosed={onToggleClosed}
            isPending={isPending}
          />
        ))}
      </div>
    </section>
  );
}

function SessionRow({
  session,
  isClosed,
  onDelete,
  onToggleClosed,
  isPending,
}: {
  session: RehearsalSessionWithSongs;
  isClosed: boolean;
  onDelete: (id: string, name: string) => void;
  onToggleClosed: (id: string, isClosed: boolean) => void;
  isPending: boolean;
}) {
  const { startLoading } = useLoading();
  const songs = [...session.rehearsal_songs].sort((a, b) => a.position - b.position);
  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-white dark:border-slate-800 dark:hover:bg-slate-900 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
      <Link href={`/rehearsal/${session.id}`} onNavigate={startLoading} className="grid min-w-0 flex-1 grid-cols-1 gap-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(180px,1fr)_72px] sm:items-center sm:gap-4">
        <span className="break-words font-serif text-base font-medium text-slate-900 dark:text-slate-100">{session.name}</span>
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {session.program_date ? (
            <>
              <span className="block font-medium">Program · {formatDate(session.program_date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="mt-0.5 block text-slate-500 dark:text-slate-400">Rehearsal · {formatDate(session.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </>
          ) : (
            <>
              <span className="block text-slate-500 dark:text-slate-400">No program date</span>
              <span className="mt-0.5 block">Rehearsal · {formatDate(session.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </>
          )}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{songs.length} song{songs.length !== 1 ? 's' : ''}</span>
      </Link>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => onToggleClosed(session.id, !isClosed)}
          disabled={isPending}
          className="button-quiet min-h-8 px-2 text-xs"
        >
          <Icon name={isClosed ? 'history' : 'check'} size={15} />{isClosed ? 'Reopen' : 'Close'}
        </button>
        <Link href={`/rehearsal/${session.id}`} onNavigate={startLoading} className="button-quiet min-h-8 px-2 text-xs">Open</Link>
        <button onClick={() => onDelete(session.id, session.name)} disabled={isPending} className="icon-button h-8 w-8 text-slate-400 hover:text-red-700 dark:hover:text-red-300" title="Delete session" aria-label={`Delete ${session.name}`}><Icon name="trash" size={15} /></button>
      </div>
    </div>
  );
}

function HarmonyRow({ harmony, onDelete, isPending }: { harmony: HarmonyPattern; onDelete: (id: string, name: string) => void; isPending: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b border-slate-200 px-4 py-4 last:border-b-0 dark:border-slate-800 sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <button onClick={() => setExpanded((value) => !value)} className="min-w-0 flex-1 text-left">
          <span className="font-medium text-slate-900 dark:text-slate-100">{harmony.name}</span>
          {!expanded && <span className="mt-1 block line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{harmony.description}</span>}
        </button>
        <div className="flex shrink-0 items-center gap-1"><button onClick={() => setExpanded((value) => !value)} aria-label={expanded ? 'Collapse pattern' : 'Expand pattern'} className="icon-button h-8 w-8"><Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={15} /></button><button onClick={() => onDelete(harmony.id, harmony.name)} disabled={isPending} className="icon-button h-8 w-8 hover:text-red-700 dark:hover:text-red-300" title="Delete pattern" aria-label={`Delete ${harmony.name}`}><Icon name="trash" size={15} /></button></div>
      </div>
      {expanded && <p className="mt-3 max-w-3xl whitespace-pre-wrap border-l-2 border-violet-700 pl-3 text-sm leading-relaxed text-slate-600 dark:border-violet-300 dark:text-slate-300">{harmony.description}</p>}
    </div>
  );
}
