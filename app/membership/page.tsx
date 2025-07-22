// app/events/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef, useEffect } from 'react';
import { useState } from 'react';
import LoginModal from '../components/LoginModal';

const images = [
    '/Gallery/End_of_Year/2025/DSC_0577.png',
    '/Gallery/Ball_Game/2023/IMG_9363.JPG',
    '/Gallery/Halloween/2024/team_pokemon.jpg',
    '/Gallery/Halloween/2023/IMG_1485.jpg',
    '/Gallery/New_Year_Event/2023/326173752_734343721563001_4064265751001994374_n.jpg',
    '/Gallery/Sports_Fes/2023/IMG_5819.JPG',
    '/Gallery/End_of_Year/2025/DSC_0487.JPG',
    '/Gallery/End_of_Year/2025/DSC_0548.JPG'
  ];


export default function MembershipPage() {
    const [showLoginModal, setShowLoginModal] = useState(false);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const scrollAmount = 360;

    // Auto-scroll logic
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
    
        const scrollInterval = setInterval(() => {
          if (!container) return;
    
          if (
            container.scrollLeft + container.clientWidth >=
            container.scrollWidth
          ) {
            container.scrollLeft = 0; // reset to start
          } else {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
          }
        }, 3000);
    
        return () => clearInterval(scrollInterval);
      }, []);

    return (
        <div className="fade-in-up w-full flex flex-col items-center justify-start text-center min-h-screen pt-16 px-4 bg-white">
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
        <button
            onClick={() => setShowLoginModal(true)}
            className="bg-[#1c2a52] text-white px-6 py-3 rounded hover:bg-[#2a3c6b] transition"
        >
            LOG IN  
        </button>

        {/* ─────────── Scrollable Photo Gallery ─────────── */}
        <div className="w-full mt-20 py-12 bg-[#1c2a52]"> 
            <div
                ref={scrollRef}
                className="flex overflow-x-auto no-scrollbar px-4 gap-6"
            >
                {images.map((src, idx) => (
                <div
                    key={idx}
                    className="inline-block flex-shrink-0 w-[500px] h-[350px] relative rounded-lg overflow-hidden"
                >
                    <Image
                    src={src}
                    alt={`Gallery ${idx + 1}`}
                    fill
                    className="object-cover"
                    />
                </div>
                ))}
            </div>
            </div>

        {/* ─────────── Background Image ─────────── */}
        <div className="relative w-full h-[300px] mt-16">
            <Image
            src="/uoft-campus.jpg"
            alt="University of Toronto campus"
            fill
            priority
            className="object-cover"
            sizes="100vw"
            />
        </div>
        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
        </div>
    );
}
