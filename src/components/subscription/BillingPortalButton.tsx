import React from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import toast from 'react-hot-toast';

interface BillingPortalButtonProps {
  className?: string;
  children?: React.ReactNode;
}

const BillingPortalButton: React.FC<BillingPortalButtonProps> = ({ 
  className = '', 
  children = 'Manage Billing' 
}) => {
  const { subscription, createCustomerPortalSession } = useSubscription();

  const handleClick = async () => {
    // Check if user has a paid subscription
    if (!subscription || subscription.subscription_tier === 'FREE') {
      toast.error('Please upgrade to a paid plan to access billing management.');
      return;
    }

    // Check if user has Stripe customer ID (has made at least one payment)
    if (!subscription.stripe_customer_id) {
      toast.error('No billing information found. Please complete your first payment to access billing management.');
      return;
    }

    try {
      const url = await createCustomerPortalSession();
      window.location.href = url;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to open billing portal';
      toast.error(errorMessage);
    }
  };

  // Show different button states based on subscription
  const getButtonText = () => {
    if (!subscription || subscription.subscription_tier === 'FREE') {
      return 'Upgrade to Manage Billing';
    }
    return children;
  };

  const getButtonStyle = () => {
    if (!subscription || subscription.subscription_tier === 'FREE') {
      return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
    return 'bg-gray-600 hover:bg-gray-700 text-white';
  };

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 rounded-md transition-colors duration-200 ${getButtonStyle()} ${className}`}
    >
      {getButtonText()}
    </button>
  );
};

export default BillingPortalButton; 