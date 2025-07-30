# AlkaForge Developer API Documentation

The AlkaForge Developer API allows Premium tier customers to programmatically generate social media content for backend integrations and AI agent development.

## Authentication

The API uses API key authentication via the `X-API-Key` header. API keys are only available to Premium tier subscribers.

### Getting an API Key

1. Upgrade to Premium tier in your AlkaForge dashboard
2. Navigate to the API Keys section in your account settings
3. Create a new API key with a descriptive name
4. Copy the API key immediately (it won't be shown again)

### Using Your API Key

Include your API key in the `X-API-Key` header for all requests:

```bash
curl -X POST https://alkaforge.vercel.app/api/developer/generate \
  -H "X-API-Key: ak_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write about the benefits of remote work",
    "contentType": "post",
    "tone": "informative"
  }'
```

## Endpoints

### Content Generation

**POST** `/api/developer/generate`

Generate social media content using AlkaForge's AI engine.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | The content prompt or topic |
| `contentType` | string | Yes | Type of content to generate (see options below) |
| `tone` | string | Yes | Tone of the content (see options below) |
| `maxTokens` | number | No | Maximum tokens for generation (default: 1000) |
| `knowledgeContent` | string | No | Additional context or knowledge base content |

#### Content Types

- `post` - Single social media post (280 characters max)
- `thread` - Multi-part thread (returns JSON with parts 1-10)
- `hook` - 3-sentence hook to grab attention
- `summary-cta` - Concise summary with call-to-action (280 characters max)
- `reply` - Short reply (50 characters max)
- `discord` - Discord announcement with markdown formatting

#### Tones

- `informative` - Clear, professional, and educational
- `viral` - Attention-grabbing and shareable
- `funny` - Witty and humorous
- `casual` - Friendly and conversational

#### Response

```json
{
  "content": "Generated content here...",
  "usage": {
    "monthly_usage": 42,
    "api_key_id": "uuid-here"
  }
}
```

For thread content type, the response format is:

```json
{
  "content": "{\"part1\": \"Hook tweet\", \"part2\": \"Context\", ..., \"part10\": \"CTA\"}",
  "usage": {
    "monthly_usage": 42,
    "api_key_id": "uuid-here"
  }
}
```

#### Error Responses

| Status | Error Code | Description |
|--------|------------|-------------|
| 401 | `INVALID_API_KEY` | Invalid or missing API key |
| 403 | `PREMIUM_REQUIRED` | API access requires Premium tier |
| 400 | `MISSING_REQUIRED_FIELDS` | Missing prompt, contentType, or tone |
| 400 | `INVALID_CONTENT_TYPE` | Invalid contentType value |
| 400 | `INVALID_TONE` | Invalid tone value |
| 429 | `USAGE_LIMIT_EXCEEDED` | Monthly usage limit exceeded |
| 429 | `OPENROUTER_RATE_LIMIT` | AI service rate limit |
| 502 | `SERVICE_UNAVAILABLE` | AI service temporarily unavailable |
| 500 | `INTERNAL_SERVER_ERROR` | Server error |

### API Key Management

These endpoints require user authentication (Bearer token) and are for managing your API keys.

#### Create API Key

**POST** `/api/developer/keys/create`

Create a new API key (max 5 per user).

**Request Body:**
```json
{
  "keyName": "My Bot API Key"
}
```

**Response:**
```json
{
  "apiKey": "ak_1234567890abcdef...",
  "keyData": {
    "id": "uuid-here",
    "key_name": "My Bot API Key",
    "api_key_prefix": "ak_12345678",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

⚠️ **Important:** The full API key is only shown once. Save it securely.

#### List API Keys

**GET** `/api/developer/keys/list`

List all your active API keys (without showing the full key).

**Response:**
```json
{
  "apiKeys": [
    {
      "id": "uuid-here",
      "key_name": "My Bot API Key",
      "api_key_prefix": "ak_12345678",
      "monthly_usage": 150,
      "usage_reset_date": "2024-02-01T00:00:00Z",
      "last_used_at": "2024-01-15T10:30:00Z",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Revoke API Key

**POST** `/api/developer/keys/revoke`

Permanently revoke an API key.

**Request Body:**
```json
{
  "keyId": "uuid-of-key-to-revoke"
}
```

**Response:**
```json
{
  "success": true
}
```

#### Get API Key Usage

**GET** `/api/developer/keys/usage?keyId=<uuid>`

Get usage statistics for a specific API key.

**Response:**
```json
{
  "usage": {
    "monthlyUsage": 150,
    "lastUsed": "2024-01-15T10:30:00Z"
  }
}
```

## Usage Examples

### Node.js/JavaScript

```javascript
const axios = require('axios');

async function generateContent(prompt, contentType, tone) {
  try {
    const response = await axios.post('https://alkaforge.vercel.app/api/developer/generate', {
      prompt: prompt,
      contentType: contentType,
      tone: tone,
      maxTokens: 1000
    }, {
      headers: {
        'X-API-Key': process.env.ALKAFORGE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.content;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
generateContent(
  "Benefits of remote work for productivity",
  "post",
  "informative"
).then(content => {
  console.log('Generated content:', content);
});
```

### Python

```python
import requests
import os

def generate_content(prompt, content_type, tone):
    url = "https://alkaforge.vercel.app/api/developer/generate"
    
    headers = {
        "X-API-Key": os.getenv("ALKAFORGE_API_KEY"),
        "Content-Type": "application/json"
    }
    
    data = {
        "prompt": prompt,
        "contentType": content_type,
        "tone": tone,
        "maxTokens": 1000
    }
    
    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code == 200:
        return response.json()["content"]
    else:
        raise Exception(f"API Error: {response.json()}")

# Usage
content = generate_content(
    "Benefits of remote work for productivity",
    "post",
    "informative"
)
print("Generated content:", content)
```

### curl

```bash
# Generate a social media post
curl -X POST https://alkaforge.vercel.app/api/developer/generate \
  -H "X-API-Key: ak_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Benefits of remote work for productivity",
    "contentType": "post",
    "tone": "informative",
    "maxTokens": 1000
  }'

# Generate a thread
curl -X POST https://alkaforge.vercel.app/api/developer/generate \
  -H "X-API-Key: ak_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How to build a successful startup",
    "contentType": "thread",
    "tone": "viral"
  }'

# List your API keys (requires user session token)
curl -X GET https://alkaforge.vercel.app/api/developer/keys/list \
  -H "Authorization: Bearer your_session_token_here"
```

## AI Agent Integration

### LangChain Example

```python
from langchain.tools import BaseTool
import requests
import os

class AlkaForgeContentTool(BaseTool):
    name = "alkaforge_content_generator"
    description = "Generate social media content using AlkaForge API"
    
    def _run(self, prompt: str, content_type: str = "post", tone: str = "informative"):
        url = "https://alkaforge.vercel.app/api/developer/generate"
        
        headers = {
            "X-API-Key": os.getenv("ALKAFORGE_API_KEY"),
            "Content-Type": "application/json"
        }
        
        data = {
            "prompt": prompt,
            "contentType": content_type,
            "tone": tone
        }
        
        response = requests.post(url, json=data, headers=headers)
        
        if response.status_code == 200:
            return response.json()["content"]
        else:
            return f"Error: {response.json()['error']}"

# Usage in agent
tool = AlkaForgeContentTool()
content = tool.run("Benefits of AI automation", "post", "viral")
```

### OpenAI Function Calling

```javascript
const functions = [
  {
    name: "generate_social_content",
    description: "Generate social media content using AlkaForge",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The content topic or prompt"
        },
        contentType: {
          type: "string",
          enum: ["post", "thread", "hook", "summary-cta", "reply", "discord"],
          description: "Type of content to generate"
        },
        tone: {
          type: "string",
          enum: ["informative", "viral", "funny", "casual"],
          description: "Tone of the content"
        }
      },
      required: ["prompt", "contentType", "tone"]
    }
  }
];

async function generateSocialContent({ prompt, contentType, tone }) {
  const response = await fetch('https://alkaforge.vercel.app/api/developer/generate', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.ALKAFORGE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt, contentType, tone })
  });
  
  const data = await response.json();
  return data.content;
}
```

## Rate Limits & Usage

- **Premium Tier**: Unlimited requests (monitored for abuse)
- **Usage Tracking**: Monthly usage is tracked per API key
- **Soft Limits**: 10,000 requests/month monitoring threshold
- **Key Limits**: Maximum 5 API keys per user
- **Request Timeout**: 30 seconds

## Best Practices

1. **Secure Your API Keys**: Never expose API keys in client-side code
2. **Use Environment Variables**: Store keys in environment variables
3. **Monitor Usage**: Check usage via the API or dashboard
4. **Handle Errors**: Implement proper error handling and retries
5. **Be Specific**: Use detailed prompts for better content quality
6. **Knowledge Context**: Include relevant context in `knowledgeContent`

## Support

- **Documentation**: This guide and examples
- **Dashboard**: Manage keys and view usage in your AlkaForge dashboard
- **Support Email**: Contact support for technical issues
- **Premium Required**: API access is exclusive to Premium tier subscribers

## Changelog

### v1.0.0 (Initial Release)
- Content generation endpoint
- API key authentication
- Key management endpoints
- Usage tracking and monitoring
- Support for all AlkaForge content types and tones