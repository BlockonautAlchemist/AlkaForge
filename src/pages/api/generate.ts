import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

type ResponseData = {
  content?: string;
  error?: string;
};

type RequestData = {
  prompt: string;
  contentType: 'post' | 'thread' | 'reply' | 'discord';
  tone: 'informative' | 'viral' | 'professional' | 'casual';
  maxTokens?: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, contentType, tone, maxTokens = 1000 } = req.body as RequestData;

    if (!prompt || !contentType || !tone) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const response = await axios.post(
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

    const generatedContent = response.data.choices[0].message.content;
    return res.status(200).json({ content: generatedContent });
  } catch (error) {
    console.error('Error generating content:', error);
    return res.status(500).json({ error: 'Failed to generate content' });
  }
} 