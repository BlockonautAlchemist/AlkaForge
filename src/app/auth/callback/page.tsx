'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { FiCheck, FiAlertCircle } from '@/lib/react-icons-compat';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (data.session) {
          // User is successfully authenticated
          setSuccess(true);
          toast.success('Email confirmed successfully!');
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          // No session found, might be an error or expired link
          throw new Error('Invalid or expired confirmation link');
        }
      } catch (err: any) {
        console.error('Email confirmation error:', err);
        setError(err.message || 'Failed to confirm email');
        toast.error('Failed to confirm email');
      } finally {
        setLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [router]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <div className="bg-white dark:bg-dark-100 shadow-md rounded-lg p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Confirming your email...
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we verify your account.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <div className="bg-white dark:bg-dark-100 shadow-md rounded-lg p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <FiAlertCircle className="mx-auto text-6xl text-red-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Email confirmation failed
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {error}
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => router.push('/signup')}
                className="w-full py-2 px-4 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                Try signing up again
              </button>
              
              <button
                onClick={() => router.push('/login')}
                className="w-full py-2 px-4 rounded-md border border-gray-300 dark:border-dark-300 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors"
              >
                Go to login
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <div className="bg-white dark:bg-dark-100 shadow-md rounded-lg p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <FiCheck className="mx-auto text-6xl text-green-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Email confirmed!
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Your account has been successfully verified. You will be redirected to your dashboard shortly.
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-md mb-6">
              <p className="text-sm">
                Redirecting to dashboard in a few seconds...
              </p>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-2 px-4 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              Go to dashboard now
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return null;
} 