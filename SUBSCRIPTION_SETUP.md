# AlkaForge Subscription System Setup Guide

This guide will help you set up the Stripe-based subscription system for AlkaForge.

## Overview

The subscription system includes:
- **Free Plan**: 10 requests/month, requires login
- **Standard Plan**: 100 requests/month, $14.99/month
- **Premium Plan**: Unlimited requests, $59.99/month (with 1000 soft cap for monitoring)

## Prerequisites

1. Stripe account
2. Supabase project
3. OpenRouter API key

## 1. Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Stripe Price IDs (create these in your Stripe dashboard)
STRIPE_STANDARD_PRICE_ID=price_your_standard_plan_price_id
STRIPE_PREMIUM_PRICE_ID=price_your_premium_plan_price_id
```

## 2. Database Setup

Run the SQL script in `database_schema.sql` in your Supabase SQL editor to create the necessary tables and functions.

## 3. Stripe Setup

### Create Products and Prices

1. Go to your Stripe Dashboard
2. Navigate to Products
3. Create two products:

**Standard Plan**
- Name: "AlkaForge Standard Plan"
- Price: $14.99/month (recurring)
- Copy the Price ID to `STRIPE_STANDARD_PRICE_ID`

**Premium Plan**
- Name: "AlkaForge Premium Plan"
- Price: $59.99/month (recurring)
- Copy the Price ID to `STRIPE_PREMIUM_PRICE_ID`

### Configure Webhooks

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/api/subscription/webhook`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

### Enable Customer Portal

1. Go to Stripe Dashboard > Settings > Billing > Customer portal
2. Enable the customer portal
3. Configure the settings as needed

## 4. Code Integration

### Limit Enforcement Points

The subscription limits are enforced in these locations:

1. **API Route Middleware** (`src/lib/subscriptionMiddleware.ts`):
   - `withSubscriptionCheck()` wrapper function
   - Applied to `/api/generate` route

2. **Frontend Warnings** (`src/components/subscription/UsageWarning.tsx`):
   - Shows usage warnings when approaching limits
   - Displays upgrade prompts

3. **Usage Tracking** (`src/lib/subscription.ts`):
   - `incrementUserUsage()` called after successful generation
   - `checkAndResetUserUsage()` resets usage monthly

### Changing Pricing

To update subscription pricing:

1. **Update Stripe Prices**: Create new prices in Stripe Dashboard
2. **Update Environment Variables**: Update the price IDs in `.env.local`
3. **Update Code Constants**: Modify prices in `src/lib/stripe.ts`:
   ```typescript
   STANDARD: {
     price: 14.99, // PRICING: Change this value
     // ...
   },
   PREMIUM: {
     price: 59.99, // PRICING: Change this value
     // ...
   }
   ```

### Changing Tier Limits

To modify request limits:

1. **Update Stripe Configuration** (`src/lib/stripe.ts`):
   ```typescript
   FREE: {
     monthlyRequests: 10, // Change this
     // ...
   },
   STANDARD: {
     monthlyRequests: 100, // Change this
     // ...
   },
   PREMIUM: {
     softCap: 1000, // Change this for monitoring
     // ...
   }
   ```

## 5. Testing

### Test the Flow

1. **Free User**: Create account, try to generate 11+ requests
2. **Upgrade Flow**: Click upgrade buttons, complete Stripe checkout
3. **Billing Management**: Access customer portal from dashboard
4. **Usage Reset**: Test monthly usage reset (or manually trigger)

### Test Webhooks

Use Stripe CLI to test webhooks locally:
```bash
stripe listen --forward-to localhost:3000/api/subscription/webhook
```

## 6. Deployment

### Environment Variables

Set all environment variables in your deployment platform (Vercel, Netlify, etc.)

### Webhook URL

Update your Stripe webhook endpoint URL to your production domain.

### Database Migration

Run the database schema script in your production Supabase instance.

## 7. Monitoring

### Usage Analytics

Query the `subscription_analytics` view in Supabase for insights:
```sql
SELECT * FROM subscription_analytics;
```

### Premium User Monitoring

Check the `usage_monitoring` table for premium users exceeding soft caps:
```sql
SELECT * FROM usage_monitoring WHERE event_type = 'premium_soft_cap_exceeded';
```

## 8. Monthly Usage Reset

Set up a cron job to reset monthly usage on the 1st of each month:

### Option 1: Supabase Cron (if available)
```sql
SELECT cron.schedule('reset-monthly-usage', '0 0 1 * *', 'SELECT reset_monthly_usage();');
```

### Option 2: External Cron Job
Create an API endpoint and call it monthly:
```bash
curl -X POST https://yourdomain.com/api/admin/reset-usage
```

## 9. Security Considerations

1. **Webhook Verification**: Always verify Stripe webhook signatures
2. **Rate Limiting**: Consider adding rate limiting to prevent abuse
3. **User Authentication**: Ensure all subscription endpoints require authentication
4. **Environment Variables**: Never commit secrets to version control

## 10. Support and Billing

### Customer Support

- Users can manage billing through Stripe Customer Portal
- Usage information is available in the subscription dashboard
- Contact support for billing issues

### Refunds and Cancellations

Handle through Stripe Dashboard or implement custom logic as needed.

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**: Check endpoint URL and selected events
2. **Price ID not found**: Verify price IDs in Stripe Dashboard
3. **Usage not incrementing**: Check database permissions and RLS policies
4. **Authentication errors**: Verify Supabase configuration

### Debug Mode

Enable debug logging by adding console.log statements in:
- `src/lib/subscriptionMiddleware.ts`
- `src/pages/api/subscription/webhook.ts`
- `src/lib/subscription.ts`

## Request Cost Tracking

The system tracks an internal cost of $0.062 per generation for analytics purposes. This is defined in `src/lib/stripe.ts` as `REQUEST_COST` and can be used for:

- Internal cost analysis
- Profit margin calculations
- Usage-based billing (if needed in the future)

---

For additional support, refer to the Stripe documentation and Supabase guides. 