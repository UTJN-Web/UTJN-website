// lib/gallery.ts (server-only – runs at build & in route handlers)
import fs from 'node:fs/promises';
import path from 'node:path';

export interface YearBlock { year: number; images: string[] }
export interface EventGallery {
  slug: string;             // 'Halloween'
  displayName: string;      // 'Halloween' → human-readable
  description?: string;     // Markdown string (optional)
  years: YearBlock[];       // newest → oldest
}

import { NAME_MAP, EventSlug } from '@/lib/eventMeta';

/** Absolute path to /public/Gallery */
const GALLERY_DIR = path.join(process.cwd(), 'public', 'Gallery');

export async function listEvents(): Promise<EventGallery[]> {
  const eventDirs = await fs.readdir(GALLERY_DIR);
  return Promise.all(eventDirs.map(loadEvent));
}

export async function loadEvent(slug: string): Promise<EventGallery> {
  const dir = path.join(GALLERY_DIR, slug);

  // ① description.md (optional)
  let description: string | undefined;
  try {
    description = await fs.readFile(path.join(dir, 'description.md'), 'utf8');
  } catch {
    /* ignore – optional file */
  }

  // ② years
  const yearDirs = (await fs.readdir(dir)).filter((d) => /^\d{4}$/.test(d));
  const years = await Promise.all(
    yearDirs
      .map(Number)
      .sort((a, b) => b - a)                 // newest first
      .map(async (year) => {
        const yPath   = path.join(dir, String(year));
        const images  = (await fs.readdir(yPath)).map((f) =>
          path.posix.join('/Gallery', slug, String(year), f),   // public path
        );
        return { year, images };
      }),
  );

  return {
    slug,
    displayName: (NAME_MAP as Record<string, string>)[slug] ?? slug.replace(/_/g, ' '),
    description: description ?? 'NULL',   // ← 読み込めなければ "NULL"
    years,
  };
}
