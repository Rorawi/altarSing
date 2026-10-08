'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ServiceLog, LogSong } from '@/types';
import { SERVICE_MOMENTS } from '@/lib/constants';
import LogEntryCard from '@/components/LogEntryCard';
import { confirmAutoLog, undoAutoLog } from '@/lib/actions';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

export default function LogClient({ initialLogs }: { initialLogs: ServiceLog[] }) {
  const router = useRouter();
  const [filterTitle, setFilterTitle] = useState('');
  const [filterSinger, setFilterSinger] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const pendingReviews = initialLogs.filter((log) => log.is_auto_generated && !log.reviewed);
  const normalLogs = initialLogs.filter((log) => !log.is_auto_generated || log.reviewed);
  const filtered = useMemo(() => {
    let list = [...normalLogs];
    if (filterTitle.trim()) {
      const query = filterTitle.toLowerCase();
      list = list.filter((log) => log.song_title.toLowerCase().includes(query) || log.songs.some((song) => song.title.toLowerCase().includes(query)));
    }
    if (filterSinger.trim()) {
      const query = filterSinger.toLowerCase();
      list = list.filter((log) => log.lead_singer?.toLowerCase().includes(query) || log.lead_singers.some((singer) => singer.toLowerCase().includes(query)));
    }
    if (filterTag) list = list.filter((log) => log.service_moment === filterTag || log.songs.some((song) => song.tags?.includes(filterTag)));
    if (filterDateFrom) list = list.filter((log) => log.service_date >= filterDateFrom);
    if (filterDateTo) list = list.filter((log) => log.service_date <= filterDateTo);
    return list;
  }, [normalLogs, filterTitle, filterSinger, filterTag, filterDateFrom, filterDateTo]);

  const grouped = useMemo(() => {
    const map = new Map<string, ServiceLog[]>();
    filtered.forEach((log) => {
      if (!map.has(log.service_date)) map.set(log.service_date, []);
      map.get(log.service_date)!.push(log);
    });
    return map;
  }, [filtered]);
  const sortedDates = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));
  const hasFilters = Boolean(filterTitle || filterSinger || filterTag || filterDateFrom || filterDateTo);

  function clearFilters() {
    setFilterTitle(''); setFilterSinger(''); setFilterTag(''); setFilterDateFrom(''); setFilterDateTo('');
  }

  return (
    <div>
      <PageHeader
        title="Service log"
        description={<>{normalLogs.length} service entr{normalLogs.length === 1 ? 'y' : 'ies'}{hasFilters ? ` · ${filtered.length} shown` : ''}{pendingReviews.length > 0 ? ` · ${pendingReviews.length} to review` : ''}</>}
        actions={<Link href="/log/new" className="button-primary"><Icon name="plus" size={16} />Log a service</Link>}
      />

      {pendingReviews.length > 0 && <section aria-label="Entries to review" className="mb-6 border-l-2 border-amber-600 bg-amber-50/70 dark:border-amber-400 dark:bg-amber-300/5">
        {pendingReviews.map((log) => <ReviewBanner key={log.id} log={log} onDone={() => router.refresh()} />)}
      </section>}

      <div className="mb-4 flex gap-5 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {['', ...SERVICE_MOMENTS].map((moment) => (
          <button key={moment || 'all'} onClick={() => setFilterTag(filterTag === moment ? '' : moment)} aria-pressed={filterTag === moment} className={`-mb-px min-h-10 shrink-0 border-b-2 px-0.5 text-sm transition-colors ${filterTag === moment ? 'border-violet-800 font-medium text-violet-900 dark:border-violet-300 dark:text-violet-200' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}`}>
            {moment || 'All services'}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters} className="button-secondary self-start"><Icon name="filter" size={16} />{showFilters ? 'Hide filters' : 'Search and filter'}{hasFilters && <span className="ml-1 text-violet-800 dark:text-violet-300">· Active</span>}</button>
        {hasFilters && <button onClick={clearFilters} className="button-quiet self-start sm:self-auto">Clear filters</button>}
      </div>

      {showFilters && <div className="mb-5 grid gap-3 border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 lg:col-span-2">Song title<input type="search" placeholder="Search songs…" value={filterTitle} onChange={(event) => setFilterTitle(event.target.value)} className="field-control mt-1" /></label>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Lead singer<input type="search" placeholder="Search names…" value={filterSinger} onChange={(event) => setFilterSinger(event.target.value)} className="field-control mt-1" /></label>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">From date<input type="date" value={filterDateFrom} onChange={(event) => setFilterDateFrom(event.target.value)} className="field-control mt-1" /></label>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">To date<input type="date" value={filterDateTo} onChange={(event) => setFilterDateTo(event.target.value)} className="field-control mt-1" /></label>
      </div>}

      {filtered.length === 0 ? (
        <div className="border-y border-slate-200 py-16 text-center dark:border-slate-800">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"><Icon name="history" /></div>
          <h2 className="font-medium text-slate-800 dark:text-slate-100">{normalLogs.length === 0 ? 'No service entries yet' : 'No entries match these filters'}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{normalLogs.length === 0 ? 'Record the music from a service to start your history.' : 'Try a different search or date range.'}</p>
          {normalLogs.length === 0 ? <Link href="/log/new" className="button-primary mt-5"><Icon name="plus" size={16} />Log your first service</Link> : <button onClick={clearFilters} className="button-quiet mt-3">Clear filters</button>}
        </div>
      ) : (
        <div className="space-y-7">
          {sortedDates.map((date) => (
            <section key={date} aria-label={new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}>
              <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-slate-300 pb-2 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
                <span className="shrink-0 text-xs tabular-nums text-slate-400">{grouped.get(date)!.length} record{grouped.get(date)!.length !== 1 ? 's' : ''}</span>
              </div>
              <div>{grouped.get(date)!.map((log) => <LogEntryCard key={log.id} log={log} />)}</div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewBanner({ log, onDone }: { log: ServiceLog; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState(true);

  function toggleSong(index: number) {
    setRemovedIndices((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }
  function handleConfirm() {
    startTransition(async () => { await confirmAutoLog(log.id, [...removedIndices]); onDone(); });
  }
  function handleUndo() {
    if (!log.source_session_id) return;
    startTransition(async () => { await undoAutoLog(log.id, log.source_session_id!); onDone(); });
  }

  const programDate = new Date(`${log.service_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const keptCount = log.songs.length - removedIndices.size;

  return (
    <div className="border-b border-amber-200 px-4 py-4 last:border-0 dark:border-amber-900/60 sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3"><Icon name="history" size={17} className="mt-0.5 shrink-0 text-amber-800 dark:text-amber-300" /><div className="min-w-0"><h2 className="break-words text-sm font-semibold text-amber-950 dark:text-amber-100">Review service record: {log.source_session_name}</h2><p className="mt-1 text-xs text-amber-800 dark:text-amber-300">{programDate} · {log.songs.length} song{log.songs.length !== 1 ? 's' : ''}</p></div></div>
        <button onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="button-quiet min-h-8 shrink-0 px-2 text-xs text-amber-900 dark:text-amber-200">{expanded ? 'Collapse' : 'Review'}</button>
      </div>
      {expanded && <div className="mt-4 pl-7">
        <p className="mb-2 text-xs text-amber-900 dark:text-amber-200">Select songs that were not performed to remove them from this record.</p>
        <div className="divide-y divide-amber-100 border-y border-amber-200 dark:divide-amber-900/50 dark:border-amber-900/60">
          {(log.songs as LogSong[]).map((song, index) => <button key={`${song.title}-${index}`} type="button" aria-pressed={removedIndices.has(index)} onClick={() => toggleSong(index)} className={`grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 py-2 text-left text-sm ${removedIndices.has(index) ? 'text-rose-700 line-through dark:text-rose-300' : 'text-slate-800 dark:text-slate-100'}`}>
            <span className="font-mono text-xs text-slate-400">{String(index + 1).padStart(2, '0')}</span><span className="break-words">{song.title}</span><span className="flex items-center gap-2">{song.key && <span className="font-serif font-semibold text-violet-900 dark:text-violet-200">{song.key}</span>}{removedIndices.has(index) && <span className="text-[11px] no-underline">Not performed</span>}</span>
          </button>)}
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={handleUndo} disabled={isPending || !log.source_session_id} className="button-secondary min-h-9">Undo auto-log</button>
          <button type="button" onClick={handleConfirm} disabled={isPending} className="button-primary min-h-9"><Icon name="check" size={15} />{isPending ? 'Saving…' : `Confirm${removedIndices.size > 0 ? ` · ${keptCount} songs` : ''}`}</button>
        </div>
      </div>}
    </div>
  );
}
