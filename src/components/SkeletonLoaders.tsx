'use client';

// ─── Generic Skeleton Components ──────────────────────────────────────────────

export function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg ${className}`} />
  );
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonPulse key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

// ─── Song Skeleton Card ───────────────────────────────────────────────────────

export function SkeletonSongCard() {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <SkeletonPulse className="w-12 h-12 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-5 w-2/3" />
          <SkeletonPulse className="h-4 w-1/2" />
        </div>
      </div>
      <div className="flex gap-2">
        <SkeletonPulse className="h-8 w-16 rounded-full" />
        <SkeletonPulse className="h-8 w-20 rounded-full" />
      </div>
    </div>
  );
}

// ─── Member Card Skeleton ────────────────────────────────────────────────────

export function SkeletonMemberCard() {
  return (
    <div className="shrink-0 snap-center w-[78vw] max-w-[300px] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden flex flex-col">
      <div className="bg-slate-50 dark:bg-slate-700 px-4 pt-4 pb-5 flex flex-col items-center space-y-3">
        <SkeletonPulse className="w-24 h-24 rounded-full" />
        <SkeletonPulse className="h-5 w-2/3" />
        <SkeletonPulse className="h-4 w-1/2" />
        <SkeletonPulse className="h-8 w-24 rounded-full" />
      </div>
      <div className="px-4 py-4 space-y-2">
        <SkeletonPulse className="h-10 w-full rounded-xl" />
        <SkeletonPulse className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ─── Session Card Skeleton ───────────────────────────────────────────────────

export function SkeletonSessionCard() {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <SkeletonPulse className="h-5 w-1/2" />
          <SkeletonPulse className="h-4 w-1/3" />
        </div>
        <SkeletonPulse className="h-8 w-16 rounded-lg" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonPulse key={i} className="h-8 w-12 rounded-full" />
        ))}
      </div>
      <SkeletonPulse className="h-20 w-full rounded-xl" />
    </div>
  );
}

// ─── Log Entry Skeleton ──────────────────────────────────────────────────────

export function SkeletonLogEntry() {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <SkeletonPulse className="h-6 w-1/4 rounded-lg" />
        <SkeletonPulse className="h-5 w-1/3" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <SkeletonPulse className="w-5 h-5 rounded" />
            <SkeletonPulse className="h-5 flex-1" />
            <SkeletonPulse className="h-6 w-12 rounded-lg" />
          </div>
        ))}
      </div>
      <SkeletonPulse className="h-12 w-full rounded-xl" />
    </div>
  );
}

// ─── Full Page Loading Skeletons ─────────────────────────────────────────────

export function SkeletonLibraryPage() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="space-y-2 mb-6">
        <SkeletonPulse className="h-8 w-1/3" />
        <SkeletonPulse className="h-4 w-1/4" />
      </div>
      {/* Search and filter skeleton */}
      <SkeletonPulse className="h-10 w-full rounded-xl" />
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonPulse key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      {/* Song cards skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonSongCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonAttendancePage() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="space-y-2 mb-6">
        <SkeletonPulse className="h-8 w-1/3" />
        <SkeletonPulse className="h-4 w-1/4" />
      </div>
      {/* Date picker skeleton */}
      <SkeletonPulse className="h-10 w-full rounded-xl mb-3" />
      {/* Stats skeleton */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonPulse key={i} className="flex-1 h-20 rounded-xl" />
        ))}
      </div>
      {/* Member cards carousel skeleton */}
      <div className="flex gap-3 -mx-4 px-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonMemberCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonRehearsalPage() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="space-y-2 mb-6">
        <SkeletonPulse className="h-8 w-1/3" />
        <SkeletonPulse className="h-4 w-1/4" />
      </div>
      {/* Action buttons skeleton */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonPulse key={i} className="h-10 flex-1 rounded-xl" />
        ))}
      </div>
      {/* Session cards skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonSessionCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonLogPage() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="space-y-2 mb-6">
        <SkeletonPulse className="h-8 w-1/3" />
        <SkeletonPulse className="h-4 w-1/4" />
      </div>
      {/* Buttons skeleton */}
      <div className="flex gap-2 mb-4">
        <SkeletonPulse className="h-10 flex-1 rounded-xl" />
        <SkeletonPulse className="h-10 w-24 rounded-xl" />
      </div>
      {/* Log entries skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLogEntry key={i} />
        ))}
      </div>
    </div>
  );
}
