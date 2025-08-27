import './globals.css';
import type { ReactNode } from 'react';
import Footer from './components/Footer';
import ScrollObserver from './components/ScrollObserver';
import ClientLayoutWrapper from './ClientLayoutWrapper';
import Navbar from './components/Navbar';

export const metadata = {
  title: 'UTJN - University of Toronto Japanese Network',
  description: 'Connecting Japanese students at UofT',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="m-0 p-0 font-sans bg-[--color-background] text-[--color-foreground]">
        <ClientLayoutWrapper>
          <Navbar />
          <main className="flex min-h-screen flex-col items-center justify-start pt-8 text-center">
            {children}
          </main>
          <Footer />
          <ScrollObserver />
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
