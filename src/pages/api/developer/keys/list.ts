import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdFromRequest } from '@/lib/subscriptionMiddleware';
import { listUserApiKeys } from '@/lib/apiKeys';

type ListKeysResponse = {
  apiKeys?: Array<{
    id: string;
    key_name: string;
    api_key_prefix: string;
    monthly_usage: number;
    usage_reset_date: string;
    last_used_at?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>;
  error?: string;
  error_code?: string;
};

/**
 * List user's API keys (without sensitive data)
 * 
 * GET /api/developer/keys/list
 * Authentication: Bearer token (user session)
 * Tier Requirement: PREMIUM only (checked by listUserApiKeys)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListKeysResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      error_code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Check if user is authenticated
    const userId = await getUserIdFromRequest(req);
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required. Please log in to view API keys.',
        error_code: 'AUTHENTICATION_REQUIRED'
      });
    }

    // Get user's API keys
    const apiKeys = await listUserApiKeys(userId);

    return res.status(200).json({
      apiKeys: apiKeys.map(key => ({
        id: key.id,
        key_name: key.key_name,
        api_key_prefix: key.api_key_prefix,
        monthly_usage: key.monthly_usage,
        usage_reset_date: key.usage_reset_date,
        last_used_at: key.last_used_at || undefined,
        is_active: key.is_active,
        created_at: key.created_at,
        updated_at: key.updated_at,
      }))
    });

  } catch (error) {
    console.error('Error listing API keys:', error);
    
    if (error instanceof Error && error.message.includes('Failed to list')) {
      return res.status(500).json({ 
        error: 'Failed to retrieve API keys. Please try again or contact support.',
        error_code: 'RETRIEVAL_FAILED'
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error. Please contact support if this persists.',
      error_code: 'INTERNAL_SERVER_ERROR'
    });
  }
}