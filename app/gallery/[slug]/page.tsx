// app/gallery/[slug]/page.tsx
import { loadEvent, listEvents } from '@/lib/gallery';
import { notFound } from 'next/navigation';
import GalleryCarousel from '../../components/GalleryCarousel';

// ---- Optional: simple defaults you can edit here ----
const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  Halloween:
    '毎年恒例のハロウィンイベントでは、仮装コンテストやゲーム、フォトブースなどを通して、学生同士の交流を深めています！ユニークなコスチュームと笑顔があふれる楽しい夜となっております！',
  New_Year_Event:
    '新たな一年の始まりをみんなで祝って最高なスタートを切りましょう！一生の出会いや思い出を作るチャンスです！みんなで盛り上がるイベントも盛りだくさん。一年の始まりを笑顔でスタートです！',
  Sports_Fes:
    '感動と笑顔を分かち合う格好の機会！勉強のストレス解消！最高に気持ちの良いイベントです！',
  Ball_Game:
    '笑顔、真剣な表情、そしてチームの団結で絆を深めましょう！！熱い瞬間をたっぷり詰め込んだイベントとなっております！',
  End_of_Year:
    '一年間の終わりを盛大に祝いましょう！ビンゴ大会やクイズ大会まで、優勝者には豪華な景品を！',
};

// ---- Treat "NULL"/"null" as empty ----
function sanitize(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (s.toLowerCase() === 'null') return '';
  return s;
}

// ---- Optional: read description from public/Gallery/<slug>/description.(txt|md) ----
import { promises as fs } from 'fs';
import path from 'path';

async function readDescriptionFromPublic(slug: string): Promise<string> {
  const candidates = [
    path.join(process.cwd(), 'public', 'Gallery', slug, 'description.txt'),
    path.join(process.cwd(), 'public', 'Gallery', slug, 'description.md'),
  ];
  for (const p of candidates) {
    try {
      const content = await fs.readFile(p, 'utf-8');
      const cleaned = content.trim();
      if (cleaned) return cleaned;
    } catch {
      // ignore
    }
  }
  return '';
}

/* ---------- build-time helpers ---------- */
export async function generateStaticParams() {
  const events = await listEvents();
  return events.map((e) => ({ slug: e.slug }));
}

export const dynamicParams = false;

/* ---------- UI ---------- */
export default async function GalleryPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const event = await loadEvent(slug);
  if (!event) notFound();

  // Prefer: data description → file → default map
  const dataDesc = sanitize((event as any).description);
  const fileDesc = await readDescriptionFromPublic(slug);
  const description = dataDesc || fileDesc || DEFAULT_DESCRIPTIONS[slug] || '';

  // Flatten all images across years (newest first already)
  const allImages = event.years.flatMap((y) => y.images);

  return (
    <main className="fade-in-up mx-auto w-full max-w-6xl px-4 py-16">
      <h1 className="mb-6 text-4xl font-bold">{event.displayName}</h1>

      {description && (
        <p className="mb-10 whitespace-pre-wrap text-neutral-700">
          {description}
        </p>
      )}

      {/* Full-bleed blue band */}
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-[#1c2a52] py-10">
        <div className="px-4">
          <GalleryCarousel images={allImages} />
        </div>
      </section>
    </main>
  );
}
