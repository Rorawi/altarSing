import { NextRequest, NextResponse } from 'next/server';
import {
  isSameOriginRequest,
  isValidRehearsalAdminSession,
  REHEARSAL_ADMIN_COOKIE,
} from '@/lib/rehearsal-admin';
import { createVoiceAdminClient } from '@/lib/supabase/voice-server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  if (!isSameOriginRequest(request) || !isValidRehearsalAdminSession(request.cookies.get(REHEARSAL_ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Admin access is required to delete a rehearsal.' }, { status: 401 });
  }

  const { projectId } = await params;
  if (!UUID_PATTERN.test(projectId)) {
    return NextResponse.json({ error: 'Rehearsal not found.' }, { status: 404 });
  }

  try {
    const supabase = createVoiceAdminClient();
    const { data: project, error: projectLookupError } = await supabase
      .from('rehearsal_projects')
      .select('id')
      .eq('id', projectId)
      .single();
    if (projectLookupError || !project) {
      return NextResponse.json({ error: 'Rehearsal not found.' }, { status: 404 });
    }

    const { data: takes, error: takesError } = await supabase
      .from('rehearsal_takes')
      .select('storage_path')
      .eq('project_id', projectId);
    if (takesError) {
      console.error('Could not list rehearsal audio before project deletion:', takesError);
      return NextResponse.json({ error: 'The saved recordings could not be prepared for deletion. Nothing was removed.' }, { status: 500 });
    }

    const storagePaths = (takes ?? []).map((take) => take.storage_path);
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('rehearsal-audio')
        .remove(storagePaths);
      if (storageError) {
        console.error('Could not remove rehearsal audio:', storageError);
        return NextResponse.json({ error: 'Some recording files could not be removed. The rehearsal was kept; try again.' }, { status: 502 });
      }
    }

    const { error: deleteError } = await supabase
      .from('rehearsal_projects')
      .delete()
      .eq('id', projectId);
    if (deleteError) {
      console.error('Audio was removed, but rehearsal metadata could not be deleted:', deleteError);
      return NextResponse.json({ error: 'The audio files were removed, but the rehearsal details could not be deleted. Try again.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deletedTakes: storagePaths.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not delete voice rehearsal project:', error);
    return NextResponse.json({ error: 'The rehearsal could not be deleted. Please try again.' }, { status: 500 });
  }
}
