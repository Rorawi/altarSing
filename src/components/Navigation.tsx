'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLoading } from '@/lib/loading-context';
import Icon, { type IconName } from '@/components/Icon';

const navItems: { href: string; label: string; shortLabel: string; icon: IconName }[] = [
  { href: '/library', label: 'Library', shortLabel: 'Library', icon: 'library' },
  { href: '/rehearsal', label: 'Rehearsals', shortLabel: 'Rehearsal', icon: 'music' },
  { href: '/attendance', label: 'Attendance', shortLabel: 'Attendance', icon: 'people' },
  { href: '/log', label: 'Service Log', shortLabel: 'Log', icon: 'history' },
];

export default function Navigation({ variant }: { variant: 'bottom' | 'side' }) {
  const pathname = usePathname();
  const { startLoading } = useLoading();

  return (
    <nav aria-label="Primary navigation" className={variant === 'side' ? 'w-full' : 'w-full'}>
      <ul className={variant === 'side' ? 'space-y-1' : 'flex'}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const label = variant === 'bottom' ? item.shortLabel : item.label;
          return (
            <li key={item.href} className={variant === 'bottom' ? 'flex-1' : ''}>
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  if (!isActive) startLoading();
                }}
                className={variant === 'bottom'
                  ? `flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors ${isActive ? 'text-violet-700 dark:text-violet-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}`
                  : `group flex min-h-10 items-center gap-3 border-l-2 px-3 text-sm transition-colors md:justify-center md:px-0 lg:justify-start lg:px-3 ${isActive ? 'border-violet-700 bg-violet-50/80 font-semibold text-violet-800 dark:border-violet-300 dark:bg-violet-300/10 dark:text-violet-200' : 'border-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`}
              >
                <Icon name={item.icon} size={variant === 'bottom' ? 20 : 18} className="shrink-0" />
                <span className={variant === 'side' ? 'hidden lg:inline' : ''}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
