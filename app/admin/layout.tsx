'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user?.email) {
        console.log('❌ No user logged in, redirecting to login');
        router.push('/login');
        return;
      }

      try {
        console.log('🔍 Checking admin access for:', user.email);
        const response = await fetch(`/api/users/admin-status?email=${encodeURIComponent(user.email)}`);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Admin access check response:', data);
          if (data.isAdmin) {
            setIsAdmin(true);
          } else {
            console.log('❌ User is not admin, redirecting to home');
            router.push('/');
          }
        } else {
          console.log('❌ Admin access check failed:', response.status);
          router.push('/');
        }
      } catch (error) {
        console.error('❌ Error checking admin access:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [user?.email, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white bg-opacity-95 rounded-lg p-8 shadow-lg backdrop-blur-sm text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#1c2a52] border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">Checking Admin Access</h2>
          <p className="text-gray-600">Please wait while we verify your permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect to home page
  }

  return <>{children}</>;
} 