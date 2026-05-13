'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { MemberWithAttendance } from '@/types';
import { upsertAttendance, addChoirMember, deleteChoirMember } from '@/lib/actions';
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

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    router.push(`/attendance?date=${e.target.value}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-xs text-slate-500 mt-0.5">{formattedDate}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/attendance/report"
            className="border border-slate-300 text-slate-600 px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors"
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
        className="mb-3 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white text-slate-700"
      />

      {/* Stats bar */}
      {members.length > 0 && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-green-50 rounded-xl px-3 py-2 text-center border border-green-100">
            <p className="text-xl font-bold text-green-700">{presentCount}</p>
            <p className="text-xs text-green-600">Present</p>
          </div>
          <div className="flex-1 bg-red-50 rounded-xl px-3 py-2 text-center border border-red-100">
            <p className="text-xl font-bold text-red-600">{absentCount}</p>
            <p className="text-xs text-red-500">Absent</p>
          </div>
          <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2 text-center border border-slate-200">
            <p className="text-xl font-bold text-slate-500">{unmarkedCount}</p>
            <p className="text-xs text-slate-400">Unmarked</p>
          </div>
        </div>
      )}

      {/* Add member form */}
      {showAddMember && (
        <form
          onSubmit={handleAddMember}
          className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-4 space-y-3"
        >
          <p className="text-sm font-semibold text-violet-800">New Choir / Band Member</p>
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
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white text-slate-700"
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
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddMember(false)}
              className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50"
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
          <p className="text-slate-500 font-medium text-lg">No choir members yet</p>
          <button
            onClick={() => setShowAddMember(true)}
            className="mt-4 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            Add First Member
          </button>
        </div>
      )}

      {/* Member cards */}
      <div className="space-y-3">
        {members.map((member) => {
          const present = member.attendance?.present;
          const absReason = (member.attendance as any)?.absence_reason as string | null | undefined;
          const isMarkingAbsent = markingAbsentId === member.id;
          const isConfirmingDelete = confirmDeleteId === member.id;
          const avatarColor = getAvatarColor(member.name);

          let accentColor = 'bg-slate-300';
          let borderColor = 'border-slate-200';
          if (present === true) { accentColor = 'bg-green-400'; borderColor = 'border-green-200'; }
          if (present === false) { accentColor = 'bg-red-400'; borderColor = 'border-red-200'; }

          return (
            <div
              key={member.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-60 pointer-events-none' : ''} ${borderColor}`}
            >
              <div className="flex">
                {/* Left accent stripe */}
                <div className={`w-1.5 shrink-0 ${accentColor}`} />

                <div className="flex-1 p-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar — tappable, goes to history */}
                    <Link href={`/attendance/${member.id}`} className="shrink-0">
                      <div className="w-13 h-13 w-[52px] h-[52px] rounded-full overflow-hidden shadow-sm">
                        {member.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.image_url}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full ${avatarColor} flex items-center justify-center`}>
                            <span className="text-white font-bold text-sm">{getInitials(member.name)}</span>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/attendance/${member.id}`}>
                        <p className="font-bold text-slate-900 text-sm leading-tight hover:text-violet-700 transition-colors">
                          {member.name}
                        </p>
                      </Link>
                      {member.role && (
                        <p className="text-xs text-slate-500 mt-0.5">{member.role}</p>
                      )}
                      <div className="mt-1.5">
                        {present === true && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            ✓ Present
                          </span>
                        )}
                        {present === false && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                            ✗ Absent{absReason ? ` · ${absReason}` : ''}
                          </span>
                        )}
                        {(present === null || present === undefined) && (
                          <span className="text-xs text-slate-400">Not marked</span>
                        )}
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {present !== true ? (
                        <button
                          onClick={() => handleMarkPresent(member.id)}
                          className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold hover:bg-green-100 transition-colors"
                        >
                          ✓ Present
                        </button>
                      ) : (
                        <button
                          onClick={() => startMarkingAbsent(member.id, absReason ?? null)}
                          className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors"
                        >
                          ✗ Absent
                        </button>
                      )}
                      {present === false && !isMarkingAbsent && (
                        <button
                          onClick={() => startMarkingAbsent(member.id, absReason ?? null)}
                          className="text-xs text-slate-400 hover:text-violet-600 transition-colors"
                        >
                          Edit reason
                        </button>
                      )}
                      {isConfirmingDelete ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="text-xs text-red-600 font-semibold hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(member.id)}
                          className="text-slate-300 hover:text-red-400 transition-colors"
                          title="Remove member"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Absence reason picker — inline expansion */}
                  {isMarkingAbsent && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                      <p className="text-xs font-semibold text-slate-600">Reason for absence:</p>
                      <div className="flex flex-wrap gap-2">
                        {ABSENCE_REASONS.map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => setSelectedReason(reason)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              selectedReason === reason
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white text-slate-600 border-slate-300 hover:border-red-300 hover:text-red-600'
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
                          autoFocus
                          className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-300"
                        />
                      )}
                      <div className="flex gap-2 pt-0.5">
                        <button
                          onClick={() => { setMarkingAbsentId(null); setSelectedReason(''); setReasonText(''); }}
                          className="flex-1 border border-slate-300 text-slate-600 rounded-xl py-2 text-xs font-medium hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmAbsent(member.id)}
                          disabled={isPending}
                          className="flex-1 bg-red-600 text-white rounded-xl py-2 text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
                        >
                          {isPending ? 'Saving…' : 'Confirm Absent'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
