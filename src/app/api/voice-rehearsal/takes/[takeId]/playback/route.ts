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
      .select('storage_path, expires_at')
      .eq('id', takeId)
      .single();
    if (error || !take || new Date(take.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'This recording was not found or has expired.' }, { status: 404 });
    }

    const adminClient = createVoiceAdminClient();
    const { data: signed, error: signError } = await adminClient.storage
      .from('rehearsal-audio')
      .createSignedUrl(take.storage_path, 5 * 60);
    if (signError || !signed) throw signError ?? new Error('Could not sign audio URL.');

    if (request.nextUrl.searchParams.get('stream') === '1') {
      return NextResponse.redirect(signed.signedUrl, {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    return NextResponse.json(
      { url: signed.signedUrl },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('Could not create voice recording playback URL:', error);
    return NextResponse.json({ error: 'Playback is temporarily unavailable.' }, { status: 500 });
  }
}
