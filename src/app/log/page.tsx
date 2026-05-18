import { createClient } from '@/lib/supabase/server';
import LogClient from './LogClient';

export default async function LogPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // Auto-convert any rehearsal sessions whose program_date has arrived
  const { data: pendingSessions } = await supabase
    .from('rehearsal_sessions')
    .select('*, rehearsal_songs(id, song_title, song_id, key_used, position, service_moment)')
    .lte('program_date', today)
    .eq('program_converted', false)
    .not('program_date', 'is', null);

  if (pendingSessions && pendingSessions.length > 0) {
    for (const session of pendingSessions) {
      const orderedSongs = (session.rehearsal_songs as {
        id: string; song_title: string; song_id: string | null; key_used: string | null; position: number; service_moment: string | null;
      }[]).sort((a, b) => a.position - b.position);

      const songs = orderedSongs.map((s) => ({
        title: s.song_title,
        key: s.key_used,
        song_id: s.song_id,
        tags: s.service_moment ? [s.service_moment] : undefined,
      }));

      const primary = songs[0] ?? { title: session.name, key: null, song_id: null };

      const { data: newLog } = await supabase
        .from('service_logs')
        .insert({
          song_title: primary.title,
          song_id: primary.song_id,
          musical_key: primary.key,
          lead_singer: null,
          songs,
          lead_singers: [],
          service_date: session.program_date,
          service_moment: 'Special Occasion',
          notes: null,
          source_session_id: session.id,
          source_session_name: session.name,
          is_auto_generated: true,
          reviewed: false,
        })
        .select('id')
        .single();

      if (newLog) {
        await supabase
          .from('rehearsal_sessions')
          .update({ program_converted: true, program_log_id: newLog.id })
          .eq('id', session.id);
      }
    }
  }

  const { data: logs, error } = await supabase
    .from('service_logs')
    .select('*')
    .order('service_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
        <p className="font-semibold">Failed to load service logs</p>
        <p className="mt-1 text-xs font-mono">{error.message}</p>
      </div>
    );
  }

  return <LogClient initialLogs={logs ?? []} />;
}
