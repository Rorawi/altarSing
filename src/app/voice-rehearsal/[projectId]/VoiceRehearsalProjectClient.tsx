'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import type { VoiceRehearsalProject, VoiceRehearsalSection, VoiceRehearsalTake } from '@/types/voice-rehearsal';
import VoiceTakeRecorder from '../VoiceTakeRecorder';
import VoiceTakeMixer from '../VoiceTakeMixer';
import VoiceWaveformPlayer from '../VoiceWaveformPlayer';
import DismissableDetails from '../DismissableDetails';
import DeleteVoiceRehearsalButton from '../DeleteVoiceRehearsalButton';
import VoiceRehearsalShare from '../VoiceRehearsalShare';
import VoiceRecorderInfoButton from '../VoiceRecorderInfoButton';
import {
  closeSharedVoiceAudioContext,
  forgetDecodedVoiceTake,
  stopActiveVoiceMix,
} from '../VoiceAudioEngine';

export default function VoiceRehearsalProjectClient({
  project,
  takes,
  sections,
  sectionsEnabled,
  isAdmin,
  adminConfigured,
}: {
  project: VoiceRehearsalProject;
  takes: VoiceRehearsalTake[];
  sections: VoiceRehearsalSection[];
  sectionsEnabled: boolean;
  isAdmin: boolean;
  adminConfigured: boolean;
}) {
  const router = useRouter();
  const [loginOpen, setLoginOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginPending, setLoginPending] = useState(false);
  const [sectionActionError, setSectionActionError] = useState('');
  const [sectionPending, setSectionPending] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionNameDraft, setSectionNameDraft] = useState('');
  const [recorderSectionId, setRecorderSectionId] = useState<string | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<VoiceRehearsalSection | null>(null);

  useEffect(() => () => closeSharedVoiceAudioContext(), []);

  function closeAdminLogin() {
    setLoginOpen(false);
    setShowPassword(false);
    setPassword('');
    setLoginError('');
  }

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
      setShowPassword(false);
      setPassword('');
      router.refresh();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setLoginPending(false);
    }
  }

  async function addSection() {
    setSectionActionError('');
    setSectionPending(true);
    try {
      const response = await fetch(`/api/voice-rehearsal/projects/${project.id}/sections`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not add a song section.');
      setEditingSectionId(result.id);
      setSectionNameDraft(result.name);
      setRecorderSectionId(null);
      router.refresh();
    } catch (cause) {
      setSectionActionError(cause instanceof Error ? cause.message : 'Could not add a song section.');
    } finally {
      setSectionPending(false);
    }
  }

  async function saveSectionName(event: React.FormEvent<HTMLFormElement>, sectionId: string) {
    event.preventDefault();
    setSectionActionError('');
    setSectionPending(true);
    try {
      const response = await fetch(`/api/voice-rehearsal/projects/${project.id}/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sectionNameDraft }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not rename this section.');
      setEditingSectionId(null);
      router.refresh();
    } catch (cause) {
      setSectionActionError(cause instanceof Error ? cause.message : 'Could not rename this section.');
    } finally {
      setSectionPending(false);
    }
  }

  async function deleteSection() {
    if (!sectionToDelete) return;
    const section = sectionToDelete;
    setSectionActionError('');
    setSectionPending(true);
    stopActiveVoiceMix();
    try {
      const response = await fetch(`/api/voice-rehearsal/projects/${project.id}/sections/${section.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not delete this song section.');
      takesForSection(section).forEach((take) => forgetDecodedVoiceTake(take.id));
      if (recorderSectionId === section.id) setRecorderSectionId(null);
      if (editingSectionId === section.id) setEditingSectionId(null);
      setSectionToDelete(null);
      router.refresh();
    } catch (cause) {
      setSectionActionError(cause instanceof Error ? cause.message : 'Could not delete this song section.');
    } finally {
      setSectionPending(false);
    }
  }

  function takesForSection(section: VoiceRehearsalSection) {
    return takes.filter((take) => take.section_id === section.id || (!take.section_id && section.position === 0));
  }

  const showSectionsWorkspace = sections.length > 1;
  const singleSection = sections.length === 1 ? sections[0] : null;
  const singleSectionTakes = singleSection ? takesForSection(singleSection) : takes;
  const deletingSectionTakeCount = sectionToDelete ? takesForSection(sectionToDelete).length : 0;

  function renderTakeRows(sectionTakes: VoiceRehearsalTake[]) {
    if (sectionTakes.length === 0) {
      return (
        <div className="border-y border-slate-200 px-4 py-8 text-center dark:border-slate-800">
          <p className="font-medium text-slate-800 dark:text-slate-100">No parts recorded in this section</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Recorded voice parts will appear here.</p>
        </div>
      );
    }
    return (
      <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {sectionTakes.map((take, index) => <VoiceTakeRow key={take.id} take={take} index={index} isAdmin={isAdmin} onDeleted={() => router.refresh()} onTimingUpdated={() => router.refresh()} />)}
      </div>
    );
  }

  const addSectionButton = isAdmin && takes.length > 0 ? (
    <button type="button" onClick={addSection} disabled={!sectionsEnabled || sectionPending} className="button-secondary shrink-0" title={!sectionsEnabled ? 'Run the Voice Studio sections migration in Supabase first.' : undefined}>
      <Icon name="plus" size={16} />{sectionPending ? 'Adding…' : 'Add song section'}
    </button>
  ) : null;

  return (
    <div>
      <div className="mb-4">
        <Link href="/voice-rehearsal" className="button-quiet -ml-3"><Icon name="arrow-left" size={16} />All projects</Link>
      </div>
      <header className="mb-7 flex items-start justify-between gap-3 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="min-w-0">
          <h1 className="break-words font-serif text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{project.title}</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Voice rehearsal project{project.bpm ? ` · ${project.bpm} BPM` : ''} · expires {new Date(project.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</p>
        </div>
        {isAdmin ? (
          <DeleteVoiceRehearsalButton projectId={project.id} title={project.title} redirectTo="/voice-rehearsal" />
        ) : adminConfigured ? <button type="button" onClick={() => { setLoginOpen(true); setPassword(''); setShowPassword(false); setLoginError(''); }} className="button-secondary shrink-0">Admin access</button> : null}
      </header>

      {isAdmin && takes.length > 0 && <VoiceRehearsalShare project={project} takes={takes} sections={sections} />}

      {!adminConfigured && !isAdmin && (
        <p className="mb-5 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Voice Studio management needs <code>REHEARSAL_ADMIN_PASSWORD</code>, a <code>REHEARSAL_ADMIN_SESSION_SECRET</code> of at least 32 characters, and the server-only <code>SUPABASE_SERVICE_ROLE_KEY</code>. Set them in this environment, then restart the dev server or redeploy.
        </p>
      )}

      {isAdmin && !sectionsEnabled && (
        <p role="status" className="mb-5 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Song sections need the <code>20261124_voice_rehearsal_sections.sql</code> migration in Supabase. Existing recordings and the single-section recorder remain available until then.
        </p>
      )}
      {sectionActionError && !sectionToDelete && <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-300">{sectionActionError}</p>}

      {showSectionsWorkspace ? (
        <section aria-labelledby="sections-heading" className="mb-8 border-y border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-2">
              <h2 id="sections-heading" className="font-serif text-xl font-semibold text-slate-950 dark:text-white">Song sections</h2>
              <VoiceRecorderInfoButton />
            </div>
            {addSectionButton}
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {sections.map((section) => {
              const sectionTakes = takesForSection(section);
              const editing = editingSectionId === section.id;
              const recording = recorderSectionId === section.id;
              return (
                <article key={section.id} aria-labelledby={`section-heading-${section.id}`} className="py-5 first:pt-4 last:pb-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      {editing ? (
                        <form onSubmit={(event) => saveSectionName(event, section.id)} className="flex flex-wrap items-center gap-2">
                          <input autoFocus required maxLength={80} value={sectionNameDraft} onChange={(event) => setSectionNameDraft(event.target.value)} className="field-control min-h-10 max-w-md" aria-label="Song section name" />
                          <button type="submit" disabled={sectionPending || !sectionNameDraft.trim()} className="button-primary min-h-10">{sectionPending ? 'Saving…' : 'Save name'}</button>
                          <button type="button" onClick={() => { setEditingSectionId(null); setSectionNameDraft(''); }} disabled={sectionPending} className="button-quiet">Cancel</button>
                        </form>
                      ) : (
                        <h3 id={`section-heading-${section.id}`} className="break-words font-serif text-lg font-semibold text-slate-950 dark:text-white">{section.name}</h3>
                      )}
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sectionTakes.length} of 8 parts recorded</p>
                    </div>
                    {isAdmin && (
                      <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                        {sectionTakes.length < 8 && <button type="button" onClick={() => setRecorderSectionId(recording ? null : section.id)} disabled={sectionPending} className="button-secondary min-w-0 flex-1 sm:flex-none"><Icon name={recording ? 'close' : 'plus'} size={16} />{recording ? 'Close recorder' : 'Record a part'}</button>}
                        {!editing && (
                          <DismissableDetails className="relative shrink-0">
                            <summary className="details-summary icon-button min-h-11 min-w-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-violet-600 sm:min-h-0 sm:min-w-0" aria-label={`More actions for ${section.name}`} title="Section actions">
                              <Icon name="more-horizontal" size={20} />
                            </summary>
                            <div className="popover-surface absolute right-0 top-full z-30 mt-1 min-w-48 max-w-[calc(100vw-2rem)] rounded-md p-1">
                              <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setEditingSectionId(section.id); setSectionNameDraft(section.name); setSectionActionError(''); }} disabled={sectionPending} className="flex min-h-10 w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"><Icon name="edit" size={15} />Rename section</button>
                              {sections.length > 1 && <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setSectionActionError(''); setSectionToDelete(section); }} disabled={sectionPending} className="flex min-h-10 w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/40"><Icon name="trash" size={15} />Delete section</button>}
                            </div>
                          </DismissableDetails>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-4">{renderTakeRows(sectionTakes)}</div>
                  {sectionTakes.length > 0 && <div className="mt-2"><VoiceTakeMixer takes={sectionTakes} /></div>}
                  {isAdmin && recording && sectionTakes.length < 8 && (
                    <section aria-label={`Record a part for ${section.name}`} className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
                      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Preview your take before saving it to {section.name}.</p>
                      <VoiceTakeRecorder project={project} sectionId={section.id} showSungLine backingTakes={sectionTakes} onSaved={() => router.refresh()} />
                    </section>
                  )}
                  {isAdmin && sectionTakes.length >= 8 && <p className="mt-4 border-l-2 border-slate-300 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">This section has reached the eight-part limit.</p>}
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <>
          <section aria-labelledby="takes-heading" className="mb-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="takes-heading" className="font-serif text-xl font-semibold text-slate-950 dark:text-white">Recorded parts</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{singleSectionTakes.length} of 8 parts recorded</p>
              </div>
              {addSectionButton}
            </div>
            {singleSectionTakes.length === 0 ? (
              <div className="border-y border-slate-200 px-4 py-9 text-center dark:border-slate-800">
                <p className="font-medium text-slate-800 dark:text-slate-100">No parts recorded yet</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Saved recordings will be available here for listeners.</p>
              </div>
            ) : renderTakeRows(singleSectionTakes)}
          </section>

          <VoiceTakeMixer takes={singleSectionTakes} />

          {isAdmin && singleSectionTakes.length < 8 && (
            <section aria-labelledby="record-heading" className="border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h2 id="record-heading" className="font-serif text-xl font-semibold text-slate-950 dark:text-white">Record a part</h2>
                <VoiceRecorderInfoButton />
              </div>
              <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">Preview your take before saving.</p>
              <VoiceTakeRecorder project={project} sectionId={singleSection?.id ?? null} backingTakes={singleSectionTakes} onSaved={() => router.refresh()} />
            </section>
          )}

          {isAdmin && singleSectionTakes.length >= 8 && (
            <p className="border-l-2 border-slate-300 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">This section has reached the eight-part limit.</p>
          )}
        </>
      )}

      {loginOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAdminLogin(); }}>
          <form onSubmit={handleLogin} className="w-full max-w-md border border-slate-200 bg-[#fbfaf7] p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-md">
            <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">Admin access</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter the passphrase to record and manage parts.</p>
            <div className="mt-5">
              <label htmlFor="project-admin-passphrase" className="block text-xs font-medium text-slate-600 dark:text-slate-400">Admin passphrase</label>
              <div className="relative mt-1">
                <input id="project-admin-passphrase" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter admin passphrase" className="field-control pr-12" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide passphrase' : 'Show passphrase'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={17} />
                </button>
              </div>
            </div>
            {loginError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{loginError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeAdminLogin} className="button-secondary">Cancel</button>
              <button type="submit" disabled={loginPending || !password} className="button-primary">{loginPending ? 'Checking…' : 'Continue'}</button>
            </div>
          </form>
        </div>
      )}

      {sectionToDelete && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !sectionPending) setSectionToDelete(null); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby={`delete-section-title-${sectionToDelete.id}`} aria-describedby={`delete-section-description-${sectionToDelete.id}`} className="w-full max-w-md border border-slate-200 bg-[#fbfaf7] p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-md">
            <h2 id={`delete-section-title-${sectionToDelete.id}`} className="font-serif text-xl font-semibold text-slate-900 dark:text-white">Delete “{sectionToDelete.name}”?</h2>
            <p id={`delete-section-description-${sectionToDelete.id}`} className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              This removes {deletingSectionTakeCount} recorded part{deletingSectionTakeCount === 1 ? '' : 's'} and their audio files from this rehearsal. This can’t be undone.
            </p>
            {sectionActionError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{sectionActionError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" autoFocus onClick={() => { setSectionToDelete(null); setSectionActionError(''); }} disabled={sectionPending} className="button-secondary">Cancel</button>
              <button type="button" onClick={deleteSection} disabled={sectionPending} className="button-danger-quiet">{sectionPending ? 'Deleting…' : 'Delete section'}</button>
            </div>
          </section>
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
      <div className="flex items-center justify-between gap-3 sm:contents">
        <span className="w-8 shrink-0 font-mono text-xs tabular-nums text-slate-400">{String(index + 1).padStart(2, '0')}</span>
        {isAdmin && (
          <DismissableDetails className="relative order-last shrink-0 sm:order-last">
            <summary className="details-summary icon-button min-h-11 min-w-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-violet-600 sm:min-h-0 sm:min-w-0" aria-label={`More actions for ${take.part_label}`} title="Part actions">
              <Icon name="more-horizontal" size={20} />
            </summary>
            <div className="popover-surface absolute right-0 top-full z-30 mt-1 min-w-44 max-w-[calc(100vw-2rem)] rounded-md p-1">
              <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setError(''); setOffsetDraft(take.offset_ms); setTimingOpen((open) => !open); }} disabled={deleting || savingTiming} className="flex min-h-10 w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"><Icon name="edit" size={15} />Adjust timing</button>
              <button type="button" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setError(''); setConfirmingDelete(true); }} disabled={deleting} className="flex min-h-10 w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/40"><Icon name="trash" size={15} />Remove part</button>
            </div>
          </DismissableDetails>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-lg font-medium text-slate-900 dark:text-slate-100">{take.part_label}</p>
        {take.line_label && take.line_label.toLowerCase() !== take.part_label.toLowerCase() && <p className="mt-0.5 text-sm text-violet-800 dark:text-violet-200">Sings the {take.line_label}</p>}
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatDuration(take.duration_seconds)} · playback shift {formatMilliseconds(take.offset_ms)} · {new Date(take.created_at).toLocaleString()}</p>
      </div>
      <VoiceWaveformPlayer
        takeId={take.id}
        audioRef={audioRef}
        src={`/api/voice-rehearsal/takes/${take.id}/playback?stream=1`}
        waveformSrc={`/api/voice-rehearsal/takes/${take.id}/playback?download=1`}
        diagnosticUrl={`/api/voice-rehearsal/takes/${take.id}/playback?diagnose=1`}
        durationSeconds={take.duration_seconds}
        label={take.part_label}
      />
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
