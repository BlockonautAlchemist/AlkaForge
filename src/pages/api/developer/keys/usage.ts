import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdFromRequest } from '@/lib/subscriptionMiddleware';
import { getApiKeyUsage } from '@/lib/apiKeys';

type UsageResponse = {
  usage?: {
    monthlyUsage: number;
    lastUsed?: string;
  };
  error?: string;
  error_code?: string;
};

/**
 * Get usage statistics for a specific API key
 * 
 * GET /api/developer/keys/usage?keyId=<uuid>
 * Authentication: Bearer token (user session)
 * Tier Requirement: PREMIUM only (user can only view their own key usage)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UsageResponse>
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
        error: 'Authentication required. Please log in to view API key usage.',
        error_code: 'AUTHENTICATION_REQUIRED'
      });
    }

    // Get keyId from query parameters
    const { keyId } = req.query;

    if (!keyId || typeof keyId !== 'string') {
      return res.status(400).json({ 
        error: 'Key ID is required as a query parameter.',
        error_code: 'MISSING_KEY_ID'
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(keyId)) {
      return res.status(400).json({ 
        error: 'Key ID must be a valid UUID format.',
        error_code: 'INVALID_KEY_ID_FORMAT'
      });
    }

    // Get usage statistics
    const usage = await getApiKeyUsage(userId, keyId);

    if (!usage) {
      return res.status(404).json({ 
        error: 'API key not found or you do not have permission to view its usage.',
        error_code: 'KEY_NOT_FOUND'
      });
    }

    return res.status(200).json({
      usage: {
        monthlyUsage: usage.monthlyUsage,
        lastUsed: usage.lastUsed,
      }
    });

  } catch (error) {
    console.error('Error getting API key usage:', error);
    
    return res.status(500).json({ 
      error: 'Internal server error. Please contact support if this persists.',
      error_code: 'INTERNAL_SERVER_ERROR'
    });
  }
}