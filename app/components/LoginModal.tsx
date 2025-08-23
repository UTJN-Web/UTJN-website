// File: app/components/LoginModal.tsx

'use client';

import { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import PasswordInput from './PasswordInput';

export default function LoginModal({ onClose }: { onClose: () => void }) {
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
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
                onClose();
                window.location.href = `/information?email=${encodeURIComponent(email)}`;
                return;
              }
            } else {
              // プロファイルが存在しない場合、プロファイル入力画面に遷移
              onClose();
              window.location.href = `/information?email=${encodeURIComponent(email)}`;
              return;
            }
          } else {
            // プロファイル取得に失敗した場合、プロファイル入力画面に遷移
            onClose();
            window.location.href = `/information?email=${encodeURIComponent(email)}`;
            return;
          }
        } catch (profileErr) {
          console.error('Profile check error:', profileErr);
          // プロファイル確認に失敗した場合、プロファイル入力画面に遷移
          onClose();
          window.location.href = `/information?email=${encodeURIComponent(email)}`;
          return;
        }
        
        // プロファイルが完全な場合、ホームページにリダイレクト
        onClose();
        window.location.href = '/';
      } else {
        const data = await res.json();
        setError(data.detail || 'You entered an invalid email or password.');
      }
    } catch (err: any) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="w-full max-w-md rounded bg-white dark:bg-black p-6 shadow text-black dark:text-white">
        <h1 className="mb-4 text-center text-xl font-bold">
          Welcome to University of Toronto <br />
          Japan Network <br />
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border p-2"
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
            className="w-full rounded bg-gray-800 py-2 text-white disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <div className="mt-4 text-sm text-center text-gray-500">
          <a href="/forgot-password" className="underline mr-4">Forgot Password?</a>
          <a href="/signup" className="underline">Create account</a>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full text-center text-sm text-gray-400 underline"
        >
          Close
        </button>
      </div>
    </div>
  );
}