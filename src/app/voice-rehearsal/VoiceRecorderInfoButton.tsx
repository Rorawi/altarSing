'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';

export default function VoiceRecorderInfoButton() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="icon-button h-8 w-8 text-slate-500 dark:text-slate-400"
        aria-label="Recording tips and information"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Recording tips"
      >
        <Icon name="info" size={17} />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-recorder-tips-title"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto border border-slate-200 bg-[#fbfaf7] p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="voice-recorder-tips-title" className="font-serif text-xl font-semibold text-slate-900 dark:text-white">Recording tips</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A few details to help your parts sound clear and stay together.</p>
              </div>
              <button ref={closeRef} type="button" onClick={close} className="icon-button" aria-label="Close recording tips"><Icon name="close" /></button>
            </div>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-medium text-slate-800 dark:text-slate-100">Microphone and headphones</dt>
                <dd className="mt-1 text-slate-600 dark:text-slate-300">Keep the microphone uncovered and about a hand-span away. Wired headphones usually add less delay than Bluetooth.</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-800 dark:text-slate-100">Recording gain</dt>
                <dd className="mt-1 text-slate-600 dark:text-slate-300">Raise gain if your voice is quiet. Keep the level meter out of the red; red means the recording may distort.</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-800 dark:text-slate-100">Tempo and count-in</dt>
                <dd className="mt-1 text-slate-600 dark:text-slate-300">Set BPM manually or capture a rhythm: mark the downbeat, tap each audible hit, then mark the next downbeat. Preview it before using it as the count-in.</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-800 dark:text-slate-100">Saving and listening</dt>
                <dd className="mt-1 text-slate-600 dark:text-slate-300">A take stays on this device until you save it. Saving requires microphone permission on a secure (HTTPS) page. Saved parts can be heard by anyone with this rehearsal link until it expires.</dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </>
  );
}
