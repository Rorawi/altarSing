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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  if (!isSameOriginRequest(request) || !isValidRehearsalAdminSession(request.cookies.get(REHEARSAL_ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Admin access is required to add a song section.' }, { status: 401 });
  }

  const { projectId } = await params;
  if (!UUID_PATTERN.test(projectId)) {
    return NextResponse.json({ error: 'Rehearsal not found.' }, { status: 404 });
  }

  try {
    const supabase = createVoiceAdminClient();
    const { data: project, error: projectError } = await supabase
      .from('rehearsal_projects')
      .select('id')
      .eq('id', projectId)
      .single();
    if (projectError || !project) return NextResponse.json({ error: 'Rehearsal not found.' }, { status: 404 });

    let sectionCount: number;
    try {
      const sections = await normalizeRehearsalSections(supabase, projectId);
      sectionCount = sections.length;
    } catch (cause) {
      console.error('Could not normalize voice rehearsal sections:', cause);
      return NextResponse.json({ error: 'Song sections could not be prepared. Please try again.' }, { status: 503 });
    }

    const position = sectionCount;
    const { data: section, error } = await supabase
      .from('rehearsal_sections')
      .insert({ project_id: projectId, name: `Section ${position + 1}`, position })
      .select(SECTION_FIELDS)
      .single();
    if (error) throw error;
    return NextResponse.json(section, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    console.error('Could not add voice rehearsal section:', cause);
    return NextResponse.json({ error: 'The song section could not be added. Please try again.' }, { status: 500 });
  }
}
