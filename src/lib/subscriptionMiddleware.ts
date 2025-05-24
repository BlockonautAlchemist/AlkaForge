import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { canMakeRequest, shouldWarnAboutLimits, SUBSCRIPTION_TIERS } from './stripe';
import { getUserSubscription, checkAndResetUserUsage, logPremiumUsageExceeded } from './subscription';

// Create server-side Supabase client with service role key for auth validation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// SUBSCRIPTION MIDDLEWARE: This middleware enforces request limits based on user's subscription tier
// Add this to any API route that performs content generation
export async function checkSubscriptionLimits(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
): Promise<{ canProceed: boolean; subscription?: any; warning?: string }> {
  try {
    // Check if user needs usage reset first
    await checkAndResetUserUsage(userId);
    
    // Get user's current subscription and usage
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) {
      return {
        canProceed: false,
      };
    }

    const { subscription_tier, monthly_usage } = subscription;
    
    // LIMIT ENFORCEMENT: Check if user can make another request
    const canProceed = canMakeRequest(subscription_tier, monthly_usage);
    
    if (!canProceed) {
      // User has exceeded their limit
      const tierDetails = SUBSCRIPTION_TIERS[subscription_tier];
      
      return {
        canProceed: false,
        subscription,
        warning: `You've reached your monthly limit of ${tierDetails.monthlyRequests} requests. Please upgrade your plan or wait until next month.`
      };
    }

    // Check if user should be warned about approaching limits
    let warning: string | undefined;
    if (shouldWarnAboutLimits(subscription_tier, monthly_usage)) {
      const tierDetails = SUBSCRIPTION_TIERS[subscription_tier];
      
      if (subscription_tier === 'PREMIUM') {
        // For premium users, this is just a soft warning
        warning = `You've used ${monthly_usage} requests this month. This is above our typical usage patterns.`;
        
        // Log for internal monitoring if they exceed soft cap
        const premiumTier = tierDetails as typeof SUBSCRIPTION_TIERS.PREMIUM;
        if (monthly_usage >= premiumTier.softCap) {
          await logPremiumUsageExceeded(userId, monthly_usage);
        }
      } else {
        const limitedTier = tierDetails as typeof SUBSCRIPTION_TIERS.FREE | typeof SUBSCRIPTION_TIERS.STANDARD;
        const remaining = limitedTier.monthlyRequests - monthly_usage;
        warning = `You have ${remaining} requests remaining this month. Consider upgrading for more requests.`;
      }
    }

    return {
      canProceed: true,
      subscription,
      warning
    };

  } catch (error) {
    console.error('Error checking subscription limits:', error);
    
    // In case of error, allow the request but log the issue
    // This prevents subscription system issues from blocking all users
    return {
      canProceed: true,
      warning: 'Unable to verify subscription status. Please contact support if this persists.'
    };
  }
}

// Helper function to get user ID from request
// This assumes you have authentication middleware that sets the user
export async function getUserIdFromRequest(req: NextApiRequest): Promise<string | null> {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Verify the token with Supabase using service role key
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      console.error('Auth validation error:', error);
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Error getting user from request:', error);
    return null;
  }
}

// Wrapper function to easily add subscription checking to API routes
export function withSubscriptionCheck(
  handler: (req: NextApiRequest, res: NextApiResponse, userId: string, subscription: any) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Check if user is authenticated
    const userId = await getUserIdFromRequest(req);
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required. Please log in to use this feature.' 
      });
    }

    // Check subscription limits
    const { canProceed, subscription, warning } = await checkSubscriptionLimits(req, res, userId);
    
    if (!canProceed) {
      return res.status(403).json({ 
        error: warning || 'Subscription limit exceeded',
        subscription_tier: subscription?.subscription_tier,
        monthly_usage: subscription?.monthly_usage,
        upgrade_required: true
      });
    }

    // Add warning to response headers if present
    if (warning) {
      res.setHeader('X-Usage-Warning', warning);
    }

    // Proceed with the original handler
    await handler(req, res, userId, subscription);
  };
} 