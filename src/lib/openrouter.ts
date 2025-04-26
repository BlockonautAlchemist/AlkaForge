/// <reference types="axios" />

import axios from 'axios';

// TypeScript declaration for axios
type AxiosError = Error & {
  response?: {
    status?: number;
    statusText?: string;
    data?: any;
    headers?: any;
  }
};

// Use a function to safely get environment variables in Next.js client components
const getEnvVar = (name: string): string => {
  // In client-side Next.js, environment variables are prefixed with NEXT_PUBLIC_
  // and available on the window object or can be imported directly
  if (typeof window !== 'undefined') {
    return (window as any).__ENV__?.[name] || '';
  }
  return '';
};

// Get the API key using our safe function
const OPENROUTER_API_KEY = getEnvVar('NEXT_PUBLIC_OPENROUTER_API_KEY');

type OpenRouterResponse = {
  choices: {
    message: {
      content: string;
    };
  }[];
};

type ContentGenerationParams = {
  prompt: string;
  contentType: 'post' | 'thread' | 'reply' | 'discord';
  tone?: 'informative' | 'viral' | 'funny' | 'casual';
  maxTokens?: number;
  knowledgeContent?: string;
  customPrompt?: string;
  firstThreadHook?: string;
};

export async function generateContent({
  prompt,
  contentType,
  tone = 'informative',
  maxTokens = 1000,
  knowledgeContent = '',
  customPrompt,
  firstThreadHook
}: ContentGenerationParams): Promise<string> {
  try {
    console.log("Starting content generation with OpenRouter");
    console.log("Content type:", contentType);
    console.log("Tone:", tone);
    console.log("Max tokens:", maxTokens);
    console.log("Knowledge content length:", knowledgeContent.length);
    console.log("API Key available:", !!OPENROUTER_API_KEY);
    
    let systemPrompt = `You are an expert content creator specialized in creating engaging ${contentType} content with a ${tone} tone. You MUST format your response EXACTLY according to the selected content type and tone - no exceptions.

    SELECTED CONTENT TYPE: ${contentType.toUpperCase()}
    SELECTED TONE: ${tone.toUpperCase()}

    Content Type Guidelines:
    - For X posts: 
        * STRICT 280 CHARACTER LIMIT - YOUR ENTIRE RESPONSE MUST BE 280 CHARACTERS OR LESS
        * Single, complete thought - no truncated ideas
        * Summarize complex topics into their core message
        * If the topic is too big, focus on the most important point only
        * Include a clear call-to-action if appropriate
        * Format with proper line breaks and emojis where appropriate
        * Focus on clear, direct communication
        * No hashtags
        * No thread-style formatting
        * Must fit in a single post
        
        Example X Post Format:
        "Core message in 1-2 sentences. Key detail or impact. Call to action if needed."
    
    - For X threads: Create a series of connected posts (3-10 tweets) with these rules:
        * Each part must be under 280 characters
        * Do NOT use any numbering (no "1/" or "2/" at the start)
        * Keep text natural and clean
        * Each part must be complete and not cut off
        * Use thread hooks and cliffhangers to maintain engagement
        * Format response as JSON with "part1" through "part5" keys
        * Always end the thread with a call to action that encourages the reader to follow for more content like this and to engage (like, reply, or repost). Use the best practices of top X (Twitter) copywriters for CTAs.
        
        Example Thread Hooks by Tone:
        INFORMATIVE:
        - "Let me break down everything you need to know about this:"
        - "I've researched this extensively, here's what I found:"
        - "Here's a complete analysis that will change your perspective:"
        - "I'm about to share some fascinating insights about this:"
        
        VIRAL:
        - "What I discovered about this completely blew my mind:"
        - "The secret that nobody's talking about yet:"
        - "This hidden insight changes everything we thought we knew:"
        - "I can't believe what I just uncovered about this:"
        
        PROFESSIONAL:
        - "Based on our comprehensive analysis, here's what we found:"
        - "Let me share our key findings and recommendations:"
        - "Here's our detailed breakdown of the situation:"
        - "After thorough research, here are our insights:"
        
        CASUAL:
        - "Okay, you won't believe what I just figured out:"
        - "So I've been diving deep into this and wow:"
        - "I need to tell you about this amazing thing I found:"
        - "Just spent hours researching this and honestly:"
    
    - For replies: Make them contextual, engaging, and conversational. Reference the original post when relevant. Keep them concise but meaningful.
        * Your reply MUST be a single, short, natural-sounding sentence. Make sure the reply is one sentence only. Be as concise as possible while still sounding conversational and human.
    
    - For Discord announcements: Use proper markdown formatting (bold, italics, code blocks). Include clear sections, bullet points, and emojis. Make important information stand out.
        * Your response MUST be a single plain text Discord announcement. NEVER use JSON, objects, or arrays. ONLY output plain text, using Discord markdown for formatting if needed.

    Tone Guidelines:
    - Informative: Focus on facts, data, and clear explanations. Use professional language while remaining accessible. Avoid marketing speak.
    - Viral/Engaging: Create content that sparks emotions and encourages sharing. Use hooks, questions, and relatable examples.
    - Funny/Troll: Create humorous, meme-worthy content that's intentionally over-the-top or absurd. Use internet culture references, exaggerated reactions, and unexpected twists. Perfect for Twitter-style trolling that makes people laugh.
    - Casual/Conversational: Use friendly, approachable language. Include personal touches and relatable analogies.

    Format Rules:
    1. For X threads, format your response as a JSON object with these exact keys:
       {
         "part1": "first part of thread",
         "part2": "second part of thread",
         "part3": "third part of thread",
         "part4": "fourth part of thread",
         "part5": "fifth part of thread"
       }
    2. For other content types, provide direct text output
    3. Never use hashtags
    4. Keep language simple and clear
    5. Write like you're talking to a friend
    6. Avoid complex adjectives and fancy words

    YOU MUST FORMAT YOUR RESPONSE AS A ${contentType.toUpperCase()} WITH A ${tone.toUpperCase()} TONE.`;

    if (knowledgeContent) {
      systemPrompt += `\n\nI'm providing you with knowledge files that contain relevant information. Use this information to inform your response and make it more accurate and specific. Only use information that's relevant to the prompt.`;
    }

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    if (knowledgeContent) {
      messages.push({
        role: 'user',
        content: `Here is the knowledge content to reference:\n\n${knowledgeContent}\n\nPlease use this information to inform your response to my upcoming prompt.`
      });
      
      messages.push({
        role: 'system',
        content: "I'll use this knowledge to inform my response to your prompt. What would you like me to create?"
      });
    }

    messages.push({
      role: 'user',
      content:
        contentType === 'thread' && firstThreadHook
          ? `MAIN PROMPT (from user):\n${prompt}\n\n${customPrompt ? `Additional instructions: ${customPrompt}\n\n` : ''}The first tweet in the thread MUST be exactly as follows (do not change it):\n${firstThreadHook}\n\nContinue the thread with 4 more tweets, following the same style and tone.\n${knowledgeContent ? 'You may use the following knowledge content as supporting context, but the MAIN PROMPT above is the primary focus.' : ''}`
          : `MAIN PROMPT (from user):\n${prompt}\n\n${customPrompt ? `Additional instructions: ${customPrompt}\n\n` : ''}${knowledgeContent ? 'You may use the following knowledge content as supporting context, but the MAIN PROMPT above is the primary focus.' : ''}`
    });

    console.log("Sending request to OpenRouter API");
    
    const apiKey = OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter API key is missing. Please check your environment variables.");
    }
    
    const requestBody = {
      model: "anthropic/claude-3.7-sonnet",
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      top_p: 1,
      stream: false
    };
    
    console.log("Request body:", JSON.stringify(requestBody, null, 2));
    
    const response = await axios.post<OpenRouterResponse>(
      'https://openrouter.ai/api/v1/chat/completions',
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://alkaforge.vercel.app',
          'X-Title': 'AlkaForge',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log("Response received from OpenRouter");
    
    if (!response.data || !response.data.choices || response.data.choices.length === 0) {
      console.error("Invalid response format:", response.data);
      throw new Error("Received invalid response format from OpenRouter");
    }
    
    let content = response.data.choices[0].message.content;
    
    // Handle different content types
    if (contentType === 'post') {
      // Enforce 280 character limit for X posts
      content = content.trim();
      if (content.length > 280) {
        // Find the last complete sentence that fits within the limit
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
        content = '';
        for (const sentence of sentences) {
          if ((content + sentence).length <= 280) {
            content += sentence;
          } else {
            break;
          }
        }
        content = content.trim();
        
        // If we still don't have any complete sentences that fit, take the first 277 chars
        if (!content) {
          const words = content.split(' ');
          content = '';
          for (const word of words) {
            if ((content + ' ' + word).length <= 277) {
              content += (content ? ' ' : '') + word;
            } else {
              break;
            }
          }
          content = content.trim() + '...';
        }
      }
    } else if (contentType === 'thread') {
      try {
        // First try to parse as JSON
        const parsedContent = JSON.parse(content);
        // Combine the thread parts into a single string with proper formatting
        content = [
          parsedContent.part1 || "",
          parsedContent.part2 || "",
          parsedContent.part3 || "",
          parsedContent.part4 || "",
          parsedContent.part5 || ""
        ]
        .filter(part => part.length > 0) // Remove empty parts
        .map(part => part.trim()) // Trim whitespace
        .join('\n\n'); // Add double line breaks between parts
      } catch (error) {
        // If JSON parsing fails, try to clean up the content
        console.error('Failed to parse thread JSON response:', error);
        // Remove any JSON formatting artifacts
        content = content
          .replace(/^\s*{\s*"part\d+":\s*"|"\s*}\s*$/g, '') // Remove JSON wrapper
          .replace(/"\s*,\s*"part\d+":\s*"/g, '\n\n') // Replace JSON separators with newlines
          .replace(/\\"/g, '"') // Fix escaped quotes
          .trim(); // Clean up whitespace
      }
    } else if (contentType === 'discord') {
      // Keep Discord markdown formatting intact
      content = content.trim();
    } else {
      // For posts and replies, ensure clean formatting
      content = content.trim();
    }
    
    return content;
  } catch (error) {
    console.error('Error generating content with Claude:', error);
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error('Axios error details:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        headers: axiosError.response?.headers
      });
    }
    
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateXThreadHooks({ prompt, tone }: { prompt: string, tone: string }): Promise<string[]> {
  const systemPrompt = `You are an expert Twitter copywriter. Generate 3 highly engaging Twitter thread hooks, each under 280 characters, that would make someone want to read a thread about the following content. Each hook should:
- Be optimized for X (Twitter) best practices
- Be unique and attention-grabbing
- Be relevant to the content provided
- Match the following tone: ${tone}
- Not use hashtags or numbering
- Be formatted as a plain list (no JSON, just 1. ..., 2. ..., 3. ...)

CONTENT:
${prompt}`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  const apiKey = OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API key is missing. Please check your environment variables.");
  }

  const requestBody = {
    model: "anthropic/claude-3.7-sonnet",
    messages: messages,
    max_tokens: 600,
    temperature: 0.8,
    top_p: 1,
    stream: false
  };

  const response = await axios.post<OpenRouterResponse>(
    'https://openrouter.ai/api/v1/chat/completions',
    requestBody,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://alkaforge.vercel.app',
        'X-Title': 'AlkaForge',
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.data || !response.data.choices || response.data.choices.length === 0) {
    throw new Error("No hooks generated");
  }

  // Parse hooks from the response
  const hooksRaw = response.data.choices[0].message.content;
  // Expecting format: 1. ...\n2. ...\n3. ...
  const hooks = hooksRaw
    .split(/\n+/)
    .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
    .filter((line: string) => line.length > 0)
    .slice(0, 3);

  return hooks;
}
