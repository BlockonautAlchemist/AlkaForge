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
};

export async function generateContent({
  prompt,
  contentType,
  tone = 'informative',
  maxTokens = 1000
}: ContentGenerationParams): Promise<string> {
  try {
    const response = await axios.post<OpenRouterResponse>(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3-7-sonnet-20240620',
        messages: [
          {
            role: 'system',
            content: `You are an expert content creator specialized in creating engaging ${contentType} content with a ${tone} tone. 
            Format the output appropriately for the content type.
            For X posts, keep it concise and within character limits.
            For X threads, create numbered posts with smooth transitions.
            For replies, make them relevant and engaging.
            For Discord announcements, use appropriate markdown formatting.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://alkaforge.vercel.app',
          'X-Title': 'AlkaForge'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating content with Claude:', error);
    throw new Error('Failed to generate content. Please try again.');
  }
} 