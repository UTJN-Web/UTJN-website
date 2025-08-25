'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
  name?: string;
  id?: number;
  firstName?: string;
  lastName?: string;
  major?: string;
  graduationYear?: number;
  cognitoSub?: string;
  joinedAt?: string;
  hasProfile?: boolean;
}

interface UserContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
  refreshUserProfile: (email: string) => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUserProfile = async (email: string) => {
    try {
      const response = await fetch(`/api/users/profile?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(prevUser => ({
            ...prevUser,
            ...data.user
          }));
        }
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  useEffect(() => {
    // Check if user is logged in on app load
    const checkAuthStatus = async () => {
      try {
        // You can add an API call here to verify the user's session
        // For now, we'll check localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          
          // If user has email but no profile data, try to refresh
          if (userData.email && !userData.hasProfile) {
            await refreshUserProfile(userData.email);
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <UserContext.Provider value={{ user, login, logout, isLoading, refreshUserProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 