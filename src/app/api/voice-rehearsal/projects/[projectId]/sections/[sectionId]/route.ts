import { NextRequest, NextResponse } from 'next/server';
import {
  isSameOriginRequest,
  isValidRehearsalAdminSession,
  REHEARSAL_ADMIN_COOKIE,
} from '@/lib/rehearsal-admin';
import { createVoiceAdminClient } from '@/lib/supabase/voice-server';
import { normalizeRehearsalSections } from '@/lib/voice-rehearsal-sections';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECTION_FIELDS = 'id, project_id, name, position, created_at';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; sectionId: string }> },
) {
  if (!isSameOriginRequest(request) || !isValidRehearsalAdminSession(request.cookies.get(REHEARSAL_ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Admin access is required to rename a song section.' }, { status: 401 });
  }

  const { projectId, sectionId } = await params;
  if (!UUID_PATTERN.test(projectId) || !UUID_PATTERN.test(sectionId)) {
    return NextResponse.json({ error: 'Song section not found.' }, { status: 404 });
  }

  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Enter a section name.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 80) {
    return NextResponse.json({ error: 'Section names must be between 1 and 80 characters.' }, { status: 400 });
  }

  try {
    const supabase = createVoiceAdminClient();
    const { data, error } = await supabase
      .from('rehearsal_sections')
      .update({ name })
      .eq('id', sectionId)
      .eq('project_id', projectId)
      .select(SECTION_FIELDS)
      .single();
    if (error || !data) {
      if (error) console.error('Could not rename voice rehearsal section:', error);
      return NextResponse.json({ error: 'Song section not found.' }, { status: 404 });
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    console.error('Could not rename voice rehearsal section:', cause);
    return NextResponse.json({ error: 'The section name could not be saved. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; sectionId: string }> },
) {
  if (!isSameOriginRequest(request) || !isValidRehearsalAdminSession(request.cookies.get(REHEARSAL_ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Admin access is required to delete a song section.' }, { status: 401 });
  }

  const { projectId, sectionId } = await params;
  if (!UUID_PATTERN.test(projectId) || !UUID_PATTERN.test(sectionId)) {
    return NextResponse.json({ error: 'Song section not found.' }, { status: 404 });
  }

  try {
    const supabase = createVoiceAdminClient();
    const { data: section, error: sectionError } = await supabase
      .from('rehearsal_sections')
      .select('id')
      .eq('id', sectionId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (sectionError || !section) {
      if (sectionError) console.error('Could not find voice rehearsal section to delete:', sectionError);
      return NextResponse.json({ error: 'Song section not found.' }, { status: 404 });
    }

    const { data: projectSections, error: sectionsError } = await supabase
      .from('rehearsal_sections')
      .select('id')
      .eq('project_id', projectId);
    if (sectionsError) {
      console.error('Could not check remaining voice rehearsal sections:', sectionsError);
      return NextResponse.json({ error: 'The remaining song sections could not be checked. Try again.' }, { status: 500 });
    }
    if ((projectSections?.length ?? 0) <= 1) {
      return NextResponse.json({ error: 'A rehearsal must keep at least one song section.' }, { status: 409 });
    }

    const { data: takes, error: takesError } = await supabase
      .from('rehearsal_takes')
      .select('id, storage_path')
      .eq('section_id', sectionId)
      .eq('project_id', projectId);
    if (takesError) {
      console.error('Could not find recordings for voice rehearsal section:', takesError);
      return NextResponse.json({ error: 'The section recordings could not be loaded. Nothing was deleted.' }, { status: 500 });
    }

    const storagePaths = (takes ?? []).map((take) => take.storage_path);
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('rehearsal-audio')
        .remove(storagePaths);
      if (storageError) {
        console.error('Could not remove audio for voice rehearsal section:', storageError);
        return NextResponse.json({ error: 'The section audio could not be removed. The section and its parts are still available; try again.' }, { status: 502 });
      }
    }

    const { error: deleteError } = await supabase
      .from('rehearsal_sections')
      .delete()
      .eq('id', sectionId)
      .eq('project_id', projectId);
    if (deleteError) {
      console.error('Audio removed, but voice rehearsal section details could not be deleted:', deleteError);
      return NextResponse.json({ error: 'The audio files were removed, but the section entry could not be deleted. Try again to clear it.' }, { status: 500 });
    }

    try {
      await normalizeRehearsalSections(supabase, projectId);
    } catch (cause) {
      // The section has already been deleted. A later add normalizes again,
      // so don't report a failed delete for an ordering-only problem.
      console.error('Deleted voice rehearsal section but could not compact remaining sections:', cause);
    }

    return NextResponse.json({ ok: true, deletedTakeIds: (takes ?? []).map((take) => take.id) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    console.error('Could not delete voice rehearsal section:', cause);
    return NextResponse.json({ error: 'The song section could not be deleted. Please try again.' }, { status: 500 });
  }
}
