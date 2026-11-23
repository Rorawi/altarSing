import { NextRequest, NextResponse } from 'next/server';
import {
  isSameOriginRequest,
  isValidRehearsalAdminSession,
  REHEARSAL_ADMIN_COOKIE,
} from '@/lib/rehearsal-admin';
import { createVoiceAdminClient } from '@/lib/supabase/voice-server';

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request) || !isValidRehearsalAdminSession(request.cookies.get(REHEARSAL_ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Admin access is required to create a project.' }, { status: 401 });
  }

  let body: { title?: unknown; bpm?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Enter a project title.' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > 120) {
    return NextResponse.json({ error: 'Project titles must be between 1 and 120 characters.' }, { status: 400 });
  }

  let bpm: number | null = null;
  if (body.bpm !== undefined && body.bpm !== null && body.bpm !== '') {
    bpm = Number(body.bpm);
    if (!Number.isInteger(bpm) || bpm < 20 || bpm > 300) {
      return NextResponse.json({ error: 'Tempo must be a whole number from 20 to 300 BPM.' }, { status: 400 });
    }
  }

  try {
    const supabase = createVoiceAdminClient();
    const { data, error } = await supabase
      .from('rehearsal_projects')
      .insert({ title, bpm, owner_id: null })
      .select('id, title, bpm, created_at, expires_at')
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not create voice rehearsal project:', error);
    return NextResponse.json({ error: 'The project could not be created. Please try again.' }, { status: 500 });
  }
}
