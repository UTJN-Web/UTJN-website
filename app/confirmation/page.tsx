// app/confirmation/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { post } from '@/lib/api';

export default function ConfirmPage() {
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
      await post('/auth/confirm', { email, confirmationcode: code });
      router.push('/information');                   // 次のステップへ
    } catch (err: any) {
      // コードが期限切れの場合、新しいコードを再送信
      if (err.message.includes('expired')) {
        try {
          await post('/auth/resend', { email });
          setError('Code expired. A new code has been sent to your email.');
        } catch (resendErr: any) {
          setError('Code expired. Please try resending the code manually.');
        }
      } else {
        setError(err.message);
      }
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
            className="input"
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
          Didn’t receive it?{' '}
          <button
            onClick={async () => {
              try {
                await post('/auth/resend', { email });
                alert('Code resent!');
              } catch (e: any) {
                alert(e.message);
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
