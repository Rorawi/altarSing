'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { VocalTrainingResource } from '@/types';
import {
  createVocalTrainingResource,
  deleteVocalTrainingResource,
  incrementVocalTrainingResourceUse,
  updateVocalTrainingResource,
} from '@/lib/actions';
import Icon from '@/components/Icon';

type ResourceInput = { title: string; url: string; notes: string | null };

function getTrainingLinkLabel(rawUrl: string): string {
  let hostname = '';
  try {
    hostname = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'Open link';
  }

  if (hostname === 'youtu.be' || hostname.endsWith('.youtube.com') || hostname === 'youtube.com' || hostname.endsWith('.youtube-nocookie.com')) return 'Watch on YouTube';
  if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) return 'Open TikTok';
  if (hostname === 'spotify.com' || hostname.endsWith('.spotify.com') || hostname === 'spotify.link') return 'Open Spotify';
  if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) return 'Open Instagram';
  if (hostname === 'facebook.com' || hostname.endsWith('.facebook.com') || hostname === 'fb.watch') return 'Open Facebook';
  if (hostname === 'soundcloud.com' || hostname.endsWith('.soundcloud.com')) return 'Open SoundCloud';
  if (hostname === 'vimeo.com' || hostname.endsWith('.vimeo.com')) return 'Watch on Vimeo';
  if (hostname === 'music.apple.com') return 'Open Apple Music';
  return 'Open link';
}

export default function VocalTrainingClient({
  resources,
  setupError,
}: {
  resources: VocalTrainingResource[];
  setupError: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [editingResource, setEditingResource] = useState<VocalTrainingResource | null>(null);
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');

  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return resources;
    return resources.filter((resource) =>
      resource.title.toLowerCase().includes(query) ||
      resource.notes?.toLowerCase().includes(query) ||
      resource.url.toLowerCase().includes(query),
    );
  }, [resources, search]);

  function saveResource(input: ResourceInput) {
    setActionError('');
    startTransition(async () => {
      try {
        if (editingResource) {
          await updateVocalTrainingResource(editingResource.id, input);
        } else {
          await createVocalTrainingResource(input);
        }
        setEditingResource(null);
        setShowCreate(false);
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Could not save this training link.');
      }
    });
  }

  function markTried(resource: VocalTrainingResource) {
    setActionError('');
    startTransition(async () => {
      try {
        await incrementVocalTrainingResourceUse(resource.id);
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Could not update the tried count.');
      }
    });
  }

  function removeResource(resource: VocalTrainingResource) {
    if (!confirm(`Remove “${resource.title}” from vocal training?`)) return;
    setActionError('');
    startTransition(async () => {
      try {
        await deleteVocalTrainingResource(resource.id);
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Could not remove this training link.');
      }
    });
  }

  const missingTable = !!setupError && /could not find the table|relation .* does not exist|schema cache/i.test(setupError);

  return (
    <section aria-labelledby="vocal-training-heading">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="vocal-training-heading" className="font-serif text-xl font-semibold text-slate-950 dark:text-slate-100">Vocal training</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Save exercises and videos to use with the choir. Mark each time you work through one together.
          </p>
        </div>
        {!setupError && !showCreate && !editingResource && (
          <button type="button" onClick={() => setShowCreate(true)} className="button-primary self-start sm:self-auto">
            <Icon name="plus" size={16} />Add training link
          </button>
        )}
      </div>

      {setupError && (
        <div role="alert" className="mb-5 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {missingTable
            ? <>Vocal training storage needs to be set up in Supabase. Run <code className="font-mono">supabase/migrations/20261127_vocal_training_resources.sql</code> in the SQL Editor, then refresh this page.</>
            : <>Could not load vocal training links: {setupError}</>}
        </div>
      )}

      {actionError && <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-300">{actionError}</p>}

      {(showCreate || editingResource) && !setupError && (
        <ResourceForm
          key={editingResource?.id ?? 'new-resource'}
          initial={editingResource}
          isPending={isPending}
          onSave={saveResource}
          onCancel={() => { setShowCreate(false); setEditingResource(null); }}
        />
      )}

      {resources.length > 0 && (
        <label className="relative mb-4 block">
          <span className="sr-only">Search vocal training links</span>
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search training links…"
            className="field-control pl-10"
          />
        </label>
      )}

      {filteredResources.length === 0 && !showCreate && !editingResource && !setupError && (
        <div className="border-y border-slate-200 px-5 py-12 text-center dark:border-slate-800">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <Icon name="microphone" size={18} />
          </div>
          <p className="font-medium text-slate-800 dark:text-slate-100">
            {resources.length === 0 ? 'No vocal training links saved yet' : 'No links match your search'}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {resources.length === 0 ? 'Save a warm-up or singing exercise to try with the choir.' : 'Try another title, note, or website name.'}
          </p>
        </div>
      )}

      {filteredResources.length > 0 && (
        <div className="border-y border-slate-200 dark:border-slate-800">
          {filteredResources.map((resource) => (
            <article key={resource.id} className="flex flex-col gap-3 border-b border-slate-200 py-4 last:border-b-0 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="break-words font-medium text-slate-900 dark:text-slate-100">{resource.title}</h3>
                <a href={resource.url} target="_blank" rel="noopener noreferrer" title={resource.url} aria-label={`${getTrainingLinkLabel(resource.url)}: ${resource.title} (opens in a new tab)`} className="mt-1 inline-flex items-center gap-1 text-sm text-violet-800 underline-offset-2 hover:underline dark:text-violet-300">
                  {getTrainingLinkLabel(resource.url)}<Icon name="external" size={14} className="shrink-0" />
                </a>
                {resource.notes && <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">{resource.notes}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="mr-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  Tried {resource.times_used} time{resource.times_used === 1 ? '' : 's'}
                </span>
                <button type="button" onClick={() => markTried(resource)} disabled={isPending} className="button-secondary min-h-9 px-3 text-sm disabled:opacity-60">
                  <Icon name="check" size={15} />Tried with choir
                </button>
                <button type="button" onClick={() => { setShowCreate(false); setEditingResource(resource); setActionError(''); }} disabled={isPending} className="icon-button h-9 w-9" aria-label={`Edit ${resource.title}`} title="Edit link">
                  <Icon name="edit" size={15} />
                </button>
                <button type="button" onClick={() => removeResource(resource)} disabled={isPending} className="icon-button h-9 w-9 text-red-700 dark:text-red-300" aria-label={`Remove ${resource.title}`} title="Remove link">
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ResourceForm({
  initial,
  isPending,
  onSave,
  onCancel,
}: {
  initial: VocalTrainingResource | null;
  isPending: boolean;
  onSave: (input: ResourceInput) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({ title, url, notes: notes.trim() || null });
  }

  return (
    <form onSubmit={handleSubmit} className="mb-5 space-y-3 border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{initial ? 'Edit training link' : 'Add a training link'}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} placeholder="e.g. Breath support warm-up" className="field-control mt-1" />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Link
          <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} required placeholder="https://…" className="field-control mt-1" />
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Note for the choir <span className="font-normal text-slate-500">(optional)</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} maxLength={1000} placeholder="What should the choir focus on?" className="field-control mt-1 resize-y" />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={isPending} className="button-quiet">Cancel</button>
        <button type="submit" disabled={isPending || !title.trim() || !url.trim()} className="button-primary">
          {isPending ? 'Saving…' : initial ? 'Save changes' : 'Save link'}
        </button>
      </div>
    </form>
  );
}
