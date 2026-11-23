import { NextRequest, NextResponse } from 'next/server';
import {
  isSameOriginRequest,
  isValidRehearsalAdminSession,
  REHEARSAL_ADMIN_COOKIE,
} from '@/lib/rehearsal-admin';
import { createVoiceAdminClient } from '@/lib/supabase/voice-server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; takeId: string }> },
) {
  if (!isSameOriginRequest(request) || !isValidRehearsalAdminSession(request.cookies.get(REHEARSAL_ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Admin access is required to adjust a part.' }, { status: 401 });
  }

  const { projectId, takeId } = await params;
  if (!UUID_PATTERN.test(projectId) || !UUID_PATTERN.test(takeId)) {
    return NextResponse.json({ error: 'Recording not found.' }, { status: 404 });
  }

  let body: { offsetMs?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The timing adjustment could not be read.' }, { status: 400 });
  }

  const offsetMs = typeof body === 'object' && body !== null ? body.offsetMs : undefined;
  if (typeof offsetMs !== 'number' || !Number.isInteger(offsetMs) || offsetMs < -5000 || offsetMs > 5000) {
    return NextResponse.json({ error: 'Timing adjustments must be a whole number between −5000 and +5000 ms.' }, { status: 400 });
  }

  try {
    const supabase = createVoiceAdminClient();
    const { data, error } = await supabase
      .from('rehearsal_takes')
      .update({ offset_ms: offsetMs })
      .eq('id', takeId)
      .eq('project_id', projectId)
      .select('id, offset_ms')
      .single();
    if (error || !data) {
      console.error('Could not update voice part timing:', error);
      return NextResponse.json({ error: 'The timing adjustment could not be saved.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, offsetMs: data.offset_ms }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not update voice part timing:', error);
    return NextResponse.json({ error: 'The timing adjustment could not be saved.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; takeId: string }> },
) {
  if (!isSameOriginRequest(request) || !isValidRehearsalAdminSession(request.cookies.get(REHEARSAL_ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Admin access is required to remove a part.' }, { status: 401 });
  }

  const { projectId, takeId } = await params;
  if (!UUID_PATTERN.test(projectId) || !UUID_PATTERN.test(takeId)) {
    return NextResponse.json({ error: 'Recording not found.' }, { status: 404 });
  }

  try {
    const supabase = createVoiceAdminClient();
    const { data: take, error: takeError } = await supabase
      .from('rehearsal_takes')
      .select('id, storage_path')
      .eq('id', takeId)
      .eq('project_id', projectId)
      .single();
    if (takeError || !take) return NextResponse.json({ error: 'Recording not found.' }, { status: 404 });

    const { error: storageError } = await supabase.storage
      .from('rehearsal-audio')
      .remove([take.storage_path]);
    if (storageError) {
      console.error('Could not remove voice rehearsal audio:', storageError);
      return NextResponse.json({ error: 'The audio file could not be removed. The part is still listed; try again.' }, { status: 502 });
    }

    const { error: rowError } = await supabase
      .from('rehearsal_takes')
      .delete()
      .eq('id', takeId)
      .eq('project_id', projectId);
    if (rowError) {
      console.error('Audio removed, but take details could not be removed:', rowError);
      return NextResponse.json({ error: 'The audio file was removed, but its part entry could not be deleted. Try again to clear the entry.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not delete voice rehearsal part:', error);
    return NextResponse.json({ error: 'The part could not be removed. Please try again.' }, { status: 500 });
  }
}
