'use client';

import { useRouter } from 'next/navigation';
import type { ChoirMember, AttendanceRecord } from '@/types';

interface Props {
  member: ChoirMember;
  history: AttendanceRecord[];
}

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

export default function MemberHistoryClient({ member, history }: Props) {
  const router = useRouter();

  const totalSessions = history.length;
  const presentCount = history.filter((h) => h.present).length;
  const absentCount = history.filter((h) => !h.present).length;
  const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
  const avatarColor = getAvatarColor(member.name);

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
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-5 -ml-1"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-sm font-medium">Attendance</span>
      </button>

      {/* Member header card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden shadow-md shrink-0">
          {member.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.image_url} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full ${avatarColor} flex items-center justify-center`}>
              <span className="text-white font-bold text-lg">{getInitials(member.name)}</span>
            </div>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{member.name}</h1>
          {member.role && <p className="text-sm text-slate-500 mt-0.5">{member.role}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-slate-700">{totalSessions}</p>
          <p className="text-[10px] text-slate-500 leading-tight">Sessions</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-green-700">{presentCount}</p>
          <p className="text-[10px] text-green-600 leading-tight">Present</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-red-600">{absentCount}</p>
          <p className="text-[10px] text-red-500 leading-tight">Absent</p>
        </div>
        <div className={`rounded-xl p-2.5 text-center border ${attendanceRate >= 75 ? 'bg-green-50 border-green-100' : attendanceRate >= 50 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-lg font-bold ${attendanceRate >= 75 ? 'text-green-700' : attendanceRate >= 50 ? 'text-amber-700' : 'text-red-600'}`}>
            {attendanceRate}%
          </p>
          <p className={`text-[10px] leading-tight ${attendanceRate >= 75 ? 'text-green-600' : attendanceRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
            Rate
          </p>
        </div>
      </div>

      {/* History */}
      {totalSessions === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-slate-500 text-sm">No attendance records yet</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([month, records]) => (
            <div key={month}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {month}
              </p>
              <div className="space-y-2">
                {records.map((record) => {
                  const absenceReason = (record as any).absence_reason as string | null;
                  const dateStr = new Date(record.session_date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  });
                  return (
                    <div
                      key={record.id}
                      className={`flex items-center gap-3 bg-white rounded-xl border px-4 py-3 ${
                        record.present ? 'border-green-200' : 'border-red-200'
                      }`}
                    >
                      {/* Status dot */}
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${record.present ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{dateStr}</p>
                        {!record.present && absenceReason && (
                          <p className="text-xs text-red-500 mt-0.5">{absenceReason}</p>
                        )}
                        {!record.present && record.notes && (
                          <p className="text-xs text-slate-400 mt-0.5 italic">{record.notes}</p>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        record.present ? 'text-green-700 bg-green-100' : 'text-red-600 bg-red-100'
                      }`}>
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
