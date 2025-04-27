import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

type ResponseData = {
  content?: string;
  error?: string;
};

type RequestData = {
  prompt: string;
  contentType: 'post' | 'thread' | 'reply' | 'discord';
  tone: 'informative' | 'viral' | 'funny' | 'casual';
  maxTokens?: number;
  knowledgeContent?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, contentType, tone, maxTokens = 1000, knowledgeContent = '' } = req.body as RequestData;

    if (!prompt || !contentType || !tone) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    let systemPrompt = `You are an expert content creator specialized in creating engaging ${contentType} content with a ${tone} tone. 
    Format the output appropriately for the content type.
    
    SELECTED CONTENT TYPE: ${contentType.toUpperCase()}
    SELECTED TONE: ${tone.toUpperCase()}
    
    Content Type Guidelines:
    - For X posts: Keep it under 280 characters, concise, and engaging.
    - For X threads: Create a series of connected posts with smooth transitions.
    - For replies: Make them contextual, engaging, and conversational.
    - For Discord announcements: Use markdown formatting appropriately.
    
    Format Rules:
    1. For X threads, format your response as a JSON object with "part1" through "part5" keys
    2. For other content types, provide direct text output
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
        content: prompt
      }
    ];

    // Check if the API key exists
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OpenRouter API key is missing. Please check your environment variables.' });
    }

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3-7-sonnet',
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.7,
        top_p: 1
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://alkaforge.vercel.app',
          'X-Title': 'AlkaForge'
        }
      }
    );

    const generatedContent = response.data.choices[0].message.content;
    return res.status(200).json({ content: generatedContent });
  } catch (error) {
    console.error('Error generating content:', error);
    return res.status(500).json({ error: 'Failed to generate content' });
  }
} 