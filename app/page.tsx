'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function HomePage() {
  /* ─────────────────────────────── events data */
  const baseEvents = [
    { image: 'halloween.png', slug: 'Halloween' },
    { image: 'happy_new_year.png', slug: 'New_Year_Event' },
    { image: 'new_sports_fes.png', slug: 'Sports_Fes' },
    { image: 'new_utjn_advice.png', slug: 'New_Year_Event' }, // Using New Year Event as fallback
    { image: 'new_ball_game.png', slug: 'Ball_Game' },
    { image: 'new_end_of_year_party.png', slug: 'End_of_Year' },
  ];

  /** 10 loops left + centre + 10 loops right  = 126 tiles */
  const loops  = 10;
  const events = Array.from({ length: loops * 2 + 1 }, () => baseEvents).flat();

  /* ─────────────────────────────── layout helpers */
  const gap       = 32;   // gap-x-8  in Tailwind → 32 px
  const imgWidth  = 300;  // fixed card width
  const step      = imgWidth + gap;
  const centerIdx = loops * baseEvents.length;
  const centerPos = centerIdx * step;

  const carouselRef = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({
      left: dir === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  /* first render → jump to the real centre */
  useEffect(() => {
    if (carouselRef.current) carouselRef.current.scrollLeft = centerPos;
  }, [centerPos]);

  /* ─────────────────────────────── render */
  return (
    <div className="fade-in-up flex min-h-screen w-full flex-col items-center">
      {/* ─────────── Hero Section (unchanged) ─────────── */}
      <div className="fade-in-up relative -mt-[30px] h-[calc(100vh-100px)] w-full pt-[30px]">
        <Image
          src="/toronto-skyline-from-park.jpg"
          alt="Toronto Skyline"
          fill
          priority
          sizes="100vw"
          quality={100}
          className="object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <h1 className="fade-in-up text-4xl font-bold text-white md:text-6xl">
            The Premier Japanese Network in Toronto
          </h1>
        </div>
      </div>

      {/* ─────────── Mission Section (unchanged) ─────────── */}
      <div className="fade-in-up bg-[#1c2a52] px-4 py-16 text-center text-white md:px-16">
        <p className="mb-8 text-2xl font-semibold md:text-3xl">
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

      {/* ─────────── Stats Section (unchanged) ─────────── */}
      <div className="fade-in-up grid w-full grid-cols-2 gap-8 bg-white py-12 text-center text-[#171717] md:grid-cols-4">
        <Stat value="2016" label="Founded" />
        <Stat value="100+" label="Alumni" />
        <Stat value="400+" label="Students" />
        <Stat value="25" label="Executives" />
      </div>

      {/* ─────────── Events Section (updated) ─────────── */}
      <div className="fade-in-up w-full bg-[#1c2a52] px-4 py-16 text-white">
        <h2 className="mb-12 text-center text-3xl font-bold md:text-5xl">
          Our Events
        </h2>

        {/* ——— scrolling rail ——— */}
        <div
          ref={carouselRef}
          className="
            no-scrollbar flex w-full gap-8 overflow-x-auto scroll-smooth
            snap-x snap-mandatory
          "
          style={{
            /* side-padding keeps the *centre* of any 300 px tile at the mid-point */
            paddingLeft: 'calc(50% - 150px)',
            paddingRight: 'calc(50% - 150px)',
          }}
        >
          {events.map((event, idx) => (
            <div
              key={`${event.image}-${idx}`}
              className="fade-in-up flex w-[300px] flex-shrink-0 snap-center flex-col items-center"
            >
              <Image
                src={`/${event.image}`}
                alt={`Event ${(idx % baseEvents.length) + 1}`}
                width={300}
                height={300}
                className="rounded-lg object-cover"
              />
              <Link
                href={`/gallery/${event.slug}`}
                className="
                  mt-4 block w-full rounded-md border border-white
                  py-2 text-center font-medium transition-colors
                  hover:bg-white hover:text-[#1c2a52]
                "
              >
                TO GALLERY
              </Link>
            </div>
          ))}
        </div>

        {/* ——— arrow controls (unchanged) ——— */}
        <div className="mt-10 flex justify-center gap-8">
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#1c2a52] shadow-md transition hover:bg-[#e5e5e5]"
          >
            <ArrowLeft size={28} />
          </button>

          <button
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#1c2a52] shadow-md transition hover:bg-[#e5e5e5]"
          >
            <ArrowRight size={28} />
          </button>
        </div>
      </div>

      {/* ─────────── Membership Section (unchanged) ─────────── */}
      <div id="become-a-member" className="fade-in-up bg-white px-4 py-16 text-center text-[#171717]">
        <h2 className="mb-6 text-3xl font-bold md:text-4xl">Become a Member</h2>
        <p className="mx-auto mb-8 max-w-3xl text-lg">
          UTJNでは2025–2026年度以降、新たに多様なサービスを提供するべくウェブサイトを一新しました。
          ネットワーキング、就職、同窓会など、多様なニーズに応えたイベントを企画しています。
          会員登録をすることで、様々なイベントに参加できるようになります。
          会員登録は無料ですので、お気軽にご登録ください。
        </p>

      </div>

      {/* ─────────── Footer (unchanged) ─────────── */}
      {/* <footer className="fade-in-up w-full bg-[#1c2a52] py-8 text-center text-sm text-white">
        <p className="mb-2 font-bold">University of Toronto Japan Network</p>
        <p className="mb-2">
          27 King&apos;s College Circle, Toronto, Ontario M5S 1A1
        </p>
        <div className="mt-4 flex justify-center gap-4">
          <Social icon="/facebook.png"  alt="Facebook"  href="https://www.facebook.com/uoftjn/" />
          <Social icon="/instagram.png" alt="Instagram" href="https://www.instagram.com/uoftjn" />
          <Social icon="/tiktok.png"    alt="TikTok"    href="https://www.tiktok.com/@uoftjn" />
        </div>
      </footer> */}
    </div>
  );
}

/* ─────────────────────────────── helpers */
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
    <Link
      href={href}
      className="fade-in-up rounded-md bg-[#1c2a52] px-6 py-3 text-white"
    >
      {label}
    </Link>
  );
}

function Social(
  {
    icon,
    alt,
    href,
    invert = false,
  }: {
    icon: string;
    alt: string;
    href?: string;       // external or internal URL
    invert?: boolean;    // sets the Tailwind “invert” filter
  },
) {
  const img = (
    <Image
      src={icon}
      alt={alt}
      width={24}
      height={24}
      className={`fade-in-up ${invert ? 'invert' : ''}`}
    />
  );

  // If no href is given, return the plain image
  if (!href) return img;

  // Otherwise wrap the image in an anchor that opens a new tab
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block"
    >
      {img}
    </a>
  );
}