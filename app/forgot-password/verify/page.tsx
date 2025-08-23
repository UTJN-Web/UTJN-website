'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      alert('Please enter the verification code.');
      return;
    }

    if (password !== confirm) {
      alert('Passwords do not match.');
      return;
    }

    // ✅ API連携する場合ここでコードとパスワードを送信
    // await api.resetPassword({ email, code, password });

    alert('Password reset successful!');
    router.push('/login');
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center"
      style={{ background: "url('/UofT.jpg') center/cover no-repeat" }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-lg bg-white/95 dark:bg-[#1c1c1c] p-8 rounded shadow">
        <h1 className="text-2xl font-bold text-center mb-6">Reset Password</h1>
        <form onSubmit={handleReset} className="space-y-5">
          <p className="text-center text-sm mb-2">
            We sent a verification code to <strong>{email}</strong>. 
            Please enter it below along with your new password.
          </p>

          {/* 🔑 Verification Code */}
          <input
            type="text"
            placeholder="Verification Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2"
            required
          />

          {/* 🔒 New Password */}
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2"
            required
          />

          {/* Confirm Password */}
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2"
            required
          />

          {/* Password Conditions */}
          <ul className="text-sm text-gray-700 dark:text-white pl-5 list-disc space-y-1 text-left">
            <li>Minimum 8 characters</li>
            <li>Includes both uppercase and lowercase letters</li>
            <li>Includes a number and special character</li>
          </ul>

          {/* 🔘 Submit Button */}
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
