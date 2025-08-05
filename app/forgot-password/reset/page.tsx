'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const code = searchParams.get('code') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === confirm) {
      alert('Password reset successful!');
      router.push('/login');
    } else {
      alert('Passwords do not match.');
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center"
      style={{ background: "url('/UofT.jpg') center/cover no-repeat" }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-lg bg-white/95 dark:bg-[#1c1c1c] p-8 rounded shadow">
        <h1 className="text-2xl font-bold text-center mb-4">Reset Password</h1>
        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2"
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2"
            required
          />

          <ul className="text-sm text-gray-700 dark:text-white pl-5 list-disc space-y-1 text-left">
            <li>Minimum 8 characters</li>
            <li>Includes both uppercase and lowercase letters</li>
            <li>Includes at least one number and one special character</li>
          </ul>
          
          <button
            type="submit"
            className="w-full bg-[#2e2e2e] hover:bg-[#1c2a52] text-white py-2 rounded"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
