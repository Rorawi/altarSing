import { SkeletonPulse } from '@/components/SkeletonLoaders';

export default function RehearsalSessionLoading() {
  return (
    <div role="status" aria-label="Loading rehearsal session" className="space-y-5">
      <span className="sr-only">Loading rehearsal session</span>
      <div className="mb-5 flex items-start gap-3">
        <SkeletonPulse className="mt-1 h-8 w-8 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonPulse className="h-7 w-2/5" />
          <SkeletonPulse className="h-4 w-1/4" />
        </div>
        <SkeletonPulse className="h-9 w-28 shrink-0" />
      </div>

      <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
        <div className="space-y-2">
          <SkeletonPulse className="h-6 w-36" />
          <SkeletonPulse className="h-3 w-16" />
        </div>
        <SkeletonPulse className="h-9 w-24" />
      </div>

      <div className="divide-y divide-slate-100 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex min-h-[68px] items-center gap-4 py-3">
            <SkeletonPulse className="h-4 w-8 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonPulse className="h-5 w-2/5" />
              <SkeletonPulse className="h-3 w-1/4" />
            </div>
            <SkeletonPulse className="h-5 w-8 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
