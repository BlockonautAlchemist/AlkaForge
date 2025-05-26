import React, { useState } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { 
  FiCreditCard, 
  FiTrendingUp, 
  FiTrendingDown, 
  FiInfo, 
  FiCalendar, 
  FiZap, 
  FiShield, 
  FiStar,
  FiBarChart2,
  FiArrowUp,
  FiMinus
} from '@/lib/react-icons-compat';

interface SubscriptionStatusCardProps {
  className?: string;
  showUpgradeOptions?: boolean;
  showUsageHistory?: boolean;
}

interface UsageTrend {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
}

const SubscriptionStatusCard: React.FC<SubscriptionStatusCardProps> = ({ 
  className = '',
  showUpgradeOptions = true,
  showUsageHistory = true
}) => {
  const { user } = useAuth();
  const {
    subscription,
    tierDetails,
    remainingRequests,
    warning,
    loading,
    createCheckoutSession,
    createCustomerPortalSession,
  } = useSubscription();

  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // Mock usage trend data - in a real app, this would come from your API
  const usageTrend: UsageTrend = {
    direction: subscription?.monthly_usage > 50 ? 'up' : subscription?.monthly_usage > 20 ? 'down' : 'stable',
    percentage: Math.floor(Math.random() * 25) + 5 // Mock percentage change
  };

  const handleUpgrade = async (tier: 'STANDARD' | 'PREMIUM') => {
    try {
      const url = await createCheckoutSession(tier);
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to start checkout process');
    }
  };

  const handleManageBilling = async () => {
    try {
      const url = await createCustomerPortalSession();
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to open billing portal');
    }
  };

  const handleViewUsageHistory = () => {
    // In a real app, this would navigate to a usage history page or open a modal
    toast.success('Usage history feature coming soon!');
  };

  if (!user) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500 dark:text-gray-400">Please log in to view subscription status</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="flex space-x-2">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription || !tierDetails) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 ${className}`}>
        <div className="flex items-center">
          <FiInfo className="w-5 h-5 text-red-500 mr-3" />
          <p className="text-red-700 dark:text-red-300">Unable to load subscription information</p>
        </div>
      </div>
    );
  }

  const getUsageColor = () => {
    if (tierDetails.monthlyRequests === -1) {
      const usagePercentage = subscription.monthly_usage / 1000;
      if (usagePercentage >= 0.8) return 'from-yellow-400 to-orange-500';
      return 'from-green-400 to-emerald-500';
    }
    
    const usagePercentage = subscription.monthly_usage / tierDetails.monthlyRequests;
    if (usagePercentage >= 0.9) return 'from-red-400 to-red-600';
    if (usagePercentage >= 0.7) return 'from-yellow-400 to-orange-500';
    return 'from-green-400 to-emerald-500';
  };

  const getUsagePercentage = () => {
    if (tierDetails.monthlyRequests === -1) {
      return Math.min((subscription.monthly_usage / 1000) * 100, 100);
    }
    return Math.min((subscription.monthly_usage / tierDetails.monthlyRequests) * 100, 100);
  };

  const getStatusColor = () => {
    const usagePercentage = getUsagePercentage();
    if (usagePercentage >= 90) return 'text-red-500';
    if (usagePercentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getPlanIcon = () => {
    switch (subscription.subscription_tier) {
      case 'FREE':
        return <FiZap className="w-5 h-5 text-gray-500" />;
      case 'STANDARD':
        return <FiShield className="w-5 h-5 text-blue-500" />;
      case 'PREMIUM':
        return <FiStar className="w-5 h-5 text-purple-500" />;
      default:
        return <FiZap className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTrendIcon = () => {
    switch (usageTrend.direction) {
      case 'up':
        return <FiTrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <FiTrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <FiMinus className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatNextBillingDate = () => {
    if (!subscription.current_period_end) return 'N/A';
    const date = new Date(subscription.current_period_end);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getBillingCycle = () => {
    if (subscription.subscription_tier === 'FREE') return 'Free';
    return 'Monthly';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 p-6 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getPlanIcon()}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {tierDetails.name}
              </h3>
              <div className="flex items-center space-x-4 mt-1">
                <span className={`text-sm font-medium ${getStatusColor()}`}>
                  {subscription.subscription_tier === 'FREE' ? 'Free Plan' : 'Active'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {getBillingCycle()}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${tierDetails.price}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                {subscription.subscription_tier === 'FREE' ? '' : '/mo'}
              </span>
            </div>
            {subscription.subscription_tier !== 'FREE' && (
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                <FiCalendar className="w-4 h-4 mr-1" />
                Next: {formatNextBillingDate()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Usage Visualization Section */}
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Usage Overview</h4>
            <div className="flex items-center space-x-2">
              {getTrendIcon()}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {usageTrend.direction === 'stable' ? 'Stable' : 
                 `${usageTrend.direction === 'up' ? '+' : '-'}${usageTrend.percentage}%`}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Requests Used</span>
              <span 
                className="cursor-help"
                onMouseEnter={() => setShowTooltip('usage')}
                onMouseLeave={() => setShowTooltip(null)}
              >
                {subscription.monthly_usage} / {tierDetails.monthlyRequests === -1 ? 'Unlimited' : tierDetails.monthlyRequests}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getUsageColor()} transition-all duration-500 ease-out relative`}
                style={{ width: `${getUsagePercentage()}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>

            {/* Tooltip */}
            {showTooltip === 'usage' && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10">
                <div className="text-center">
                  <div className="font-semibold">{subscription.monthly_usage} requests used</div>
                  <div>{tierDetails.monthlyRequests === -1 ? 'Unlimited plan' : `${remainingRequests} remaining`}</div>
                  <div className="text-gray-300 mt-1">
                    {getUsagePercentage().toFixed(1)}% of {tierDetails.monthlyRequests === -1 ? 'soft limit' : 'monthly quota'}
                  </div>
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
              </div>
            )}
          </div>

          {/* Usage Stats */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-sm text-gray-500 dark:text-gray-400">Remaining</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {tierDetails.monthlyRequests === -1 ? '∞' : remainingRequests}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-sm text-gray-500 dark:text-gray-400">Usage %</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {getUsagePercentage().toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        {warning && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <FiInfo className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5" />
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">{warning}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {subscription.subscription_tier === 'FREE' && showUpgradeOptions && (
            <>
              <button
                onClick={() => handleUpgrade('STANDARD')}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                <FiArrowUp className="w-4 h-4 mr-2" />
                Upgrade to Standard
              </button>
              <button
                onClick={() => handleUpgrade('PREMIUM')}
                className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                <FiStar className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </button>
            </>
          )}
          
          {subscription.subscription_tier === 'STANDARD' && showUpgradeOptions && (
            <>
              <button
                onClick={() => handleUpgrade('PREMIUM')}
                className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                <FiStar className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </button>
              <button
                onClick={handleManageBilling}
                className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                <FiCreditCard className="w-4 h-4 mr-2" />
                Manage Billing
              </button>
            </>
          )}
          
          {subscription.subscription_tier === 'PREMIUM' && (
            <button
              onClick={handleManageBilling}
              className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              <FiCreditCard className="w-4 h-4 mr-2" />
              Manage Billing
            </button>
          )}

          {showUsageHistory && (
            <button
              onClick={handleViewUsageHistory}
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              <FiBarChart2 className="w-4 h-4 mr-2" />
              View Usage History
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionStatusCard; 