'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ServiceLog, LogSong } from '@/types';
import { SERVICE_MOMENTS } from '@/lib/constants';
import LogEntryCard from '@/components/LogEntryCard';
import { confirmAutoLog, undoAutoLog } from '@/lib/actions';

export default function LogClient({ initialLogs }: { initialLogs: ServiceLog[] }) {
  const router = useRouter();
  const [filterTitle, setFilterTitle] = useState('');
  const [filterSinger, setFilterSinger] = useState('');
  const [filterMoment, setFilterMoment] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Separate pending reviews from normal log entries
  const pendingReviews = initialLogs.filter((l) => l.is_auto_generated && !l.reviewed);
  const normalLogs = initialLogs.filter((l) => !l.is_auto_generated || l.reviewed);

  const filtered = useMemo(() => {
    let list = [...normalLogs];
    if (filterTitle.trim()) {
      const q = filterTitle.toLowerCase();
      list = list.filter((l) => l.song_title.toLowerCase().includes(q));
    }
    if (filterSinger.trim()) {
      const q = filterSinger.toLowerCase();
      list = list.filter((l) => l.lead_singer?.toLowerCase().includes(q));
    }
    if (filterMoment) list = list.filter((l) => l.service_moment === filterMoment);
    if (filterDateFrom) list = list.filter((l) => l.service_date >= filterDateFrom);
    if (filterDateTo) list = list.filter((l) => l.service_date <= filterDateTo);
    return list;
  }, [normalLogs, filterTitle, filterSinger, filterMoment, filterDateFrom, filterDateTo]);

  // Group entries by service date
  const grouped = useMemo(() => {
    const map = new Map<string, ServiceLog[]>();
    filtered.forEach((log) => {
      if (!map.has(log.service_date)) map.set(log.service_date, []);
      map.get(log.service_date)!.push(log);
    });
    return map;
  }, [filtered]);

  const sortedDates = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));
  const hasFilters = filterTitle || filterSinger || filterMoment || filterDateFrom || filterDateTo;
  function clearFilters() {
    setFilterTitle('');
    setFilterSinger('');
    setFilterMoment('');
    setFilterDateFrom('');
    setFilterDateTo('');
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Service Log</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {normalLogs.length} entr{normalLogs.length !== 1 ? 'ies' : 'y'}
            {hasFilters ? ` · ${filtered.length} shown` : ''}
            {pendingReviews.length > 0 ? ` · ${pendingReviews.length} awaiting review` : ''}
          </p>
        </div>
        <Link
          href="/log/new"
          className="bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm"
        >
          + Log Entry
        </Link>
      </div>
      {/* Pending review banners */}
      {pendingReviews.length > 0 && (
        <div className="space-y-3 mb-5">
          {pendingReviews.map((log) => (
            <ReviewBanner key={log.id} log={log} onDone={() => router.refresh()} />
          ))}
        </div>
      )}

      {/* Moment tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
        {(['', ...SERVICE_MOMENTS] as const).map((m) => (
          <button
            key={m || 'all'}
            onClick={() => setFilterMoment(m)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterMoment === m
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-300'
            }`}
          >
            {m || 'All'}
          </button>
        ))}
      </div>

      {/* Filter toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium mb-3 border transition-colors ${
          showFilters || hasFilters
            ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <span className="flex items-center gap-2">
          <span>🔍</span>
          <span>
            {hasFilters ? `Filters active (${filtered.length} results)` : 'Search & Filter'}
          </span>
        </span>
        <span className="text-xs">{showFilters ? '▲' : '▼'}</span>
      </button>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4 space-y-3">
          <input
            type="text"
            placeholder="Search by song title…"
            value={filterTitle}
            onChange={(e) => setFilterTitle(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />

          <input
            type="text"
            placeholder="Lead singer…"
            value={filterSinger}
            onChange={(e) => setFilterSinger(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">From date</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">To date</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-violet-600 hover:text-violet-800 font-medium"
            >
              ✕ Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Log entries */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📅</p>
          <p className="text-slate-500 font-medium text-lg">
            {normalLogs.length === 0 ? 'No service entries yet' : 'No entries match your filters'}
          </p>
          {normalLogs.length === 0 ? (
            <Link
              href="/log/new"
              className="mt-4 inline-block bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
            >
              Log your first service
            </Link>
          ) : (
            <button onClick={clearFilters} className="mt-3 text-sm text-violet-600 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {sortedDates.map((date) => (
            <div key={date}>
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
              <div className="space-y-2">
                {grouped.get(date)!.map((log) => (
                  <LogEntryCard key={log.id} log={log} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Review Banner ────────────────────────────────────────────────────────────

function ReviewBanner({ log, onDone }: { log: ServiceLog; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState(true);

  function toggleSong(i: number) {
    setRemovedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      await confirmAutoLog(log.id, [...removedIndices]);
      onDone();
    });
  }

  function handleUndo() {
    if (!log.source_session_id) return;
    startTransition(async () => {
      await undoAutoLog(log.id, log.source_session_id!);
      onDone();
    });
  }

  const programDate = new Date(log.service_date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const keptCount = log.songs.length - removedIndices.size;

  return (
    <div className="border-2 border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span>🎉</span>
              <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm leading-snug truncate">
                Auto-logged: {log.source_session_name}
              </p>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {programDate} · {log.songs.length} song{log.songs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-amber-500 dark:text-amber-400 text-xs shrink-0 mt-0.5"
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>

        {expanded && (
          <>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-3 mb-2 font-medium">
              Tap any song you didn&apos;t perform to remove it:
            </p>
            <div className="space-y-1.5 mb-4">
              {(log.songs as LogSong[]).map((song, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleSong(i)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors ${
                    removedIndices.has(i)
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-medium w-4 shrink-0 text-slate-400">{i + 1}.</span>
                  <span className={`flex-1 text-sm ${removedIndices.has(i) ? 'line-through' : ''}`}>
                    {song.title}
                  </span>
                  {song.key && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                      removedIndices.has(i)
                        ? 'bg-red-200 dark:bg-red-800 text-red-500 dark:text-red-300'
                        : 'bg-violet-600 text-white'
                    }`}>
                      {song.key}
                    </span>
                  )}
                  {removedIndices.has(i) && (
                    <span className="text-[10px] text-red-400 shrink-0">not performed</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={isPending || !log.source_session_id}
                className="flex-1 border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-400 rounded-xl py-2.5 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50 transition-colors"
              >
                ↩ Undo
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isPending
                  ? 'Saving…'
                  : `✓ Confirm${removedIndices.size > 0 ? ` (${keptCount} song${keptCount !== 1 ? 's' : ''})` : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
