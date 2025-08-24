// app/components/LoginButton.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';

export default function LoginButton() {
  const { user, logout, isLoading } = useUser();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (isLoading) {
    return (
      <div className="text-lg font-normal text-gray-400">
        Loading...
      </div>
    );
  }

  if (user) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-[#222] transition"
        >
          <span className="text-lg font-normal">
            Hi, {user.firstName || user.name || user.email.split('@')[0]}
          </span>
          {/* Chevron Down SVG */}
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="text-gray-500">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {open && (
          <div className="fixed inset-0 z-[99999]">
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded shadow-lg z-[99999]">
              <button
                onClick={() => {
                  setOpen(false);
                  window.location.href = `/information?email=${encodeURIComponent(user.email)}`;
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] transition"
              >
                {/* Edit Profile SVG */}
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Edit Profile
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100 dark:hover:bg-[#333] transition"
              >
                {/* Logout SVG */}
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                  <path d="M9 16l-4-4m0 0l4-4m-4 4h12m-6 4v1a2 2 0 002 2h4a2 2 0 002-2v-10a2 2 0 00-2-2h-4a2 2 0 00-2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => window.dispatchEvent(new Event('open-login-modal'))}
      className="text-lg font-normal hover:text-[#1c2a52]"
    >
      Login
    </button>
  );
}
