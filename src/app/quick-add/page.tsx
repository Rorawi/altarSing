'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import SongForm from '@/components/SongForm';
import { addSong } from '@/lib/actions';

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
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setStep('paste')}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 -ml-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Song Details</h1>
            <p className="text-sm text-slate-500">Fill in the details to save to your library</p>
          </div>
        </div>

        {/* Link preview */}
        {youtubeLink && (
          <div className="mb-4 p-3 bg-violet-50 border border-violet-100 rounded-xl flex items-start gap-2">
            <span className="text-lg mt-0.5">{isYouTube ? '▶️' : '🔗'}</span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-violet-700">Link ready to save</p>
              <p className="text-xs text-violet-500 truncate">{youtubeLink}</p>
            </div>
            <button
              onClick={() => setYoutubeLink('')}
              className="text-violet-300 hover:text-violet-500 shrink-0 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Quick Add</h1>
        <p className="text-sm text-slate-500 mt-1">
          Paste a YouTube link to get started, then fill in the details.
        </p>
      </div>

      {/* Paste area */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Paste YouTube / Online Link
        </label>
        <textarea
          value={youtubeLink}
          onChange={(e) => handleLinkChange(e.target.value)}
          placeholder="Paste a YouTube link here…&#10;e.g. https://youtube.com/watch?v=..."
          rows={3}
          autoFocus
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
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
            <span>{isValidLink ? '✅' : '⚠️'}</span>
            <span>
              {isYouTube
                ? 'YouTube link detected — ready to continue!'
                : isValidLink
                  ? 'Link detected — ready to continue!'
                  : 'This does not look like a valid link'}
            </span>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleContinue}
            className="flex-1 bg-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            {youtubeLink ? 'Continue →' : 'Skip & Add Manually'}
          </button>
        </div>
      </div>

      {/* Tip */}
      <p className="text-xs text-slate-400 text-center">
        💡 Tip: Copy a YouTube link from the Share button and paste it above
      </p>
    </div>
  );
}
