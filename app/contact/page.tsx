// app/contact/page.tsx
'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (res.ok) {
        setSuccess(true);
        setName('');
        setEmail('');
        setMessage('');
      } else {
        const data = await res.json();
        setError(data.detail || '送信に失敗しました。');
      }
    } catch (err) {
      setError('送信に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-lg bg-white rounded shadow p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">企業向けお問い合わせ</h1>
        <p className="mb-6 text-center text-gray-600">UTJNへのご連絡はこちらのフォームからどうぞ。</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="お名前"
            className="w-full border rounded px-4 py-2"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="メールアドレス"
            className="w-full border rounded px-4 py-2"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <textarea
            placeholder="メッセージ"
            className="w-full border rounded px-4 py-2 min-h-[120px]"
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">送信が完了しました。ありがとうございました！</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1c2a52] text-white py-2 rounded hover:bg-[#2a3c6b] transition disabled:opacity-50"
          >
            {loading ? '送信中…' : '送信する'}
          </button>
        </form>
      </div>
    </div>
  );
} 