'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function HomePage() {
  /* ---------------------------------------------------------------- events */
  const baseEvents = [
    'halloween.png',
    'happy-new-year.png',
    'sports-fes.png',
    'utjn-advice.png',
    'ball-game.png',
    'end-year.png',
  ];

  /** 10 周左 + 1 周中央 + 10 周右 = 21 周 (126 枚) */
  const loops  = 10;
  const events = Array.from({ length: loops * 2 + 1 }, () => baseEvents).flat();

  /** layout helpers (larger card & full-width rail) */
  const gap        = 32;              // gap-x-8 = 32px
  const imgWidth   = 300;             // bigger tile
  const step       = imgWidth + gap;  // move distance
  const centerIdx  = loops * baseEvents.length;
  const centerPos  = centerIdx * step;

  const carouselRef = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({
      left: dir === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  /* 初期スクロール位置を中央へ */
  useEffect(() => {
    if (carouselRef.current) carouselRef.current.scrollLeft = centerPos;
  }, [centerPos]);

  /* ---------------------------------------------------------------- render */
  return (
    <div className="fade-in-up flex flex-col items-center w-full min-h-screen">
      {/* ─────────── Hero Section ─────────── */}
      <div className="fade-in-up relative -mt-[30px] pt-[30px] w-full h-[calc(100vh-100px)]">
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
          <h1 className="fade-in-up text-white text-4xl md:text-6xl font-bold">
            The Premier Japanese Network in Toronto
          </h1>
        </div>
      </div>

      {/* ─────────── Mission Section ─────────── */}
      <div className="fade-in-up bg-[#1c2a52] text-white text-center py-16 px-4 md:px-16">
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

      {/* ─────────── Stats Section ─────────── */}
      <div className="fade-in-up bg-white text-[#171717] text-center py-12 grid grid-cols-2 md:grid-cols-4 gap-8 w-full">
        <Stat value="2016" label="Founded" />
        <Stat value="400+" label="Alumni" />
        <Stat value="340+" label="Students" />
        <Stat value="37" label="Executives" />
      </div>

      {/* ─────────── Events Section ─────────── */}
      <div className="fade-in-up bg-[#1c2a52] text-white py-16 w-full px-4">
        <h2 className="text-3xl md:text-5xl text-center font-bold mb-12">
          Our Events
        </h2>

        {/* full-width rail */}
        <div
          ref={carouselRef}
          className="no-scrollbar flex w-full gap-8 overflow-x-auto px-4 scroll-smooth"
        >
          {events.map((file, idx) => (
            <div
              key={`${file}-${idx}`}
              className="fade-in-up flex-shrink-0 w-[300px] flex flex-col items-center"
            >
              <Image
                src={`/${file}`}
                alt={`Event ${(idx % baseEvents.length) + 1}`}
                width={300}
                height={300}
                className="rounded-lg object-cover"
              />
              <Link
                href="#"
                className="
                  mt-4 block w-full text-center font-medium
                  border border-white py-2 rounded-md
                  transition-colors hover:bg-white hover:text-[#1c2a52]
                "
              >
                TO GALLERY
              </Link>
            </div>
          ))}
        </div>

        {/* arrows */}
        <div className="fade-in-up mt-12 flex justify-center gap-12">
          <button
            onClick={() => scroll('left')}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#1c2a52] shadow-md"
            aria-label="Scroll left"
          >
            <ArrowLeft size={28} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#1c2a52] shadow-md"
            aria-label="Scroll right"
          >
            <ArrowRight size={28} />
          </button>
        </div>
      </div>

      {/* ─────────── Membership Section ─────────── */}
      <div className="fade-in-up bg-white text-[#171717] py-16 text-center px-4">
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

      {/* ─────────── Footer ─────────── */}
      <footer className="fade-in-up bg-[#1c2a52] text-white py-8 w-full text-center text-sm">
        <p className="mb-2 font-bold">University of Toronto Japan Network</p>
        <p className="mb-2">
          27 King&apos;s College Circle, Toronto, Ontario M5S 1A1
        </p>
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
    <div className="fade-in-up">
      <h2 className="text-4xl font-bold">{value}</h2>
      <p>{label}</p>
    </div>
  );
}

function CTA({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="fade-in-up bg-[#1c2a52] text-white px-6 py-3 rounded-md">
      {label}
    </Link>
  );
}

function Social({ icon, alt }: { icon: string; alt: string }) {
  return <Image className="fade-in-up" src={icon} alt={alt} width={24} height={24} />;
}
