import { createClient } from '@/lib/supabase/server';
import WheelClient from './WheelClient';

export default async function WheelPage() {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from('choir_members')
    .select('id, name')
    .order('name');

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
        <p className="font-semibold">Failed to load wheel</p>
        <p className="mt-1 text-xs font-mono">{error.message}</p>
      </div>
    );
  }

  return <WheelClient members={members ?? []} />;
}
