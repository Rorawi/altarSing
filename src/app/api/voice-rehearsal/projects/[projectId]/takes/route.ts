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
const TAKE_FIELDS = 'id, project_id, section_id, part_label, line_label, mime_type, duration_seconds, offset_ms, volume, is_muted, created_at, expires_at';
const LEGACY_TAKE_FIELDS = 'id, project_id, part_label, mime_type, duration_seconds, offset_ms, volume, is_muted, created_at, expires_at';

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
  const lineLabel = String(formData.get('lineLabel') ?? formData.get('partLabel') ?? '').trim();
  const requestedSectionId = String(formData.get('sectionId') ?? '').trim();
  const durationSeconds = Number(formData.get('durationSeconds'));
  const offsetMs = Number(formData.get('offsetMs') ?? 0);
  if (requestedSectionId && !UUID_PATTERN.test(requestedSectionId)) {
    return NextResponse.json({ error: 'Choose a valid song section.' }, { status: 400 });
  }
  if (!(file instanceof File) || file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Choose a non-empty audio file smaller than 50 MB.' }, { status: 413 });
  }
  if (!partLabel || partLabel.length > 40) {
    return NextResponse.json({ error: 'Part names must be between 1 and 40 characters.' }, { status: 400 });
  }
  if (!lineLabel || lineLabel.length > 40) {
    return NextResponse.json({ error: 'Singing line names must be between 1 and 40 characters.' }, { status: 400 });
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

  let sectionId: string | null = null;
  const sectionResult = requestedSectionId
    ? await supabase.from('rehearsal_sections').select('id').eq('id', requestedSectionId).eq('project_id', projectId).maybeSingle()
    : await supabase.from('rehearsal_sections').select('id').eq('project_id', projectId).order('position', { ascending: true }).limit(1).maybeSingle();
  if (sectionResult.error) {
    const missingSectionsTable = sectionResult.error.code === 'PGRST205'
      || sectionResult.error.code === '42P01'
      || sectionResult.error.message.toLowerCase().includes('rehearsal_sections');
    if (!missingSectionsTable || requestedSectionId) {
      console.error('Could not resolve voice rehearsal section:', sectionResult.error);
      return NextResponse.json({ error: 'Song sections are not available yet. Run the Voice Studio sections migration in Supabase.' }, { status: 503 });
    }
  } else if (!sectionResult.data) {
    return NextResponse.json({ error: 'Choose a valid song section for this recording.' }, { status: 400 });
  } else {
    sectionId = sectionResult.data.id;
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

  const takeDetails = {
    id: takeId,
    project_id: projectId,
    part_label: partLabel,
    storage_path: storagePath,
    mime_type: mimeType,
    duration_seconds: Math.round(durationSeconds * 1000) / 1000,
    offset_ms: offsetMs,
    ...(sectionId ? { section_id: sectionId, line_label: lineLabel } : {}),
  };
  const { data: take, error: insertError } = await supabase
    .from('rehearsal_takes')
    .insert(takeDetails)
    .select(sectionId ? TAKE_FIELDS : LEGACY_TAKE_FIELDS)
    .single();

  if (insertError) {
    const { error: removeError } = await supabase.storage.from('rehearsal-audio').remove([storagePath]);
    if (removeError) console.error('Could not clean up failed voice recording upload:', removeError);
    const isDuplicatePart = insertError.code === '23505';
    const sectionIsFull = insertError.code === '23514';
    return NextResponse.json({
      error: isDuplicatePart
        ? 'This section already has a saved take for this part. Remove the existing part before recording it again.'
        : sectionIsFull
          ? 'This section already has eight recorded parts.'
        : 'The recording uploaded, but its details could not be saved. Please retry.',
    }, { status: isDuplicatePart || sectionIsFull ? 409 : 500 });
  }

  return NextResponse.json(take, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
