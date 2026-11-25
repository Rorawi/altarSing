'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import DismissableDetails from './DismissableDetails';

export default function DeleteVoiceRehearsalButton({
  projectId,
  title,
  redirectTo,
}: {
  projectId: string;
  title: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function deleteProject() {
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/api/voice-rehearsal/projects/${projectId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'The rehearsal could not be deleted.');
      setConfirming(false);
      if (redirectTo) router.replace(redirectTo);
      else router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The rehearsal could not be deleted.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DismissableDetails className="relative shrink-0">
        <summary className="details-summary icon-button min-h-11 min-w-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-violet-600 sm:min-h-0 sm:min-w-0" aria-label={`More actions for ${title}`} title="More actions">
          <Icon name="more-horizontal" size={20} />
        </summary>
        <div className="popover-surface absolute right-0 top-full z-30 mt-1 min-w-48 max-w-[calc(100vw-2rem)] rounded-md p-1">
          <button
            type="button"
            onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setError(''); setConfirming(true); }}
            className="flex min-h-10 w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
            aria-label={`Delete ${title} rehearsal`}
          >
            <Icon name="trash" size={16} />Delete rehearsal
          </button>
        </div>
      </DismissableDetails>
      {confirming && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setConfirming(false); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby={`delete-rehearsal-title-${projectId}`} aria-describedby={`delete-rehearsal-description-${projectId}`} className="w-full max-w-md border border-slate-200 bg-[#fbfaf7] p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-md">
            <h2 id={`delete-rehearsal-title-${projectId}`} className="font-serif text-xl font-semibold text-slate-900 dark:text-white">Delete this rehearsal?</h2>
            <p id={`delete-rehearsal-description-${projectId}`} className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              <strong>{title}</strong>, all of its recorded parts, notes, and stored audio files will be permanently deleted.
            </p>
            {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" autoFocus onClick={() => setConfirming(false)} disabled={pending} className="button-secondary">Cancel</button>
              <button type="button" onClick={deleteProject} disabled={pending} className="button-danger-quiet">{pending ? 'Deleting…' : 'Delete rehearsal'}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
