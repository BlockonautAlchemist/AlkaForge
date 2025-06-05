import React from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

const SubscriptionDashboard: React.FC = () => {
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
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to open billing portal';
      toast.error(errorMessage);
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Subscription Status</h2>
        <p className="text-gray-600">Please log in to view your subscription status.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Subscription Status</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const getUsageColor = () => {
    if (!subscription || !tierDetails) return 'bg-gray-200';
    
    const usagePercentage = subscription.monthly_usage / (tierDetails.monthlyRequests === -1 ? 1000 : tierDetails.monthlyRequests);
    
    if (usagePercentage >= 0.9) return 'bg-red-500';
    if (usagePercentage >= 0.7) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getUsagePercentage = () => {
    if (!subscription || !tierDetails) return 0;
    
    if (tierDetails.monthlyRequests === -1) {
      // Premium tier - show percentage of soft cap (1000)
      return Math.min((subscription.monthly_usage / 1000) * 100, 100);
    }
    
    return Math.min((subscription.monthly_usage / tierDetails.monthlyRequests) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
        
        {tierDetails && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">{tierDetails.name}</h3>
              <span className="text-2xl font-bold text-blue-600">
                ${tierDetails.price}/month
              </span>
            </div>
            
            {/* Usage Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Monthly Usage</span>
                <span>
                  {subscription?.monthly_usage || 0} / {tierDetails.monthlyRequests === -1 ? 'Unlimited' : tierDetails.monthlyRequests}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageColor()}`}
                  style={{ width: `${getUsagePercentage()}%` }}
                ></div>
              </div>
              {tierDetails.monthlyRequests !== -1 && (
                <p className="text-sm text-gray-600 mt-1">
                  {remainingRequests} requests remaining this month
                </p>
              )}
            </div>

            {/* Warning Message */}
            {warning && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <p className="text-yellow-800 text-sm">{warning}</p>
              </div>
            )}

            {/* Features List */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Plan Features:</h4>
              <ul className="space-y-1">
                {tierDetails.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {subscription?.subscription_tier === 'FREE' && (
            <>
              <button
                onClick={() => handleUpgrade('STANDARD')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Upgrade to Standard ($14.99/month)
              </button>
              <button
                onClick={() => handleUpgrade('PREMIUM')}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                Upgrade to Premium ($59.99/month)
              </button>
            </>
          )}
          
          {subscription?.subscription_tier === 'STANDARD' && (
            <>
              <button
                onClick={() => handleUpgrade('PREMIUM')}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                Upgrade to Premium ($59.99/month)
              </button>
              <button
                onClick={handleManageBilling}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Manage Billing
              </button>
            </>
          )}
          
          {subscription?.subscription_tier === 'PREMIUM' && (
            <button
              onClick={handleManageBilling}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Manage Billing
            </button>
          )}
        </div>
      </div>

      {/* Pricing Comparison */}
      {subscription?.subscription_tier === 'FREE' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Compare Plans</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">Free Plan</h3>
              <p className="text-2xl font-bold mb-4">$0<span className="text-sm font-normal">/month</span></p>
              <ul className="space-y-2 text-sm">
                <li>✓ Up to 10 requests per month</li>
                <li>✓ Basic content generation</li>
                <li>✓ Email support</li>
              </ul>
              <div className="mt-4">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Current Plan</span>
              </div>
            </div>

            {/* Standard Plan */}
            <div className="border border-blue-200 rounded-lg p-4 relative">
              <h3 className="font-semibold text-lg mb-2">Standard Plan</h3>
              <p className="text-2xl font-bold mb-4">$14.99<span className="text-sm font-normal">/month</span></p>
              <ul className="space-y-2 text-sm">
                <li>✓ Up to 100 requests per month</li>
                <li>✓ All content types</li>
                <li>✓ Priority support</li>
                <li>✓ Knowledge base integration</li>
              </ul>
              <button
                onClick={() => handleUpgrade('STANDARD')}
                className="w-full mt-4 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Upgrade Now
              </button>
            </div>

            {/* Premium Plan */}
            <div className="border border-purple-200 rounded-lg p-4 relative">
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs">Most Popular</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Premium Plan</h3>
              <p className="text-2xl font-bold mb-4">$59.99<span className="text-sm font-normal">/month</span></p>
              <ul className="space-y-2 text-sm">
                <li>✓ Unlimited requests</li>
                <li>✓ All content types</li>
                <li>✓ Priority support</li>
                <li>✓ Knowledge base integration</li>
                <li>✓ Advanced analytics</li>
              </ul>
              <button
                onClick={() => handleUpgrade('PREMIUM')}
                className="w-full mt-4 bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionDashboard; 