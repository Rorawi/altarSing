'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import SongForm from '@/components/SongForm';
import { addSong } from '@/lib/actions';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

function isVideoUrl(url: string) {
  return (
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('vimeo.com') ||
    url.startsWith('http')
  );
}

export default function QuickAddPage() {
  const router = useRouter();
  const [step, setStep] = useState<'paste' | 'fill'>('paste');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [isPasting, startPasteTransition] = useTransition();

  function handleLinkChange(value: string) {
    setYoutubeLink(value);
  }

  function handleContinue() {
    setStep('fill');
  }

  async function handleSubmit(formData: FormData) {
    await addSong(formData);
    router.refresh();
  }

  const isValidLink = youtubeLink.trim() && isVideoUrl(youtubeLink.trim());
  const isYouTube =
    youtubeLink.includes('youtube.com') || youtubeLink.includes('youtu.be');

  if (step === 'fill') {
    return (
      <div>
        <PageHeader title="Song details" description="Fill in the details to save this song to your library." actions={<button onClick={() => setStep('paste')} className="button-secondary"><Icon name="arrow-left" size={16} />Back</button>} />

        {/* Link preview */}
        {youtubeLink && (
          <div className="mb-4 flex items-start gap-3 border-l-2 border-violet-700 bg-violet-50/70 p-3 dark:bg-violet-300/5">
            <Icon name={isYouTube ? 'play' : 'external'} size={17} className="mt-0.5 text-violet-800 dark:text-violet-300" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-violet-700">Link ready to save</p>
              <p className="text-xs text-violet-500 truncate">{youtubeLink}</p>
            </div>
            <button
              onClick={() => setYoutubeLink('')}
              className="icon-button h-8 w-8 shrink-0"
              aria-label="Remove link"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        )}

        <div className="max-w-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <SongForm
            prefillYoutubeLink={youtubeLink}
            onSubmit={handleSubmit}
            submitLabel="Save to Library"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Quick add" description="Add a song from a reference link or enter its details manually." />

      {/* Paste area */}
      <div className="mb-4 max-w-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Paste a YouTube or online link
        </label>
        <textarea
          value={youtubeLink}
          onChange={(e) => handleLinkChange(e.target.value)}
          placeholder="Paste a YouTube link here…&#10;e.g. https://youtube.com/watch?v=..."
          rows={3}
          autoFocus
          className="field-control min-h-24 resize-y"
        />

        {/* Detection feedback */}
        {youtubeLink.trim() && (
          <div
            className={`mt-3 p-3 rounded-xl flex items-center gap-2 text-sm ${
              isValidLink
                ? 'bg-green-50 border border-green-100 text-green-700'
                : 'bg-amber-50 border border-amber-100 text-amber-700'
            }`}
          >
            <Icon name={isValidLink ? 'check' : 'close'} size={16} />
            <span>
              {isYouTube
                ? 'YouTube link detected — ready to continue.'
                : isValidLink
                  ? 'Link detected — ready to continue!'
                  : 'This does not look like a valid link'}
            </span>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleContinue}
            className="button-primary w-full sm:w-auto"
          >
            {youtubeLink ? 'Continue' : 'Skip and add manually'}
          </button>
        </div>
      </div>

      {/* Tip */}
      <p className="text-xs text-slate-400 text-center">
        Tip: Copy a song reference link and paste it above.
      </p>
    </div>
  );
}
