import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';
import ScrollObserver from './components/ScrollObserver';
import Footer from './components/Footer';
import ClientLayoutWrapper from './ClientLayoutWrapper';
import LoginButton from './components/LoginButton';
import AdminLink from './components/AdminLink';

export const metadata = {
  title: 'UTJN - University of Toronto Japanese Network',
  description: 'Connecting Japanese students at UofT',
};

export default function RootLayout({ children }: { children: ReactNode }) {

  return (
    <html lang="en">
      <body className="m-0 p-0 font-sans bg-[--color-background] text-[--color-foreground]">
        <ClientLayoutWrapper>
        {/* ──────────────── Header ──────────────── */}
        <header className="relative h-[100px] bg-[--color-background]">
          {/* ───────── Mobile “mod-signal” (hamburger → ×) ───────── */}
          <details className="group md:hidden absolute left-4 top-4">
            <summary className="
                list-none relative z-50
                flex h-10 w-10 items-center justify-center
                border border-[#1c2a52] rounded cursor-pointer
              ">
              <span className="sr-only">Toggle navigation</span>

              {/* hamburger */}
              <div className="flex flex-col gap-[4px] group-open:hidden">
                <span className="block h-[2px] w-6 bg-[#1c2a52]" />
                <span className="block h-[2px] w-6 bg-[#1c2a52]" />
                <span className="block h-[2px] w-6 bg-[#1c2a52]" />
              </div>

              {/* close × */}
              <div className="hidden group-open:block">
                <svg width="20" height="20" viewBox="0 0 24 24" stroke="#1c2a52" strokeWidth="2" fill="none">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </div>
            </summary>

            {/* full-screen overlay stays exactly the same */}
            <nav className="
                fixed inset-0 z-40 bg-[--color-background]
                flex flex-col items-center justify-center
                gap-12 text-4xl font-normal tracking-wide
              ">
              <Link href="#" className="hover:text-[#1c2a52]">Membership</Link>
              <Link href="/events" className="hover:text-[#1c2a52]">Member Events</Link>
              <Link href="https://note.com/torontonians" target="_blank" rel="noopener noreferrer" className="hover:text-[#1c2a52]">Torontonians Blog</Link>
              <Link href="/contact" className="hover:text-[#1c2a52]">Contact</Link>
              {/* <Link href="/login" className="hover:text-[#1c2a52]">Login</Link> */}
              <Link href="/about" className="hover:text-[#1c2a52]">About</Link>
              <div className="absolute bottom-10 flex gap-6">
                <Link href="https://www.facebook.com/uoftjn/" target="_blank" rel="noopener noreferrer">
                  <img src="/facebook.png" alt="Facebook" className="h-6 w-6" />
                </Link>
                <Link href="https://www.instagram.com/uoftjn" target="_blank" rel="noopener noreferrer">
                  <img src="/instagram.png" alt="Instagram" className="h-6 w-6" />
                </Link>
                <Link href="https://www.tiktok.com/@uoftjn" target="_blank" rel="noopener noreferrer">
                  <img src="/tiktok.png" alt="TikTok" className="h-6 w-6" />
                </Link>
              </div>
            </nav>
          </details>


          {/* ───────── Desktop nav (nudged toward logo) ───────── */}
          <nav
            className="
              absolute top-1/2 -translate-y-1/2
              left-[50px] hidden md:flex gap-6 text-lg font-normal
            "
          >
            <Link href="/membership" className="hover:text-[#1c2a52]">Membership</Link>
            <Link href="/events" className="hover:text-[#1c2a52]">Member Events</Link>
            <Link href="https://note.com/torontonians" target="_blank" rel="noopener noreferrer" className="hover:text-[#1c2a52]">Torontonians Blog</Link>
          </nav>

          {/* ───────── Centred logo (80 px) ───────── */}
          <Link
            href="/"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c2a52]"
          >
            <img src="/logo.png" alt="UTJN Logo" style={{ height: 80, width: 'auto' }} />
          </Link>


          <div
            className="
              absolute right-5 top-1/2 -translate-y-1/2
              flex items-center gap-8 text-sm font-medium whitespace-nowrap
            "
          >
            <Link href="/contact" className="text-lg font-normal hover:text-[#1c2a52]">Contact</Link>
            <Link href="/about" className="text-lg font-normal hover:text-[#1c2a52]">About</Link>
            <AdminLink />
            <LoginButton />

            <Link href="https://www.facebook.com/uoftjn/" target="_blank" rel="noopener noreferrer">
              <img src="/facebook.png" alt="Facebook" width={24} height={24} />
            </Link>
            <Link href="https://www.instagram.com/uoftjn" target="_blank" rel="noopener noreferrer">
              <img src="/instagram.png" alt="Instagram" width={24} height={24} />
            </Link>
            <Link href="https://www.tiktok.com/@uoftjn" target="_blank" rel="noopener noreferrer">
              <img src="/tiktok.png" alt="TikTok" width={24} height={24} />
            </Link>
          </div>
        </header>

        {/* ──────────────── Main ──────────────── */}
        <main className="flex flex-col items-center justify-start min-h-screen pt-8 text-center">
          {children}
        </main>
        <Footer />
        <ScrollObserver />
      </ClientLayoutWrapper>
      </body>
    </html>
  );
}
