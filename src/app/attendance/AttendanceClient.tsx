'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { MemberWithAttendance } from '@/types';
import { upsertAttendance, addChoirMember, deleteChoirMember, markAllAbsent } from '@/lib/actions';
import { ABSENCE_REASONS, MEMBER_ROLES } from '@/lib/constants';

interface Props {
  members: MemberWithAttendance[];
  sessionDate: string;
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
];

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function getAvatarColor(name: string) {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function AttendanceClient({ members, sessionDate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Member management
  const [showAddMember, setShowAddMember] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Absence flow
  const [markingAbsentId, setMarkingAbsentId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [reasonText, setReasonText] = useState('');

  const formattedDate = new Date(sessionDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const presentCount = members.filter((m) => m.attendance?.present === true).length;
  const absentCount = members.filter((m) => m.attendance?.present === false).length;
  const unmarkedCount = members.length - presentCount - absentCount;

  function handleMarkPresent(memberId: string) {
    if (markingAbsentId === memberId) {
      setMarkingAbsentId(null);
      setSelectedReason('');
      setReasonText('');
    }
    startTransition(async () => {
      await upsertAttendance(memberId, sessionDate, true, null, null);
      router.refresh();
    });
  }

  function startMarkingAbsent(memberId: string, existingReason: string | null) {
    setMarkingAbsentId(memberId);
    const knownReasons = ABSENCE_REASONS as readonly string[];
    if (existingReason && knownReasons.includes(existingReason)) {
      setSelectedReason(existingReason);
      setReasonText('');
    } else if (existingReason) {
      setSelectedReason('Other');
      setReasonText(existingReason);
    } else {
      setSelectedReason('');
      setReasonText('');
    }
  }

  function handleConfirmAbsent(memberId: string) {
    const reason = selectedReason === 'Other' ? (reasonText.trim() || 'Other') : selectedReason;
    startTransition(async () => {
      await upsertAttendance(memberId, sessionDate, false, reason || null, null);
      setMarkingAbsentId(null);
      setSelectedReason('');
      setReasonText('');
      router.refresh();
    });
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    const formData = new FormData();
    formData.set('name', newName);
    formData.set('role', newRole);
    formData.set('image_url', newImageUrl);
    startTransition(async () => {
      try {
        await addChoirMember(formData);
        setNewName(''); setNewRole(''); setNewImageUrl('');
        setShowAddMember(false);
        router.refresh();
      } catch (err) {
        setAddError(err instanceof Error ? err.message : 'Failed to add member');
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteChoirMember(id);
      setConfirmDeleteId(null);
      router.refresh();
    });
  }

  function handleMarkAllAbsent() {
    if (!confirm(`Mark all ${members.length} members as absent for this session?`)) return;
    startTransition(async () => {
      await markAllAbsent(members.map((m) => m.id), sessionDate);
      router.refresh();
    });
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    router.push(`/attendance?date=${e.target.value}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Attendance</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formattedDate}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/attendance/report"
            className="border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            📊 Report
          </Link>
          <button
            onClick={() => setShowAddMember((v) => !v)}
            className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm"
          >
            + Member
          </button>
        </div>
      </div>

      {/* Date picker */}
      <input
        type="date"
        value={sessionDate}
        onChange={handleDateChange}
        className="mb-3 w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
      />

      {/* Stats bar */}
      {members.length > 0 && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-green-50 dark:bg-green-900/30 rounded-xl px-3 py-2 text-center border border-green-100 dark:border-green-800">
            <p className="text-xl font-bold text-green-700 dark:text-green-400">{presentCount}</p>
            <p className="text-xs text-green-600 dark:text-green-500">Present</p>
          </div>
          <div className="flex-1 bg-red-50 dark:bg-red-900/30 rounded-xl px-3 py-2 text-center border border-red-100 dark:border-red-800">
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{absentCount}</p>
            <p className="text-xs text-red-500 dark:text-red-400">Absent</p>
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-xl font-bold text-slate-500 dark:text-slate-400">{unmarkedCount}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Unmarked</p>
          </div>
        </div>
      )}

      {/* Mark all absent */}
      {members.length > 0 && (
        <button
          onClick={handleMarkAllAbsent}
          disabled={isPending}
          className="w-full mb-4 border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 rounded-xl py-2.5 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
        >
          ✗ Mark all absent
        </button>
      )}

      {/* Add member form */}
      {showAddMember && (
        <form
          onSubmit={handleAddMember}
          className="bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded-2xl p-4 mb-4 space-y-3"
        >
          <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">New Choir / Band Member</p>
          {addError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {addError}
            </p>
          )}
          <input
            type="text"
            placeholder="Full name *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Role / Instrument (optional)</option>
            {MEMBER_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <input
            type="url"
            placeholder="Photo URL (optional)"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddMember(false)}
              className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-violet-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-violet-700 disabled:opacity-60"
            >
              {isPending ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {members.length === 0 && !showAddMember && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🎤</p>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">No choir members yet</p>
          <button
            onClick={() => setShowAddMember(true)}
            className="mt-4 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            Add First Member
          </button>
        </div>
      )}

      {/* Member cards — horizontal swipe carousel */}
      {members.length > 0 && (
        <div
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-3"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {members.map((member, index) => {
            const present = member.attendance?.present;
            const absReason = (member.attendance as any)?.absence_reason as string | null | undefined;
            const isMarkingAbsent = markingAbsentId === member.id;
            const isConfirmingDelete = confirmDeleteId === member.id;
            const avatarColor = getAvatarColor(member.name);

            let topBg = 'bg-slate-50 dark:bg-slate-700';
            let borderColor = 'border-slate-200 dark:border-slate-600';
            if (present === true) { topBg = 'bg-green-50 dark:bg-green-900/30'; borderColor = 'border-green-200 dark:border-green-700'; }
            if (present === false) { topBg = 'bg-red-50 dark:bg-red-900/30'; borderColor = 'border-red-200 dark:border-red-700'; }

            return (
              <div
                key={member.id}
                className={`shrink-0 snap-center w-[78vw] max-w-[300px] bg-white dark:bg-slate-800 rounded-2xl border shadow-md overflow-hidden flex flex-col transition-opacity ${isPending ? 'opacity-60 pointer-events-none' : ''} ${borderColor}`}
              >
                {/* Card top — avatar + info */}
                <div className={`${topBg} px-4 pt-4 pb-5 flex flex-col items-center`}>
                  {/* Counter + delete row */}
                  <div className="w-full flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{index + 1} / {members.length}</span>
                    {isConfirmingDelete ? (
                      <div className="flex gap-3">
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-slate-500">Cancel</button>
                        <button onClick={() => handleDelete(member.id)} className="text-xs text-red-600 font-semibold">Remove</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(member.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors p-1"
                        title="Remove member"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Avatar */}
                  <Link href={`/attendance/${member.id}`}>
                    <div className="w-24 h-24 rounded-full overflow-hidden shadow-md">
                      {member.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={member.image_url} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full ${avatarColor} flex items-center justify-center`}>
                          <span className="text-white font-bold text-3xl">{getInitials(member.name)}</span>
                        </div>
                      )}
                    </div>
                  </Link>

                  <Link href={`/attendance/${member.id}`} className="mt-3 text-center">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">{member.name}</p>
                  </Link>
                  {member.role && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{member.role}</p>
                  )}

                  {/* Status badge */}
                  <div className="mt-2.5">
                    {present === true && (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 bg-green-200 px-3 py-1 rounded-full">
                        ✓ Present
                      </span>
                    )}
                    {present === false && (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 bg-red-200 px-3 py-1 rounded-full">
                        ✗ Absent{absReason ? ` · ${absReason}` : ''}
                      </span>
                    )}
                    {(present === null || present === undefined) && (
                      <span className="text-sm text-slate-400">Not marked</span>
                    )}
                  </div>
                </div>

                {/* Card bottom — action buttons */}
                <div className="px-4 py-4 flex-1 space-y-3">
                  {!isMarkingAbsent ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMarkPresent(member.id)}
                        className={`flex-1 py-3.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                          present === true
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white dark:bg-slate-700 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20'
                        }`}
                      >
                        ✓ Present
                      </button>
                      <button
                        onClick={() => startMarkingAbsent(member.id, absReason ?? null)}
                        className={`flex-1 py-3.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                          present === false
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20'
                        }`}
                      >
                        ✗ Absent
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Reason for absence:</p>
                      <div className="flex flex-wrap gap-2">
                        {ABSENCE_REASONS.map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => setSelectedReason(reason)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              selectedReason === reason
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-red-300'
                            }`}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                      {selectedReason === 'Other' && (
                        <input
                          type="text"
                          placeholder="Describe reason…"
                          value={reasonText}
                          onChange={(e) => setReasonText(e.target.value)}
                          className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
                        />
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setMarkingAbsentId(null); setSelectedReason(''); setReasonText(''); }}
                          className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-medium dark:hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmAbsent(member.id)}
                          disabled={isPending}
                          className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                        >
                          {isPending ? 'Saving…' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
