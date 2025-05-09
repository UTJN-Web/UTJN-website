'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function HomePage() {
  /* ---------------------------------------------------------------- events */
  const events = [
    'halloween.png',
    'happy-new-year.png',
    'sports-fes.png',
    'utjn-advice.png',
    'ball-game.png',
    'end-year.png'
  ];
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const cardWidth = carouselRef.current.firstElementChild?.clientWidth ?? 0;
    carouselRef.current.scrollBy({
      left: dir === 'left' ? -cardWidth - 24 : cardWidth + 24, // 24 ≈ gap
      behavior: 'smooth',
    });
  };

  /* ---------------------------------------------------------------- render */
  return (
    <div className="flex flex-col items-center w-full min-h-screen">
      {/* Hero Section */}
      <div className="relative w-full h-screen">
        <Image
          src="/toronto-skyline-from-park.jpg"
          alt="Toronto Skyline"
          fill
          quality={100}
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <h1 className="text-center text-white text-4xl md:text-6xl font-bold">
            The Premier Japanese Network in Toronto
          </h1>
        </div>
      </div>

      {/* Mission Section */}
      <div className="bg-[#1c2a52] text-white text-center py-16 px-4 md:px-16">
        <p className="text-2xl md:text-3xl font-semibold mb-8">
          “刺激的な環境を提供することで個々の新しいアイディアや挑戦を可能にし、
          トロント大学を才能と発想のインキュベーターにする”
        </p>
        <p className="text-base md:text-lg">
          University of Toronto Japan Network は日英バイリンガルの在校生だけでなく、
          トロント大学への進学を考えている方、交換留学生、大学院生、そして卒業生をつなぐ
          グローバルネットワークの構築に力を入れています。 北米において最も影響力のある
          バイリンガルネットワークを目指し、 何百人ものトロント大学生や様々なグローバル組織に
          サービスを提供しています。
        </p>
      </div>

      {/* Stats Section */}
      <div className="bg-white text-center py-12 grid grid-cols-2 md:grid-cols-4 gap-8 w-full">
        <Stat value="2016" label="Founded" />
        <Stat value="400+" label="Alumni" />
        <Stat value="340+" label="Students" />
        <Stat value="37" label="Executives" />
      </div>

      {/* ───────────────────── Events Section (carousel) ─────────────────────── */}
      <div className="bg-[#1c2a52] text-white py-16 w-full px-4">
        <h2 className="text-3xl md:text-4xl text-center font-bold mb-12">
          Our Events
        </h2>

        {/* scroll container */}
        <div
          ref={carouselRef}
          className="no-scrollbar mx-auto flex max-w-6xl gap-6 overflow-x-auto px-1"
        >
          {events.map((file, idx) => (
            <div key={idx} className="flex-shrink-0 w-64">
              <Image
                src={`/${file}`}
                alt={`Event ${idx + 1}`}
                width={256}
                height={256}
                className="rounded-lg mb-4 object-cover"
              />
              <Link
                href="#"
                className="block text-center text-white border border-white py-2 rounded-md"
              >
                TO GALLERY
              </Link>
            </div>
          ))}
        </div>

        {/* arrows below carousel */}
        <div className="mt-8 flex justify-center gap-8">
          <button
            onClick={() => scroll('left')}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#1c2a52] shadow"
            aria-label="Scroll left"
          >
            <ArrowLeft size={22} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#1c2a52] shadow"
            aria-label="Scroll right"
          >
            <ArrowRight size={22} />
          </button>
        </div>
      </div>


      {/* Membership Section */}
      <div className="bg-white py-16 text-center px-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Become a Member</h2>
        <p className="mb-8 text-lg max-w-3xl mx-auto">
          UTJNでは2023–2024年度もネットワーキング、就職、同窓会など、多様なニーズに応えた
          イベントを企画しています。会員登録をすることで、様々なイベントに参加できる
          ようになります。会員登録は無料ですので、お気軽にご登録ください。
        </p>
        <div className="flex justify-center gap-4">
          <CTA href="#" label="在校生の方" />
          <CTA href="#" label="卒業生の方" />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1c2a52] text-white py-8 w-full text-center text-sm">
        <p className="mb-2 font-bold">University of Toronto Japan Network</p>
        <p className="mb-2">27 King&apos;s College Circle, Toronto, Ontario M5S 1A1</p>
        <div className="flex justify-center gap-4 mt-4">
          <Social icon="/facebook.png" alt="Facebook" />
          <Social icon="/instagram.png" alt="Instagram" />
          <Social icon="/tiktok.png" alt="TikTok" />
        </div>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------- helpers */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <h2 className="text-4xl font-bold">{value}</h2>
      <p>{label}</p>
    </div>
  );
}

function CTA({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="bg-[#1c2a52] text-white px-6 py-3 rounded-md">
      {label}
    </Link>
  );
}

function Social({ icon, alt }: { icon: string; alt: string }) {
  return <Image src={icon} alt={alt} width={24} height={24} />;
}
