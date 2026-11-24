'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import PageHeader from '@/components/PageHeader';
import type { VoiceRehearsalProject, VoiceRehearsalTake } from '@/types/voice-rehearsal';
import VoiceTakeRecorder from '../VoiceTakeRecorder';
import VoiceTakeMixer from '../VoiceTakeMixer';
import VoiceWaveformPlayer from '../VoiceWaveformPlayer';
import DeleteVoiceRehearsalButton from '../DeleteVoiceRehearsalButton';
import {
  closeSharedVoiceAudioContext,
  forgetDecodedVoiceTake,
  stopActiveVoiceMix,
} from '../VoiceAudioEngine';

export default function VoiceRehearsalProjectClient({
  project,
  takes,
  isAdmin,
  adminConfigured,
}: {
  project: VoiceRehearsalProject;
  takes: VoiceRehearsalTake[];
  isAdmin: boolean;
  adminConfigured: boolean;
}) {
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginPending, setLoginPending] = useState(false);

  useEffect(() => () => closeSharedVoiceAudioContext(), []);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');
    setLoginPending(true);
    try {
      const response = await fetch('/api/voice-rehearsal/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not sign in.');
      setLoginOpen(false);
      setPassword('');
      router.refresh();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setLoginPending(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/voice-rehearsal" className="button-quiet -ml-3"><Icon name="arrow-left" size={16} />All projects</Link>
      </div>
      <PageHeader
        title={project.title}
        description={<>Voice rehearsal project{project.bpm ? ` · ${project.bpm} BPM` : ''} · expires {new Date(project.expires_at).toLocaleDateString()}</>}
        actions={isAdmin ? (
          <DeleteVoiceRehearsalButton projectId={project.id} title={project.title} redirectTo="/voice-rehearsal" />
        ) : adminConfigured ? <button type="button" onClick={() => setLoginOpen(true)} className="button-secondary">Admin access</button> : undefined}
      />

      {!adminConfigured && !isAdmin && (
        <p className="mb-5 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Voice Studio management needs <code>REHEARSAL_ADMIN_PASSWORD</code>, a <code>REHEARSAL_ADMIN_SESSION_SECRET</code> of at least 32 characters, and the server-only <code>SUPABASE_SERVICE_ROLE_KEY</code>. Set them in this environment, then restart the dev server or redeploy.
        </p>
      )}

      <section aria-labelledby="takes-heading" className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <div>
            <h2 id="takes-heading" className="font-serif text-xl font-semibold text-slate-950 dark:text-white">Recorded parts</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{takes.length} of 8 parts recorded</p>
          </div>
        </div>
        {takes.length === 0 ? (
          <div className="border-y border-slate-200 px-4 py-9 text-center dark:border-slate-800">
            <p className="font-medium text-slate-800 dark:text-slate-100">No parts recorded yet</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Saved recordings will be available here for listeners.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {takes.map((take, index) => <VoiceTakeRow key={take.id} take={take} index={index} isAdmin={isAdmin} onDeleted={() => router.refresh()} onTimingUpdated={() => router.refresh()} />)}
          </div>
        )}
      </section>

      <VoiceTakeMixer takes={takes} />

      {isAdmin && takes.length < 8 && (
        <section aria-labelledby="record-heading" className="border-t border-slate-200 pt-6 dark:border-slate-800">
          <h2 id="record-heading" className="font-serif text-xl font-semibold text-slate-950 dark:text-white">Record a part</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">The take stays on this device until you preview and save it.</p>
          {takes.length > 0 && <p className="mb-4 border-l-2 border-violet-700 px-3 py-2 text-sm text-slate-600 dark:border-violet-300 dark:text-slate-300">Existing parts will play in sync automatically when your recording starts. Keep your headphones on to prevent the backing audio from bleeding into the microphone.</p>}
          <VoiceTakeRecorder project={project} backingTakes={takes} onSaved={() => router.refresh()} />
        </section>
      )}

      {isAdmin && takes.length >= 8 && (
        <p className="border-l-2 border-slate-300 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">This project has reached the eight-part limit.</p>
      )}

      {loginOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setLoginOpen(false); }}>
          <form onSubmit={handleLogin} className="w-full max-w-md border border-slate-200 bg-[#fbfaf7] p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-md">
            <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">Admin access</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter the passphrase to record and manage parts.</p>
            <label className="mt-5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Admin passphrase
              <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="field-control mt-1" />
            </label>
            {loginError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{loginError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setLoginOpen(false)} className="button-secondary">Cancel</button>
              <button type="submit" disabled={loginPending || !password} className="button-primary">{loginPending ? 'Checking…' : 'Continue'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function VoiceTakeRow({ take, index, isAdmin, onDeleted, onTimingUpdated }: { take: VoiceRehearsalTake; index: number; isAdmin: boolean; onDeleted: () => void; onTimingUpdated: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [timingOpen, setTimingOpen] = useState(false);
  const [offsetDraft, setOffsetDraft] = useState(take.offset_ms);
  const [savingTiming, setSavingTiming] = useState(false);

  useEffect(() => setOffsetDraft(take.offset_ms), [take.offset_ms]);

  async function deleteTake() {
    setDeleting(true);
    setError('');
    stopActiveVoiceMix();
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    try {
      const response = await fetch(`/api/voice-rehearsal/projects/${take.project_id}/takes/${take.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'The part could not be removed.');
      forgetDecodedVoiceTake(take.id);
      setConfirmingDelete(false);
      onDeleted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The part could not be removed.');
      setDeleting(false);
    }
  }

  function nudgeTiming(milliseconds: number) {
    setOffsetDraft((current) => Math.max(-5000, Math.min(5000, current + milliseconds)));
  }

  async function saveTimingAdjustment() {
    setSavingTiming(true);
    setError('');
    stopActiveVoiceMix();
    audioRef.current?.pause();
    try {
      const response = await fetch(`/api/voice-rehearsal/projects/${take.project_id}/takes/${take.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offsetMs: offsetDraft }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'The timing adjustment could not be saved.');
      setOffsetDraft(result.offsetMs);
      setTimingOpen(false);
      onTimingUpdated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The timing adjustment could not be saved.');
    } finally {
      setSavingTiming(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 px-2 py-4 sm:flex-row sm:items-center sm:px-4">
      <span className="w-8 shrink-0 font-mono text-xs tabular-nums text-slate-400">{String(index + 1).padStart(2, '0')}</span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-lg font-medium text-slate-900 dark:text-slate-100">{take.part_label}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatDuration(take.duration_seconds)} · playback shift {formatMilliseconds(take.offset_ms)} · {new Date(take.created_at).toLocaleString()}</p>
      </div>
      <VoiceWaveformPlayer
        audioRef={audioRef}
        src={`/api/voice-rehearsal/takes/${take.id}/playback?stream=1`}
        waveformSrc={`/api/voice-rehearsal/takes/${take.id}/playback?download=1`}
        diagnosticUrl={`/api/voice-rehearsal/takes/${take.id}/playback?diagnose=1`}
        durationSeconds={take.duration_seconds}
        label={take.part_label}
      />
      {isAdmin && <button type="button" onClick={() => { setError(''); setOffsetDraft(take.offset_ms); setTimingOpen((open) => !open); }} disabled={deleting || savingTiming} className="button-secondary">{timingOpen ? 'Close timing' : 'Adjust timing'}</button>}
      {isAdmin && <button type="button" onClick={() => { setError(''); setConfirmingDelete(true); }} disabled={deleting} className="button-danger-quiet" aria-label={`Delete ${take.part_label} part`}>{deleting ? 'Removing…' : <><Icon name="trash" size={16} />Remove</>}</button>}
      {error && !confirmingDelete && !timingOpen && <p role="alert" className="basis-full text-sm text-red-700 dark:text-red-300 sm:basis-auto">{error}</p>}
      {timingOpen && (
        <section aria-label={`Adjust ${take.part_label} timing`} className="basis-full border-l-2 border-violet-500 bg-slate-50 px-3 py-3 dark:bg-slate-900/60">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Fine-tune this part</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Earlier starts this part sooner; later starts it afterward. Save, then use Play all to compare the change.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => nudgeTiming(-10)} disabled={savingTiming || offsetDraft <= -5000} className="button-secondary">Earlier 10 ms</button>
            <button type="button" onClick={() => nudgeTiming(-1)} disabled={savingTiming || offsetDraft <= -5000} className="button-secondary">Earlier 1 ms</button>
            <strong className="min-w-24 text-center font-mono tabular-nums text-slate-900 dark:text-white">{formatMilliseconds(offsetDraft)}</strong>
            <button type="button" onClick={() => nudgeTiming(1)} disabled={savingTiming || offsetDraft >= 5000} className="button-secondary">Later 1 ms</button>
            <button type="button" onClick={() => nudgeTiming(10)} disabled={savingTiming || offsetDraft >= 5000} className="button-secondary">Later 10 ms</button>
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => { setOffsetDraft(take.offset_ms); setTimingOpen(false); setError(''); }} disabled={savingTiming} className="button-quiet">Cancel</button>
            <button type="button" onClick={saveTimingAdjustment} disabled={savingTiming || offsetDraft === take.offset_ms} className="button-primary">{savingTiming ? 'Saving…' : 'Save adjustment'}</button>
          </div>
        </section>
      )}
      {confirmingDelete && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setConfirmingDelete(false); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby={`delete-take-title-${take.id}`} aria-describedby={`delete-take-description-${take.id}`} className="w-full max-w-md border border-slate-200 bg-[#fbfaf7] p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-md">
            <h2 id={`delete-take-title-${take.id}`} className="font-serif text-xl font-semibold text-slate-900 dark:text-white">Remove {take.part_label}?</h2>
            <p id={`delete-take-description-${take.id}`} className="mt-2 text-sm text-slate-600 dark:text-slate-300">This permanently deletes the recording and its saved part details from this project.</p>
            {deleting && <p role="status" className="mt-3 text-sm text-slate-500 dark:text-slate-400">Removing the recording…</p>}
            {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" autoFocus onClick={() => setConfirmingDelete(false)} disabled={deleting} className="button-secondary">Cancel</button>
              <button type="button" onClick={deleteTake} disabled={deleting} className="button-danger-quiet">{deleting ? 'Removing…' : 'Remove part'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function formatMilliseconds(value: number) {
  return `${value > 0 ? '+' : ''}${value} ms`;
}
