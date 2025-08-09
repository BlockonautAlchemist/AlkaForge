import React from 'react';
// @ts-ignore - Ignoring type issues with React imports
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { supabase } from '@/lib/supabase';

interface SubscriptionData {
  subscription_tier: 'FREE' | 'STANDARD' | 'PREMIUM';
  monthly_usage: number;
  usage_reset_date: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

interface TierDetails {
  name: string;
  price: number;
  monthlyRequests: number;
  features: string[];
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  tierDetails: TierDetails | null;
  remainingRequests: number;
  warning: string | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  syncSubscription: () => Promise<void>;
  createCheckoutSession: (tier: 'STANDARD' | 'PREMIUM') => Promise<string>;
  createCustomerPortalSession: () => Promise<string>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [tierDetails, setTierDetails] = useState<TierDetails | null>(null);
  const [remainingRequests, setRemainingRequests] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to get auth headers for API calls
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
    return {
      'Authorization': `Bearer ${session.access_token}`
    };
  };

  const refreshSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setTierDetails(null);
      setRemainingRequests(0);
      setWarning(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await axios.get('/api/subscription/status', { headers });

      setSubscription(response.data.subscription);
      setTierDetails(response.data.tier_details);
      setRemainingRequests(response.data.remaining_requests || 0);
      setWarning(response.data.warning || null);
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        throw error;
      }
      console.error('Error fetching subscription:', error);
      // Set default free tier on error
      setSubscription({
        subscription_tier: 'FREE',
        monthly_usage: 0,
        usage_reset_date: new Date().toISOString(),
      });
      setTierDetails({
        name: 'Free Plan',
        price: 0,
        monthlyRequests: 10,
        features: ['Up to 10 requests per month', 'Basic content generation', 'Email support'],
      });
      setRemainingRequests(10);
      setWarning(null);
    } finally {
      setLoading(false);
    }
  };

  const createCheckoutSession = async (tier: 'STANDARD' | 'PREMIUM'): Promise<string> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post('/api/subscription/create-checkout', { tier }, { headers });
      return response.data.url;
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        throw error;
      }
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  };

  const syncSubscription = async (): Promise<void> => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await axios.post('/api/subscription/sync', {}, { headers });

      if (response.data.success) {
        // Refresh subscription data after sync
        await refreshSubscription();
      }
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        throw error;
      }
      console.error('Error syncing subscription:', error);
      throw new Error('Failed to sync subscription status');
    } finally {
      setLoading(false);
    }
  };

  const createCustomerPortalSession = async (): Promise<string> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post('/api/subscription/customer-portal', {}, { headers });
      return response.data.url;
    } catch (error: any) {
      if (error.message === 'Authentication required') {
        throw error;
      }
      console.error('Error creating customer portal session:', error);

      // Extract error message from API response
      const errorMessage = error.response?.data?.error || 'Failed to create customer portal session';
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    refreshSubscription().catch((err) => {
      if (err.message === 'Authentication required') {
        console.warn('Authentication required to refresh subscription');
      }
    });
  }, [user]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        tierDetails,
        remainingRequests,
        warning,
        loading,
        refreshSubscription,
        syncSubscription,
        createCheckoutSession,
        createCustomerPortalSession,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
} 