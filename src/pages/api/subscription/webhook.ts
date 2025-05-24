import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { updateUserSubscription } from '@/lib/subscription';
import { buffer } from 'micro';

// Disable body parsing for webhook
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event;

  try {
    const body = await buffer(req);
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckoutCompleted(session: any) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier;
  
  if (!userId || !tier) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Get the subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  
  await updateUserSubscription(userId, {
    subscription_tier: tier,
    stripe_customer_id: session.customer,
    stripe_subscription_id: session.subscription,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  });
}

async function handleSubscriptionUpdated(subscription: any) {
  // Find user by customer ID
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userId = (customer as any).metadata?.userId;
  
  if (!userId) {
    console.error('No userId found in customer metadata');
    return;
  }

  // Determine tier based on price ID
  let tier: 'FREE' | 'STANDARD' | 'PREMIUM' = 'FREE';
  if (subscription.items.data.length > 0) {
    const priceId = subscription.items.data[0].price.id;
    if (priceId === process.env.STRIPE_STANDARD_PRICE_ID) {
      tier = 'STANDARD';
    } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
      tier = 'PREMIUM';
    }
  }

  await updateUserSubscription(userId, {
    subscription_tier: tier,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  });
}

async function handleSubscriptionDeleted(subscription: any) {
  // Find user by customer ID
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userId = (customer as any).metadata?.userId;
  
  if (!userId) {
    console.error('No userId found in customer metadata');
    return;
  }

  // Downgrade to free tier
  await updateUserSubscription(userId, {
    subscription_tier: 'FREE',
    stripe_subscription_id: undefined,
    current_period_start: undefined,
    current_period_end: undefined,
  });
}

async function handlePaymentSucceeded(invoice: any) {
  // Payment succeeded - subscription is active
  console.log(`Payment succeeded for subscription: ${invoice.subscription}`);
}

async function handlePaymentFailed(invoice: any) {
  // Payment failed - you might want to notify the user
  console.log(`Payment failed for subscription: ${invoice.subscription}`);
} 