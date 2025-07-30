import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdFromRequest } from '@/lib/subscriptionMiddleware';
import { revokeApiKey } from '@/lib/apiKeys';

type RevokeKeyRequest = {
  keyId: string;
};

type RevokeKeyResponse = {
  success?: boolean;
  error?: string;
  error_code?: string;
};

/**
 * Revoke an API key
 * 
 * POST /api/developer/keys/revoke
 * Authentication: Bearer token (user session)
 * Tier Requirement: PREMIUM only (user can only revoke their own keys)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RevokeKeyResponse>
) {
  if (req.method !== 'POST') {
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
        error: 'Authentication required. Please log in to revoke API keys.',
        error_code: 'AUTHENTICATION_REQUIRED'
      });
    }

    // Validate request body
    const { keyId } = req.body as RevokeKeyRequest;

    if (!keyId || typeof keyId !== 'string' || keyId.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Key ID is required and must be a valid UUID.',
        error_code: 'INVALID_KEY_ID'
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(keyId.trim())) {
      return res.status(400).json({ 
        error: 'Key ID must be a valid UUID format.',
        error_code: 'INVALID_KEY_ID_FORMAT'
      });
    }

    // Revoke the API key
    await revokeApiKey(userId, keyId.trim());

    return res.status(200).json({
      success: true
    });

  } catch (error) {
    console.error('Error revoking API key:', error);
    
    if (error instanceof Error && error.message.includes('Failed to revoke')) {
      return res.status(500).json({ 
        error: 'Failed to revoke API key. Please try again or contact support.',
        error_code: 'REVOCATION_FAILED'
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error. Please contact support if this persists.',
      error_code: 'INTERNAL_SERVER_ERROR'
    });
  }
}