// app/events/page.tsx
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

interface EventItem {
  id: number;
  date: string;
  seats: number;
  capacity: number;
  type: 'career' | 'social';
  title: string;
  description: string;
  years: string;
  image: string;
  archived?: boolean;
  registered?: boolean;
}

const eventsData: EventItem[] = [
  {
    id: 1,
    date: '2025-09-02',
    seats: 12,
    capacity: 40,
    type: 'career',
    title: '外資コンサルティング企業説明会',
    description:
      'KPMGやPwCなど外資系コンサルの採用担当者とのネットワーキング。',
    years: 'All years',
    image: '/events/event1.jpg',
    registered: true,
  },
  {
    id: 2,
    date: '2025-09-05',
    seats: 5,
    capacity: 25,
    type: 'social',
    title: '秋の新歓BBQ',
    description:
      'トロントの湖畔で新入生歓迎BBQ！日本食も用意します。',
    years: '1st–2nd year',
    image: '/events/event2.jpg',
  },
  {
    id: 3,
    date: '2025-09-10',
    seats: 0,
    capacity: 30,
    type: 'social',
    title: 'トロント・アイススケート交流会',
    description:
      'ダウンタウンのスケートリンクを貸し切り！初心者歓迎。',
    years: 'All years',
    image: '/events/event3.jpg',
  },
  {
    id: 4,
    date: '2025-09-15',
    seats: 18,
    capacity: 50,
    type: 'career',
    title: '就活ワークショップ：履歴書の書き方',
    description: 'カナダ企業向けレジュメの書き方をプロが指導。',
    years: '3rd–4th year',
    image: '/events/event4.jpg',
  },
  {
    id: 5,
    date: '2025-09-20',
    seats: 2,
    capacity: 20,
    type: 'career',
    title: 'OB・OG座談会 〜キャリアパスを語ろう〜',
    description:
      '卒業生からリアルなキャリア体験を聞ける少人数座談会。',
    years: 'All years',
    image: '/events/event5.jpg',
  },
  {
    id: 6,
    date: '2025-04-05',
    seats: 0,
    capacity: 35,
    type: 'social',
    title: '桜鑑賞ピクニック',
    description: 'ハイパークでお花見＆お弁当交流会を開催しました。',
    years: 'All years',
    image: '/events/event6.jpg',
    archived: true,
  },
  {
    id: 7,
    date: '2024-08-12',
    seats: 0,
    capacity: 60,
    type: 'social',
    title: '夏祭り in Toronto',
    description: '盆踊りと屋台で日本の夏を再現！400名超が参加。',
    years: 'All years',
    image: '/events/event7.jpg',
    archived: true,
  },
  {
    id: 8,
    date: '2024-01-15',
    seats: 0,
    capacity: 45,
    type: 'career',
    title: 'インターン面接対策セミナー',
    description:
      '現役リクルーターによる模擬面接＆フィードバック。',
    years: '2nd–3rd year',
    image: '/events/event8.jpg',
    archived: true,
  },
  {
    id: 9,
    date: '2023-10-30',
    seats: 0,
    capacity: 80,
    type: 'social',
    title: 'ハロウィン・コスチュームパーティー',
    description: '仮装コンテストで盛り上がったナイトイベント。',
    years: 'All years',
    image: '/events/event9.jpg',
    archived: true,
  },
  {
    id: 10,
    date: '2023-11-20',
    seats: 0,
    capacity: 55,
    type: 'career',
    title: '金融業界パネルディスカッション',
    description:
      '大手銀行・証券のプロがキャリアについてパネル形式で議論。',
    years: 'All years',
    image: '/events/event10.jpg',
    archived: true,
  },
];

export default function EventsPage() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<'all' | 'career' | 'social'>('all');
  const [showArchived, setShowArchived] = useState(false);

  const filteredEvents = useMemo(() => {
    return eventsData.filter((ev) => {
      if (keyword && !ev.title.toLowerCase().includes(keyword.toLowerCase()))
        return false;
      if (category !== 'all' && ev.type !== category) return false;
      return true;
    });
  }, [keyword, category]);

  const liveEvents = filteredEvents.filter((e) => !e.archived);
  const archivedEvents = filteredEvents.filter((e) => e.archived);

  return (
    <div className="min-h-screen w-full">
      {/* ───────── Hero banner (Option B) ───────── */}
      <section className="relative h-[36vh] w-full fade-in-up">
        <Image
          src="/trinity_college.jpg"    // put a big, crisp image in /public
          alt="Member Events"
          fill
          priority
          quality={100}
          sizes="100vw"
          className="object-cover"
        />
        {/* readability overlay */}
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="px-6 text-center text-4xl font-extrabold text-white drop-shadow">
            Member Events
          </h1>
        </div>
      </section>

      {/* ───────── Main content ───────── */}
      <section className="fade-in-up mx-auto w-full max-w-4xl px-4 pb-20 pt-10">
        {/* keep an accessible heading for screen readers */}
        <h1 className="sr-only">Member Events</h1>

        {/* search */}
        <div className="mb-10 flex justify-center gap-2">
          <label htmlFor="filter" className="sr-only">
            Search events
          </label>
          <input
            id="filter"
            type="text"
            placeholder="Search by keyword"
            className="w-full max-w-sm rounded-md border border-gray-300 bg-transparent px-3 py-2 focus:border-[#1c2a52] focus:outline-none"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {/* filter tabs */}
        <div className="mb-10 flex justify-center gap-4">
          {(['all', 'career', 'social'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-2 text-sm border transition ${
                category === c
                  ? 'bg-[#1c2a52] text-white border-[#1c2a52]'
                  : 'border-gray-400 hover:bg-gray-100 dark:hover:bg-[#171717]'
              }`}
            >
              {c === 'all' ? 'All' : c === 'career' ? 'Career' : 'Social'}
            </button>
          ))}
        </div>

        {/* live events */}
        <div className="space-y-8">
          {liveEvents.length === 0 && (
            <p className="text-center text-gray-500">No events found.</p>
          )}
          {liveEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {/* archived toggle */}
        <div className="mt-16 text-center">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-gray-400 px-4 py-2 text-sm transition hover:bg-gray-100 dark:hover:bg-[#171717]"
            onClick={() => setShowArchived((prev) => !prev)}
          >
            {showArchived ? (
              <>
                Hide archived <ChevronUp size={18} />
              </>
            ) : (
              <>
                View archived events <ChevronDown size={18} />
              </>
            )}
          </button>
        </div>

        {/* archived list */}
        {showArchived && (
          <div className="mt-10 space-y-8">
            {archivedEvents.map((event) => (
              <EventCard key={event.id} event={event} archived />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EventCard({
  event,
  archived,
}: {
  event: EventItem;
  archived?: boolean;
}) {
  const date = new Date(event.date);
  const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;

  return (
    <article className="flex flex-col rounded-lg border border-gray-300 p-4 shadow-sm md:flex-row md:items-center md:gap-4">
      {/* date / seats */}
      <div className="flex w-full items-center justify-between md:w-[120px] md:flex-col md:justify-center">
        <span className="text-2xl font-bold md:text-3xl">{dateLabel}</span>
        <span className="text-sm text-gray-500">
          Seats {event.seats}/{event.capacity}
        </span>
      </div>

      {/* text */}
      <div className="mt-3 grow md:mt-0">
        <h2 className="text-lg font-semibold">{event.title}</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {event.description}
        </p>
        <p className="mt-1 text-xs text-gray-500">For: {event.years}</p>
      </div>

      {/* tag + action */}
      <div className="mt-4 flex shrink-0 flex-col items-end gap-2 md:mt-0 md:w-[150px]">
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
            event.type === 'career'
              ? 'bg-red-100 text-red-600'
              : 'bg-blue-100 text-blue-600'
          }`}
        >
          {event.type === 'career' ? 'Career' : 'Social'}
        </span>

        {archived ? (
          <Link
            href="#"
            className="w-full rounded-md border border-gray-400 py-2 text-center text-sm transition hover:bg-gray-100 dark:hover:bg-[#171717]"
          >
            View report
          </Link>
        ) : event.registered ? (
          <Link
            href="#"
            className="w-full rounded-md border border-[#1c2a52] bg-[#1c2a52] py-2 text-center text-sm text-white transition hover:opacity-90"
          >
            View receipt
          </Link>
        ) : (
          <Link
            href="#"
            className="w-full rounded-md border border-[#1c2a52] py-2 text-center text-sm text-[#1c2a52] transition hover:bg-[#1c2a52] hover:text-white"
          >
            Register
          </Link>
        )}
      </div>
    </article>
  );
}
