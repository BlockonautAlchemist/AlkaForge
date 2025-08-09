'use client';

import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function DebugSubscription() {
  const { user } = useAuth();
  const { subscription, syncSubscription, refreshSubscription, loading } = useSubscription();
  const router = useRouter();

  const handleSync = async () => {
    try {
      await syncSubscription();
      toast.success('Subscription synced successfully!');
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        toast.error('Please log in to sync subscription');
        router.push('/login');
        return;
      }
      toast.error(error.message || 'Failed to sync subscription');
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshSubscription();
      toast.success('Subscription refreshed!');
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        toast.error('Please log in to refresh subscription');
        router.push('/login');
        return;
      }
      toast.error('Failed to refresh subscription');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold mb-4">Debug Subscription</h1>
            <p>Please log in to debug your subscription.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            Debug Subscription
          </h1>
          
          <div className="space-y-6">
            {/* Current Subscription Status */}
            <div className="border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Current Subscription
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">User ID:</span> {user.id}
                </div>
                <div>
                  <span className="font-medium">Tier:</span> {subscription?.subscription_tier || 'Loading...'}
                </div>
                <div>
                  <span className="font-medium">Monthly Usage:</span> {subscription?.monthly_usage || 0}
                </div>
                <div>
                  <span className="font-medium">Stripe Customer ID:</span> {subscription?.stripe_customer_id || 'None'}
                </div>
                <div>
                  <span className="font-medium">Stripe Subscription ID:</span> {subscription?.stripe_subscription_id || 'None'}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleSync}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md transition-colors"
              >
                {loading ? 'Syncing...' : 'Sync with Stripe'}
              </button>
              
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md transition-colors"
              >
                {loading ? 'Refreshing...' : 'Refresh Subscription'}
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                Instructions:
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                <li>If you just completed a Stripe checkout, click "Sync with Stripe"</li>
                <li>This will find your Stripe customer and update your subscription</li>
                <li>If you see a Stripe Customer ID above, your billing portal should work</li>
                <li>Use "Refresh Subscription" to reload data from the database</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 