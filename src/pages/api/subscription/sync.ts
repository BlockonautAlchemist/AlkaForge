import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { getUserIdFromRequest } from '@/lib/subscriptionMiddleware';
import { getUserSubscription, updateUserSubscription } from '@/lib/subscription';

type ResponseData = {
  success?: boolean;
  error?: string;
  subscription?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if user is authenticated
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`Syncing subscription for user: ${userId}`);

    // Get current subscription from database
    const currentSubscription = await getUserSubscription(userId);
    
    // Search for this user's customer in Stripe
    const customers = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
    });

    if (customers.data.length === 0) {
      console.log(`No Stripe customer found for user: ${userId}`);
      return res.status(200).json({ 
        success: true, 
        subscription: currentSubscription 
      });
    }

    const customer = customers.data[0];
    console.log(`Found Stripe customer: ${customer.id}`);

    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
    });

    if (subscriptions.data.length === 0) {
      console.log(`No active subscriptions found for customer: ${customer.id}`);
      return res.status(200).json({ 
        success: true, 
        subscription: currentSubscription 
      });
    }

    const activeSubscription = subscriptions.data[0];
    console.log(`Found active subscription: ${activeSubscription.id}`);

    // Determine tier based on price ID
    let tier: 'FREE' | 'STANDARD' | 'PREMIUM' = 'FREE';
    if (activeSubscription.items.data.length > 0) {
      const priceId = activeSubscription.items.data[0].price.id;
      console.log(`Price ID: ${priceId}`);
      console.log(`Standard Price ID: ${process.env.STRIPE_STANDARD_PRICE_ID}`);
      console.log(`Premium Price ID: ${process.env.STRIPE_PREMIUM_PRICE_ID}`);
      
      if (priceId === process.env.STRIPE_STANDARD_PRICE_ID) {
        tier = 'STANDARD';
      } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
        tier = 'PREMIUM';
      }
    }

    console.log(`Updating subscription to tier: ${tier}`);

    // Update user subscription in database
    await updateUserSubscription(userId, {
      subscription_tier: tier,
      stripe_customer_id: customer.id,
      stripe_subscription_id: activeSubscription.id,
      current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
    });

    // Get updated subscription
    const updatedSubscription = await getUserSubscription(userId);

    return res.status(200).json({
      success: true,
      subscription: updatedSubscription
    });

  } catch (error: any) {
    console.error('Error syncing subscription:', error);
    return res.status(500).json({ 
      error: 'Failed to sync subscription status' 
    });
  }
} 