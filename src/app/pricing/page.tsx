'use client';

import React, { useState } from 'react';
// @ts-ignore
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';
import { FiCheck, FiX, FiStar, FiZap, FiShield, FiHeadphones } from '@/lib/react-icons-compat';
import toast from 'react-hot-toast';

export default function PricingPage() {
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
    if (!user) return { isCurrent: false, buttonText: 'Get Started Free', buttonLink: '/signup' };
    
    const userTier = subscription?.subscription_tier || 'FREE';
    
    if (planTier === null && userTier === 'FREE') {
      return { isCurrent: true, buttonText: 'Current Plan', buttonLink: null };
    }
    if (planTier === userTier) {
      return { isCurrent: true, buttonText: 'Current Plan', buttonLink: null };
    }
    
    return { isCurrent: false, buttonText: planTier ? `Choose ${planTier.charAt(0) + planTier.slice(1).toLowerCase()}` : 'Get Started Free', buttonLink: planTier ? null : '/signup' };
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Perfect for getting started with AI content creation',
      features: [
        '10 requests per month',
        'Basic content generation',
        'X posts and threads',
        'Discord announcements',
        'Email support',
        'Knowledge base upload'
      ],
      limitations: [
        'Limited to 10 requests',
        'No priority support',
        'Basic templates only'
      ],
      buttonText: 'Get Started Free',
      buttonLink: '/signup',
      popular: false,
      tier: null
    },
    {
      name: 'Standard',
      price: '$14.99',
      period: '/month',
      description: 'Ideal for content creators and small businesses',
      features: [
        '100 requests per month',
        'All content types',
        'Advanced AI generation',
        'Priority support',
        'Knowledge base integration',
        'Custom templates',
        'Analytics dashboard',
        'Export options'
      ],
      limitations: [],
      buttonText: 'Choose Standard',
      buttonLink: null,
      popular: true,
      tier: 'STANDARD' as const
    },
    {
      name: 'Premium',
      price: '$59.99',
      period: '/month',
      description: 'For power users and growing teams',
      features: [
        'Unlimited requests',
        'All content types',
        'Advanced AI generation',
        'Priority support',
        'Knowledge base integration',
        'Custom templates',
        'Advanced analytics',
        'Team collaboration',
        'API access',
        'White-label options'
      ],
      limitations: [],
      buttonText: 'Choose Premium',
      buttonLink: null,
      popular: false,
      tier: 'PREMIUM' as const
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900 dark:to-primary-800">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
            Choose Your <span className="text-primary-600 dark:text-primary-400">Perfect Plan</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-10">
            Scale your content creation with AI-powered tools. Start free, upgrade when you need more power.
          </p>
          <div className="flex justify-center items-center space-x-4 mb-8">
            <div className="flex items-center">
              <FiShield className="text-green-500 mr-2" />
              <span className="text-gray-600 dark:text-gray-300">30-day money-back guarantee</span>
            </div>
            <div className="flex items-center">
              <FiZap className="text-yellow-500 mr-2" />
              <span className="text-gray-600 dark:text-gray-300">Instant activation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-white dark:bg-dark-100">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              const planStatus = getCurrentPlanStatus(plan.tier);
              return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 ${
                  planStatus.isCurrent
                    ? 'border-2 border-green-500 shadow-2xl bg-green-50 dark:bg-green-900/20'
                    : plan.popular
                    ? 'border-2 border-primary-600 shadow-2xl scale-105'
                    : 'border border-gray-200 dark:border-dark-300 shadow-lg'
                } bg-white dark:bg-dark-200`}
              >
                {planStatus.isCurrent && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-6 py-2 rounded-full text-sm font-medium flex items-center">
                      <FiCheck className="mr-1" />
                      Current Plan
                    </span>
                  </div>
                )}
                {!planStatus.isCurrent && plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-2 rounded-full text-sm font-medium flex items-center">
                      <FiStar className="mr-1" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                    <span className="text-gray-600 dark:text-gray-300 text-lg">{plan.period}</span>
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <FiCheck className="text-green-500 mr-2" />
                    What's included:
                  </h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <FiCheck className="text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.limitations.length > 0 && (
                  <div className="mb-8">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <FiX className="text-red-500 mr-2" />
                      Limitations:
                    </h4>
                    <ul className="space-y-3">
                      {plan.limitations.map((limitation, limitIndex) => (
                        <li key={limitIndex} className="flex items-start">
                          <FiX className="text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-300">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-auto">
                  {planStatus.isCurrent ? (
                    <button
                      disabled
                      className="w-full px-6 py-3 font-medium rounded-lg bg-green-500 text-white cursor-not-allowed opacity-75"
                    >
                      Current Plan
                    </button>
                  ) : planStatus.buttonLink ? (
                    <Link
                      href={planStatus.buttonLink}
                      className={`w-full inline-block text-center px-6 py-3 font-medium rounded-lg transition duration-300 ${
                        plan.popular
                          ? 'bg-primary-600 hover:bg-primary-700 text-white'
                          : 'border border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900'
                      }`}
                    >
                      {planStatus.buttonText}
                    </Link>
                  ) : (
                    <button
                      onClick={() => plan.tier && handleSubscribe(plan.tier)}
                      disabled={isLoading === plan.tier || !plan.tier}
                      className={`w-full px-6 py-3 font-medium rounded-lg transition duration-300 ${
                        plan.popular
                          ? 'bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50'
                          : 'border border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900 disabled:opacity-50'
                      }`}
                    >
                      {isLoading === plan.tier ? 'Processing...' : planStatus.buttonText}
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 bg-gray-50 dark:bg-dark-300">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Detailed Feature Comparison
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              See exactly what's included in each plan
            </p>
          </div>

          <div className="max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full bg-white dark:bg-dark-200 rounded-lg shadow-lg">
              <thead>
                <tr className="border-b border-gray-200 dark:border-dark-300">
                  <th className="text-left p-6 font-semibold text-gray-900 dark:text-white">Features</th>
                  <th className="text-center p-6 font-semibold text-gray-900 dark:text-white">Free</th>
                  <th className="text-center p-6 font-semibold text-gray-900 dark:text-white">Standard</th>
                  <th className="text-center p-6 font-semibold text-gray-900 dark:text-white">Premium</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 dark:border-dark-300">
                  <td className="p-6 text-gray-900 dark:text-white">Monthly Requests</td>
                  <td className="p-6 text-center text-gray-600 dark:text-gray-300">10</td>
                  <td className="p-6 text-center text-gray-600 dark:text-gray-300">100</td>
                  <td className="p-6 text-center text-gray-600 dark:text-gray-300">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-dark-300">
                  <td className="p-6 text-gray-900 dark:text-white">Content Types</td>
                  <td className="p-6 text-center"><FiCheck className="text-green-500 mx-auto" /></td>
                  <td className="p-6 text-center"><FiCheck className="text-green-500 mx-auto" /></td>
                  <td className="p-6 text-center"><FiCheck className="text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-dark-300">
                  <td className="p-6 text-gray-900 dark:text-white">Knowledge Base Upload</td>
                  <td className="p-6 text-center"><FiCheck className="text-green-500 mx-auto" /></td>
                  <td className="p-6 text-center"><FiCheck className="text-green-500 mx-auto" /></td>
                  <td className="p-6 text-center"><FiCheck className="text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-dark-300">
                  <td className="p-6 text-gray-900 dark:text-white">Priority Support</td>
                  <td className="p-6 text-center"><FiX className="text-red-500 mx-auto" /></td>
                  <td className="p-6 text-center"><FiCheck className="text-green-500 mx-auto" /></td>
                  <td className="p-6 text-center"><FiCheck className="text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-dark-300">
                  <td className="p-6 text-gray-900 dark:text-white">Advanced Analytics</td>
                  <td className="p-6 text-center"><FiX className="text-red-500 mx-auto" /></td>
                  <td className="p-6 text-center"><FiX className="text-red-500 mx-auto" /></td>
                  <td className="p-6 text-center"><FiCheck className="text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-dark-300">
                  <td className="p-6 text-gray-900 dark:text-white">API Access</td>
                  <td className="p-6 text-center"><FiX className="text-red-500 mx-auto" /></td>
                  <td className="p-6 text-center"><FiX className="text-red-500 mx-auto" /></td>
                  <td className="p-6 text-center"><FiCheck className="text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-6 text-gray-900 dark:text-white">Team Collaboration</td>
                  <td className="p-6 text-center"><FiX className="text-red-500 mx-auto" /></td>
                  <td className="p-6 text-center"><FiX className="text-red-500 mx-auto" /></td>
                  <td className="p-6 text-center"><FiCheck className="text-green-500 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white dark:bg-dark-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Can I change my plan at any time?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing differences.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                What happens if I exceed my monthly limit?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                For Free and Standard plans, you'll be prompted to upgrade when you reach your limit. Premium users have unlimited requests with a soft cap of 1000 for monitoring purposes.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact our support team for a full refund.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Is my data secure?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Absolutely. We use enterprise-grade security measures and never store your generated content longer than necessary for processing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600 dark:bg-primary-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto mb-8">
            Join thousands of content creators who are already using AlkaForge to create amazing content.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/signup" 
              className="px-8 py-3 bg-white hover:bg-gray-100 text-primary-600 font-medium rounded-md shadow-md transition duration-300"
            >
              Start Free Trial
            </Link>
            <Link 
              href="/contact" 
              className="px-8 py-3 border border-white text-white hover:bg-white hover:text-primary-600 font-medium rounded-md transition duration-300 flex items-center justify-center"
            >
              <FiHeadphones className="mr-2" />
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
} 