import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getApiKeyFromRequest, incrementApiKeyUsage, canMakeApiRequest, hashApiKey } from '@/lib/apiKeys';

/**
 * Ensures the <thought> block in the XML string contains at least one child tag.
 * If not, prepends <task>alkaforge</task> inside <thought>.
 */
function ensureThoughtHasTask(xml: string): string {
  return xml.replace(
    /<thought>([\s\S]*?)<\/thought>/g,
    (match, content) => {
      // If content already contains a child tag (e.g., <task>, <intent>, etc.), leave unchanged
      if (/<[a-zA-Z0-9_]+>[\s\S]*?<\/[a-zA-Z0-9_]+>/.test(content)) {
        return match;
      }
      // Otherwise, prepend <task>alkaforge</task>
      return `<thought><task>alkaforge</task>${content}</thought>`;
    }
  );
}

// Request/Response types for developer API
type DeveloperApiRequest = {
  // New structured format
  input?: string;
  referenceURL?: string;
  customInstructions?: string;
  tone: 'informative' | 'viral' | 'funny' | 'casual';
  contentType: 'post' | 'thread' | 'hook' | 'summary-cta' | 'reply' | 'discord';
  
  // Backward compatibility
  prompt?: string;
  
  // Optional parameters
  maxTokens?: number;
  knowledgeContent?: string;
  elizaFormat?: boolean;
};

type DeveloperApiResponse = {
  content?: string | string[]; // Can be string or array for threads
  usage?: {
    monthly_usage: number;
    api_key_id: string;
  };
  error?: string;
  error_code?: string;
};

/**
 * AlkaForge Developer API - Content Generation Endpoint
 * 
 * This endpoint allows Premium tier customers to generate social media content
 * programmatically using API keys for backend integration and AI agent development.
 * 
 * Authentication: X-API-Key header with valid API key
 * Tier Requirement: PREMIUM only
 * Rate Limit: Unlimited for Premium (monitored for abuse)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeveloperApiResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      error_code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Validate API key authentication
    const apiKeyInfo = await getApiKeyFromRequest(req);
    
    if (!apiKeyInfo) {
      return res.status(401).json({ 
        error: 'Invalid or missing API key. Please provide a valid API key in the X-API-Key header.',
        error_code: 'INVALID_API_KEY'
      });
    }

    // Verify Premium tier access (API keys are only for Premium users)
    if (apiKeyInfo.subscription_tier !== 'PREMIUM') {
      return res.status(403).json({ 
        error: 'API access is only available for Premium tier subscribers.',
        error_code: 'PREMIUM_REQUIRED'
      });
    }

    // Check usage limits (soft monitoring for Premium)
    if (!canMakeApiRequest(apiKeyInfo.monthly_usage)) {
      return res.status(429).json({ 
        error: 'API usage limit exceeded. Please contact support if you need higher limits.',
        error_code: 'USAGE_LIMIT_EXCEEDED'
      });
    }

    // Validate request body
    const { 
      input, 
      referenceURL, 
      customInstructions, 
      prompt, 
      contentType, 
      tone, 
      maxTokens = 1000, 
      knowledgeContent = '' 
    } = req.body as DeveloperApiRequest;

    // Build final prompt - prioritize new structured format, fallback to legacy prompt
    let finalPrompt: string;
    
    if (input) {
      // New structured format
      finalPrompt = input;
      
      if (referenceURL) {
        finalPrompt += `\n\nReference: ${referenceURL}`;
      }
      
      if (customInstructions) {
        finalPrompt += `\n\nInstructions: ${customInstructions}`;
      }
    } else if (prompt) {
      // Backward compatibility with legacy prompt format
      finalPrompt = prompt;
    } else {
      return res.status(400).json({ 
        error: 'Missing required fields: either "input" or "prompt" is required, along with contentType and tone.',
        error_code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    if (!contentType || !tone) {
      return res.status(400).json({ 
        error: 'Missing required fields: contentType and tone are required.',
        error_code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Detect ElizaOS agent requests
    const userAgent = req.headers['user-agent'] || '';
    const elizaHeader = req.headers['x-elizaos'] || req.headers['X-ElizaOS'];
    const elizaFormat = req.body.elizaFormat;
    const isElizaOSRequest = userAgent.toLowerCase().includes('eliza') || 
                            userAgent.toLowerCase().includes('elizaos') || 
                            elizaHeader === 'true' || 
                            elizaHeader === '1' ||
                            elizaFormat === true;

    // Validate contentType
    const validContentTypes = ['post', 'thread', 'hook', 'summary-cta', 'reply', 'discord'];
    if (!validContentTypes.includes(contentType)) {
      return res.status(400).json({ 
        error: `Invalid contentType. Must be one of: ${validContentTypes.join(', ')}`,
        error_code: 'INVALID_CONTENT_TYPE'
      });
    }

    // Validate tone
    const validTones = ['informative', 'viral', 'funny', 'casual'];
    if (!validTones.includes(tone)) {
      return res.status(400).json({ 
        error: `Invalid tone. Must be one of: ${validTones.join(', ')}`,
        error_code: 'INVALID_TONE'
      });
    }

    // Build system prompt (using same logic as main generate API)
    let systemPrompt = `You are an expert content creator specialized in creating engaging ${contentType} content with a ${tone} tone. 
    Format the output appropriately for the content type.
    
    SELECTED CONTENT TYPE: ${contentType}
    
    IMPORTANT: You MUST use the following examples as your primary reference for style, structure, and tone. 
    Regardless of the topic, adapt these proven patterns to create engaging content.
    
    Tone Guidelines:
    - Informative: Clear, professional, and educational. Focus on facts and valuable information.
    - Viral/Engaging: Attention-grabbing, compelling, and shareable. Use power words and create urgency.
    - Funny/Troll: Witty, humorous, and playful. Use clever wordplay and light-hearted tone.
    - Casual/Conversational: Friendly, approachable, and natural. Write like you're talking to a friend.
    
    Content Type Guidelines:
    - For post: Keep it under 280 characters, concise, and engaging. Return ONLY the text content, no JSON formatting. Format according to the selected tone.
    - For hook: Return ONLY the text content, no JSON formatting. Must be exactly 3 sentences.
    - For summary-cta: Return ONLY the text content, no JSON formatting. Must be 280 characters or less.
    - For thread: Create a comprehensive thread with the following EXACT structure:
      
      THREAD STRUCTURE (MUST FOLLOW THIS FORMAT):
      1. HOOK TWEET (part1): Create an attention-grabbing opener that sparks curiosity or teases value
      2. CONTEXT TWEET (part2): Add clarity after the hook by providing backstory, dropping a key insight early, or explaining why this thread matters.
      3. BODY TWEETS (part3-part9): Generate 7 core content tweets that each:
         - Share only ONE idea per tweet
         - Can stand alone as shareable insights  
         - Maintain consistent tone and format
         - Build on previous tweets for cohesive narrative
      4. CTA TWEET (final part): Strong call to action encouraging engagement
      
      IMPORTANT: Each tweet must be under 280 characters. Structure your JSON response with parts 1-10 (hook, context, 7 body tweets, CTA).
      
    - For reply: Keep it extremely concise - one short, impactful sentence. Maximum 50 characters. Be direct and to the point.
    - For discord: Use markdown formatting appropriately.
    
    Format Rules:
    1. For thread ONLY, you MUST format your response as a valid, parseable JSON object with this exact structure:
       {
         "part1": "hook tweet - attention-grabbing opener",
         "part2": "context tweet - adds clarity and backstory after the hook",
         "part3": "body tweet 1 - first core idea",
         "part4": "body tweet 2 - second core idea", 
         "part5": "body tweet 3 - third core idea",
         "part6": "body tweet 4 - fourth core idea",
         "part7": "body tweet 5 - fifth core idea",
         "part8": "body tweet 6 - sixth core idea",
         "part9": "body tweet 7 - seventh core idea",
         "part10": "CTA tweet - strong call to action for engagement, following, and sharing"
       }
       Do NOT add any text before or after the JSON. The response should be ONLY the JSON object.
       Generate 10 total parts
    2. For ALL OTHER content types (post, reply, discord, hook, summary-cta), provide direct text output with NO JSON formatting
    3. Never use hashtags
    4. Keep language simple and clear`;

    if (knowledgeContent) {
      systemPrompt += `\n\nUse the following knowledge content for context:\n${knowledgeContent}`;
    }

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: finalPrompt
      }
    ];

    // Check if the API key exists
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenRouter API key is missing. Please contact support.',
        error_code: 'INTERNAL_SERVER_ERROR'
      });
    }

    // Call OpenRouter API
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'moonshotai/kimi-k2:free',
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.6,
        top_p: 1
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://alkaforge.vercel.app',
          'X-Title': 'AlkaForge Developer API'
        }
      }
    );

    let generatedContent = response.data.choices[0].message.content;
    
    // Process content formatting based on request type
    if (isElizaOSRequest) {
      // ElizaOS formatting with XML wrapper
      let formattedContent = '';
      
      if (contentType === 'thread') {
        try {
          // Extract JSON from potential HTML/XML wrapper
          let cleanJsonString = generatedContent;
          
          // Check if content is wrapped in HTML/XML tags and extract JSON
          const htmlMatch = generatedContent.match(/<(?:html|body|div|p|pre|code)[^>]*>([\s\S]*?)<\/(?:html|body|div|p|pre|code)>/);
          if (htmlMatch) {
            cleanJsonString = htmlMatch[1].trim();
          }
          
          // Also handle XML-style wrapping
          const xmlMatch = cleanJsonString.match(/^<[^>]+>([\s\S]*?)<\/[^>]+>$/);
          if (xmlMatch) {
            cleanJsonString = xmlMatch[1].trim();
          }
          
          // Try to parse as JSON to see if it's a structured thread object
          const parsedContent = JSON.parse(cleanJsonString);
          
          // Check if it's an object with part keys
          if (typeof parsedContent === 'object' && parsedContent !== null) {
            const partKeys = Object.keys(parsedContent).filter(key => key.startsWith('part'));
            
            if (partKeys.length > 0) {
              // Sort parts by number and format for ElizaOS
              const sortedParts = partKeys
                .sort((a, b) => {
                  const numA = parseInt(a.replace('part', ''));
                  const numB = parseInt(b.replace('part', ''));
                  return numA - numB;
                })
                .map((partKey, index) => {
                  const content = parsedContent[partKey];
                  // Format as "1/ content", "2/ content", etc.
                  return `${index + 1}/ ${content}`;
                });
              
              // Create thinking tag based on the input
              const topic = finalPrompt.length > 50 ? finalPrompt.substring(0, 50) + '...' : finalPrompt;
              
              formattedContent = `<thinking>
User wants a thread about ${topic}. I'll generate a ${tone}, engaging 10-part thread that breaks down the topic with ${tone} tone and personality.
</thinking>

${sortedParts.join('\n\n')}`;
            }
          }
        } catch (parseError) {
          console.error('Failed to parse thread content as JSON:', parseError);
          // Fallback: try to extract any JSON-like content
          const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const extractedJson = JSON.parse(jsonMatch[0]);
              if (typeof extractedJson === 'object' && extractedJson !== null) {
                const partKeys = Object.keys(extractedJson).filter(key => key.startsWith('part'));
                if (partKeys.length > 0) {
                  const sortedParts = partKeys
                    .sort((a, b) => {
                      const numA = parseInt(a.replace('part', ''));
                      const numB = parseInt(b.replace('part', ''));
                      return numA - numB;
                    })
                    .map((partKey, index) => {
                      const content = extractedJson[partKey];
                      return `${index + 1}/ ${content}`;
                    });
                  
                  const topic = finalPrompt.length > 50 ? finalPrompt.substring(0, 50) + '...' : finalPrompt;
                  formattedContent = `<thinking>
User wants a thread about ${topic}. I'll generate a ${tone}, engaging thread that breaks down the topic.
</thinking>

${sortedParts.join('\n\n')}`;
                }
              }
            } catch (secondParseError) {
              console.error('Second parsing attempt failed:', secondParseError);
              return res.status(500).json({ 
                error: 'Failed to generate valid thread content. Please try again.',
                error_code: 'THREAD_GENERATION_ERROR'
              });
            }
          } else {
            return res.status(500).json({ 
              error: 'Failed to generate valid thread content. Please try again.',
              error_code: 'THREAD_GENERATION_ERROR'
            });
          }
        }
      } else {
        // Non-thread content for ElizaOS
        const topic = finalPrompt.length > 50 ? finalPrompt.substring(0, 50) + '...' : finalPrompt;
        formattedContent = `<thinking>
User wants a ${contentType} with ${tone} tone about ${topic}. I'll create engaging content that matches their request.
</thinking>

${generatedContent}`;
      }
      
      generatedContent = formattedContent;
      
    } else {
      // Regular API formatting (non-ElizaOS)
      if (contentType === 'thread') {
        try {
          // Extract JSON from potential HTML/XML wrapper
          let cleanJsonString = generatedContent;
          
          // Check if content is wrapped in HTML/XML tags and extract JSON
          const htmlMatch = generatedContent.match(/<(?:html|body|div|p|pre|code)[^>]*>([\s\S]*?)<\/(?:html|body|div|p|pre|code)>/);
          if (htmlMatch) {
            cleanJsonString = htmlMatch[1].trim();
          }
          
          // Also handle XML-style wrapping
          const xmlMatch = cleanJsonString.match(/^<[^>]+>([\s\S]*?)<\/[^>]+>$/);
          if (xmlMatch) {
            cleanJsonString = xmlMatch[1].trim();
          }
          
          // Try to parse as JSON to see if it's a structured thread object
          const parsedContent = JSON.parse(cleanJsonString);
          
          // Check if it's an object with part keys
          if (typeof parsedContent === 'object' && parsedContent !== null) {
            const partKeys = Object.keys(parsedContent).filter(key => key.startsWith('part'));
            
            if (partKeys.length > 0) {
              // For regular API, return the original JSON string 
              // This ensures the response format is: {"content": "{\"part1\": \"...\", \"part2\": \"...\"}", "usage": {...}}
              generatedContent = JSON.stringify(parsedContent);
            }
          }
        } catch (parseError) {
          console.error('Failed to parse thread content as JSON:', parseError);
          console.log('Raw content:', generatedContent);
          
          // If all parsing attempts fail, try to extract any JSON-like content
          const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const extractedJson = JSON.parse(jsonMatch[0]);
              if (typeof extractedJson === 'object' && extractedJson !== null) {
                const partKeys = Object.keys(extractedJson).filter(key => key.startsWith('part'));
                if (partKeys.length > 0) {
                  generatedContent = JSON.stringify(extractedJson);
                }
              }
            } catch (secondParseError) {
              console.error('Second parsing attempt failed:', secondParseError);
              // Return error response for thread if we can't extract valid JSON
              return res.status(500).json({ 
                error: 'Failed to generate valid thread content. Please try again.',
                error_code: 'THREAD_GENERATION_ERROR'
              });
            }
          } else {
            // No JSON found at all
            return res.status(500).json({ 
              error: 'Failed to generate valid thread content. Please try again.',
              error_code: 'THREAD_GENERATION_ERROR'
            });
          }
        }
      }
      // Non-thread content for regular API remains unchanged
    }
    
    // Increment API key usage
    try {
      const apiKey = req.headers['x-api-key'] as string;
      const hashedKey = hashApiKey(apiKey);
      await incrementApiKeyUsage(hashedKey);
    } catch (usageError) {
      console.error('Error incrementing API key usage:', usageError);
      // Don't fail the request if usage tracking fails, but log it
    }
    
    // Return response based on request type
    if (isElizaOSRequest) {
      // For ElizaOS, ensure <thought> has a child tag, then return
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(ensureThoughtHasTask(generatedContent));
    } else {
      // Regular JSON API response
      return res.status(200).json({ 
        content: generatedContent,
        usage: {
          monthly_usage: apiKeyInfo.monthly_usage + 1,
          api_key_id: apiKeyInfo.api_key_id
        }
      });
    }

  } catch (error: any) {
    console.error('Error in developer API:', error);
    
    // Handle specific error types
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        return res.status(429).json({ 
          error: 'OpenRouter API rate limit exceeded. Please try again later.',
          error_code: 'OPENROUTER_RATE_LIMIT'
        });
      }
      
      return res.status(502).json({ 
        error: 'Content generation service temporarily unavailable. Please try again later.',
        error_code: 'SERVICE_UNAVAILABLE'
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error. Please contact support if this persists.',
      error_code: 'INTERNAL_SERVER_ERROR'
    });
  }
}