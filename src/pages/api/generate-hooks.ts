import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

type ResponseData = {
  hooks?: string[];
  error?: string;
};

type RequestData = {
  prompt: string;
  tone: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, tone } = req.body as RequestData;

    if (!prompt || !tone) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

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

    // Check if the API key exists
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OpenRouter API key is missing. Please check your environment variables.' });
    }

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3.7-sonnet',
        messages: messages,
        max_tokens: 600,
        temperature: 0.8,
        top_p: 1,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://alkaforge.vercel.app',
          'X-Title': 'AlkaForge',
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data || !response.data.choices || response.data.choices.length === 0) {
      return res.status(500).json({ error: 'No hooks generated' });
    }

    // Parse hooks from the response
    const hooksRaw = response.data.choices[0].message.content;
    // Expecting format: 1. ...\n2. ...\n3. ...
    const hooks = hooksRaw
      .split(/\n+/)
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
      .filter((line: string) => line.length > 0)
      .slice(0, 3);

    return res.status(200).json({ hooks });
  } catch (error) {
    console.error('Error generating hooks:', error);
    return res.status(500).json({ error: 'Failed to generate hooks' });
  }
} 