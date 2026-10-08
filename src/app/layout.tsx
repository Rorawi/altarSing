import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import Navigation from '@/components/Navigation';
import LoadingBar from '@/components/LoadingBar';
import ThemeProvider, { ThemeToggle } from '@/components/ThemeProvider';
import { LoadingProvider } from '@/lib/loading-context';
import BirthdayIndicator from '@/components/BirthdayIndicator';
import { YouTubePlayerProvider } from '@/lib/youtube-player-context';
import YouTubePlayer from '@/components/YouTubePlayer';
import Icon from '@/components/Icon';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AltarSing',
  description: 'Music Director Song Organizer — track, log, and organize church songs',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AltarSing',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4C3767',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen bg-stone-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>
          <LoadingProvider>
            <YouTubePlayerProvider>
              <LoadingBar />
              <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95 sm:px-6 lg:px-8 no-print">
                <div className="mx-auto flex h-full max-w-[1600px] items-center gap-3">
                  <Link href="/library" className="flex min-w-0 items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-800 text-white">
                      <Icon name="music" size={20} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">AltarSing</span>
                      <span className="hidden text-[11px] leading-none text-slate-500 dark:text-slate-400 sm:block">Music director workspace</span>
                    </span>
                  </Link>
                  <div className="ml-auto flex items-center gap-1.5">
                    <Suspense fallback={null}>
                      <BirthdayIndicator />
                    </Suspense>
                    <ThemeToggle />
                  </div>
                </div>
              </header>

              <div className="min-h-screen pt-16">
                <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-[76px] border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:block lg:w-64 no-print">
                  <div className="px-2 py-7 lg:px-4">
                    <Navigation variant="side" />
                  </div>
                  <div className="absolute inset-x-4 bottom-5 hidden border-t border-slate-200 pt-4 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500 lg:block">
                    AltarSing · Music ministry
                  </div>
                </aside>

                <main className="min-h-[calc(100vh-4rem)] min-w-0 px-4 pb-28 pt-7 sm:px-6 md:ml-[76px] md:px-7 md:pb-10 lg:ml-64 lg:px-10 xl:px-12">
                  <div className="mx-auto w-full max-w-[1440px]">{children}</div>
                </main>

                <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95 md:hidden no-print" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                  <Navigation variant="bottom" />
                </div>
              </div>

              {/* Global YouTube Background Player */}
              <YouTubePlayer />
            </YouTubePlayerProvider>
          </LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
