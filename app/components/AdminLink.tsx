'use client';

import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../contexts/UserContext';

export default function AdminLink() {
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Checking admin status for:', user.email);
        const response = await fetch(`/api/users/admin-status?email=${encodeURIComponent(user.email)}`);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Admin status response:', data);
          setIsAdmin(data.isAdmin);
        } else {
          console.log('❌ Admin status check failed:', response.status);
        }
      } catch (error) {
        console.error('❌ Error checking admin status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user?.email]);

  // Debug logging
  console.log('🔍 AdminLink render:', { 
    user: user?.email, 
    loading, 
    isAdmin,
    shouldShow: user && !loading && isAdmin 
  });

  // Only show admin link for logged-in users with admin privileges
  if (!user || loading || !isAdmin) {
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