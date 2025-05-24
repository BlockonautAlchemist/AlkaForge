import { supabase } from './supabase';
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
    user_id: userId
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