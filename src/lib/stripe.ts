import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Client-side Stripe instance
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

// Define subscription tier types
interface BaseTier {
  name: string;
  price: number;
  features: string[];
  stripePriceId: string | null;
}

interface LimitedTier extends BaseTier {
  monthlyRequests: number;
}

interface UnlimitedTier extends BaseTier {
  monthlyRequests: -1;
  softCap: number;
}

// Subscription tiers configuration
// PRICING CONFIGURATION: Update these values to change subscription pricing
export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'Free Plan',
    price: 0,
    monthlyRequests: 10,
    features: ['Up to 10 requests per month', 'Basic content generation', 'Email support'],
    stripePriceId: null, // No Stripe price for free tier
  } as LimitedTier,
  STANDARD: {
    name: 'Standard Plan',
    price: 14.99, // PRICING: Change this value to update Standard plan pricing
    monthlyRequests: 100,
    features: ['Up to 100 requests per month', 'All content types', 'Priority support', 'Knowledge base integration'],
    stripePriceId: process.env.STRIPE_STANDARD_PRICE_ID || '', // Set this in environment variables
  } as LimitedTier,
  PREMIUM: {
    name: 'Premium Plan',
    price: 59.99, // PRICING: Change this value to update Premium plan pricing
    monthlyRequests: -1, // -1 indicates unlimited
    softCap: 1000, // Soft cap for monitoring unlimited users
    features: ['Unlimited requests', 'All content types', 'Priority support', 'Knowledge base integration', 'Advanced analytics'],
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || '', // Set this in environment variables
  } as UnlimitedTier,
} as const;

// Request cost for internal calculations
export const REQUEST_COST = 0.062; // $0.062 per generation - used for internal cost tracking

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

// Helper function to get tier details
export function getTierDetails(tier: SubscriptionTier) {
  return SUBSCRIPTION_TIERS[tier];
}

// Helper function to check if user can make a request based on their tier and usage
export function canMakeRequest(tier: SubscriptionTier, currentUsage: number): boolean {
  const tierDetails = getTierDetails(tier);
  
  // Premium tier has unlimited requests (with soft cap for monitoring)
  if (tier === 'PREMIUM') {
    return true;
  }
  
  // For Free and Standard tiers, check against monthly limit
  return currentUsage < (tierDetails as LimitedTier).monthlyRequests;
}

// Helper function to get remaining requests for a tier
export function getRemainingRequests(tier: SubscriptionTier, currentUsage: number): number {
  const tierDetails = getTierDetails(tier);
  
  // Premium tier shows soft cap remaining for display purposes
  if (tier === 'PREMIUM') {
    return Math.max(0, (tierDetails as UnlimitedTier).softCap - currentUsage);
  }
  
  return Math.max(0, (tierDetails as LimitedTier).monthlyRequests - currentUsage);
}

// Helper function to check if user should be warned about approaching limits
export function shouldWarnAboutLimits(tier: SubscriptionTier, currentUsage: number): boolean {
  const tierDetails = getTierDetails(tier);
  
  // Premium tier warning at 80% of soft cap
  if (tier === 'PREMIUM') {
    return currentUsage >= (tierDetails as UnlimitedTier).softCap * 0.8;
  }
  
  // Other tiers warning at 80% of limit
  return currentUsage >= (tierDetails as LimitedTier).monthlyRequests * 0.8;
} 