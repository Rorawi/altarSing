'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLoading } from '@/lib/loading-context';

const navItems = [
  { href: '/library',    label: 'Library',    icon: '🎵' },
  { href: '/rehearsal',  label: 'Rehearsal',  icon: '🎼' },
  { href: '/attendance', label: 'Attendance', icon: '✅' },
  { href: '/log',        label: 'Log',        icon: '📅' },
];

export default function Navigation({ variant }: { variant: 'bottom' | 'side' }) {
  const pathname = usePathname();
  const router = useRouter();
  const { startLoading } = useLoading();

  const handleNavigation = (href: string) => {
    // Only show loading if navigating to a different section
    if (!pathname.startsWith(href)) {
      startLoading();
    }
    router.push(href);
  };

  if (variant === 'bottom') {
    return (
      <nav className="flex-shrink-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
        <ul className="flex">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href} className="flex-1">
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={`w-full flex flex-col items-center justify-center py-3 px-1 gap-1 transition-colors ${
                    isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <span className="text-4xl leading-none">{item.icon}</span>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-violet-600 dark:text-violet-400' : ''}`}>
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav className="py-3">
      <ul className="space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <button
                onClick={() => handleNavigation(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
