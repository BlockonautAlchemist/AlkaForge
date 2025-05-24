import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe, SUBSCRIPTION_TIERS } from '@/lib/stripe';
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

    const { tier } = req.body;

    // Validate tier
    if (!tier || !['STANDARD', 'PREMIUM'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    const tierDetails = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];
    
    if (!tierDetails.stripePriceId) {
      return res.status(400).json({ error: 'Invalid subscription tier configuration' });
    }

    // Get or create customer
    const subscription = await getUserSubscription(userId);
    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Create new customer
      const customer = await stripe.customers.create({
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: tierDetails.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/dashboard`,
      metadata: {
        userId: userId,
        tier: tier,
      },
    });

    return res.status(200).json({ url: session.url || undefined });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
} 