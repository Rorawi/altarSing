import { notFound } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { hasRehearsalAdminSession, isRehearsalAdminConfigured } from '@/lib/rehearsal-admin';
import { createVoicePublicClient } from '@/lib/supabase/voice-server';
import type { VoiceRehearsalProject, VoiceRehearsalTake } from '@/types/voice-rehearsal';
import VoiceRehearsalProjectClient from './VoiceRehearsalProjectClient';

export const dynamic = 'force-dynamic';

export default async function VoiceRehearsalProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = createVoicePublicClient();
  const [{ data: project }, { data: takes }] = await Promise.all([
    supabase
      .from('rehearsal_projects')
      .select('id, title, bpm, created_at, expires_at')
      .eq('id', projectId)
      .single(),
    supabase
      .from('rehearsal_takes')
      .select('id, project_id, part_label, mime_type, duration_seconds, offset_ms, volume, is_muted, created_at, expires_at')
      .eq('project_id', projectId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true }),
  ]);

  if (!project || new Date(project.expires_at).getTime() <= Date.now()) notFound();

  return (
    <VoiceRehearsalProjectClient
      project={project as VoiceRehearsalProject}
      takes={(takes ?? []) as VoiceRehearsalTake[]}
      isAdmin={await hasRehearsalAdminSession()}
      adminConfigured={isRehearsalAdminConfigured()}
    />
  );
}
