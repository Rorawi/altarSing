import PageHeader from '@/components/PageHeader';
import { hasRehearsalAdminSession, isRehearsalAdminConfigured } from '@/lib/rehearsal-admin';
import { createVoicePublicClient } from '@/lib/supabase/voice-server';
import VoiceRehearsalLibraryClient from './VoiceRehearsalLibraryClient';

export const dynamic = 'force-dynamic';

export default async function VoiceRehearsalPage() {
  const supabase = createVoicePublicClient();
  const { data, error } = await supabase
    .from('rehearsal_projects')
    .select('id, title, bpm, created_at, expires_at')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div>
        <PageHeader title="Voice rehearsal" description="Record each part and build a rehearsal mix." />
        <div role="alert" className="border-l-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
          The rehearsal recordings could not be loaded. Check that the Supabase migration has been run.
        </div>
      </div>
    );
  }

  return (
    <VoiceRehearsalLibraryClient
      projects={data ?? []}
      isAdmin={await hasRehearsalAdminSession()}
      adminConfigured={isRehearsalAdminConfigured()}
    />
  );
}
