import { createClient } from '@/lib/supabase/server';
import LogClient from './LogClient';

export default async function LogPage() {
  const supabase = await createClient();
  const { data: logs, error } = await supabase
    .from('service_logs')
    .select('*, songs(title)')
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
