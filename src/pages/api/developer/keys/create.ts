import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdFromRequest } from '@/lib/subscriptionMiddleware';
import { createApiKey } from '@/lib/apiKeys';

type CreateKeyRequest = {
  keyName: string;
};

type CreateKeyResponse = {
  apiKey?: string;
  keyData?: {
    id: string;
    key_name: string;
    api_key_prefix: string;
    created_at: string;
  };
  error?: string;
  error_code?: string;
};

/**
 * Create a new API key for Premium users
 * 
 * POST /api/developer/keys/create
 * Authentication: Bearer token (user session)
 * Tier Requirement: PREMIUM only
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateKeyResponse>
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
        error: 'Authentication required. Please log in to create API keys.',
        error_code: 'AUTHENTICATION_REQUIRED'
      });
    }

    // Validate request body
    const { keyName } = req.body as CreateKeyRequest;

    if (!keyName || typeof keyName !== 'string' || keyName.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Key name is required and must be a non-empty string.',
        error_code: 'INVALID_KEY_NAME'
      });
    }

    // Validate key name format (alphanumeric, spaces, hyphens, underscores only)
    const keyNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!keyNameRegex.test(keyName.trim())) {
      return res.status(400).json({ 
        error: 'Key name can only contain letters, numbers, spaces, hyphens, and underscores.',
        error_code: 'INVALID_KEY_NAME_FORMAT'
      });
    }

    // Limit key name length
    if (keyName.trim().length > 50) {
      return res.status(400).json({ 
        error: 'Key name must be 50 characters or less.',
        error_code: 'KEY_NAME_TOO_LONG'
      });
    }

    // Create the API key
    const { apiKey, keyData } = await createApiKey(userId, keyName.trim());

    // Return the API key (this is the only time it will be shown in full)
    return res.status(201).json({
      apiKey,
      keyData: {
        id: keyData.id,
        key_name: keyData.key_name,
        api_key_prefix: keyData.api_key_prefix,
        created_at: keyData.created_at,
      }
    });

  } catch (error) {
    console.error('Error creating API key:', error);
    
    if (error instanceof Error) {
      // Handle specific error messages from createApiKey
      if (error.message.includes('Premium tier')) {
        return res.status(403).json({ 
          error: 'API keys are only available for Premium tier subscribers. Please upgrade your subscription.',
          error_code: 'PREMIUM_REQUIRED'
        });
      }
      
      if (error.message.includes('Maximum of 5')) {
        return res.status(400).json({ 
          error: 'You have reached the maximum limit of 5 API keys. Please revoke an existing key before creating a new one.',
          error_code: 'MAX_KEYS_REACHED'
        });
      }
      
      if (error.message.includes('Failed to create')) {
        return res.status(500).json({ 
          error: 'Failed to create API key. Please try again or contact support.',
          error_code: 'CREATION_FAILED'
        });
      }
    }
    
    return res.status(500).json({ 
      error: 'Internal server error. Please contact support if this persists.',
      error_code: 'INTERNAL_SERVER_ERROR'
    });
  }
}