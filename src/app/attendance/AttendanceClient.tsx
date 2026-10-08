'use client';

import { useMemo, useState, useTransition, type FormEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { MemberWithAttendance } from '@/types';
import { upsertAttendance, addChoirMember, deleteChoirMember, markAllAbsent } from '@/lib/actions';
import { ABSENCE_REASONS, MEMBER_ROLES } from '@/lib/constants';
import EditBirthdaysModal from '@/components/EditBirthdaysModal';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

interface Props {
  members: MemberWithAttendance[];
  sessionDate: string;
}

function getInitials(name: string) {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

function isBirthdayToday(birthDate: string | null | undefined) {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  const today = new Date();
  return birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate();
}

export default function AttendanceClient({ members, sessionDate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showEditBirthdaysModal, setShowEditBirthdaysModal] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [markingAbsentId, setMarkingAbsentId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [search, setSearch] = useState('');

  const formattedDate = new Date(`${sessionDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const presentCount = members.filter((member) => member.attendance?.present === true).length;
  const absentCount = members.filter((member) => member.attendance?.present === false).length;
  const unmarkedCount = members.length - presentCount - absentCount;
  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? members.filter((member) => member.name.toLowerCase().includes(query) || member.role?.toLowerCase().includes(query)) : members;
  }, [members, search]);

  const upcomingBirthdays = members
    .filter((member) => member.birth_date && !isBirthdayToday(member.birth_date))
    .filter((member) => {
      const birthDate = new Date(member.birth_date!);
      const today = new Date();
      return birthDate.getMonth() === today.getMonth() && birthDate.getDate() > today.getDate();
    })
    .sort((a, b) => new Date(a.birth_date!).getDate() - new Date(b.birth_date!).getDate());

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
    const reason = selectedReason === 'Other' ? reasonText.trim() || 'Other' : selectedReason;
    startTransition(async () => {
      await upsertAttendance(memberId, sessionDate, false, reason || null, null);
      setMarkingAbsentId(null);
      setSelectedReason('');
      setReasonText('');
      router.refresh();
    });
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddError(null);
    const formData = new FormData();
    formData.set('name', newName);
    formData.set('role', newRole);
    formData.set('image_url', newImageUrl);
    formData.set('birth_date', newBirthDate);
    startTransition(async () => {
      try {
        await addChoirMember(formData);
        setNewName(''); setNewRole(''); setNewImageUrl(''); setNewBirthDate('');
        setShowAddMember(false);
        router.refresh();
      } catch (error) {
        setAddError(error instanceof Error ? error.message : 'Failed to add member');
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
      await markAllAbsent(members.map((member) => member.id), sessionDate);
      router.refresh();
    });
  }

  function handleDateChange(event: ChangeEvent<HTMLInputElement>) {
    router.push(`/attendance?date=${event.target.value}`);
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        description={<>{formattedDate}<span className="mx-2 text-slate-300 dark:text-slate-700">·</span>{members.length} choir members</>}
        actions={<>
          <Link href="/attendance/report" className="button-secondary"><Icon name="report" size={16} />Report</Link>
          <Link href="/wheel" className="button-secondary"><Icon name="shuffle" size={16} />Spin wheel</Link>
          <button onClick={() => setShowEditBirthdaysModal(true)} className="button-secondary"><Icon name="birthday" size={16} />Birthdays</button>
          <button onClick={() => setShowAddMember((value) => !value)} className="button-primary"><Icon name="plus" size={16} />Add member</button>
        </>}
      />

      <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="w-full sm:w-48">
            <span className="sr-only">Attendance date</span>
            <input type="date" value={sessionDate} onChange={handleDateChange} className="field-control" />
          </label>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{presentCount} of {members.length} present</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{absentCount} absent <span aria-hidden="true">·</span> {unmarkedCount} unmarked</span>
          </div>
        </div>
        {members.length > 0 && <button onClick={handleMarkAllAbsent} disabled={isPending} className="button-quiet self-start text-xs text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40 sm:self-auto">Mark all absent</button>}
      </div>

      {upcomingBirthdays.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-violet-700 bg-violet-50/60 px-4 py-3 text-sm dark:border-violet-300 dark:bg-violet-300/5">
          <span className="inline-flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100"><Icon name="birthday" size={16} className="text-violet-800 dark:text-violet-300" />Upcoming birthdays</span>
          <span className="text-slate-500 dark:text-slate-400">{upcomingBirthdays.slice(0, 5).map((member) => `${member.name} · ${new Date(member.birth_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`).join('  /  ')}{upcomingBirthdays.length > 5 ? `  /  +${upcomingBirthdays.length - 5} more` : ''}</span>
        </div>
      )}

      {showAddMember && (
        <form onSubmit={handleAddMember} className="mb-6 max-w-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="font-semibold text-slate-900 dark:text-slate-100">Add choir or band member</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Member details are optional except for the name.</p></div>
            <button type="button" onClick={() => setShowAddMember(false)} className="icon-button" aria-label="Close form"><Icon name="close" /></button>
          </div>
          {addError && <p role="alert" className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{addError}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <input aria-label="Full name" type="text" placeholder="Full name *" value={newName} onChange={(event) => setNewName(event.target.value)} required className="field-control" />
            <select aria-label="Role or instrument" value={newRole} onChange={(event) => setNewRole(event.target.value)} className="field-control"><option value="">Role / instrument (optional)</option>{MEMBER_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select>
            <input aria-label="Photo URL" type="url" placeholder="Photo URL (optional)" value={newImageUrl} onChange={(event) => setNewImageUrl(event.target.value)} className="field-control" />
            <label className="text-xs text-slate-500 dark:text-slate-400">Date of birth (optional)<input type="date" value={newBirthDate} onChange={(event) => setNewBirthDate(event.target.value)} className="field-control mt-1" /></label>
          </div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowAddMember(false)} className="button-secondary">Cancel</button><button type="submit" disabled={isPending} className="button-primary">{isPending ? 'Adding…' : 'Add member'}</button></div>
        </form>
      )}

      {members.length === 0 && !showAddMember ? (
        <div className="border-y border-slate-200 py-16 text-center dark:border-slate-800">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"><Icon name="people" /></div>
          <h2 className="font-medium text-slate-800 dark:text-slate-100">No choir members yet</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add your roster to start recording rehearsal attendance.</p>
          <button onClick={() => setShowAddMember(true)} className="button-primary mt-5"><Icon name="plus" size={16} />Add first member</button>
        </div>
      ) : members.length > 0 ? (
        <section aria-label="Choir member attendance">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Choir roster <span className="ml-1 font-normal tabular-nums text-slate-400">{filteredMembers.length}{search ? ` of ${members.length}` : ''}</span></h2>
            <label className="relative block w-full sm:max-w-xs">
              <span className="sr-only">Search members</span>
              <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a member…" className="field-control pl-9" />
            </label>
          </div>

          <div className="overflow-hidden border-y border-slate-200 dark:border-slate-800">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(90px,.55fr)_minmax(230px,.9fr)_40px] items-center gap-4 border-b border-slate-200 bg-slate-100/70 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:grid sm:px-5">
              <span>Member</span><span>Status</span><span>Mark attendance</span><span />
            </div>
            {filteredMembers.map((member) => {
              const present = member.attendance?.present;
              const absenceReason = member.attendance?.absence_reason ?? null;
              const isMarkingAbsent = markingAbsentId === member.id;
              const isConfirmingDelete = confirmDeleteId === member.id;
              const birthday = isBirthdayToday(member.birth_date);
              return (
                <div key={member.id} className="border-b border-slate-200 px-3 py-3 last:border-b-0 hover:bg-white dark:border-slate-800 dark:hover:bg-slate-900 sm:px-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(90px,.55fr)_minmax(230px,.9fr)_40px] sm:items-center sm:gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Link href={`/attendance/${member.id}`} className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {member.image_url ? <img src={member.image_url} alt="" className="h-full w-full object-cover" /> : <span>{getInitials(member.name)}</span>}
                      </Link>
                      <div className="min-w-0">
                        <Link href={`/attendance/${member.id}`} className="inline-flex max-w-full items-center gap-1.5 truncate text-sm font-medium text-slate-900 hover:text-violet-800 dark:text-slate-100 dark:hover:text-violet-300">
                          <span className="truncate">{member.name}</span>{birthday && <Icon name="birthday" size={14} className="shrink-0 text-violet-700 dark:text-violet-300" />}
                        </Link>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{member.role || (birthday ? 'Birthday today' : 'Choir member')}</p>
                      </div>
                    </div>

                    <div className="pl-12 text-xs sm:pl-0">
                      {present === true ? <span className="font-medium text-emerald-700 dark:text-emerald-300">Present</span> : present === false ? <span className="font-medium text-rose-700 dark:text-rose-300">Absent{absenceReason ? ` · ${absenceReason}` : ''}</span> : <span className="text-slate-400">Unmarked</span>}
                    </div>

                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 pl-12 sm:pl-0">
                      {!isMarkingAbsent ? <>
                        <button onClick={() => handleMarkPresent(member.id)} disabled={isPending} className={`min-h-8 rounded-md border px-3 text-xs font-medium transition-colors disabled:opacity-50 ${present === true ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 text-slate-600 hover:border-emerald-600 hover:text-emerald-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-emerald-300'}`}>Present</button>
                        <button onClick={() => startMarkingAbsent(member.id, absenceReason)} disabled={isPending} className={`min-h-8 rounded-md border px-3 text-xs font-medium transition-colors disabled:opacity-50 ${present === false ? 'border-rose-700 bg-rose-700 text-white' : 'border-slate-300 text-slate-600 hover:border-rose-600 hover:text-rose-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-rose-300'}`}>Absent</button>
                      </> : <div className="flex w-full flex-col gap-2">
                        <div className="flex flex-wrap gap-1.5">{ABSENCE_REASONS.map((reason) => <button key={reason} type="button" onClick={() => setSelectedReason(reason)} className={`min-h-8 rounded-md border px-2.5 text-xs transition-colors ${selectedReason === reason ? 'border-rose-700 bg-rose-700 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{reason}</button>)}</div>
                        {selectedReason === 'Other' && <input type="text" placeholder="Describe reason…" value={reasonText} onChange={(event) => setReasonText(event.target.value)} className="field-control" />}
                        <div className="flex gap-2"><button onClick={() => { setMarkingAbsentId(null); setSelectedReason(''); setReasonText(''); }} className="button-secondary min-h-8 px-3 text-xs">Cancel</button><button onClick={() => handleConfirmAbsent(member.id)} disabled={isPending} className="button-primary min-h-8 px-3 text-xs">{isPending ? 'Saving…' : 'Save absence'}</button></div>
                      </div>}
                    </div>

                    <div className="flex justify-end pl-12 sm:pl-0">
                      {isConfirmingDelete ? <div className="flex items-center gap-2 text-xs"><button onClick={() => setConfirmDeleteId(null)} className="text-slate-500">Cancel</button><button onClick={() => handleDelete(member.id)} disabled={isPending} className="font-medium text-rose-700 dark:text-rose-300">Remove</button></div> : <button onClick={() => setConfirmDeleteId(member.id)} className="icon-button h-8 w-8" title="Remove member" aria-label={`Remove ${member.name}`}><Icon name="trash" size={15} /></button>}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredMembers.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No members match “{search}”.</p>}
          </div>
        </section>
      ) : null}

      <EditBirthdaysModal members={members} isOpen={showEditBirthdaysModal} onClose={() => setShowEditBirthdaysModal(false)} />
    </div>
  );
}
