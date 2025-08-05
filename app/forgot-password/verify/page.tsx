'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyCodePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState('');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/forgot-password/reset?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`);
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center"
      style={{ background: "url('/UofT.jpg') center/cover no-repeat" }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-lg bg-white/95 dark:bg-[#1c1c1c] p-8 rounded shadow">
        <h1 className="text-2xl font-bold text-center mb-4">Verify Code</h1>
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-center text-sm mb-6">
          We sent a verification code to <strong>{email}</strong>.
        </p>

          <input
            type="text"
            placeholder="Enter verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2"
            required
          />
          <button
            type="submit"
            className="w-full bg-[#2e2e2e] hover:bg-[#1c2a52] text-white py-2 rounded"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}