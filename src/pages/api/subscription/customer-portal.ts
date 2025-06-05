import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { getUserIdFromRequest } from '@/lib/subscriptionMiddleware';
import { getUserSubscription } from '@/lib/subscription';

type ResponseData = {
  url?: string;
  error?: string;
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
      console.error('Customer portal access denied - no user ID found');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`Creating customer portal session for user: ${userId}`);

    // Get user's subscription to find customer ID
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) {
      console.error(`No subscription record found for user: ${userId}`);
      return res.status(400).json({ 
        error: 'No subscription found. Please upgrade to a paid plan first.' 
      });
    }

    if (!subscription.stripe_customer_id) {
      console.error(`No Stripe customer ID found for user: ${userId}, subscription tier: ${subscription.subscription_tier}`);
      return res.status(400).json({ 
        error: 'No billing information found. Please upgrade to a paid plan to access billing management.' 
      });
    }

    console.log(`Creating portal session for Stripe customer: ${subscription.stripe_customer_id}`);

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${req.headers.origin}/dashboard`,
    });

    console.log(`Successfully created portal session: ${session.id}`);
    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating customer portal session:', error);
    
    // Provide more specific error messages based on the error type
    if (error.type === 'StripeInvalidRequestError') {
      if (error.message.includes('customer')) {
        return res.status(400).json({ 
          error: 'Invalid customer information. Please contact support.' 
        });
      }
      if (error.message.includes('billing portal')) {
        return res.status(500).json({ 
          error: 'Billing portal is not properly configured. Please contact support.' 
        });
      }
    }
    
    return res.status(500).json({ 
      error: 'Unable to access billing portal. Please try again or contact support.' 
    });
  }
} 