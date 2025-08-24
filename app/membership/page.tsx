// app/membership/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import LoginModal from '../components/LoginModal';

const galleryImages = [
  '/Gallery/End_of_Year/2025/DSC_0577.png',
  '/Gallery/Ball_Game/2023/IMG_9363.JPG',
  '/Gallery/Halloween/2024/team_pokemon.jpg',
  '/Gallery/Halloween/2023/IMG_1485.jpg',
  '/Gallery/New_Year_Event/2023/326173752_734343721563001_4064265751001994374_n.jpg',
  '/Gallery/Sports_Fes/2023/IMG_5819.JPG',
  '/Gallery/End_of_Year/2025/DSC_0487.JPG',
  '/Gallery/End_of_Year/2025/DSC_0548.JPG',
];

export default function MembershipPage() {
  // modal
  const [showLoginModal, setShowLoginModal] = useState(false);

  // horizontal auto-scroll
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const SCROLL_STEP = 360;
  const INTERVAL_MS = 3000;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const id = setInterval(() => {
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: 'auto' });
      } else {
        el.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
      }
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex w-full flex-col items-center text-center">
      {/* ───────── Hero with crisp background image ───────── */}
      <section className="relative w-full min-h-[60vh] h-[60vh] min-w-0 fade-in-up">
        <Image
          src="/cn_tower_night.jpg"          // make sure this is a large (≥3200px wide) image
          alt="CN Tower background"
          fill
          priority
          sizes="100vw"
          quality={90}
          className="object-cover object-center"
        />

        {/* Glass card content */}
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div
            className="
              w-full max-w-3xl rounded-2xl p-8 md:p-10
              bg-white/75 shadow-xl
              backdrop-blur-sm
            "
          >
            <h1 className="text-3xl md:text-5xl font-bold mb-6 text-[#0f172a]">
              Become a Member
            </h1>

            <p className="text-[#0f172a]/85 md:text-lg leading-relaxed">
              UTJNでは2025-2026年度もネットワーキング、就職、同窓会など、様々なニーズに応えたイベントを企画しています。
              無料の会員登録をすることで、様々なイベントに参加できるようになります。
            </p>

            <p className="mt-4">
              <a href="/#become-a-member" className="text-blue-700 underline">
                会員登録はこちらから
              </a>
            </p>

            <button
              onClick={() => setShowLoginModal(true)}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-[#1c2a52] px-6 py-3 text-white hover:bg-[#2a3c6b] transition"
            >
              LOG IN
            </button>
          </div>
        </div>
      </section>

      {/* ───────── Scrollable Photo Gallery on blue band ───────── */}
      <section className="w-full bg-[#1c2a52] py-12 mt-0 fade-in-up">
        <div
          ref={scrollRef}
          className="no-scrollbar flex gap-6 overflow-x-auto px-4"
        >
          {galleryImages.map((src, idx) => (
            <div
              key={`${src}-${idx}`}
              className="relative h-[350px] w-[500px] flex-shrink-0 rounded-lg overflow-hidden"
            >
              <Image
                src={src}
                alt={`Gallery image ${idx + 1}`}
                fill
                sizes="(max-width: 768px) 80vw, 500px"
                quality={85}
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Footer background image ───────── */}
      <section className="relative w-full h-[300px] mt-16 fade-in-up">
        <Image
          src="/uoft-campus.jpg"
          alt="University of Toronto campus"
          fill
          sizes="100vw"
          quality={90}
          className="object-cover"
        />
      </section>

      {/* ───────── Login Modal ───────── */}
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  );
}
