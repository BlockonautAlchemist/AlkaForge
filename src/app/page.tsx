'use client';

import React, { useState } from 'react';
// @ts-ignore
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';
import { FileText as FiFileText, Cpu as FiCpu, Twitter as FiTwitter, MessageSquare as FiMessageSquare, Check as FiCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Home() {
  const { subscription, createCheckoutSession } = useSubscription();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: 'STANDARD' | 'PREMIUM') => {
    if (!user) {
      toast.error('Please log in to subscribe to a plan');
      return;
    }

    setIsLoading(tier);
    try {
      const url = await createCheckoutSession(tier);
      window.location.href = url;
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setIsLoading(null);
    }
  };

  const getCurrentPlanStatus = (planTier: string | null) => {
    if (!user) return { isCurrent: false, buttonText: 'Get Started', buttonLink: '/signup' };
    
    const userTier = subscription?.subscription_tier || 'FREE';
    
    if (planTier === null && userTier === 'FREE') {
      return { isCurrent: true, buttonText: 'Current Plan', buttonLink: null };
    }
    if (planTier === userTier) {
      return { isCurrent: true, buttonText: 'Current Plan', buttonLink: null };
    }
    
    return { isCurrent: false, buttonText: planTier ? `Choose ${planTier.charAt(0) + planTier.slice(1).toLowerCase()}` : 'Get Started', buttonLink: planTier ? null : '/signup' };
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
            <span className="text-primary-600 dark:text-primary-400">AI-Powered</span> Content Management
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-10">
            Create stunning X posts, threads, replies, and Discord announcements with the help of AI.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {user ? (
              // Logged in user buttons
              <>
                <Link 
                  href="/dashboard" 
                  className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md shadow-md transition duration-300"
                >
                  Go to Dashboard
                </Link>
                <Link 
                  href="/generator" 
                  className="px-8 py-3 bg-gray-100 dark:bg-dark-300 hover:bg-gray-200 dark:hover:bg-dark-400 text-gray-800 dark:text-gray-200 font-medium rounded-md shadow-md transition duration-300"
                >
                  Create Content
                </Link>
              </>
            ) : (
              // Not logged in user buttons
              <>
                <Link 
                  href="/signup" 
                  className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md shadow-md transition duration-300"
                >
                  Get Started
                </Link>
                <Link 
                  href="/login" 
                  className="px-8 py-3 bg-gray-100 dark:bg-dark-300 hover:bg-gray-200 dark:hover:bg-dark-400 text-gray-800 dark:text-gray-200 font-medium rounded-md shadow-md transition duration-300"
                >
                  Log In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-gray-50 dark:bg-dark-300">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Powerful Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-dark-200 p-6 rounded-lg shadow-md">
              <div className="bg-primary-100 dark:bg-primary-900 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <FiFileText className="text-primary-600 dark:text-primary-400 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Knowledge Base</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Upload PDFs, TXT, and Markdown files to provide context for your AI-generated content.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-dark-200 p-6 rounded-lg shadow-md">
              <div className="bg-primary-100 dark:bg-primary-900 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <FiCpu className="text-primary-600 dark:text-primary-400 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">AI Generation</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Powered by Claude-3.7-Sonnet, produce high-quality content tailored to your needs.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-dark-200 p-6 rounded-lg shadow-md">
              <div className="bg-primary-100 dark:bg-primary-900 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <FiTwitter className="text-primary-600 dark:text-primary-400 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Social Content</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Create engaging X posts and threads that captivate your audience.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-dark-200 p-6 rounded-lg shadow-md">
              <div className="bg-primary-100 dark:bg-primary-900 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <FiMessageSquare className="text-primary-600 dark:text-primary-400 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Discord Integration</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Craft perfect Discord announcements formatted beautifully with markdown.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-white dark:bg-dark-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Choose the plan that fits your content creation needs. Start free, upgrade when you need more.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            {(() => {
              const planStatus = getCurrentPlanStatus(null);
              return (
            <div className={`rounded-lg p-8 text-center relative ${
              planStatus.isCurrent
                ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border border-gray-200 dark:border-dark-300'
            }`}>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Free</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
                <span className="text-gray-600 dark:text-gray-300">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">10 requests per month</span>
                </li>
                <li className="flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">Basic content generation</span>
                </li>
                <li className="flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">Email support</span>
                </li>
              </ul>
              {planStatus.isCurrent && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                    <FiCheck className="mr-1" />
                    Current Plan
                  </span>
                </div>
              )}
              {planStatus.isCurrent ? (
                <button
                  disabled
                  className="w-full px-6 py-3 font-medium rounded-md bg-green-500 text-white cursor-not-allowed opacity-75"
                >
                  Current Plan
                </button>
              ) : planStatus.buttonLink ? (
                <Link 
                  href={planStatus.buttonLink} 
                  className="w-full inline-block px-6 py-3 border border-primary-600 text-primary-600 font-medium rounded-md hover:bg-primary-50 dark:hover:bg-primary-900 transition duration-300"
                >
                  {planStatus.buttonText}
                </Link>
              ) : null}
            </div>
              );
            })()}

            {/* Standard Plan */}
            {(() => {
              const planStatus = getCurrentPlanStatus('STANDARD');
              return (
            <div className={`rounded-lg p-8 text-center relative ${
              planStatus.isCurrent
                ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-2 border-primary-600'
            }`}>
              {planStatus.isCurrent && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                    <FiCheck className="mr-1" />
                    Current Plan
                  </span>
                </div>
              )}
              {!planStatus.isCurrent && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
                </div>
              )}
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Standard</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$14.99</span>
                <span className="text-gray-600 dark:text-gray-300">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">100 requests per month</span>
                </li>
                <li className="flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">All content types</span>
                </li>
                <li className="flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">Priority support</span>
                </li>
                <li className="flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">Knowledge base integration</span>
                </li>
              </ul>
              {planStatus.isCurrent ? (
                <button
                  disabled
                  className="w-full px-6 py-3 font-medium rounded-md bg-green-500 text-white cursor-not-allowed opacity-75"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe('STANDARD')}
                  disabled={isLoading === 'STANDARD'}
                  className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition duration-300 disabled:opacity-50"
                >
                  {isLoading === 'STANDARD' ? 'Processing...' : planStatus.buttonText}
                </button>
              )}
            </div>
              );
            })()}

            {/* Premium Plan */}
            {(() => {
              const planStatus = getCurrentPlanStatus('PREMIUM');
              return (
            <div className={`rounded-lg p-8 text-center relative ${
              planStatus.isCurrent
                ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border border-gray-200 dark:border-dark-300'
            }`}>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Premium</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$59.99</span>
                <span className="text-gray-600 dark:text-gray-300">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">Unlimited requests</span>
                </li>
                <li className="flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">All content types</span>
                </li>
                <li className="flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">Priority support</span>
                </li>
                <li className="flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">Advanced analytics</span>
                </li>
              </ul>
              {planStatus.isCurrent && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                    <FiCheck className="mr-1" />
                    Current Plan
                  </span>
                </div>
              )}
              {planStatus.isCurrent ? (
                <button
                  disabled
                  className="w-full px-6 py-3 font-medium rounded-md bg-green-500 text-white cursor-not-allowed opacity-75"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe('PREMIUM')}
                  disabled={isLoading === 'PREMIUM'}
                  className="w-full px-6 py-3 border border-gray-300 dark:border-dark-300 text-gray-700 dark:text-gray-300 font-medium rounded-md hover:bg-gray-50 dark:hover:bg-dark-300 transition duration-300 disabled:opacity-50"
                >
                  {isLoading === 'PREMIUM' ? 'Processing...' : planStatus.buttonText}
                </button>
              )}
            </div>
              );
            })()}
          </div>
          
          <div className="text-center mt-12">
            <Link 
              href="/pricing" 
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View detailed pricing comparison →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600 dark:bg-primary-800">
        <div className="container mx-auto px-4 text-center">
          {user ? (
            <>
              <h2 className="text-3xl font-bold text-white mb-6">Ready to Create Amazing Content?</h2>
              <p className="text-xl text-primary-100 max-w-2xl mx-auto mb-8">
                You're all set! Start creating stunning content with the power of AI.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link 
                  href="/generator" 
                  className="px-8 py-3 bg-white hover:bg-gray-100 text-primary-600 font-medium rounded-md shadow-md transition duration-300"
                >
                  Start Creating
                </Link>
                <Link 
                  href="/dashboard" 
                  className="px-8 py-3 border border-white text-white hover:bg-white hover:text-primary-600 font-medium rounded-md transition duration-300"
                >
                  View Dashboard
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-white mb-6">Ready to Transform Your Content Creation?</h2>
              <p className="text-xl text-primary-100 max-w-2xl mx-auto mb-8">
                Join thousands of content creators who are saving time and producing better content with AlkaForge.
              </p>
              <Link 
                href="/signup" 
                className="px-8 py-3 bg-white hover:bg-gray-100 text-primary-600 font-medium rounded-md shadow-md transition duration-300"
              >
                Get Started Today
              </Link>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
} 