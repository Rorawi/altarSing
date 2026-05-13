'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { ChoirMember, AttendanceRecord } from '@/types';

type MemberWithStatus = ChoirMember & { attendance: AttendanceRecord | null };

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
];

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function getAvatarColor(name: string) {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
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
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-5 -ml-1"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-sm font-medium">Attendance</span>
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">Attendance Report</h1>
      <p className="text-sm text-slate-500 mb-4">{formattedDate}</p>

      {/* Date picker */}
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="mb-4 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white text-slate-700"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
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
          <p className="text-3xl mb-3">🎤</p>
          <p className="text-slate-500 text-sm">No choir members found</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{presentMembers.length}</p>
              <p className="text-xs text-green-600">Present</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{absentMembers.length}</p>
              <p className="text-xs text-red-500">Absent</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-slate-500">{unmarkedMembers.length}</p>
              <p className="text-xs text-slate-400">Unmarked</p>
            </div>
          </div>

          {/* Present section */}
          {presentMembers.length > 0 && (
            <Section title="Present" count={presentMembers.length} color="green">
              {presentMembers.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </Section>
          )}

          {/* Absent section */}
          {absentMembers.length > 0 && (
            <Section title="Absent" count={absentMembers.length} color="red">
              {absentMembers.map((m) => (
                <MemberRow key={m.id} member={m} showReason />
              ))}
            </Section>
          )}

          {/* Unmarked section */}
          {unmarkedMembers.length > 0 && (
            <Section title="Not Marked" count={unmarkedMembers.length} color="gray">
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
  title, count, color, children,
}: {
  title: string; count: number; color: 'green' | 'red' | 'gray'; children: React.ReactNode;
}) {
  const colors = {
    green: 'text-green-700 bg-green-100',
    red: 'text-red-600 bg-red-100',
    gray: 'text-slate-500 bg-slate-100',
  };
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[color]}`}>
          {title} · {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MemberRow({ member, showReason }: { member: MemberWithStatus; showReason?: boolean }) {
  const absenceReason = (member.attendance as any)?.absence_reason as string | null;
  const avatarColor = getAvatarColor(member.name);
  const present = member.attendance?.present;

  return (
    <div className={`flex items-center gap-3 bg-white rounded-xl border px-3 py-2.5 ${present === true ? 'border-green-200' : present === false ? 'border-red-200' : 'border-slate-200'}`}>
      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
        {member.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.image_url} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full ${avatarColor} flex items-center justify-center`}>
            <span className="text-white font-bold text-xs">{getInitials(member.name)}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{member.name}</p>
        {member.role && <p className="text-xs text-slate-400 truncate">{member.role}</p>}
        {showReason && absenceReason && (
          <p className="text-xs text-red-500 mt-0.5">{absenceReason}</p>
        )}
      </div>
    </div>
  );
}
