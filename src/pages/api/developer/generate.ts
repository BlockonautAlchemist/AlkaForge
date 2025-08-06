import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getApiKeyFromRequest, incrementApiKeyUsage, canMakeApiRequest, hashApiKey } from '@/lib/apiKeys';

function formatForEliza(xmlContent: string, reasoning: string): string {
  // Provide fallback reasoning if needed
  const trimmedReasoning = reasoning.trim() || 'User requested content generation.';
  const hasTaskTag = trimmedReasoning.includes('<task>');
  const reasoningWithTask = hasTaskTag ? trimmedReasoning : `<task>alkaforge</task>\n${trimmedReasoning}`;

  // Escape only `&`, not < or >. Do not wrap XML or HTML inside <text>.
  const cleanText = xmlContent
    .replace(/&/g, '&amp;')    // Escape ampersands
    .replace(/</g, '&lt;')     // Also escape < and > to prevent injection
    .replace(/>/g, '&gt;');

  return `<response>
  <thought>${reasoningWithTask}</thought>
  <actions>REPLY</actions>
  <providers></providers>
  <text>${cleanText}</text>
</response>`;
}

/**
 * Ensures the <thought> block in the XML string contains at least one child tag.
 * If not, prepends <task>alkaforge</task> inside <thought>.
 * @deprecated Use formatForEliza instead for ElizaOS compatibility
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
    let systemPrompt = `You are an expert viral content creator specialized in creating engaging ${contentType} content with a ${tone} tone. 
    Your primary goal is to maximize DWELL TIME - the metric that matters most for viral content.
    
    SELECTED CONTENT TYPE: ${contentType}
    
    VIRAL CONTENT PRINCIPLES (MUST FOLLOW):
    
    1. DWELL TIME IS KING: 3 seconds = dead content. 10+ seconds = viral potential. Create content that makes people pause and think.
    
    2. PATTERN INTERRUPT: First 3 words must stop the scroll. Challenge assumptions immediately.
    
    3. CURIOSITY GAP: Create knowledge gaps that demand to be filled. Make people NEED to know more.
    
    4. OPEN LOOP: End with a promise that creates anticipation. Make people want the next piece.
    
    5. TEXT BEATS VIDEO: People come to X to READ, not watch. Focus on compelling text that makes them pause.
    
    6. THE 3-SECOND TEST: Before posting, ask: "Would I stop scrolling if I saw this?" If no, delete it.
    
    VIRAL FORMULA: [Shocking statement] + [Unexpected twist] + [Promise of value] = Viral potential
    
    VIRAL CONTENT EXAMPLES - MASTER THESE PATTERNS:
    
    Pattern 1 - Viral Pattern Interrupts (3-Second Rule):
    - "You're being scammed. Not by who you think. And it's costing you $1,000/month."
    - "Your calendar is broken. But not how you think. Here's the 3-minute fix that changed everything."
    - "Stop posting content. Start creating scroll-stoppers. The difference? 10 likes vs 10 million views."
    - "Most people are invisible. Not because they're boring. Because they're predictable. Here's how to break the pattern."
    - "Your business is dying. Slowly. And you won't see it coming. But I can show you the exact moment it started."

    Pattern 2 - Dwell Time Masters (10+ Second Potential):
    - "The algorithm doesn't care about your likes. It cares about dwell time. 3 seconds = dead. 10+ seconds = viral potential. Your content should make people stop scrolling and actually think."
    - "Text beats video on X. Every time. Why? People come here to READ, not watch. That 15-second TikTok? Dead on arrival. But a 280-character hook that makes you pause? Gold."
    - "Want 10M+ impressions? Study this structure: [Shocking statement] + [Unexpected twist] + [Promise of value]. Works every single time. The algorithm rewards what humans reward: attention."
    - "Before you post, do this 3-second test: Scroll past your own tweet. Did you stop? No? Delete it. Your content should punch you in the face with curiosity."
    - "Every scroll is a battle for 3 seconds of attention. Win those 3 seconds, and the algorithm becomes your biggest fan. Lose them, and you're invisible."

    Pattern 3 - Personal Story + Lesson:
    - "The biggest career mistake I made was chasing titles instead of skills. Skills compound. Titles fade."
    - "Most people try to change too many habits at once. Pick one keystone habit and master it. The rest will follow."
    - "Three years ago I was drowning in spreadsheets. Today I run a $2M agency. Here's what changed everything."
    - "I lost $100K before I learned this lesson. Now I make it back every month. The difference? I stopped doing what everyone else was doing."

    Pattern 4 - Problem + Solution:
    - "We built this because we were tired of spreadsheets that felt like math homework. Turns out, 25,000 other people were too."
    - "What if your email inbox sorted itself? Not someday. Today. [Product] is now in open beta."
    - "Good design feels obvious in hindsight. Great design feels inevitable."

    Pattern 5 - Insight + Impact:
    - "ChatGPT is just the beginning. The real revolution starts when AI models can reason about cause and effect."
    - "The secret to productivity isn't time management. It's energy management."
    - "Three books that changed how I think about business: [Book A], [Book B], [Book C]. Not because they had all the answers, but because they asked better questions."

    Pattern 6 - Community + Value:
    - "Join 50,000 founders who get our Tuesday newsletter on building in public. No fluff. No spam. Just real lessons from the trenches."
    - "What's your biggest challenge with [specific topic]? Reply below and I'll share resources that helped me."
    - "The best communities aren't built on transactions. They're built on transformation."

    Pattern 7 - Announcement + Proof:
    - "We just released our annual [Industry] Report. 3 months of research, 500+ interviews, and 1 clear conclusion: [Insight]. Download free below."
    - "You don't need another tool. You need a solution. That's why we built [Product]."
    - "We didn't want to create another [product category]. We wanted to reinvent it."

    Pattern 8 - 3-Sentence Hook Examples (Viral Formula):
    - "Most brands think they're telling a story. But what they're really doing is listing features. Here's how to shift your messaging from boring to unforgettable."
    - "You don't need 2 hours a day in the gym to get strong. You just need a smarter system. This one works even when motivation runs out."
    - "Most people don't get rich by saving. They do it by understanding leverage. Let me show you how that actually works."
    - "Your calendar isn't broken — your priorities are. Here's how I fixed both in under 15 minutes a week."
    - "The biggest reason your business isn't growing? You're working on the wrong thing. This thread will show you where to redirect your focus."

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
      // ElizaOS formatting with proper XML structure for ALL content types
      let userFacingContent = '';
      let reasoning = '';
      
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
              // MODIFIED: Combine all thread parts into a single coherent message for ElizaOS
              // Instead of preserving the part structure with numbering, concatenate all parts into one response
              const threadParts = [];
              for (let i = 1; i <= 10; i++) {
                const part = parsedContent[`part${i}`];
                if (part) {
                  threadParts.push(part);
                }
              }
              
              // Create reasoning and user-facing content
              const topic = finalPrompt.length > 50 ? finalPrompt.substring(0, 50) + '...' : finalPrompt;
              reasoning = `User wants a thread about ${topic}. I'll generate a ${tone}, engaging thread that breaks down the topic with ${tone} tone and personality.`;
              userFacingContent = threadParts.join('\n\n');
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
                  // MODIFIED: Combine all thread parts into a single coherent message for ElizaOS fallback
                  // Instead of preserving the part structure with numbering, concatenate all parts into one response
                  const threadParts = [];
                  for (let i = 1; i <= 10; i++) {
                    const part = extractedJson[`part${i}`];
                    if (part) {
                      threadParts.push(part);
                    }
                  }
                  
                  const topic = finalPrompt.length > 50 ? finalPrompt.substring(0, 50) + '...' : finalPrompt;
                  reasoning = `User wants a thread about ${topic}. I'll generate a ${tone}, engaging thread that breaks down the topic.`;
                  userFacingContent = threadParts.join('\n\n');
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
        // Non-thread content for ElizaOS (post, hook, summary-cta, reply, discord)
        // Check if content has reasoning (if it's a single blob, split on first double line break)
        const doubleLineBreakIndex = generatedContent.indexOf('\n\n');
        
        if (doubleLineBreakIndex > 0 && doubleLineBreakIndex < generatedContent.length * 0.3) {
          // First paragraph likely contains reasoning
          reasoning = generatedContent.substring(0, doubleLineBreakIndex).trim();
          userFacingContent = generatedContent.substring(doubleLineBreakIndex + 2).trim();
        } else {
          // No clear separation, create generic reasoning
          const topic = finalPrompt.length > 50 ? finalPrompt.substring(0, 50) + '...' : finalPrompt;
          reasoning = `User wants a ${contentType} with ${tone} tone about ${topic}. I'll create engaging content that matches their request.`;
          userFacingContent = generatedContent;
        }
      }
      
      // Use the formatForEliza helper function for ALL content types when elizaFormat is true
      generatedContent = formatForEliza(userFacingContent, reasoning);
      
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
              // MODIFIED: Combine all thread parts into a single coherent message
              // Instead of preserving the JSON structure, concatenate all parts into one response
              const threadParts = [];
              for (let i = 1; i <= 10; i++) {
                const part = parsedContent[`part${i}`];
                if (part) {
                  threadParts.push(part);
                }
              }
              
              // Join all parts with double line breaks to create a single coherent message
              // This removes the part1/part2 numbering and creates one unified response
              generatedContent = threadParts.join('\n\n');
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
      // For ElizaOS, return properly formatted XML as plain text
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(generatedContent);
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