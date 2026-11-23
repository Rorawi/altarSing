import { NextRequest, NextResponse } from 'next/server';
import {
  isSameOriginRequest,
  isValidRehearsalAdminSession,
  REHEARSAL_ADMIN_COOKIE,
} from '@/lib/rehearsal-admin';
import { createVoiceAdminClient } from '@/lib/supabase/voice-server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_DURATION_SECONDS = 10 * 60;
const TAKE_FIELDS = 'id, project_id, part_label, mime_type, duration_seconds, offset_ms, volume, is_muted, created_at, expires_at';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  if (!isSameOriginRequest(request) || !isValidRehearsalAdminSession(request.cookies.get(REHEARSAL_ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Admin access is required to upload a recording.' }, { status: 401 });
  }

  const { projectId } = await params;
  if (!UUID_PATTERN.test(projectId)) {
    return NextResponse.json({ error: 'That rehearsal project was not found.' }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'The audio upload could not be read.' }, { status: 400 });
  }

  const file = formData.get('audio');
  const partLabel = String(formData.get('partLabel') ?? '').trim();
  const durationSeconds = Number(formData.get('durationSeconds'));
  const offsetMs = Number(formData.get('offsetMs') ?? 0);
  if (!(file instanceof File) || file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Choose a non-empty audio file smaller than 50 MB.' }, { status: 413 });
  }
  if (!partLabel || partLabel.length > 40) {
    return NextResponse.json({ error: 'Part names must be between 1 and 40 characters.' }, { status: 400 });
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > MAX_DURATION_SECONDS) {
    return NextResponse.json({ error: 'Recordings must be 10 minutes or shorter.' }, { status: 400 });
  }
  if (!Number.isInteger(offsetMs) || offsetMs < -5000 || offsetMs > 5000) {
    return NextResponse.json({ error: 'The sync correction is outside the supported range.' }, { status: 400 });
  }

  const mimeType = file.type.split(';', 1)[0].trim().toLowerCase();
  if (mimeType !== 'audio/webm' && mimeType !== 'audio/mp4') {
    return NextResponse.json({ error: 'Use a WebM or MP4 audio recording.' }, { status: 415 });
  }

  const supabase = createVoiceAdminClient();
  const { data: project, error: projectError } = await supabase
    .from('rehearsal_projects')
    .select('id, expires_at')
    .eq('id', projectId)
    .single();
  if (projectError || !project || new Date(project.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'This rehearsal project was not found or has expired.' }, { status: 404 });
  }

  const extension = mimeType === 'audio/mp4' ? 'mp4' : 'webm';
  const takeId = crypto.randomUUID();
  const storagePath = `admin/${projectId}/${takeId}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from('rehearsal-audio')
    .upload(storagePath, file, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    });
  if (uploadError) {
    console.error('Voice rehearsal audio upload failed:', uploadError);
    return NextResponse.json({ error: 'The recording could not be uploaded. Your local copy is still available to retry.' }, { status: 502 });
  }

  const { data: take, error: insertError } = await supabase
    .from('rehearsal_takes')
    .insert({
      id: takeId,
      project_id: projectId,
      part_label: partLabel,
      storage_path: storagePath,
      mime_type: mimeType,
      duration_seconds: Math.round(durationSeconds * 1000) / 1000,
      offset_ms: offsetMs,
    })
    .select(TAKE_FIELDS)
    .single();

  if (insertError) {
    const { error: removeError } = await supabase.storage.from('rehearsal-audio').remove([storagePath]);
    if (removeError) console.error('Could not clean up failed voice recording upload:', removeError);
    const isDuplicatePart = insertError.code === '23505';
    return NextResponse.json({
      error: isDuplicatePart
        ? 'This part already has a saved take. Remove the existing part before recording it again.'
        : 'The recording uploaded, but its details could not be saved. Please retry.',
    }, { status: isDuplicatePart ? 409 : 500 });
  }

  return NextResponse.json(take, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
