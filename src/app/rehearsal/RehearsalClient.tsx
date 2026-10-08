'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RehearsalSessionWithSongs, HarmonyPattern } from '@/types';
import { deleteRehearsalSession, addHarmonyPattern, deleteHarmonyPattern } from '@/lib/actions';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

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
  const [tab, setTab] = useState<Tab>('sessions');
  const [search, setSearch] = useState('');
  const [showAddHarmony, setShowAddHarmony] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return initialSessions;
    return initialSessions.filter((session) =>
      session.name.toLowerCase().includes(query) || session.date.includes(query) ||
      session.rehearsal_songs.some((song) => song.song_title.toLowerCase().includes(query)),
    );
  }, [initialSessions, search]);

  const { featuredSession, remainingSessions } = useMemo(() => {
    const ordered = [...filteredSessions].sort((a, b) => dateValue(a.date) - dateValue(b.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = ordered.find((session) => dateValue(session.date) >= today.getTime()) ?? ordered[ordered.length - 1] ?? null;
    return { featuredSession: next, remainingSessions: ordered.filter((session) => session.id !== next?.id).reverse() };
  }, [filteredSessions]);

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
              <section className="mb-8 border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/60 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-800 dark:text-violet-300">{dateValue(featuredSession.date) >= new Date(new Date().setHours(0, 0, 0, 0)).getTime() ? 'Next rehearsal plan' : 'Most recent rehearsal'}</p>
                    <h2 className="mt-1 break-words text-xl font-semibold tracking-tight text-slate-950 dark:text-white">{featuredSession.name}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(featuredSession.date)} · {featuredSession.rehearsal_songs.length} song{featuredSession.rehearsal_songs.length !== 1 ? 's' : ''}</p>
                    {featuredSession.program_date && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">For service on {formatDate(featuredSession.program_date, { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
                  </div>
                  <Link href={`/rehearsal/${featuredSession.id}`} className="button-secondary shrink-0">Open rehearsal <Icon name="chevron-right" size={15} /></Link>
                </div>
                {featuredSession.notes && <p className="border-b border-slate-200 px-5 py-3 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300 sm:px-6">{featuredSession.notes}</p>}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[...featuredSession.rehearsal_songs].sort((a, b) => a.position - b.position).slice(0, 8).map((song, index) => (
                    <div key={song.id} className="grid grid-cols-[32px_minmax(0,1fr)_56px] items-center gap-3 px-5 py-3 sm:grid-cols-[40px_minmax(0,1fr)_72px] sm:px-6">
                      <span className="font-mono text-xs tabular-nums text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                      <span className="break-words text-sm font-medium text-slate-900 dark:text-slate-100">{song.song_title}</span>
                      <span className="text-right font-serif text-base font-semibold text-violet-900 dark:text-violet-200">{song.key_used || '—'}</span>
                    </div>
                  ))}
                  {featuredSession.rehearsal_songs.length > 8 && <p className="px-5 py-2 text-xs text-slate-500 sm:px-6">+ {featuredSession.rehearsal_songs.length - 8} more songs in this plan</p>}
                  {featuredSession.rehearsal_songs.length === 0 && <p className="px-5 py-6 text-sm text-slate-500 sm:px-6">No songs have been added to this rehearsal yet.</p>}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-baseline justify-between gap-3"><h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Other sessions</h2><span className="text-xs tabular-nums text-slate-400">{remainingSessions.length}</span></div>
                <div className="border-y border-slate-200 dark:border-slate-800">
                  {remainingSessions.map((session) => <SessionRow key={session.id} session={session} onDelete={handleDeleteSession} isPending={isPending} />)}
                  {remainingSessions.length === 0 && <p className="px-4 py-7 text-sm text-slate-500">No other rehearsal sessions.</p>}
                </div>
              </section>
            </>
          ) : (
            <div className="border-y border-slate-200 py-16 text-center dark:border-slate-800">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"><Icon name="music" /></div>
              <h2 className="font-medium text-slate-800 dark:text-slate-100">{search ? 'No rehearsals match your search' : 'No rehearsal sessions yet'}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{search ? 'Try a different date, song, or session name.' : 'Create a plan to organize songs and notes for the choir.'}</p>
              {!search && <Link href="/rehearsal/new" className="button-primary mt-5"><Icon name="plus" size={16} />Create rehearsal</Link>}
            </div>
          )}
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

function SessionRow({ session, onDelete, isPending }: { session: RehearsalSessionWithSongs; onDelete: (id: string, name: string) => void; isPending: boolean }) {
  const songs = [...session.rehearsal_songs].sort((a, b) => a.position - b.position);
  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 last:border-b-0 hover:bg-white dark:border-slate-800 dark:hover:bg-slate-900 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
      <Link href={`/rehearsal/${session.id}`} className="grid min-w-0 flex-1 grid-cols-1 gap-1 sm:grid-cols-[minmax(0,1.1fr)_minmax(150px,1fr)_100px] sm:items-center sm:gap-4">
        <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{session.name}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(session.date, { month: 'short', day: 'numeric', year: 'numeric' })}{session.notes ? ` · ${session.notes}` : ''}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{songs.length} song{songs.length !== 1 ? 's' : ''}</span>
      </Link>
      <div className="flex items-center justify-end gap-2">
        <Link href={`/rehearsal/${session.id}`} className="button-quiet min-h-8 px-2 text-xs">Open</Link>
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
