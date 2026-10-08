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
    <div className="flex min-h-[76px] items-center gap-4 border-b border-slate-200 py-4 dark:border-slate-800">
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonPulse className="h-5 w-2/5" />
        <SkeletonPulse className="h-3.5 w-1/4" />
      </div>
      <SkeletonPulse className="hidden h-4 w-12 sm:block" />
      <SkeletonPulse className="h-8 w-20" />
    </div>
  );
}

// ─── Member Card Skeleton ────────────────────────────────────────────────────

export function SkeletonMemberCard() {
  return (
    <div className="flex min-h-[68px] items-center gap-4 border-b border-slate-200 py-3 dark:border-slate-800">
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonPulse className="h-4 w-1/3" />
        <SkeletonPulse className="h-3 w-1/5" />
      </div>
      <SkeletonPulse className="h-9 w-24" />
      <SkeletonPulse className="h-9 w-24" />
    </div>
  );
}

// ─── Session Card Skeleton ───────────────────────────────────────────────────

export function SkeletonSessionCard() {
  return (
    <div className="flex min-h-[72px] items-center gap-4 border-b border-slate-200 py-4 dark:border-slate-800">
      <SkeletonPulse className="h-9 w-12" />
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonPulse className="h-5 w-2/5" />
        <SkeletonPulse className="h-3.5 w-1/4" />
      </div>
      <SkeletonPulse className="h-8 w-16" />
    </div>
  );
}

// ─── Log Entry Skeleton ──────────────────────────────────────────────────────

export function SkeletonLogEntry() {
  return (
    <div className="flex gap-5 border-b border-slate-200 py-5 dark:border-slate-800">
      <SkeletonPulse className="h-10 w-20 shrink-0" />
      <div className="min-w-0 flex-1 space-y-3">
        <SkeletonPulse className="h-5 w-2/5" />
        <SkeletonPulse className="h-4 w-3/5" />
        <SkeletonPulse className="h-3.5 w-1/4" />
      </div>
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
      <SkeletonPulse className="h-10 w-full rounded-md" />
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
      <SkeletonPulse className="h-10 w-full rounded-md mb-3" />
      {/* Stats skeleton */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonPulse key={i} className="flex-1 h-20 rounded-xl" />
        ))}
      </div>
      {/* Compact roster rows */}
      <div>
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
          <SkeletonPulse key={i} className="h-10 flex-1 rounded-md" />
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
