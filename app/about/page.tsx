// File: app/about/page.tsx
import type { Metadata } from "next";
import React from "react";
import Image from "next/image";

/* ---------- (optional) page metadata ---------- */
export const metadata: Metadata = {
  title: "About | UTJN",
  description: "UTJNの設立経緯",
};

/* ---------- data: edit freely ---------- */
type TimelineItem = {
  year: string;
  title: string;
  body: string;
};

const TIMELINE: TimelineItem[] = [
  {
    year: "2016",
    title: "UTJN 発足",
    body:
      "有志の学生数名が「日本語・日本文化を軸にしたネットワーク」を目標にUTJNを立ち上げました。小さな集まりから第一歩が始まりました。",
  },
  {
    year: "2017",
    title: "最初の交流会を開催",
    body:
      "在校生・留学生・卒業生が交わる交流会を定期化。学年や学部を超えたつながりが、クラブのイベントをとうして少しずつ広がりました。",
  },
  {
    year: "2019",
    title: "学内外の連携を強化",
    body:
      "日本関連サークルや地域コミュニティ、企業・団体との連携を開始。協働イベントが増え、活動の幅が拡大しました。",
  },
  {
    year: "2021",
    title: "オンライン化と仕組み整備",
    body:
      "ハイブリッド運営へ移行。運営基盤や役割分担を整備し、より持続可能な組織体制を構築しました。",
  },
  {
    year: "2023",
    title: "大型イベントの開催",
    body:
      "年次イベントや就職・ネットワーキング企画が定着。数百名規模の参加につながり、UTJNの存在感が高まりました。",
  },
  {
    year: "2025",
    title: "次の一歩へ",
    body:
      "より多様なバックグラウンドの学生が交わる場として、学内外をつなぐクラブへ。フレンドリーなコミュニティーを作り、メンバーの皆様が楽しい大学生活を送れるようにクラブを支えています。",
  },
];

/* ---------- page ---------- */
export default function AboutPage() {
  return (
    <main className="w-full">
      {/* ----- Hero background image with glass effect ----- */}
      <section className="relative h-[36vh] w-full fade-in-up">
        <Image
          src="/library.jpeg" 
          alt="About UTJN"
          fill
          priority
          quality={100}
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="mx-4 rounded-xl bg-white/30 p-6 text-center backdrop-blur-md shadow-lg md:p-10 max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              UTJNの設立経緯
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white md:text-base">
              UTJNはメンバーの皆様と共に積み重ねた経験と時間によって、今の形になりました。<br />
              創立から今日までの物語を、ぜひ最後までお楽しみください。
            </p>
          </div>
        </div>
      </section>

      {/* ----- Timeline container ----- */}
      <section className="relative mx-auto w-full max-w-6xl px-4 py-16 fade-in-up">
        {/* vertical line across the whole timeline */}
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-full w-[3px] -translate-x-1/2 bg-[#1c2a52]" />

        <ul className="space-y-16 md:space-y-24">
          {TIMELINE.map((item, idx) => (
            <TimelineRow
              key={`${item.year}-${item.title}`}
              item={item}
              align={idx % 2 === 0 ? "left" : "right"}
            />
          ))}
        </ul>
      </section>
    </main>
  );
}

/* ---------- one row in the timeline ---------- */
function TimelineRow({
  item,
  align,
}: {
  item: TimelineItem;
  align: "left" | "right";
}) {
  return (
    <li className="relative grid items-center grid-cols-1 md:grid-cols-[1fr_40px_1fr]">
      {/* left column */}
      <div
        className={[
          "order-2 md:order-1",
          align === "left"
            ? "flex justify-end pr-6"
            : "hidden md:block md:opacity-0",
        ].join(" ")}
      >
        {align === "left" ? <Card {...item} /> : null}
      </div>

      {/* center circle */}
      <div className="order-1 md:order-2 mx-auto flex h-full w-10 items-center justify-center">
        <span className="mb-3 block h-2 w-2 rounded-full bg-[#1c2a52] md:hidden" />
        <span className="hidden md:block h-5 w-5 rounded-full border-2 border-[#1c2a52] bg-white" />
      </div>

      {/* right column */}
      <div
        className={[
          "order-3",
          align === "right"
            ? "flex justify-start pl-6"
            : "hidden md:block md:opacity-0",
        ].join(" ")}
      >
        {align === "right" ? <Card {...item} /> : null}
      </div>

      {/* mobile card */}
      <div className="order-4 mt-4 md:hidden">
        <Card {...item} />
      </div>
    </li>
  );
}

/* ---------- the card UI itself ---------- */
function Card({ year, title, body }: TimelineItem) {
  return (
    <article className="max-w-md rounded-xl bg-white p-6 shadow-md ring-1 ring-black/5">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#1c2a52] px-3 py-1 text-xs font-semibold text-white">
        {year}
      </div>
      <h3 className="mt-3 text-lg font-bold">{title}</h3>
      <p className="mt-3 leading-relaxed text-gray-600">{body}</p>
    </article>
  );
}
