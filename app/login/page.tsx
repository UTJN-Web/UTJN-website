// File: app/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../contexts/UserContext';
import PasswordInput from '../components/PasswordInput';

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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // ログイン成功後、ユーザーコンテキストを更新
        if (data.user) {
          login({ email: data.user.email, name: data.user.name });
        } else {
          login({ email });
        }
        
        // ユーザープロファイルを確認
        try {
          const profileResponse = await fetch(`/api/users/profile?email=${encodeURIComponent(email)}`);
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData.success && profileData.user) {
              // プロファイルが完全かチェック
              const user = profileData.user;
              const hasCompleteProfile = user.firstName && user.lastName && user.major && 
                                       user.graduationYear && user.university && user.currentYear &&
                                       user.firstName.trim() !== '' && user.lastName.trim() !== '';
              
              if (!hasCompleteProfile) {
                // プロファイルが不完全な場合、プロファイル入力画面に遷移
                router.push(`/information?email=${encodeURIComponent(email)}`);
                return;
              }
            } else {
              // プロファイルが存在しない場合、プロファイル入力画面に遷移
              router.push(`/information?email=${encodeURIComponent(email)}`);
              return;
            }
          } else {
            // プロファイル取得に失敗した場合、プロファイル入力画面に遷移
            router.push(`/information?email=${encodeURIComponent(email)}`);
            return;
          }
        } catch (profileErr) {
          console.error('Profile check error:', profileErr);
          // プロファイル確認に失敗した場合、プロファイル入力画面に遷移
          router.push(`/information?email=${encodeURIComponent(email)}`);
          return;
        }
        
        // プロファイルが完全な場合、ホームページにリダイレクト
        router.push('/');
      } else {
        // ユーザーが未確認の場合、確認画面にリダイレクト
        if (data.detail && data.detail.includes('You are not confirmed yet')) {
          router.push(`/confirmation?email=${encodeURIComponent(email)}`);
          return;
        }
        setError(data.detail || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
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

          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="Password"
            required
            disabled={loading}
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