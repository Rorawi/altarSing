'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/library',    label: 'Library',    icon: '🎵' },
  { href: '/quick-add',  label: 'Quick Add',  icon: '⚡' },
  { href: '/rehearsal',  label: 'Rehearsal',  icon: '🎼' },
  { href: '/attendance', label: 'Attendance', icon: '✅' },
  { href: '/log',        label: 'Log',        icon: '📅' },
];

export default function Navigation({ variant }: { variant: 'bottom' | 'side' }) {
  const pathname = usePathname();

  if (variant === 'bottom') {
    return (
      <nav className="flex-shrink-0 z-50 bg-white border-t border-slate-200">
        <ul className="flex">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-2 px-1 gap-0.5 transition-colors ${
                    isActive ? 'text-violet-700' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className="text-xl leading-none">{item.icon}</span>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-violet-700' : ''}`}>
                    {item.label}
                  </span>
                </Link>
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
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
