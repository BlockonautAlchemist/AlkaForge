import axios from 'axios';

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
  tone?: 'informative' | 'viral' | 'professional' | 'casual';
  maxTokens?: number;
  knowledgeContent?: string;
};

export async function generateContent({
  prompt,
  contentType,
  tone = 'informative',
  maxTokens = 1000,
  knowledgeContent = ''
}: ContentGenerationParams): Promise<string> {
  try {
    console.log("Starting content generation with OpenRouter");
    console.log("Content type:", contentType);
    console.log("Tone:", tone);
    console.log("Max tokens:", maxTokens);
    console.log("Knowledge content length:", knowledgeContent.length);
    console.log("API Key available:", !!process.env.NEXT_PUBLIC_OPENROUTER_API_KEY);
    
    let systemPrompt = `You are an expert content creator specialized in creating engaging ${contentType} content with a ${tone} tone. 
    Format the output appropriately for the content type.
    For X posts, keep it concise and within character limits.
    For X threads, create numbered posts with smooth transitions.
    For replies, make them relevant and engaging.
    For Discord announcements, use appropriate markdown formatting.`;

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
      content: prompt
    });

    console.log("Sending request to OpenRouter API");
    
    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
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
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating content with Claude:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
    }
    
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 