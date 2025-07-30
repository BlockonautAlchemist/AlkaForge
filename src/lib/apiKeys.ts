import { NextApiRequest } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';
import { getUserSubscription } from './subscription';

// Create server-side Supabase client
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

export interface ApiKey {
  id: string;
  user_id: string;
  key_name: string;
  api_key_hash: string;
  api_key_prefix: string;
  monthly_usage: number;
  usage_reset_date: string;
  last_used_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyUsageInfo {
  user_id: string;
  subscription_tier: string;
  monthly_usage: number;
  api_key_id: string;
}

/**
 * Generate a new API key with secure random bytes
 * Returns: { apiKey: string, hashedKey: string, prefix: string }
 */
export function generateApiKey(): { apiKey: string; hashedKey: string; prefix: string } {
  // Generate 32 random bytes and convert to hex
  const keyBytes = randomBytes(32);
  const apiKey = `ak_${keyBytes.toString('hex')}`;
  
  // Create SHA-256 hash of the full key for storage
  const hashedKey = createHash('sha256').update(apiKey).digest('hex');
  
  // Store first 8 characters for identification
  const prefix = apiKey.substring(0, 11); // 'ak_' + 8 chars
  
  return { apiKey, hashedKey, prefix };
}

/**
 * Hash an API key for lookup
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Create a new API key for a user (Premium tier only)
 */
export async function createApiKey(userId: string, keyName: string): Promise<{ apiKey: string; keyData: ApiKey }> {
  // Verify user has Premium subscription
  const subscription = await getUserSubscription(userId);
  if (!subscription || subscription.subscription_tier !== 'PREMIUM') {
    throw new Error('API keys are only available for Premium tier subscribers');
  }

  // Check if user already has 5 keys (limit)
  const { count } = await supabaseAdmin
    .from('api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  if (count && count >= 5) {
    throw new Error('Maximum of 5 active API keys allowed per user');
  }

  // Generate new API key
  const { apiKey, hashedKey, prefix } = generateApiKey();

  // Insert into database
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .insert({
      user_id: userId,
      key_name: keyName,
      api_key_hash: hashedKey,
      api_key_prefix: prefix,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating API key:', error);
    throw new Error('Failed to create API key');
  }

  return { apiKey, keyData: data };
}

/**
 * Authenticate API key and return user info
 */
export async function authenticateApiKey(apiKey: string): Promise<ApiKeyUsageInfo | null> {
  if (!apiKey || !apiKey.startsWith('ak_')) {
    return null;
  }

  const hashedKey = hashApiKey(apiKey);

  // Look up API key in database
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select(`
      id,
      user_id,
      monthly_usage,
      is_active,
      usage_reset_date
    `)
    .eq('api_key_hash', hashedKey)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if usage needs reset
  const now = new Date();
  const resetDate = new Date(data.usage_reset_date);
  
  if (now >= resetDate) {
    // Reset usage for this API key
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await supabaseAdmin
      .from('api_keys')
      .update({
        monthly_usage: 0,
        usage_reset_date: nextMonth.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', data.id);
    
    data.monthly_usage = 0;
  }

  // Get user's subscription info
  const subscription = await getUserSubscription(data.user_id);
  if (!subscription || subscription.subscription_tier !== 'PREMIUM') {
    return null; // API keys only work for Premium users
  }

  return {
    user_id: data.user_id,
    subscription_tier: subscription.subscription_tier,
    monthly_usage: data.monthly_usage,
    api_key_id: data.id,
  };
}

/**
 * Get API key info from request headers
 */
export async function getApiKeyFromRequest(req: NextApiRequest): Promise<ApiKeyUsageInfo | null> {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return null;
  }

  return await authenticateApiKey(apiKey);
}

/**
 * Increment API key usage
 */
export async function incrementApiKeyUsage(apiKeyHash: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc('increment_api_key_usage', {
    target_api_key_hash: apiKeyHash
  });

  if (error) {
    console.error('Error incrementing API key usage:', error);
    throw new Error('Failed to update API key usage');
  }
}

/**
 * List user's API keys (without sensitive data)
 */
export async function listUserApiKeys(userId: string): Promise<Omit<ApiKey, 'api_key_hash'>[]> {
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select(`
      id,
      user_id,
      key_name,
      api_key_prefix,
      monthly_usage,
      usage_reset_date,
      last_used_at,
      is_active,
      created_at,
      updated_at
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing API keys:', error);
    throw new Error('Failed to list API keys');
  }

  return data || [];
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('api_keys')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error revoking API key:', error);
    throw new Error('Failed to revoke API key');
  }
}

/**
 * Check if API key usage is within limits (for Premium tier, this is mainly for monitoring)
 */
export function canMakeApiRequest(monthlyUsage: number): boolean {
  // Premium tier has unlimited usage, but we monitor for abuse
  // Set a very high soft limit for monitoring purposes
  const PREMIUM_SOFT_LIMIT = 10000; // 10k requests per month
  
  return monthlyUsage < PREMIUM_SOFT_LIMIT;
}

/**
 * Get usage statistics for an API key
 */
export async function getApiKeyUsage(userId: string, keyId: string): Promise<{ monthlyUsage: number; lastUsed?: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('monthly_usage, last_used_at')
    .eq('id', keyId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    monthlyUsage: data.monthly_usage,
    lastUsed: data.last_used_at,
  };
}