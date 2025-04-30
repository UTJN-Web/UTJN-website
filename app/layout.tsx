// app/layout.tsx
import './globals.css';
import Link from 'next/link';
import { ReactNode } from 'react';

export const metadata = {
  title: 'UTJN - University of Toronto Japanese Network',
  description: 'Connecting Japanese students at UofT',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'sans-serif' }}>
        {/* ヘッダー */}
        <header
          style={{
            position: 'relative',
            height: '100px',
            borderBottom: '1px solid #ddd',
            backgroundColor: '#fff'
          }}
        >
          {/* 左側ナビ */}
          <nav
            style={{
              position: 'absolute',
              left: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: '1.5rem',
            }}
          >
            <Link href="#"style={{ color: '#1a1a1a', textDecoration: 'none' }}>Membership</Link>
            <Link href="#"style={{ color: '#1a1a1a', textDecoration: 'none' }}>Events</Link>
            <Link href="#"style={{ color: '#1a1a1a', textDecoration: 'none' }}>Torontonians Blog</Link>
          </nav>

          {/* 中央ロゴ */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <img src="/logo.png" alt="UTJN Logo" style={{ height: 60 }} />
          </div>

          {/* 右側SNS */}
          <div
            style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
            }}
          >
            <Link href="#"style={{ color: '#1a1a1a', textDecoration: 'none' }}>Login</Link>

            <Link href="https://www.facebook.com/uoftjn/" target="_blank" rel="noopener noreferrer">
            <img src="/facebook.png" alt="Facebook" style={{ width: 24, height: 24 }} />
            </Link>

            <Link href="https://www.instagram.com/uoftjn" target="_blank" rel="noopener noreferrer">
            <img src="/instagram.png" alt="Instagram" style={{ width: 24, height: 24 }} />
            </Link>
            
            <Link href="https://www.tiktok.com/@uoftjn" target="_blank" rel="noopener noreferrer">
            <img src="/tiktok.png" alt="Tiktok" style={{ width: 24, height: 24 }} />
            </Link>
          </div>
        </header>

        {/* メイン */}
        <main
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            minHeight: '100vh',
            paddingTop: '2rem',
            textAlign: 'center',
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
