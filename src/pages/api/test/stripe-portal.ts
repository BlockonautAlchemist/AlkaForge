import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';

type ResponseData = {
  success?: boolean;
  error?: string;
  details?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test 1: Check if Stripe is properly configured
    console.log('Testing Stripe configuration...');
    
    // Test 2: Try to list customers (this will fail if API key is invalid)
    const customers = await stripe.customers.list({ limit: 1 });
    console.log('✅ Stripe API connection successful');

    // Test 3: Check if billing portal is enabled
    try {
      // Try to create a portal session with a test customer
      // This will fail if billing portal is not enabled
      const testCustomer = await stripe.customers.create({
        email: 'test@example.com',
        metadata: { test: 'true' }
      });

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: testCustomer.id,
        return_url: 'https://example.com',
      });

      // Clean up test customer
      await stripe.customers.del(testCustomer.id);

      console.log('✅ Billing portal is properly configured');
      
      return res.status(200).json({
        success: true,
        details: {
          stripeConnected: true,
          billingPortalEnabled: true,
          message: 'Stripe billing portal is properly configured'
        }
      });

    } catch (portalError: any) {
      console.error('❌ Billing portal error:', portalError.message);
      
      if (portalError.message.includes('billing portal')) {
        return res.status(500).json({
          error: 'Billing portal is not enabled in your Stripe account',
          details: {
            stripeConnected: true,
            billingPortalEnabled: false,
            message: 'Please enable the billing portal in your Stripe dashboard: Settings > Billing > Customer portal'
          }
        });
      }
      
      throw portalError;
    }

  } catch (error: any) {
    console.error('❌ Stripe configuration error:', error);
    
    return res.status(500).json({
      error: 'Stripe configuration error',
      details: {
        stripeConnected: false,
        message: error.message || 'Unknown error'
      }
    });
  }
} 