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
  contentType: 'post' | 'thread' | 'reply' | 'discord' | 'hook' | 'summary-cta';
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
    
    // Get the auth token from Supabase
    const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Authentication required. Please log in to generate content.');
    }

    // Use the existing API endpoint that uses server-side API key
    const response = await axios.post('/api/generate', {
      prompt: formattedPrompt,
      contentType,
      tone,
      maxTokens,
      knowledgeContent
    }, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.data || !response.data.content) {
      console.error("Invalid response format:", response.data);
      throw new Error("Received invalid response format from API");
    }
    
    let content = response.data.content;
    
    // Handle different content types
    if (contentType === 'post') {
      // For single posts, ensure we're not getting JSON format
      content = content.trim();
      
      // If content is wrapped in JSON, extract just the text
      if (content.startsWith('{') && content.includes('"part')) {
        try {
          const jsonContent = JSON.parse(content);
          // If it's a single post, just use part1 if it exists
          content = jsonContent.part1 || content;
        } catch (e) {
          // If JSON parsing fails, just use the content as is
          console.warn('Failed to parse JSON content for post:', e);
        }
      }
      
      // Clean up the content
      content = content
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/\\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Enforce 280 character limit for X posts
      if (content.length > 280) {
        // Find the last complete sentence that fits within the limit
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
        content = '';
        let currentLength = 0;
        
        for (const sentence of sentences) {
          const trimmedSentence = sentence.trim();
          if (currentLength + trimmedSentence.length + (currentLength > 0 ? 1 : 0) <= 280) {
            content += (currentLength > 0 ? ' ' : '') + trimmedSentence;
            currentLength += trimmedSentence.length + (currentLength > 0 ? 1 : 0);
          } else {
            break;
          }
        }
        
        content = content.trim();
        
        // If we still don't have any complete sentences that fit, add as many full words as possible without cutting any word off
        if (!content) {
          const words = (response.data.content || '').trim().split(/\s+/);
          content = '';
          currentLength = 0;
          for (const word of words) {
            // +1 for space if not the first word
            if (currentLength + word.length + (currentLength > 0 ? 1 : 0) <= 280) {
              content += (currentLength > 0 ? ' ' : '') + word;
              currentLength += word.length + (currentLength > 0 ? 1 : 0);
            } else {
              break;
            }
          }
          content = content.trim();
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
        
        // Parse to validate it's proper JSON
        const parsedContent = JSON.parse(jsonContent);
        
        // Ensure part10 exists and has a proper call to action
        const ctaKeywords = ['follow', 'like', 'repost', 'share', 'bookmark', 'save', 'rt', 'retweet'];
        const hasCTA = parsedContent.part10 && ctaKeywords.some(keyword => 
          parsedContent.part10.toLowerCase().includes(keyword)
        );
        
        if (!parsedContent.part10 || !hasCTA) {
          console.warn("Thread missing proper CTA in part10:", parsedContent.part10);
          
          // Create a proper CTA for part10
          if (!parsedContent.part10) {
            // If part10 doesn't exist, create it
            parsedContent.part10 = "Found this valuable? Follow for more insights like this. Like and repost to share with others!";
          } else {
            // If part10 exists but lacks CTA, enhance it
            const existingContent = parsedContent.part10.trim();
            parsedContent.part10 = `${existingContent} Follow for more insights like this. Like and repost to share!`;
            
            // Make sure it's not too long
            if (parsedContent.part10.length > 280) {
              parsedContent.part10 = existingContent.substring(0, 200) + " Follow for more! Like & RT to share!";
            }
          }
        }
        
        // Convert to a human-readable thread format
        // Each part on a new line, separated by double line breaks
        const threadParts = [];
        for (let i = 1; i <= 10; i++) {
          const part = parsedContent[`part${i}`];
          if (part) {
            threadParts.push(part);
          }
        }
        
        // Join all parts with double line breaks to create a human-readable thread
        content = threadParts.join('\n\n');
        
      } catch (error) {
        // If JSON parsing fails, try to clean up the content
        console.error('Failed to parse thread JSON response:', error);
        // For non-JSON responses, just return the cleaned content
        content = content
          .replace(/^\s*{\s*"part\d+":\s*"|"\s*}\s*$/g, '') // Remove JSON wrapper
          .replace(/"\s*,\s*"part\d+":\s*"/g, '\n\n') // Replace JSON separators with newlines
          .replace(/\\"/g, '"') // Fix escaped quotes
          .trim(); // Clean up whitespace
      }
    } else if (contentType === 'reply') {
      // For replies, enforce extremely short length
      content = content.trim();
      
      // Clean up the content
      content = content
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/\\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Enforce 50 character limit for replies
      if (content.length > 50) {
        // Find the first complete sentence that fits within the limit
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
        content = sentences[0].trim();
        
        // If still too long, truncate at the last word that fits
        if (content.length > 50) {
          const words = content.split(/\s+/);
          content = '';
          let currentLength = 0;
          
          for (const word of words) {
            if (currentLength + word.length + (currentLength > 0 ? 1 : 0) <= 50) {
              content += (currentLength > 0 ? ' ' : '') + word;
              currentLength += word.length + (currentLength > 0 ? 1 : 0);
            } else {
              break;
            }
          }
          content = content.trim();
        }
      }
    } else if (contentType === 'discord') {
      // Keep Discord markdown formatting intact
      content = content.trim();
    } else if (contentType === 'summary-cta') {
      // For summary with CTA, ensure clean formatting and 280 character limit
      content = content.trim();
      
      // Clean up the content
      content = content
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/\\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Enforce 280 character limit
      if (content.length > 280) {
        // Find the last complete sentence that fits within the limit
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
        content = '';
        let currentLength = 0;
        
        for (const sentence of sentences) {
          const trimmedSentence = sentence.trim();
          if (currentLength + trimmedSentence.length + (currentLength > 0 ? 1 : 0) <= 280) {
            content += (currentLength > 0 ? ' ' : '') + trimmedSentence;
            currentLength += trimmedSentence.length + (currentLength > 0 ? 1 : 0);
          } else {
            break;
          }
        }
        
        content = content.trim();
        
        // If we still don't have any complete sentences that fit, add as many full words as possible
        if (!content) {
          const words = (response.data.content || '').trim().split(/\s+/);
          content = '';
          currentLength = 0;
          for (const word of words) {
            if (currentLength + word.length + (currentLength > 0 ? 1 : 0) <= 280) {
              content += (currentLength > 0 ? ' ' : '') + word;
              currentLength += word.length + (currentLength > 0 ? 1 : 0);
            } else {
              break;
            }
          }
          content = content.trim();
        }
      }
    } else if (contentType === 'hook') {
      // For 3-sentence hooks, ensure clean formatting and appropriate length
      content = content.trim();
      
      // Clean up the content
      content = content
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/\\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Ensure it's exactly 3 sentences
      const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
      if (sentences.length > 3) {
        content = sentences.slice(0, 3).join(' ').trim();
      } else if (sentences.length < 3) {
        // If we have fewer than 3 sentences, try to split by other punctuation
        const parts = content.split(/[.!?]+/).filter((part: string) => part.trim().length > 0);
        if (parts.length >= 3) {
          content = parts.slice(0, 3).map((part: string) => part.trim() + '.').join(' ').trim();
        }
      }
      
      // Ensure the hook is compelling and engaging
      if (content.length > 200) {
        // If too long, truncate to the first 3 complete sentences that fit
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
        content = '';
        let currentLength = 0;
        let sentenceCount = 0;
        
        for (const sentence of sentences) {
          const trimmedSentence = sentence.trim();
          if (currentLength + trimmedSentence.length + (currentLength > 0 ? 1 : 0) <= 200 && sentenceCount < 3) {
            content += (currentLength > 0 ? ' ' : '') + trimmedSentence;
            currentLength += trimmedSentence.length + (currentLength > 0 ? 1 : 0);
            sentenceCount++;
          } else {
            break;
          }
        }
        
        content = content.trim();
      }
    } else {
      // For posts, replies, and summary-cta, ensure clean formatting
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
    
    // Get the auth token from Supabase
    const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Authentication required. Please log in to generate content.');
    }

    // Use the API endpoint that uses server-side API key
    const response = await axios.post('/api/generate-hooks', {
      prompt,
      tone
    }, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.data || !response.data.hooks) {
      console.error("Invalid response format:", response.data);
      throw new Error("Failed to generate hooks");
    }
    
    return response.data.hooks;
  } catch (error) {
    console.error("Error generating hooks:", error);
    throw new Error("Failed to generate hooks. Please try again.");
  }
}
