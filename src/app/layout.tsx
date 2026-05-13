import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-slate-50 text-slate-900`}>
        {/* Fixed-width app shell — max 430px, centered on wide screens */}
        <div className="relative mx-auto h-screen w-full max-w-[430px] bg-white shadow-xl flex flex-col overflow-hidden">
          {/* Mobile header */}
          <header className="flex-shrink-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2 shadow-sm no-print">
            <span className="text-xl">🎶</span>
            <h1 className="font-bold text-violet-700 text-lg">AltarSing</h1>
          </header>

          <main className="flex-1 px-4 py-5 overflow-y-auto">
            {children}
          </main>

          {/* Bottom nav — always visible inside the fixed-width shell */}
          <div className="no-print">
            <Navigation variant="bottom" />
          </div>
        </div>
      </body>
    </html>
  );
}
