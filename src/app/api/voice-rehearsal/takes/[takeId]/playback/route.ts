import { NextRequest, NextResponse } from 'next/server';
import { createVoiceAdminClient, createVoicePublicClient } from '@/lib/supabase/voice-server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ takeId: string }> },
) {
  const { takeId } = await params;
  if (!UUID_PATTERN.test(takeId)) {
    return NextResponse.json({ error: 'Recording not found.' }, { status: 404 });
  }

  try {
    const publicClient = createVoicePublicClient();
    const { data: take, error } = await publicClient
      .from('rehearsal_takes')
      .select('storage_path, project_id, expires_at')
      .eq('id', takeId)
      .single();
    if (error || !take || new Date(take.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'This recording was not found or has expired.' }, { status: 404 });
    }

    const { data: project, error: projectError } = await publicClient
      .from('rehearsal_projects')
      .select('expires_at')
      .eq('id', take.project_id)
      .single();
    if (projectError || !project || new Date(project.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'This rehearsal project was not found or has expired.' }, { status: 404 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Voice playback is not configured on this deployment. The site administrator must add the server-only SUPABASE_SERVICE_ROLE_KEY and redeploy.' },
        { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const adminClient = createVoiceAdminClient();
    const { data: signed, error: signError } = await adminClient.storage
      .from('rehearsal-audio')
      .createSignedUrl(take.storage_path, 5 * 60);
    if (signError || !signed) throw signError ?? new Error('Could not sign audio URL.');

    if (request.nextUrl.searchParams.get('stream') === '1' || request.nextUrl.searchParams.get('download') === '1' || request.nextUrl.searchParams.get('diagnose') === '1') {
      const isDiagnostic = request.nextUrl.searchParams.get('diagnose') === '1';
      const range = isDiagnostic ? 'bytes=0-0' : request.headers.get('range');
      const audioResponse = await fetch(signed.signedUrl, {
        cache: 'no-store',
        headers: range ? { Range: range } : undefined,
      });
      if (!audioResponse.ok) {
        console.error('Supabase Storage could not serve a voice take:', audioResponse.status, audioResponse.statusText);
        return NextResponse.json(
          { error: 'Supabase Storage could not return this recording. Check that the rehearsal-audio bucket and saved audio file are available.' },
          { status: 502, headers: { 'Cache-Control': 'private, no-store' } },
        );
      }
      if (isDiagnostic) {
        await audioResponse.body?.cancel();
        return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
      }

      const headers = new Headers({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
      for (const name of ['Accept-Ranges', 'Content-Length', 'Content-Range', 'Content-Type']) {
        const value = audioResponse.headers.get(name);
        if (value) headers.set(name, value);
      }
      return new NextResponse(audioResponse.body, { status: audioResponse.status, headers });
    }

    return NextResponse.json(
      { url: signed.signedUrl },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('Could not create voice recording playback URL:', error);
    return NextResponse.json(
      { error: 'The recording could not be prepared for playback. Check the deployment’s Supabase Storage configuration and try again.' },
      { status: 502, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
