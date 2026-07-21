'use client';

import { useLoading } from '@/lib/loading-context';

export default function LoadingBar() {
  const { isLoading } = useLoading();

  return (
    <>
      {/* Loading bar at top */}
      <div className={`fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-pink-600 to-violet-600 transition-all duration-300 z-60 ${isLoading ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
        } origin-left`} />

      {/* Optional: Semi-transparent overlay for loading state */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/5 dark:bg-black/5 pointer-events-none z-40 transition-opacity duration-300" />
      )}
    </>
  );
}
