'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';
import type { VoiceRehearsalProject, VoiceRehearsalTake } from '@/types/voice-rehearsal';

function formatExpiry(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC' });
}

export default function VoiceRehearsalShare({ project, takes }: { project: VoiceRehearsalProject; takes: VoiceRehearsalTake[] }) {
  const [status, setStatus] = useState('');

  function getMessage() {
    const parts = [...new Set(takes.map((take) => take.part_label))];
    const details = [
      `Voice parts for ${project.title}`,
      parts.length ? `Recorded parts: ${parts.join(', ')}` : '',
      project.bpm ? `Tempo: ${project.bpm} BPM` : '',
      `Listen and practise: ${window.location.href}`,
      `This view-only link is available until ${formatExpiry(project.expires_at)}.`,
    ].filter(Boolean);
    return details.join('\n');
  }

  function shareOnWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(getMessage())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus('Rehearsal link copied. Anyone with it can listen until the expiry date.');
    } catch {
      setStatus('Copy was blocked by the browser. Copy the page address from your browser bar.');
    }
  }

  return (
    <section aria-labelledby="share-rehearsal-heading" className="mb-7 border-y border-slate-200 py-4 dark:border-slate-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id="share-rehearsal-heading" className="font-medium text-slate-900 dark:text-slate-100">Share this rehearsal</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Send {takes.length} recorded part{takes.length === 1 ? '' : 's'} to the choir. Anyone with the link can listen until {formatExpiry(project.expires_at)}.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={shareOnWhatsApp} className="button-secondary"><Icon name="external" size={16} />Share to WhatsApp</button>
          <button type="button" onClick={copyLink} className="button-primary">Copy rehearsal link</button>
        </div>
      </div>
      {status && <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-300">{status}</p>}
    </section>
  );
}
