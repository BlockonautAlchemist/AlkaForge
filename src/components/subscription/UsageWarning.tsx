import React from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface UsageWarningProps {
  className?: string;
}

const UsageWarning: React.FC<UsageWarningProps> = ({ className = '' }) => {
  const {
    subscription,
    tierDetails,
    remainingRequests,
    warning,
    createCheckoutSession,
  } = useSubscription();
  const router = useRouter();

  const handleUpgrade = async (tier: 'STANDARD' | 'PREMIUM') => {
    try {
      const url = await createCheckoutSession(tier);
      window.location.href = url;
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        toast.error('Please log in to upgrade your plan.');
        router.push('/login');
        return;
      }
      toast.error('Failed to start checkout process');
    }
  };

  // Don't show warning if no subscription data or no warning
  if (!subscription || !tierDetails || !warning) {
    return null;
  }

  // Different warning styles based on severity
  const getWarningStyle = () => {
    if (remainingRequests === 0) {
      return 'bg-red-50 border-red-200 text-red-800';
    }
    if (remainingRequests <= 2) {
      return 'bg-orange-50 border-orange-200 text-orange-800';
    }
    return 'bg-yellow-50 border-yellow-200 text-yellow-800';
  };

  const getWarningIcon = () => {
    if (remainingRequests === 0) {
      return (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className={`border rounded-lg p-4 ${getWarningStyle()} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getWarningIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">
            {remainingRequests === 0 ? 'Usage Limit Reached' : 'Usage Warning'}
          </h3>
          <div className="mt-1 text-sm">
            <p>{warning}</p>
          </div>
          
          {/* Show upgrade options for free and standard users */}
          {(subscription.subscription_tier === 'FREE' || subscription.subscription_tier === 'STANDARD') && (
            <div className="mt-3 flex space-x-2">
              {subscription.subscription_tier === 'FREE' && (
                <>
                  <button
                    onClick={() => handleUpgrade('STANDARD')}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                  >
                    Upgrade to Standard
                  </button>
                  <button
                    onClick={() => handleUpgrade('PREMIUM')}
                    className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700 transition-colors"
                  >
                    Upgrade to Premium
                  </button>
                </>
              )}
              
              {subscription.subscription_tier === 'STANDARD' && (
                <button
                  onClick={() => handleUpgrade('PREMIUM')}
                  className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700 transition-colors"
                >
                  Upgrade to Premium
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsageWarning; 