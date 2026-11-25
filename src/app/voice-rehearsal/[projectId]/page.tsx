import { notFound } from 'next/navigation';
import { hasRehearsalAdminSession, isRehearsalAdminConfigured } from '@/lib/rehearsal-admin';
import { createVoicePublicClient } from '@/lib/supabase/voice-server';
import type { VoiceRehearsalProject, VoiceRehearsalSection, VoiceRehearsalTake } from '@/types/voice-rehearsal';
import VoiceRehearsalProjectClient from './VoiceRehearsalProjectClient';

export const dynamic = 'force-dynamic';

export default async function VoiceRehearsalProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = createVoicePublicClient();
  const { data: project } = await supabase
    .from('rehearsal_projects')
    .select('id, title, bpm, created_at, expires_at')
    .eq('id', projectId)
    .single();

  if (!project || new Date(project.expires_at).getTime() <= Date.now()) notFound();

  const [sectionResult, takeResult] = await Promise.all([
    supabase
      .from('rehearsal_sections')
      .select('id, project_id, name, position, created_at')
      .eq('project_id', projectId)
      .order('position', { ascending: true }),
    supabase
      .from('rehearsal_takes')
      .select('id, project_id, section_id, part_label, line_label, mime_type, duration_seconds, offset_ms, volume, is_muted, created_at, expires_at')
      .eq('project_id', projectId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true }),
  ]);

  let takes = takeResult.data;
  let sectionsEnabled = !sectionResult.error && !takeResult.error;
  if (takeResult.error) {
    sectionsEnabled = false;
    const legacyTakeResult = await supabase
      .from('rehearsal_takes')
      .select('id, project_id, part_label, mime_type, duration_seconds, offset_ms, volume, is_muted, created_at, expires_at')
      .eq('project_id', projectId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });
    takes = legacyTakeResult.data?.map((take) => ({
      ...take,
      section_id: null,
      line_label: take.part_label,
    })) ?? null;
  }

  return (
    <VoiceRehearsalProjectClient
      project={project as VoiceRehearsalProject}
      takes={(takes ?? []) as VoiceRehearsalTake[]}
      sections={(sectionsEnabled ? sectionResult.data ?? [] : []) as VoiceRehearsalSection[]}
      sectionsEnabled={sectionsEnabled}
      isAdmin={await hasRehearsalAdminSession()}
      adminConfigured={isRehearsalAdminConfigured()}
    />
  );
}
