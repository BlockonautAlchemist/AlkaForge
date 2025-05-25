// Use the public supabase client on the client-side, but when this code runs
// in a server context (e.g. inside Next.js API routes) we should leverage the
// service-role key so that our database operations have the required
// privileges and are not blocked by RLS policies.  Importing the public client
// here would embed the service role key into the client bundle, so we create a
// new admin client *only* on the server.

// @ts-ignore - Path alias resolution handled by TS config
import { supabase as supabasePublic } from './supabase';
// @ts-ignore - Ignoring missing type declarations for @supabase/supabase-js
import { createClient } from '@supabase/supabase-js';

// Determine which supabase client to use.  If we are executing on the server
// (window is undefined) *and* a service-role key is available, create an admin
// client.  Otherwise fall back to the public client.
// @ts-ignore - `window` is only defined in browser context
const isServer = typeof window === 'undefined';

// @ts-ignore - process.env provided by Node.js during build/runtime
export const supabase = isServer && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      // @ts-ignore - Server-side env vars
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      // @ts-ignore - Server-side env vars
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : supabasePublic;

// ---------------------------------------------------------------------------

import { SubscriptionTier } from './stripe';

// User subscription data interface
export interface UserSubscription {
  user_id: string;
  subscription_tier: SubscriptionTier;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  monthly_usage: number;
  usage_reset_date: string;
  created_at: string;
  updated_at: string;
}

// USAGE TRACKING: This function increments the user's monthly usage count
// Called after each successful generation request
export async function incrementUserUsage(userId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_user_usage', {
    target_user_id: userId
  });

  if (error) {
    console.error('Error incrementing user usage:', error);
    throw new Error('Failed to update usage count');
  }
}

// Get user's current subscription and usage data
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No subscription found, create default free subscription
      return await createDefaultSubscription(userId);
    }
    console.error('Error fetching user subscription:', error);
    throw new Error('Failed to fetch subscription data');
  }

  return data;
}

// Create default free subscription for new users
async function createDefaultSubscription(userId: string): Promise<UserSubscription> {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  const defaultSubscription = {
    user_id: userId,
    subscription_tier: 'FREE' as SubscriptionTier,
    monthly_usage: 0,
    usage_reset_date: nextMonth.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert(defaultSubscription)
    .select()
    .single();

  if (error) {
    console.error('Error creating default subscription:', error);
    throw new Error('Failed to create subscription');
  }

  return data;
}

// Update user's subscription tier (called from Stripe webhook)
export async function updateUserSubscription(
  userId: string,
  subscriptionData: Partial<UserSubscription>
): Promise<void> {
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      ...subscriptionData,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating user subscription:', error);
    throw new Error('Failed to update subscription');
  }
}

// Reset monthly usage for all users (called by cron job on 1st of each month)
export async function resetMonthlyUsage(): Promise<void> {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      monthly_usage: 0,
      usage_reset_date: nextMonth.toISOString(),
      updated_at: now.toISOString(),
    })
    .lte('usage_reset_date', now.toISOString());

  if (error) {
    console.error('Error resetting monthly usage:', error);
    throw new Error('Failed to reset monthly usage');
  }
}

// Check if user needs usage reset (for individual user checks)
export async function checkAndResetUserUsage(userId: string): Promise<void> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return;

  const now = new Date();
  const resetDate = new Date(subscription.usage_reset_date);

  // If reset date has passed, reset usage
  if (now >= resetDate) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    await updateUserSubscription(userId, {
      monthly_usage: 0,
      usage_reset_date: nextMonth.toISOString(),
    });
  }
}

// Log premium user exceeding soft cap (for internal monitoring)
export async function logPremiumUsageExceeded(userId: string, currentUsage: number): Promise<void> {
  console.warn(`Premium user ${userId} exceeded soft cap with ${currentUsage} requests`);
  
  // You can extend this to log to a monitoring service or database table
  // For now, we'll just console.warn for internal monitoring
  
  // Optional: Insert into a monitoring table
  const { error } = await supabase
    .from('usage_monitoring')
    .insert({
      user_id: userId,
      usage_count: currentUsage,
      event_type: 'premium_soft_cap_exceeded',
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error logging premium usage exceeded:', error);
  }
} 