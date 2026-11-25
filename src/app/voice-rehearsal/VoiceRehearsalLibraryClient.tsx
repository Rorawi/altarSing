'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Icon from '@/components/Icon';
import PageHeader from '@/components/PageHeader';
import type { VoiceRehearsalProject } from '@/types/voice-rehearsal';
import DeleteVoiceRehearsalButton from './DeleteVoiceRehearsalButton';

export default function VoiceRehearsalLibraryClient({
  projects,
  isAdmin,
  adminConfigured,
}: {
  projects: VoiceRehearsalProject[];
  isAdmin: boolean;
  adminConfigured: boolean;
}) {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      const response = await fetch('/api/voice-rehearsal/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not sign in.');
      setPassword('');
      setShowLogin(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.');
    } finally {
      setPending(false);
    }
  }

  async function handleLogout() {
    setError('');
    setPending(true);
    try {
      const response = await fetch('/api/voice-rehearsal/admin/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Could not end admin access.');
      setShowCreate(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not end admin access.');
    } finally {
      setPending(false);
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      const response = await fetch('/api/voice-rehearsal/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, bpm: bpm || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not create the project.');
      router.push(`/voice-rehearsal/${result.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the project.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Voice rehearsal"
        description={<>Separate voice-part recordings for rehearsal · {projects.length} project{projects.length === 1 ? '' : 's'}</>}
        actions={isAdmin ? (
          <>
            <button type="button" onClick={handleLogout} disabled={pending} className="button-secondary">End admin access</button>
            <button type="button" onClick={() => { setShowCreate((value) => !value); setError(''); }} className="button-primary">
              <Icon name="plus" size={16} />New project
            </button>
          </>
        ) : (
          <button type="button" onClick={() => { setShowLogin(true); setError(''); }} disabled={!adminConfigured} className="button-secondary">
            Admin access
          </button>
        )}
      />

      {!adminConfigured && (
        <p className="mb-5 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Voice Studio management needs <code>REHEARSAL_ADMIN_PASSWORD</code>, a <code>REHEARSAL_ADMIN_SESSION_SECRET</code> of at least 32 characters, and the server-only <code>SUPABASE_SERVICE_ROLE_KEY</code>. Set them in this environment, then restart the dev server or redeploy.
        </p>
      )}

      {error && <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-300">{error}</p>}

      {isAdmin && showCreate && (
        <form onSubmit={handleCreate} className="mb-6 border-y border-slate-200 py-4 dark:border-slate-800">
          <h2 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">New voice rehearsal</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Rehearsal title
              <input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className="field-control mt-1" placeholder="Song · key · service or occasion" />
              <span className="mt-1 block font-normal text-slate-500 dark:text-slate-400">Include the song and key, then add the service or occasion so singers can identify it (e.g. Amazing Grace · G major · Sunday service).</span>
            </label>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Tempo (optional)
              <input type="number" min={20} max={300} step={1} value={bpm} onChange={(event) => setBpm(event.target.value)} className="field-control mt-1" placeholder="BPM" />
            </label>
            <button type="submit" disabled={pending || !title.trim()} className="button-primary">{pending ? 'Creating…' : 'Create project'}</button>
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <div className="border-y border-slate-200 px-4 py-16 text-center dark:border-slate-800">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"><Icon name="microphone" size={19} /></div>
          <h2 className="mt-4 font-medium text-slate-900 dark:text-slate-100">No rehearsal projects yet</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Projects and their recordings will appear here for listeners.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {projects.map((project) => (
            <div key={project.id} className="group flex min-h-20 items-center justify-between gap-4 px-2 py-4 transition-colors hover:bg-white/70 dark:hover:bg-slate-900/60 sm:px-4">
              <Link href={`/voice-rehearsal/${project.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-4">
                <span className="min-w-0">
                  <span className="block break-words font-serif text-lg font-medium text-slate-900 group-hover:text-violet-900 dark:text-slate-100 dark:group-hover:text-violet-200">{project.title}</span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    {project.bpm ? `${project.bpm} BPM · ` : ''}Expires {new Date(project.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">Open <Icon name="chevron-right" size={16} /></span>
              </Link>
              {isAdmin && <DeleteVoiceRehearsalButton projectId={project.id} title={project.title} />}
            </div>
          ))}
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowLogin(false); }}>
          <form onSubmit={handleLogin} className="w-full max-w-md border border-slate-200 bg-[#fbfaf7] p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-md">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">Admin access</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to manage rehearsal projects and recordings.</p></div>
              <button type="button" aria-label="Close" className="icon-button" onClick={() => setShowLogin(false)}><Icon name="close" /></button>
            </div>
            <label className="mt-5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Admin passphrase
              <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="field-control mt-1" />
            </label>
            {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowLogin(false)} className="button-secondary">Cancel</button>
              <button type="submit" disabled={pending || !password} className="button-primary">{pending ? 'Checking…' : 'Continue'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
