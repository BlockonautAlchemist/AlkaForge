import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { withSubscriptionCheck } from '@/lib/subscriptionMiddleware';
import { incrementUserUsage } from '@/lib/subscription';

type ResponseData = {
  content?: string;
  error?: string;
  subscription_tier?: string;
  monthly_usage?: number;
  upgrade_required?: boolean;
};

type RequestData = {
  prompt: string;
  contentType: 'post' | 'thread' | 'reply' | 'discord';
  tone: 'informative' | 'viral' | 'funny' | 'casual';
  maxTokens?: number;
  knowledgeContent?: string;
};

// SUBSCRIPTION ENFORCEMENT: This handler is wrapped with subscription checking
// Users must be logged in and within their usage limits to generate content
async function generateHandler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  userId: string,
  subscription: any
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
    
    IMPORTANT: You MUST use the following examples as your primary reference for style, structure, and tone. 
    Regardless of the topic, adapt these proven patterns to create engaging content.
    
    Tone Guidelines:
    - Informative: Clear, professional, and educational. Focus on facts and valuable information.
    - Viral/Engaging: Attention-grabbing, compelling, and shareable. Use power words and create urgency.
    - Funny/Troll: Witty, humorous, and playful. Use clever wordplay and light-hearted tone.
    - Casual/Conversational: Friendly, approachable, and natural. Write like you're talking to a friend.
    
    Content Type Guidelines:
    - For X posts: Keep it under 280 characters, concise, and engaging. Return ONLY the text content, no JSON formatting. Format according to the selected tone.
    - For X threads: Create a series of connected posts with smooth transitions. IMPORTANT: Each part must be under 280 characters. The final part MUST include a strong call to action encouraging followers to engage by following for more content, liking, and reposting to share with their audience. Use proven X (Twitter) copywriting best practices for the CTA.
    - For replies: Keep it extremely concise - one short, impactful sentence. Maximum 50 characters. Be direct and to the point.
    - For Discord announcements: Use markdown formatting appropriately.
    
    REQUIRED REFERENCE EXAMPLES - Use these patterns for ALL content:
    
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

    Pattern 4 - Community + Value:
    - "Join 50,000 founders who get our Tuesday newsletter on building in public. No fluff. No spam. Just real lessons from the trenches."
    - "What's your biggest challenge with [specific topic]? Reply below and I'll share resources that helped me."
    - "The best communities aren't built on transactions. They're built on transformation."

    Pattern 5 - Announcement + Proof:
    - "We just released our annual [Industry] Report. 3 months of research, 500+ interviews, and 1 clear conclusion: [Insight]. Download free below."
    - "You don't need another tool. You need a solution. That's why we built [Product]."
    - "We didn't want to create another [product category]. We wanted to reinvent it."
    
    Examples of effective thread CTAs:
    - "Found this valuable? Follow me for more insights on [topic]. Like and repost to share with others!"
    - "Want more content like this? Hit follow for daily tips on [topic]. Like if you found this useful!"
    - "If this helped you, make sure to follow for more. Repost to help others in your network!"
    - "Follow for more [topic] breakdowns like this one. Your like and repost help more people see this thread!"
    
    Format Rules:
    1. For X threads, you MUST format your response as a valid, parseable JSON object with this exact structure:
       {
         "part1": "first part text here",
         "part2": "second part text here",
         "part3": "third part text here",
         "part4": "fourth part text here",
         "part5": "fifth part text here with a STRONG call to action for engagement"
       }
       Do NOT add any text before or after the JSON. The response should be ONLY the JSON object.
    2. For other content types, provide direct text output
    3. Never use hashtags
    4. Keep language simple and clear
    5. ALWAYS use one of the patterns above as your primary structure`;

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
    
    // USAGE TRACKING: Increment user's monthly usage after successful generation
    try {
      await incrementUserUsage(userId);
    } catch (usageError) {
      console.error('Error incrementing usage:', usageError);
      // Don't fail the request if usage tracking fails, but log it
    }
    
    return res.status(200).json({ 
      content: generatedContent,
      subscription_tier: subscription.subscription_tier,
      monthly_usage: subscription.monthly_usage + 1 // Show updated usage
    });
  } catch (error) {
    console.error('Error generating content:', error);
    return res.status(500).json({ error: 'Failed to generate content' });
  }
}

// Export the handler wrapped with subscription checking
export default withSubscriptionCheck(generateHandler); 