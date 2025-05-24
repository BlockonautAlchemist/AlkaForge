import React from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';

interface UsageDisplayProps {
  className?: string;
}

const UsageDisplay: React.FC<UsageDisplayProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const {
    subscription,
    tierDetails,
    remainingRequests,
    loading,
  } = useSubscription();

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-dark-100 rounded-lg shadow-md p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-dark-300 rounded w-3/4 mb-2"></div>
          <div className="h-2 bg-gray-200 dark:bg-dark-300 rounded w-full mb-1"></div>
          <div className="h-3 bg-gray-200 dark:bg-dark-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!subscription || !tierDetails) {
    return (
      <div className={`bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 ${className}`}>
        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
          Unable to load subscription information. Please refresh the page.
        </p>
      </div>
    );
  }

  const getUsageColor = () => {
    if (tierDetails.monthlyRequests === -1) {
      // Premium tier - use soft cap for color calculation
      const usagePercentage = subscription.monthly_usage / 1000;
      if (usagePercentage >= 0.8) return 'bg-yellow-500';
      return 'bg-green-500';
    }
    
    const usagePercentage = subscription.monthly_usage / tierDetails.monthlyRequests;
    if (usagePercentage >= 0.9) return 'bg-red-500';
    if (usagePercentage >= 0.7) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getUsagePercentage = () => {
    if (tierDetails.monthlyRequests === -1) {
      // Premium tier - show percentage of soft cap (1000)
      return Math.min((subscription.monthly_usage / 1000) * 100, 100);
    }
    
    return Math.min((subscription.monthly_usage / tierDetails.monthlyRequests) * 100, 100);
  };

  const getStatusIcon = () => {
    if (remainingRequests === 0) {
      return (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (remainingRequests <= 2) {
      return (
        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    
    return (
      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className={`bg-white dark:bg-dark-100 rounded-lg shadow-md p-4 border border-gray-200 dark:border-dark-300 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          {getStatusIcon()}
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {tierDetails.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Current subscription plan
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {subscription.monthly_usage} / {tierDetails.monthlyRequests === -1 ? 'Unlimited' : tierDetails.monthlyRequests}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            requests this month
          </p>
        </div>
      </div>
      
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>Usage</span>
          {tierDetails.monthlyRequests !== -1 && (
            <span>{remainingRequests} remaining</span>
          )}
        </div>
        <div className="w-full bg-gray-200 dark:bg-dark-300 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getUsageColor()}`}
            style={{ width: `${getUsagePercentage()}%` }}
          ></div>
        </div>
        {tierDetails.monthlyRequests === -1 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Unlimited plan (monitoring threshold: 1000/month)
          </p>
        )}
      </div>
    </div>
  );
};

export default UsageDisplay; 