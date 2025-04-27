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
        console.log("Raw thread content:", content);
        
        // Clean the content to ensure it's valid JSON
        // Remove any potential text before the opening brace or after the closing brace
        const jsonContent = content.trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        console.log("Cleaned JSON:", jsonContent);
        
        // Parse to validate it's proper JSON, but return the formatted JSON string
        const parsedContent = JSON.parse(jsonContent);
        
        // Ensure all parts exist and have the call to action in part5
        if (!parsedContent.part5 || !parsedContent.part5.includes("follow") || !parsedContent.part5.includes("like")) {
          console.warn("Thread missing proper CTA in part5:", parsedContent.part5);
          
          // If part5 exists but doesn't have a proper CTA, add one
          if (parsedContent.part5) {
            parsedContent.part5 = parsedContent.part5.trim() + " Found this valuable? Follow for more insights like this. Like and repost to share with others!";
            
            // Make sure it's not too long
            if (parsedContent.part5.length > 280) {
              parsedContent.part5 = parsedContent.part5.substring(0, 230) + " Follow for more! Like & RT to share!";
            }
            
            // Return the updated JSON
            return JSON.stringify(parsedContent, null, 2);
          }
        }
        
        // For display purposes, return properly formatted JSON
        return JSON.stringify(parsedContent, null, 2);
      } catch (error) {
        // If JSON parsing fails, try to clean up the content
        console.error('Failed to parse thread JSON response:', error);
        // Return the raw content as a fallback
        return content;
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
  try {
    console.log("Starting thread hooks generation");
    console.log("Tone:", tone);
    
    // Use the API endpoint that uses server-side API key
    const response = await axios.post('/api/generate-hooks', {
      prompt,
      tone
    });
    
    if (!response.data || !response.data.hooks) {
      console.error("Invalid response format:", response.data);
      throw new Error("Failed to generate hooks");
    }
    
    return response.data.hooks;
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      console.error("API error:", axiosError.response.status, axiosError.response.statusText, axiosError.response.data);
      throw new Error(`API error: ${axiosError.response.statusText}`);
    }
    console.error("Error generating hooks:", error);
    throw new Error("Failed to generate hooks");
  }
}
