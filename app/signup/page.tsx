// app/signup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/confirmation');  
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
      <div className="absolute inset-0 bg-black/40 dark:bg-black/70 z-0" /> />

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#1c1c1c] bg-opacity-95 dark:bg-opacity-100 text-black dark:text-white p-8 rounded shadow-lg backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-center leading-tight">
          Join the <br />
          University of Toronto <br />
          <span className="text-lg font-medium">Japan Network</span>
        </h1>

        <form className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] text-black dark:text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Create Password"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] text-black dark:text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Re-type Password"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] text-black dark:text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <ul className="text-sm text-gray-700 dark:text-white pl-5 list-disc space-y-1 text-left">
            <li>At least 8 characters</li>
            <li>Includes both uppercase and lowercase letters</li>
            <li>Includes a number or special character</li>
          </ul>

          <button
            type="submit"
            className="w-full bg-[#2e2e2e] hover:bg-[#1c2a52] text-white py-2 rounded font-semibold transition"
          >
            Sign Up
          </button>
        </form>

        <div className="text-sm text-center text-gray-600 dark:text-white mt-4">
          Already have an account? <a href="/login" className="hover:underline">Login</a>
        </div>
      </div>
    </div>
  );
}