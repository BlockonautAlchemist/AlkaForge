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
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's subscription to find customer ID
    const subscription = await getUserSubscription(userId);
    
    if (!subscription?.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${req.headers.origin}/dashboard`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return res.status(500).json({ error: 'Failed to create customer portal session' });
  }
} 