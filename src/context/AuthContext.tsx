import React from 'react';
// @ts-ignore - Ignoring type issues with React imports
import { createContext, useContext, useEffect, useState } from 'react';
import { User, signIn, signOut, signUp, getCurrentUser, onAuthStateChange } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, fullName?: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize from local storage if available
const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  const storedUser = localStorage.getItem('alkaforge-user');
  return storedUser ? JSON.parse(storedUser) : null;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [loading, setLoading] = useState(true);

  // Update localStorage when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('alkaforge-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('alkaforge-user');
    }
  }, [user]);

  useEffect(() => {
    // Check for current user on mount
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser || null);
      } catch (error) {
        console.error("Error checking authentication:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Set up auth state listener
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    // Add event listener for page visibility changes
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Refresh user data when tab becomes visible again
        const currentUser = await getCurrentUser();
        setUser(currentUser || null);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 