import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import MemberHistoryClient from './MemberHistoryClient';

export default async function MemberHistoryPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const supabase = await createClient();

  const [{ data: member, error: memberError }, { data: history }] = await Promise.all([
    supabase.from('choir_members').select('*').eq('id', memberId).single(),
    supabase
      .from('attendance')
      .select('*')
      .eq('member_id', memberId)
      .order('session_date', { ascending: false }),
  ]);

  if (memberError || !member) notFound();

  return <MemberHistoryClient member={member} history={history ?? []} />;
}
