'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import AdminLink from './AdminLink';
import LoginButton from './LoginButton';

const NAV_LEFT = [
  { href: '/membership', label: 'Membership' },
  { href: '/events', label: 'Member Events' },
  { href: 'https://note.com/torontonians', label: 'Torontonians Blog', external: true },
];
const NAV_RIGHT = [
  { href: '/contact', label: 'Contact' },
  { href: '/about', label: 'About' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock scroll when open
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle('overflow-hidden', open);
    return () => el.classList.remove('overflow-hidden');
  }, [open]);

  return (
    <header className="sticky top-0 z-50 h-[100px] bg-white">
      {/* Mobile: hamburger */}
      <div className="absolute left-4 top-4 md:hidden">
        <button
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
          className="relative z-[60] inline-flex h-10 w-10 items-center justify-center rounded border border-[#1c2a52] bg-white"
        >
          {!open ? (
            <span className="flex flex-col gap-[4px]">
              <span className="block h-[2px] w-6 bg-[#1c2a52]" />
              <span className="block h-[2px] w-6 bg-[#1c2a52]" />
              <span className="block h-[2px] w-6 bg-[#1c2a52]" />
            </span>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" stroke="#1c2a52" strokeWidth="2" fill="none">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          )}
        </button>
      </div>

      {/* Desktop left nav */}
      <nav className="absolute top-1/2 hidden -translate-y-1/2 left-[50px] md:flex gap-6 text-lg font-normal">
        {NAV_LEFT.map((l) =>
          l.external ? (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-[#1c2a52]">
              {l.label}
            </a>
          ) : (
            <Link key={l.label} href={l.href} className="hover:text-[#1c2a52]">
              {l.label}
            </Link>
          )
        )}
      </nav>

      {/* Center logo */}
      <Link
        href="/"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1c2a52]"
      >
        <Image src="/logo.png" alt="UTJN Logo" width={160} height={80} className="h-16 w-auto md:h-20 object-contain" />
      </Link>

      {/* Desktop right area (HIDDEN on mobile) */}
      <div className="absolute right-5 top-1/2 hidden -translate-y-1/2 md:flex items-center gap-8">
        {NAV_RIGHT.map((l) => (
          <Link key={l.href} href={l.href} className="text-lg font-normal hover:text-[#1c2a52]">
            {l.label}
          </Link>
        ))}
        <AdminLink />
        <LoginButton />
        <a href="https://www.facebook.com/uoftjn/" target="_blank" rel="noopener noreferrer">
          <Image src="/facebook.png" alt="Facebook" width={24} height={24} />
        </a>
        <a href="https://www.instagram.com/uoftjn" target="_blank" rel="noopener noreferrer">
          <Image src="/instagram.png" alt="Instagram" width={24} height={24} />
        </a>
        <a href="https://www.tiktok.com/@uoftjn" target="_blank" rel="noopener noreferrer">
          <Image src="/tiktok.png" alt="TikTok" width={24} height={24} />
        </a>
      </div>

      {/* Mobile full-screen overlay */}
      {open && (
        <div className="fixed inset-0 z-50 bg-white">
          {/* top row inside overlay */}
          <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-4">
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3">
              <Image src="/logo.png" alt="UTJN Logo" width={120} height={60} className="h-10 w-auto object-contain" />
            </Link>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded border"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="#1c2a52" strokeWidth="2" fill="none">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>

          {/* links */}
          <nav className="mx-auto max-w-screen-sm px-4">
            <ul className="divide-y">
              {[...NAV_LEFT, ...NAV_RIGHT].map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpen(false)}
                      className="block py-4 text-lg font-normal hover:text-[#1c2a52]"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block py-4 text-lg font-normal hover:text-[#1c2a52]"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            {/* Admin / Login — click anywhere here closes overlay before action */}
            <div className="mt-6 flex items-center gap-6 text-lg" onClick={() => setOpen(false)}>
              <AdminLink />
              <LoginButton />
            </div>

            {/* Socials */}
            <div className="mt-10 mb-8 flex justify-center gap-6">
              <a href="https://www.facebook.com/uoftjn/" target="_blank" rel="noopener noreferrer">
                <Image src="/facebook.png" alt="Facebook" width={24} height={24} />
              </a>
              <a href="https://www.instagram.com/uoftjn" target="_blank" rel="noopener noreferrer">
                <Image src="/instagram.png" alt="Instagram" width={24} height={24} />
              </a>
              <a href="https://www.tiktok.com/@uoftjn" target="_blank" rel="noopener noreferrer">
                <Image src="/tiktok.png" alt="TikTok" width={24} height={24} />
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}