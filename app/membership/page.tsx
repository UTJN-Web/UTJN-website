// app/events/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function MembershipPage() {
  return (
    <div className="w-full flex flex-col items-center justify-start text-center min-h-screen pt-16 px-4 bg-white">
      {/* ─────────── Heading ─────────── */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-black">Become a Member</h1>

      {/* ─────────── Description ─────────── */}
      <p className="text-base md:text-lg max-w-2xl mb-4 text-black">
        UTJNでは2025-2026年度もネットワーキング、就職、同窓会など、多様なニーズに応えたイベントを企画しています。
        無料の会員登録をすることで、様々なイベントに参加できるようになります。
      </p>

      {/* ─────────── Registration Link ─────────── */}
      <p className="text-blue-700 underline mb-6">
        <a href="#">会員登録はこちらから</a>
      </p>

      {/* ─────────── Login Button ─────────── */}
      <Link href="/login">
        <button className="bg-[#1c2a52] text-white px-6 py-3 rounded hover:bg-[#2a3c6b] transition">
          LOG IN
        </button>
      </Link>

      {/* ─────────── Background Image ───────────
      <div className="relative w-full h-[500px] mt-16">
        <Image
          src="/uoft-campus.jpg"
          alt="University of Toronto campus"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </div> */}
    </div>
  );
}