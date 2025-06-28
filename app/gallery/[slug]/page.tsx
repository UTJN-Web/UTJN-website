// app/gallery/[slug]/page.tsx
import { loadEvent, listEvents, type YearBlock } from '@/lib/gallery';
import Image from 'next/image';
import { notFound } from 'next/navigation';

/* ---------- build-time helpers ---------- */
export async function generateStaticParams() {
  const events = await listEvents();
  return events.map((e) => ({ slug: e.slug }));
}

export const dynamicParams = false; // purely static build

/* ---------- UI ---------- */
export default async function GalleryPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  // ★ params は Promise。必ず await してから使う
  const { slug } = await params;

  const event = await loadEvent(slug);
  if (!event) notFound();

  return (
    <main className="fade-in-up mx-auto w-full max-w-6xl px-4 py-16">
      <h1 className="mb-6 text-4xl font-bold">{event.displayName}</h1>

      {event.description && (
        <p className="mb-10 whitespace-pre-wrap">{event.description}</p>
      )}

      {event.years.map((y, idx) => (
        <YearSection key={y.year} openDefault={idx === 0} {...y} />
      ))}
    </main>
  );
}

/* ---------- sub-components ---------- */

function YearSection(
  { year, images, openDefault }: YearBlock & { openDefault?: boolean },
) {
  return (
    <details className="mb-8" open={openDefault}>
      <summary className="cursor-pointer select-none py-3 text-2xl font-semibold">
        {year}
      </summary>

      <div
        className="
          mt-4 grid gap-4
          grid-cols-2 sm:grid-cols-3 md:grid-cols-4
        "
      >
        {images.map((src) => (
          <ImageCard key={src} src={src} />
        ))}
      </div>
    </details>
  );
}

function ImageCard({ src }: { src: string }) {
  return (
    <div className="relative w-full pb-[75%]">
      <Image
        src={src}
        alt=""
        fill
        sizes="(min-width: 768px) 25vw, 50vw"
        className="rounded-lg object-cover"
        placeholder="blur"
        blurDataURL={src}
      />
    </div>
  );
}
