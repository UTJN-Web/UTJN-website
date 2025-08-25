'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccess('Reset code sent to your email!', 'Success');
        setTimeout(() => {
          router.push(`/forgot-password/verify?email=${encodeURIComponent(email)}`);
        }, 1500);
      } else {
        showError(data.detail || 'Failed to send reset code');
      }
    } catch (err: any) {
      showError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center"
      style={{ background: "url('/UofT.jpg') center/cover no-repeat" }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-lg bg-white/95 dark:bg-[#1c1c1c] p-8 rounded shadow">
        <h1 className="text-2xl font-bold text-center mb-4">Forgot Password</h1>
        <form onSubmit={handleNext} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2"
            required
            disabled={loading}
          />
          <button
            type="submit"
            className="w-full bg-[#2e2e2e] hover:bg-[#1c2a52] text-white py-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
          <p className="text-sm text-center mt-4">
            Back to{' '}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('open-login-modal'))}
              className="underline text-blue-600"
            >
              Login
            </button>
          </p>
        </form>
      </div>
      
      <Toast
        isOpen={toast.isOpen}
        onClose={hideToast}
        title={toast.title}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}
