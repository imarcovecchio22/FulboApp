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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-950">
        <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
            <span className="text-2xl">⚽</span>
            <a href="/" className="font-bold text-white text-lg tracking-tight hover:text-pitch-400 transition-colors">
              FULBO
            </a>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
