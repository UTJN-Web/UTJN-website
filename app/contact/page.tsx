// app/contact/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Mail, User, MessageSquare, Send, CheckCircle, AlertCircle } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverMsg, setServerMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailOk) {
        setSuccess(false);
        setServerMsg("メールアドレスの形式が正しくありません。");
        setLoading(false);
        return;
      }
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSuccess(true);
        setServerMsg(data.message || '送信が完了しました。ありがとうございました！');
        setName(''); setEmail(''); setMessage('');
      } else {
        setSuccess(false);
        setServerMsg(data.detail || '送信に失敗しました。');
      }
    } catch {
      setSuccess(false);
      setServerMsg('送信に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full">
      {/* ───────── Hero banner ───────── */}
      <section className="relative h-[40vh] w-full fade-in-up">
        <Image
          src="/toronto-skyline.png"
          alt="Contact UTJN"
          fill
          priority
          quality={100}
          sizes="100vw"
          className="object-cover"
        />
        {/* readability overlay */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="mx-4 rounded-xl bg-white/20 p-6 text-center backdrop-blur-md shadow-lg md:p-10 max-w-3xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl mb-3">
              企業様向けお問い合わせ
            </h1>
            <p className="text-lg leading-relaxed text-white/90 md:text-xl">
              UTJNへのご連絡はこちらのフォームからどうぞ。
            </p>
          </div>
        </div>
      </section>

      {/* ───────── Main content ───────── */}
      <section className="w-full px-4 pb-20 pt-16">
        <div className="mx-auto max-w-4xl">
          {/* Contact Form */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Form Header */}
            <div className="bg-gradient-to-r from-[#1c2a52] to-[#2a3c6b] px-8 py-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">お問い合わせフォーム</h2>
                  <p className="text-white/80 text-sm">Contact Form</p>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <User className="w-4 h-4 text-[#1c2a52]" />
                    お名前 / Name
                  </label>
                  <input
                    type="text"
                    placeholder="お名前を入力してください"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1c2a52] focus:border-[#1c2a52] transition-all duration-200 bg-gray-50 hover:bg-white"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Mail className="w-4 h-4 text-[#1c2a52]" />
                    メールアドレス / Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="example@company.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1c2a52] focus:border-[#1c2a52] transition-all duration-200 bg-gray-50 hover:bg-white"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Message Field */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <MessageSquare className="w-4 h-4 text-[#1c2a52]" />
                    メッセージ / Message
                  </label>
                  <textarea
                    placeholder="お問い合わせ内容を詳しくお聞かせください"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1c2a52] focus:border-[#1c2a52] transition-all duration-200 bg-gray-50 hover:bg-white min-h-[120px] resize-vertical"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                  />
                </div>

                {/* Status Message */}
                {serverMsg && (
                  <div className={`flex items-center gap-3 p-4 rounded-lg ${
                    success 
                      ? 'bg-green-50 border border-green-200 text-green-800' 
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    {success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <p className="text-sm font-medium">{serverMsg}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#1c2a52] to-[#2a3c6b] text-white py-4 px-6 rounded-lg hover:from-[#2a3c6b] hover:to-[#1c2a52] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      送信中...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      送信する / Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>


        </div>
      </section>
    </div>
  );
} 