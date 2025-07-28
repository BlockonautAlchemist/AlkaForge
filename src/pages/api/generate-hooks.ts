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
    
    IMPORTANT: You MUST use one of these proven patterns for EACH hook you generate. 
    Adapt these patterns to fit the content while maintaining their engaging structure:

    Pattern 1 - Personal Story + Lesson:
    - "I spent 10 years building a $50M business. Here are the 3 decisions that actually mattered."
    - "The biggest career mistake I made was chasing titles instead of skills. Skills compound. Titles fade."
    - "Most people try to change too many habits at once. Pick one keystone habit and master it. The rest will follow."

    Pattern 2 - Problem + Solution:
    - "We built this because we were tired of spreadsheets that felt like math homework. Turns out, 25,000 other people were too."
    - "What if your email inbox sorted itself? Not someday. Today. [Product] is now in open beta."
    - "Good design feels obvious in hindsight. Great design feels inevitable."

    Pattern 3 - Insight + Impact:
    - "ChatGPT is just the beginning. The real revolution starts when AI models can reason about cause and effect."
    - "Three books that changed how I think about business: [Book A], [Book B], [Book C]. Not because they had all the answers, but because they asked better questions."
    - "The secret to productivity isn't time management. It's energy management."
    
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
        model: 'moonshotai/kimi-k2:free',
        messages: messages,
        max_tokens: 600,
        temperature: 0.6,
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