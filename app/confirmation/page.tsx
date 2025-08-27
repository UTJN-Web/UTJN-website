// app/confirmation/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function ConfirmationForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';           // クエリから取得

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, confirmationcode: code }),
      });
      
      if (response.ok) {
        router.push(`/information?email=${encodeURIComponent(email)}`);  // Pass email to information page
      } else {
        const data = await response.json();
        // コードが期限切れの場合、新しいコードを再送信
        if (data.detail && data.detail.includes('expired')) {
          try {
            const resendResponse = await fetch('/api/auth/resend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            });
            
            if (resendResponse.ok) {
              setError('Code expired. A new code has been sent to your email.');
            } else {
              setError('Code expired. Please try resending the code manually.');
            }
          } catch (resendErr: any) {
            setError('Code expired. Please try resending the code manually.');
          }
        } else {
          setError(data.detail || 'Confirmation failed');
        }
      }
    } catch (err: any) {
      console.error('Confirmation error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center"
      style={{ background: "url('/UofT.jpg') center/cover no-repeat" }}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/70" />

      <div className="relative z-10 w-full max-w-lg bg-white/95 dark:bg-[#1c1c1c] p-8 rounded shadow">
        <h1 className="text-2xl font-bold text-center mb-2">Confirm Your Code</h1>
        <p className="text-center text-sm mb-6">
          We sent a confirmation code to <strong>{email}</strong>.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <input
            type="text"
            placeholder="Enter Confirmation Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2e2e2e] hover:bg-[#1c2a52] text-white py-2 rounded transition"
          >
            {loading ? 'Verifying…' : 'Confirm Code'}
          </button>
        </form>

        <p className="text-sm text-center mt-4">
          Didn't receive it?{' '}
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/auth/resend', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email }),
                });
                
                if (response.ok) {
                  alert('Code resent!');
                } else {
                  const data = await response.json();
                  alert(data.detail || 'Failed to resend code');
                }
              } catch (e: any) {
                alert('Failed to resend code');
              }
            }}
            className="underline"
          >
            Resend
          </button>
        </p>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmationForm />
    </Suspense>
  );
}
