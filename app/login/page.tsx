// File: app/login/page.tsx

'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

        <form className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="w-full bg-[#2e2e2e] hover:bg-[#1c2a52] text-white py-2 rounded font-semibold transition"
          >
            Login
          </button>
        </form>

        <div className="text-sm text-center text-gray-600 mt-4">
          Don't have an account? <a href="/signup" className="hover:underline">Sign Up</a>
        </div>
      </div>
    </div>
  );
}