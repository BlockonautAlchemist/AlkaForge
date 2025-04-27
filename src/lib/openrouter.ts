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
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

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
    
    let formattedPrompt = prompt;
    
    if (contentType === 'thread' && firstThreadHook) {
      formattedPrompt = `MAIN PROMPT (from user):\n${prompt}\n\n${customPrompt ? `Additional instructions: ${customPrompt}\n\n` : ''}The first tweet in the thread MUST be exactly as follows (do not change it):\n${firstThreadHook}\n\nContinue the thread with 4 more tweets, following the same style and tone.\n${knowledgeContent ? 'You may use the following knowledge content as supporting context, but the MAIN PROMPT above is the primary focus.' : ''}`;
    } else {
      formattedPrompt = `MAIN PROMPT (from user):\n${prompt}\n\n${customPrompt ? `Additional instructions: ${customPrompt}\n\n` : ''}${knowledgeContent ? 'You may use the following knowledge content as supporting context, but the MAIN PROMPT above is the primary focus.' : ''}`;
    }
    
    // Use the existing API endpoint that uses server-side API key
    const response = await axios.post('/api/generate', {
      prompt: formattedPrompt,
      contentType,
      tone,
      maxTokens,
      knowledgeContent
    });
    
    if (!response.data || !response.data.content) {
      console.error("Invalid response format:", response.data);
      throw new Error("Received invalid response format from API");
    }
    
    let content = response.data.content;
    
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
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      console.error("OpenRouter API error:", axiosError.response.status, axiosError.response.statusText, axiosError.response.data);
      throw new Error(`OpenRouter API error: ${axiosError.response.statusText}`);
    }
    console.error("Error generating content:", error);
    throw new Error("Failed to generate content. Please try again later.");
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
