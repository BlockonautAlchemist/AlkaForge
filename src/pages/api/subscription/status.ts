import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdFromRequest } from '@/lib/subscriptionMiddleware';
import { getUserSubscription, checkAndResetUserUsage } from '@/lib/subscription';
import { SUBSCRIPTION_TIERS, getRemainingRequests, shouldWarnAboutLimits } from '@/lib/stripe';

type ResponseData = {
  subscription?: any;
  tier_details?: any;
  remaining_requests?: number;
  warning?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if user is authenticated
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user needs usage reset
    await checkAndResetUserUsage(userId);

    // Get user's subscription
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const { subscription_tier, monthly_usage } = subscription;
    const tierDetails = SUBSCRIPTION_TIERS[subscription_tier];
    const remainingRequests = getRemainingRequests(subscription_tier, monthly_usage);
    
    // Check if user should be warned about limits
    let warning: string | undefined;
    if (shouldWarnAboutLimits(subscription_tier, monthly_usage)) {
      if (subscription_tier === 'PREMIUM') {
        warning = `You've used ${monthly_usage} requests this month. This is above our typical usage patterns.`;
      } else {
        warning = `You have ${remainingRequests} requests remaining this month. Consider upgrading for more requests.`;
      }
    }

    return res.status(200).json({
      subscription,
      tier_details: tierDetails,
      remaining_requests: remainingRequests,
      warning,
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
} 