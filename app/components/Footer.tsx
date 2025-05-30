/* app/components/Footer.tsx */
'use client';

import Image from 'next/image';
import Link from 'next/link';

function SocialIcon(
  {
    href,
    icon,
    alt,
  }: {
    href: string;
    icon: string;
    alt: string;
  },
) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block"
    >
      <Image
        src={icon}
        alt={alt}
        width={24}
        height={24}
        className="invert"
      />
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="fade-in-up w-full bg-[#1c2a52] py-8 text-center text-sm text-white">
      <p className="mb-2 font-bold">University of Toronto Japan Network</p>
      <p className="mb-2">
        27 King&apos;s College Circle, Toronto, Ontario&nbsp;M5S&nbsp;1A1
      </p>
      <div className="mt-4 flex justify-center gap-4">
        <SocialIcon
          href="https://www.facebook.com/uoftjn/"
          icon="/facebook.png"
          alt="Facebook"
        />
        <SocialIcon
          href="https://www.instagram.com/uoftjn"
          icon="/instagram.png"
          alt="Instagram"
        />
        <SocialIcon
          href="https://www.tiktok.com/@uoftjn"
          icon="/tiktok.png"
          alt="TikTok"
        />
      </div>
    </footer>
  );
}
