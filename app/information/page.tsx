'use client';

import { useState } from 'react';

export default function ProfileInfoPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [major, setMajor] = useState('');
  const [gradYear, setGradYear] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ firstName, lastName, major, gradYear });
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
      <div className="absolute inset-0 bg-black/40 dark:bg-black/70 z-0" />

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#1c1c1c] bg-opacity-95 dark:bg-opacity-100 text-black dark:text-white p-8 rounded shadow-lg backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-center mb-2">Personal Info</h1>
        <p className="text-sm text-center text-gray-700 dark:text-gray-300 mb-6">
          Please provide your name, major, and expected graduation year.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-1 text-sm font-medium text-left">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] text-black dark:text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-left">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] text-black dark:text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-left">Major</label>
            <input
              type="text"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] text-black dark:text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-left">Graduation Year</label>
            <input
              type="number"
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2a2a] text-black dark:text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1c2a52]"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#2e2e2e] hover:bg-[#1c2a52] text-white py-2 rounded font-semibold transition"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
