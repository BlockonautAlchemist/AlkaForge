'use client';

import React from 'react';
// @ts-ignore
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { FiFileText, FiCpu, FiTwitter, FiMessageSquare } from '@/lib/react-icons-compat';

export default function Home() {
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

      {/* CTA Section */}
      <section className="py-16 bg-primary-600 dark:bg-primary-800">
        <div className="container mx-auto px-4 text-center">
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
        </div>
      </section>
    </Layout>
  );
} 