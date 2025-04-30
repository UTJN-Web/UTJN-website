// app/about/page.tsx
import Link from 'next/link';

export default function About() {
  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>About Page</h1>
      <p>This is the About page.</p>
      <nav style={{ marginTop: '20px' }}>
        <Link href="/">Home</Link> | <Link href="/about">About</Link>
      </nav>
    </div>
  );
}
