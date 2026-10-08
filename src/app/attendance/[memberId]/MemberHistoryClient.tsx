'use client';

import { useRouter } from 'next/navigation';
import type { ChoirMember, AttendanceRecord } from '@/types';
import Icon from '@/components/Icon';

interface Props {
  member: ChoirMember;
  history: AttendanceRecord[];
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function MemberHistoryClient({ member, history }: Props) {
  const router = useRouter();

  const totalSessions = history.length;
  const presentCount = history.filter((h) => h.present).length;
  const absentCount = history.filter((h) => !h.present).length;
  const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

  // Group history by month for better readability
  const grouped = history.reduce<Record<string, AttendanceRecord[]>>((acc, record) => {
    const month = new Date(record.session_date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', year: 'numeric',
    });
    if (!acc[month]) acc[month] = [];
    acc[month].push(record);
    return acc;
  }, {});

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-5 -ml-1"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-sm font-medium">Attendance</span>
      </button>

      <div className="mb-5 flex items-center gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-stone-100 dark:border-slate-700 dark:bg-slate-800">
          {member.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.image_url} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{getInitials(member.name)}</span>
            </div>
          )}
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-slate-950 dark:text-slate-100">{member.name}</h1>
          {member.role && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{member.role}</p>}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-200 pb-4 text-sm dark:border-slate-800">
        <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{attendanceRate}% attendance</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{presentCount} present <span aria-hidden="true">·</span> {absentCount} absent <span aria-hidden="true">·</span> {totalSessions} sessions</span>
      </div>

      {/* History */}
      {totalSessions === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"><Icon name="history" /></div>
          <p className="text-slate-500 text-sm">No attendance records yet</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([month, records]) => (
            <div key={month}>
              <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {month}
              </h2>
              <div className="border-y border-slate-200 dark:border-slate-800">
                {records.map((record) => {
                  const absenceReason = (record as any).absence_reason as string | null;
                  const dateStr = new Date(record.session_date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  });
                  return (
                    <div
                      key={record.id}
                      className="flex items-center gap-3 border-b border-slate-200 px-3 py-3 last:border-0 dark:border-slate-800"
                    >
                      {/* Status dot */}
                      <div className={`h-2 w-2 shrink-0 rounded-full ${record.present ? 'bg-emerald-600' : 'bg-slate-400 dark:bg-slate-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{dateStr}</p>
                        {!record.present && absenceReason && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{absenceReason}</p>
                        )}
                        {!record.present && record.notes && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic">{record.notes}</p>
                        )}
                      </div>
                      <span className={`text-xs font-medium ${record.present ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        {record.present ? 'Present' : 'Absent'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
