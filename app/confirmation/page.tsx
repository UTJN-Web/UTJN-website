// app/confirmation/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ConfirmCodePage() {
  const [code, setCode] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (code.trim() !== '') {
      router.push('/information');
    } else {
      alert('Please enter the confirmation code.');
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
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/70 z-0" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#1c1c1c] bg-opacity-95 dark:bg-opacity-100 text-black dark:text-white p-8 rounded shadow-lg backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-center mb-2">
          Confirm Your Code
        </h1>
        <p className="text-sm text-center text-gray-600 dark:text-gray-300 mb-6">
          A confirmation code has been sent to your email. Please enter it below.
        </p>

        <form className="space-y-4">
          <input
            type="text"
            placeholder="Enter Confirmation Code"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] text-black dark:text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <button
            type="submit"
            className="w-full bg-[#2e2e2e] hover:bg-[#1c2a52] text-white py-2 rounded font-semibold transition"
          >
            Confirm Code
          </button>
        </form>

        <div className="text-sm text-center text-gray-600 dark:text-white mt-4">
          Didn’t receive it?{' '}
          <button className="text-[#1c2a52] dark:text-[#90cdf4] hover:underline">
            Resend confirmation code
          </button>
        </div>
      </div>
    </div>
  );
}
