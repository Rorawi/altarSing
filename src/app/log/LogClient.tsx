'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ServiceLog } from '@/types';
import { SERVICE_MOMENTS } from '@/lib/constants';
import LogEntryCard from '@/components/LogEntryCard';

export default function LogClient({ initialLogs }: { initialLogs: ServiceLog[] }) {
  const [filterTitle, setFilterTitle] = useState('');
  const [filterSinger, setFilterSinger] = useState('');
  const [filterMoment, setFilterMoment] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = [...initialLogs];
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
  }, [initialLogs, filterTitle, filterSinger, filterMoment, filterDateFrom, filterDateTo]);

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
            {initialLogs.length} entr{initialLogs.length !== 1 ? 'ies' : 'y'}
            {hasFilters ? ` · ${filtered.length} shown` : ''}
          </p>
        </div>
        <Link
          href="/log/new"
          className="bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm"
        >
          + Log Entry
        </Link>
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

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Lead singer…"
              value={filterSinger}
              onChange={(e) => setFilterSinger(e.target.value)}
              className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <select
              value={filterMoment}
              onChange={(e) => setFilterMoment(e.target.value)}
              className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-600"
            >
              <option value="">All moments</option>
              {SERVICE_MOMENTS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

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
            {initialLogs.length === 0 ? 'No service entries yet' : 'No entries match your filters'}
          </p>
          {initialLogs.length === 0 ? (
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
