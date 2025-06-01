'use client';

import { useEffect, useState } from 'react';
import LoginModal from './components/LoginModal';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const handler = () => setShowLogin(true);
    window.addEventListener('open-login-modal', handler);
    return () => window.removeEventListener('open-login-modal', handler);
  }, []);

  return (
    <>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {children}
    </>
  );
}
