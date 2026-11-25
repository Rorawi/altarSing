'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';
import type { VoiceRehearsalProject, VoiceRehearsalSection, VoiceRehearsalTake } from '@/types/voice-rehearsal';
import DismissableDetails from './DismissableDetails';

function formatExpiry(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC' });
}

export default function VoiceRehearsalShare({ project, takes, sections }: { project: VoiceRehearsalProject; takes: VoiceRehearsalTake[]; sections: VoiceRehearsalSection[] }) {
  const [status, setStatus] = useState('');

  function getMessage() {
    const takeName = (take: VoiceRehearsalTake) => take.line_label && take.line_label.toLowerCase() !== take.part_label.toLowerCase()
      ? `${take.part_label} → ${take.line_label}`
      : take.part_label;
    const parts = sections.length > 1
      ? sections.flatMap((section) => {
        const labels = [...new Set(takes.filter((take) => take.section_id === section.id).map(takeName))];
        return labels.length ? [`${section.name}: ${labels.join(', ')}`] : [];
      })
      : [...new Set(takes.map(takeName))];
    const details = [
      `Voice parts for ${project.title}`,
      parts.length ? `${sections.length > 1 ? 'Sections' : 'Recorded parts'}: ${parts.join(' · ')}` : '',
      project.bpm ? `Tempo: ${project.bpm} BPM` : '',
      `Listen and practise: ${window.location.href}`,
      `This view-only link is available until ${formatExpiry(project.expires_at)}.`,
    ].filter(Boolean);
    return details.join('\n');
  }

  function closeShareMenu(event: React.MouseEvent<HTMLButtonElement>) {
    event.currentTarget.closest('details')?.removeAttribute('open');
  }

  function shareOnWhatsApp(event: React.MouseEvent<HTMLButtonElement>) {
    closeShareMenu(event);
    const url = `https://wa.me/?text=${encodeURIComponent(getMessage())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function copyLink(event: React.MouseEvent<HTMLButtonElement>) {
    closeShareMenu(event);
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
        <DismissableDetails className="relative w-fit shrink-0 self-start sm:self-auto">
          <summary className="details-summary button-secondary cursor-pointer">Share rehearsal<Icon name="chevron-down" size={16} /></summary>
          <div className="popover-surface absolute left-0 top-full z-30 mt-1 min-w-48 max-w-[calc(100vw-2rem)] rounded-md p-1 sm:left-auto sm:right-0">
            <button type="button" onClick={shareOnWhatsApp} className="flex min-h-10 w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><Icon name="external" size={15} />Share to WhatsApp</button>
            <button type="button" onClick={copyLink} className="flex min-h-10 w-full items-center rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Copy rehearsal link</button>
          </div>
        </DismissableDetails>
      </div>
      {status && <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-300">{status}</p>}
    </section>
  );
}
