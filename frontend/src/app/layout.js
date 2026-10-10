import { Bricolage_Grotesque, Public_Sans } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import SiteHeader from '@/components/layout/SiteHeader';
import './globals.css';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage', display: 'swap' });
const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-public-sans', display: 'swap' });

export const metadata = {
  title: { default: 'Bookly — pick your seat', template: '%s · Bookly' },
  description: 'Book seats for concerts, comedy, theatre and more. Choose the exact seat you want.',
  icons: { icon: '/favicon.svg' },
};

export const viewport = { themeColor: '#eef0f6' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${publicSans.variable}`}>
      <body className="min-h-dvh bg-paper">
        <AuthProvider>
          <ToastProvider>
            <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
              Skip to content
            </a>
            <SiteHeader />
            <main id="main" className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6">
              {children}
            </main>
            <footer className="border-t border-line">
              <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-ink-soft sm:px-6">
                <span>Bookly — seats held for 5 minutes while you pay.</span>
                <a href="/explorer" className="hover:text-ink">Explore the API</a>
              </div>
            </footer>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
