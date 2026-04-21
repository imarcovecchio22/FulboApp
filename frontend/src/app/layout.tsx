import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FULBO',
  description: 'Coordiná el día y la cancha del partido con tus amigos',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'FULBO',
    description: 'Coordiná el día y la cancha del partido con tus amigos',
    type: 'website',
    siteName: 'FULBO',
  },
  twitter: {
    card: 'summary',
    title: 'FULBO',
    description: 'Coordiná el día y la cancha del partido con tus amigos',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'FULBO',
    'theme-color': '#22c55e',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-950 overflow-x-hidden">
        {/* Ambient background blobs */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-pitch-500/10 rounded-full blur-[120px]" />
          <div className="absolute top-[30%] right-[-15%] w-[500px] h-[500px] bg-pitch-600/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-pitch-700/8 rounded-full blur-[80px]" />
        </div>

        <nav className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50 shadow-sm shadow-black/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-pitch-500/15 border border-pitch-500/30">
              <span className="text-lg leading-none">⚽</span>
            </div>
            <a href="/" className="font-extrabold text-white text-lg tracking-tight hover:text-pitch-400 transition-colors">
              FULBO
            </a>
            <div className="flex-1" />
            <a
              href="/stats"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/20 transition-all"
            >
              <span className="text-sm">✨</span>
              <span className="hidden sm:inline">Stats IA</span>
              <span className="inline sm:hidden">IA</span>
              <span className="bg-purple-500/20 text-purple-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Beta</span>
            </a>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-pitch-500/30 to-transparent" />
        </nav>
        <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
