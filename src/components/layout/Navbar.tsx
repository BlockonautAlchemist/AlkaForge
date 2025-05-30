import React, { useState, useEffect } from 'react';
// @ts-ignore
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Menu as FiMenu, X as FiX, Moon as FiMoon, Sun as FiSun, LogOut as FiLogOut } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <nav className="bg-white dark:bg-dark-100 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">AlkaForge</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              href="/pricing" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300"
            >
              Pricing
            </Link>
            {loading ? (
              // Show loading state to prevent hydration mismatch
              <div className="px-3 py-2">
                <div className="w-16 h-6 bg-gray-200 dark:bg-dark-300 animate-pulse rounded"></div>
              </div>
            ) : user ? (
              <>
                <Link 
                  href="/dashboard" 
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/generator" 
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300"
                >
                  Content Generator
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300"
                >
                  <FiLogOut className="mr-1" /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300"
                >
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className="px-3 py-2 rounded-md text-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
                >
                  Sign Up
                </Link>
              </>
            )}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <FiSun className="text-yellow-400" /> : <FiMoon className="text-gray-700" />}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleDarkMode}
              className="p-2 mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-300"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <FiSun className="text-yellow-400" /> : <FiMoon className="text-gray-700" />}
            </button>
            <button
              onClick={toggleMenu}
              className="p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300 focus:outline-none"
            >
              {isMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-dark-100 pt-2 pb-4 px-4">
          <div className="space-y-1">
            <Link 
              href="/pricing" 
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300"
            >
              Pricing
            </Link>
            {loading ? (
              // Show loading state to prevent hydration mismatch
              <div className="px-3 py-2">
                <div className="w-20 h-6 bg-gray-200 dark:bg-dark-300 animate-pulse rounded"></div>
              </div>
            ) : user ? (
              <>
                <Link 
                  href="/dashboard" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/generator" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300"
                >
                  Content Generator
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="flex items-center w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300"
                >
                  <FiLogOut className="mr-1" /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-300"
                >
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className="block px-3 py-2 rounded-md text-base font-medium bg-primary-600 text-white hover:bg-primary-700"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 