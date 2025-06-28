// app/signup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password1, setPw1] = useState('');
  const [password2, setPw2] = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await post('/auth/signup', { email, password1, password2 });
      // 成功したら確認ページへ email をクエリに添付
      router.push(`/confirmation?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center"
      style={{ background: "url('/UofT.jpg') center/cover no-repeat" }}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/70" />
      <div className="relative z-10 w-full max-w-md bg-white/95 dark:bg-[#1c1c1c] p-8 rounded shadow">
        <h1 className="text-2xl font-bold text-center">Join UTJN</h1>

        {/* ---- form ---- */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            required
          />
          <input
            type="password"
            placeholder="Create Password"
            value={password1}
            onChange={(e) => setPw1(e.target.value)}
            className="input"
            required
          />
          <input
            type="password"
            placeholder="Re-type Password"
            value={password2}
            onChange={(e) => setPw2(e.target.value)}
            className="input"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2e2e2e] hover:bg-[#1c2a52] text-white py-2 rounded transition"
          >
            {loading ? 'Submitting…' : 'Sign Up'}
          </button>
        </form>

        <p className="text-sm text-center mt-4">
          Already have an account? <a href="/login" className="underline">Login</a>
        </p>
      </div>
    </div>
  );
}

/* Tailwind 共通 */
const input = `
  w-full border border-gray-300 dark:border-gray-600
  bg-white dark:bg-[#2a2a2a] rounded px-4 py-2
  focus:outline-none focus:ring-2 focus:ring-[#1c2a52]
`;
