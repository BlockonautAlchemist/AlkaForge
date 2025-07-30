import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const envCheck = {
    hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
    openRouterKeyLength: process.env.OPENROUTER_API_KEY?.length || 0,
    openRouterKeyPrefix: process.env.OPENROUTER_API_KEY?.substring(0, 10) || 'NOT_SET',
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  };

  res.status(200).json(envCheck);
} 