import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import ThemeProvider, { ThemeToggle } from '@/components/ThemeProvider';

const geist = Geist({ subsets: ['latin'] });

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
  themeColor: '#7c3aed',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100`}>
        <ThemeProvider>
        {/* Fixed-width app shell — max 430px, centered on wide screens */}
        <div className="relative mx-auto h-screen w-full max-w-[430px] bg-white dark:bg-slate-900 shadow-xl flex flex-col overflow-hidden">
          {/* Mobile header */}
          <header className="flex-shrink-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-2 shadow-sm no-print">
            <span className="text-xl">🎶</span>
            <h1 className="font-bold text-violet-700 dark:text-violet-400 text-lg flex-1">AltarSing</h1>
            <ThemeToggle />
          </header>

          <main className="flex-1 px-4 py-5 overflow-y-auto">
            {children}
          </main>

          {/* Bottom nav — always visible inside the fixed-width shell */}
          <div className="no-print" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <Navigation variant="bottom" />
          </div>
        </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
