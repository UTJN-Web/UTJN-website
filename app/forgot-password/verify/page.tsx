'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '../../hooks/useToast';
import { useSuccessModal } from '../../hooks/useSuccessModal';
import Toast from '../../components/Toast';
import SuccessModal from '../../components/SuccessModal';
import PasswordInput from '../../components/PasswordInput';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function VerifyForm() {
  const router = useRouter();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const { modal, showSuccessModal, hideSuccessModal } = useSuccessModal();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      showError('Please enter the verification code.');
      return;
    }

    if (password !== confirm) {
      showError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      showError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          code, 
          new_password1: password, 
          new_password2: confirm 
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        showSuccessModal(
          'Password Reset Successful!',
          'Your password has been successfully reset. You can now log in with your new password.',
          'Go to Login',
          () => {
            // ログインページに遷移する際に、プロファイル確認も行う
            router.push('/login');
          }
        );
      } else {
        showError(data.detail || 'Password reset failed');
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
            disabled={loading}
          />

          {/* 🔒 New Password */}
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="New Password"
            required
            disabled={loading}
          />

          {/* Confirm Password */}
          <PasswordInput
            value={confirm}
            onChange={setConfirm}
            placeholder="Confirm New Password"
            required
            disabled={loading}
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
            className="w-full bg-[#2e2e2e] hover:bg-[#1c2a52] text-white py-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="text-sm text-center mt-4">
          Didn't receive the code?{' '}
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/auth/forgot-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email }),
                });
                
                if (response.ok) {
                  showSuccess('Reset code resent to your email!', 'Success');
                } else {
                  const data = await response.json();
                  showError(data.detail || 'Failed to resend code');
                }
              } catch (e: any) {
                showError('Failed to resend code');
              }
            }}
            className="underline text-blue-600"
          >
            Resend
          </button>
        </p>
      </div>
      
      <Toast
        isOpen={toast.isOpen}
        onClose={hideToast}
        title={toast.title}
        message={toast.message}
        type={toast.type}
      />
      
      <SuccessModal
        isOpen={modal.isOpen}
        onClose={hideSuccessModal}
        title={modal.title}
        message={modal.message}
        buttonText={modal.buttonText}
        onButtonClick={modal.onButtonClick}
      />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyForm />
    </Suspense>
  );
}
