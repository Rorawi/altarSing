'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createRehearsalSession } from '@/lib/actions';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

export default function NewSessionClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().split('T')[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const id = await createRehearsalSession(formData);
      router.push(`/rehearsal/${id}`);
    });
  }

  return (
    <div>
      <PageHeader
        title="New rehearsal"
        description="Set the rehearsal date and focus, then add songs to the plan."
        actions={<Link href="/rehearsal" className="button-quiet"><Icon name="arrow-left" size={16} />All rehearsals</Link>}
      />

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-5 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Date
            </label>
            <input
              type="date"
              name="date"
              defaultValue={today}
              required
              className="field-control"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Session Name / Focus
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Sunday Service Medley Practice"
              className="field-control"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Program Date{' '}
              <span className="text-slate-400 font-normal text-xs">(optional — when will this be performed?)</span>
            </label>
            <input
              type="date"
              name="program_date"
              className="field-control"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              When this date arrives, the app will auto-create a Service Log entry from this session.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Overall Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Any general notes about this rehearsal session…"
              className="field-control resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="button-primary"
        >
          {isPending ? 'Creating…' : 'Create Session & Add Songs'}
        </button>
      </form>
    </div>
  );
}
