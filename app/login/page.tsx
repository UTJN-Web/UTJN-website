// File: app/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/api';
import { useUser } from '../contexts/UserContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await post<{ user?: { email: string; name?: string } }>('/auth/login', { email, password });
      // ログイン成功後、ユーザーコンテキストを更新
      if (response.user) {
        login({ email: response.user.email, name: response.user.name });
      } else {
        login({ email });
      }
      // ホームページにリダイレクト
      router.push('/');
    } catch (err: any) {
      // ユーザーが未確認の場合、確認画面にリダイレクト
      if (err.message.includes('You are not confirmed yet')) {
        router.push(`/confirmation?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center"
      style={{
        backgroundImage: "url('/UofT.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark faded overlay */}
      <div className="absolute inset-0 bg-black opacity-20 z-0" />

      {/* Login box */}
      <div className="relative z-10 w-full max-w-md bg-white bg-opacity-95 p-8 rounded shadow-lg backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-center leading-tight">
          Welcome to <br />
          University of Toronto <br />
          <span className="text-lg font-medium">Japan Network</span>
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2e2e2e] hover:bg-[#1c2a52] text-white py-2 rounded font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="text-sm text-center text-gray-600 mt-4 space-y-2">
          <div>
          Don't have an account? <a href="/signup" className="hover:underline">Sign Up</a>
          </div>
          <div>
            <a href="/forgot-password" className="hover:underline">Forgot Password?</a>
          </div>
        </div>
      </div>
    </div>
  );
}