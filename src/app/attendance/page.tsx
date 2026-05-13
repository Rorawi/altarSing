import { createClient } from '@/lib/supabase/server';
import AttendanceClient from './AttendanceClient';

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const sessionDate = date ?? new Date().toISOString().split('T')[0];

  const supabase = await createClient();

  const [{ data: members, error }, { data: attendanceRecords }] = await Promise.all([
    supabase.from('choir_members').select('*').order('name'),
    supabase.from('attendance').select('*').eq('session_date', sessionDate),
  ]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
        <p className="font-semibold">Failed to load attendance</p>
        <p className="mt-1 text-xs font-mono">{error.message}</p>
      </div>
    );
  }

  const attendanceMap = new Map((attendanceRecords ?? []).map((r) => [r.member_id, r]));
  const membersWithAttendance = (members ?? []).map((m) => ({
    ...m,
    attendance: attendanceMap.get(m.id) ?? null,
  }));

  return <AttendanceClient members={membersWithAttendance} sessionDate={sessionDate} />;
}
