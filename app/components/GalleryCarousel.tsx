'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

interface GalleryCarouselProps {
  images: string[];
  heightPx?: number;
  itemWidthPx?: number;
  autoScrollMs?: number;
  scrollStepPx?: number;
}

export default function GalleryCarousel(
  {
    images,
    heightPx = 350,
    itemWidthPx = 500,
    autoScrollMs = 3000,
    scrollStepPx = 360,
  }: GalleryCarouselProps,
) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const halfWidthRef = useRef<number>(0);

  // Duplicate images for seamless looping
  const loopImages = images.length > 0 ? images.concat(images) : images;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Measure half of total width (one set of images)
    halfWidthRef.current = el.scrollWidth / 2;

    const id = window.setInterval(() => {
      const container = scrollRef.current;
      if (!container) return;

      // If we've scrolled past one full set, jump back by half width without animation
      if (container.scrollLeft >= halfWidthRef.current - scrollStepPx) {
        container.scrollTo({ left: container.scrollLeft - halfWidthRef.current, behavior: 'auto' });
      }

      container.scrollBy({ left: scrollStepPx, behavior: 'smooth' });
    }, autoScrollMs);

    return () => window.clearInterval(id);
  }, [autoScrollMs, scrollStepPx, loopImages.length]);

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar flex gap-6 overflow-x-auto"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {loopImages.map((src, idx) => (
        <div
          key={`${src}-${idx}`}
          className="relative flex-shrink-0 rounded-lg overflow-hidden"
          style={{
            height: `${heightPx}px`,
            width: `${itemWidthPx}px`,
            scrollSnapAlign: 'start',
          }}
        >
          <Image
            src={src}
            alt=""
            fill
            sizes="(max-width: 768px) 80vw, 500px"
            quality={85}
            className="object-cover"
            placeholder="blur"
            blurDataURL={src}
          />
        </div>
      ))}
    </div>
  );
} 