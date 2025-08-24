'use client';

import Link from 'next/link';
import { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';

export default function AdminLink() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;

  // Only show admin link for logged-in users (you can add more specific authorization logic here)
  if (!user) {
    return null;
  }

  return (
    <Link 
      href="/admin" 
      className="text-lg font-normal hover:text-[#1c2a52] text-orange-600"
      title="Admin Dashboard"
    >
      Admin
    </Link>
  );
} 