'use client';

import { useState } from 'react';

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      window.location.href = '/';
    } else {
      alert('You entered an invalid email or password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
+     <div className="w-full max-w-sm rounded bg-white dark:bg-gray-900 p-6 shadow text-black dark:text-white">
        <h1 className="mb-4 text-center text-xl font-bold">
          Welcome to University of Toronto Japan Network
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border p-2"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border p-2"
          />
          <button
            type="submit"
            className="w-full rounded bg-gray-800 py-2 text-white"
          >
            Sign in
          </button>
        </form>
        <div className="mt-4 text-sm text-center text-gray-500">
          <a href="#" className="underline mr-4">Forgot Password?</a>
          <a href="#" className="underline">Create account</a>
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
