'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { ChoirMember, AttendanceRecord } from '@/types';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

type MemberWithStatus = ChoirMember & { attendance: AttendanceRecord | null };

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function ReportClient() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [members, setMembers] = useState<MemberWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const [{ data: membersData, error: membersErr }, { data: attendanceData }] = await Promise.all([
      supabase.from('choir_members').select('*').order('name'),
      supabase.from('attendance').select('*').eq('session_date', date),
    ]);
    if (membersErr) {
      setError(membersErr.message);
      setLoading(false);
      return;
    }
    const attendanceMap = new Map((attendanceData ?? []).map((r) => [r.member_id, r]));
    setMembers(
      (membersData ?? []).map((m) => ({
        ...m,
        attendance: attendanceMap.get(m.id) ?? null,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate, fetchReport]);

  const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const presentMembers = members.filter((m) => m.attendance?.present === true);
  const absentMembers = members.filter((m) => m.attendance?.present === false);
  const unmarkedMembers = members.filter((m) => m.attendance === null || m.attendance?.present === null || m.attendance?.present === undefined);

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-5 -ml-1"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-sm font-medium">Attendance</span>
      </button>

      <PageHeader title="Attendance report" description={formattedDate} />

      {/* Date picker */}
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="field-control mb-5 max-w-xs"
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
          <p className="font-semibold">Error loading report</p>
          <p className="text-xs font-mono mt-1">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"><Icon name="people" /></div>
          <p className="text-slate-500 text-sm">No choir members found</p>
        </div>
      ) : (
        <>
          <div className="mb-6 border-y border-slate-200 py-3 text-sm dark:border-slate-800" aria-label="Attendance summary">
            <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{presentMembers.length} of {members.length} present</span>
            <span className="ml-3 text-xs text-slate-500 dark:text-slate-400">{absentMembers.length} absent <span aria-hidden="true">·</span> {unmarkedMembers.length} not marked</span>
          </div>

          {/* Present section */}
          {presentMembers.length > 0 && (
            <Section title="Present" count={presentMembers.length}>
              {presentMembers.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </Section>
          )}

          {/* Absent section */}
          {absentMembers.length > 0 && (
            <Section title="Absent" count={absentMembers.length}>
              {absentMembers.map((m) => (
                <MemberRow key={m.id} member={m} showReason />
              ))}
            </Section>
          )}

          {/* Unmarked section */}
          {unmarkedMembers.length > 0 && (
            <Section title="Not marked" count={unmarkedMembers.length}>
              {unmarkedMembers.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title, count, children,
}: {
  title: string; count: number; children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{title} <span className="ml-1 font-normal tabular-nums text-slate-400">{count}</span></h2>
      <div className="border-y border-slate-200 dark:border-slate-800">{children}</div>
    </section>
  );
}

function MemberRow({ member, showReason }: { member: MemberWithStatus; showReason?: boolean }) {
  const absenceReason = (member.attendance as any)?.absence_reason as string | null;

  return (
    <div className="flex items-center gap-3 border-b border-slate-200 px-3 py-2.5 last:border-0 dark:border-slate-800">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-stone-100 dark:border-slate-700 dark:bg-slate-800">
        {member.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.image_url} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{getInitials(member.name)}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{member.name}</p>
        {member.role && <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{member.role}</p>}
        {showReason && absenceReason && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{absenceReason}</p>}
      </div>
    </div>
  );
}
