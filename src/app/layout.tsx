import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import LoadingBar from '@/components/LoadingBar';
import ThemeProvider, { ThemeToggle } from '@/components/ThemeProvider';
import { LoadingProvider } from '@/lib/loading-context';

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
          <LoadingProvider>
            <LoadingBar />
            <div className="mx-auto w-full max-w-[430px] min-h-screen bg-white dark:bg-slate-900 shadow-xl">
              {/* Fixed header */}
              <header className="fixed top-0 left-0 right-0 max-w-[430px] mx-auto z-50 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 flex items-center gap-2 shadow-sm no-print">
                <span className="text-xl">🎶</span>
                <h1 className="font-bold text-violet-700 dark:text-violet-400 text-lg flex-1">AltarSing</h1>
                <ThemeToggle />
              </header>

              <main className="px-4 pt-16 pb-32">
                {children}
              </main>

              {/* Fixed bottom nav */}
              <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-50 no-print bg-white dark:bg-slate-900" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <Navigation variant="bottom" />
              </div>
            </div>
          </LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
