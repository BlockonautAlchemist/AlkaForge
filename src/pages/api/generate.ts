import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { withSubscriptionCheck } from '@/lib/subscriptionMiddleware';
import { incrementUserUsage, getUserSubscription } from '@/lib/subscription';

type ResponseData = {
  content?: string;
  error?: string;
  subscription_tier?: string;
  monthly_usage?: number;
  upgrade_required?: boolean;
};

type RequestData = {
  prompt: string;
  contentType: 'post' | 'thread' | 'reply' | 'discord' | 'hook' | 'summary-cta';
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
    - For X threads: Create a comprehensive thread with the following EXACT structure:
      
      THREAD STRUCTURE (MUST FOLLOW THIS FORMAT):
      1. HOOK TWEET (part1): Create an attention-grabbing opener that sparks curiosity or teases value
      2. CONTEXT TWEET (part2): Add clarity after the hook by providing backstory, dropping a key insight early, or explaining why this thread matters. Examples:
         - "I've spent the last 6 months testing this, and the results shocked me."
         - "Here's what I learned after doing this daily — and why it might change how you approach it."
         - "Let me explain how I stumbled onto this and what it can do for you."
      3. BODY TWEETS (part3-part9): Generate 7 core content tweets that each:
         - Share only ONE idea per tweet
         - Can stand alone as shareable insights  
         - Maintain consistent tone and format
         - Build on previous tweets for cohesive narrative
         - Follow patterns like: "Lesson 1: [statement]. Here's why it matters: [insight]." or "This mistake cost me months. Here's what I'd do differently now."
      4. CTA TWEET (final part): Strong call to action encouraging engagement
      
      IMPORTANT: Each tweet must be under 280 characters. Structure your JSON response with parts 1-10 (hook, context, 7 body tweets, CTA).
      
    - For replies: Keep it extremely concise - one short, impactful sentence. Maximum 50 characters. Be direct and to the point.
    - For Discord announcements: Use markdown formatting appropriately.
    - For Concise Summary and CTA: 
      
      CRITICAL REQUIREMENTS FOR CONCISE SUMMARY WITH CTA:
      
      1. MUST include BOTH a summary AND a call to action - this is non-negotiable
      2. MUST be 280 characters or less total
      3. NO hashtags or emojis allowed
      4. MUST follow this exact structure: "[Brief summary of key points]. [Clear call to action that encourages engagement]."
      
    - For 3-sentence hooks: 
      
      CRITICAL REQUIREMENTS FOR 3-SENTENCE HOOKS:
      
      1. MUST generate EXACTLY 3 sentences - no more, no less
      2. MUST be directly related to the specific content the user provided
      3. MUST follow this exact structure:
         - Sentence 1: Challenge a common assumption or present a surprising fact
         - Sentence 2: Reveal the truth or explain why this matters
         - Sentence 3: Tease the value or solution that follows
      4. MUST match the selected tone (${tone})
      5. MUST spark curiosity about the user's specific content
      
      STRUCTURE TEMPLATE:
      "[Challenge/Surprising fact about user's topic]. [Truth/Why it matters]. [Tease the value from user's content]."
      
      EXAMPLES BY TOPIC:
      
      Marketing: "Most brands think they're telling a story. But what they're really doing is listing features. Here's how to shift your messaging from boring to unforgettable."
      
      Fitness: "You don't need 2 hours a day in the gym to get strong. You just need a smarter system. This one works even when motivation runs out."
      
      Finance: "Most people don't get rich by saving. They do it by understanding leverage. Let me show you how that actually works."
      
      Gaming/Tech: "Most gaming projects fail because they focus on features instead of retention. The successful ones solve onboarding first, then scale. Here's the exact 3-month strategy that's working."
      
      INSTRUCTIONS: 
      Analyze the user's specific content and create a 3-sentence hook that introduces THEIR specific topic, strategy, or insights. Do not be generic - be specific to what they're sharing.
    
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
    
    Pattern 6 - 3-Sentence Hook Examples:
    - "Most brands think they're telling a story. But what they're really doing is listing features. Here's how to shift your messaging from boring to unforgettable."
    - "You don't need 2 hours a day in the gym to get strong. You just need a smarter system. This one works even when motivation runs out."
    - "Most people don't get rich by saving. They do it by understanding leverage. Let me show you how that actually works."
    - "Your calendar isn't broken — your priorities are. Here's how I fixed both in under 15 minutes a week."
    - "The biggest reason your business isn't growing? You're working on the wrong thing. This thread will show you where to redirect your focus."
    - "There's a faster way to learn any new skill. No courses. No books. Just this 3-step method that actually sticks."
    - "You weren't lazy — you were uninspired. The trick is not discipline, it's design. Here's how to build your day around momentum."
    - "Most health advice overcomplicates things. You don't need a stack of supplements — just these 3 habits. They changed everything for me."
    - "The internet moves fast. Here's what just dropped, what's gaining momentum, and what you don't want to miss this week."
    
    Examples of effective thread CTAs:
    - "Found this valuable? Follow me for more insights on [topic]. Like and repost to share with others!"
    - "Want more content like this? Hit follow for daily tips on [topic]. Like if you found this useful!"
    - "If this helped you, make sure to follow for more. Repost to help others in your network!"
    - "Follow for more [topic] breakdowns like this one. Your like and repost help more people see this thread!"
    
    Format Rules:
    1. For X threads, you MUST format your response as a valid, parseable JSON object with this exact structure:
       {
         "part1": "hook tweet - attention-grabbing opener",
         "part2": "context tweet - adds clarity and backstory after the hook",
         "part3": "body tweet 1 - first core idea",
         "part4": "body tweet 2 - second core idea", 
         "part5": "body tweet 3 - third core idea",
         "part6": "body tweet 4 - fourth core idea",
         "part7": "body tweet 5 - fifth core idea",
         "part8": "body tweet 6 - sixth core idea",
         "part9": "body tweet 7 - seventh core idea",
         "part10": "CTA tweet - strong call to action for engagement, following, and sharing"
       }
       Do NOT add any text before or after the JSON. The response should be ONLY the JSON object.
       Generate 10 total parts
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
        model: 'openai/chatgpt-4o-latest',
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

    // Fetch the updated subscription data to return fresh usage numbers
    let updatedSubscription = subscription;
    try {
      const sub = await getUserSubscription(userId);
      if (sub) {
        updatedSubscription = sub;
      }
    } catch (subError) {
      console.error('Error fetching updated subscription:', subError);
    }
    
    return res.status(200).json({ 
      content: generatedContent,
      subscription_tier: updatedSubscription.subscription_tier,
      monthly_usage: updatedSubscription.monthly_usage
    });
  } catch (error) {
    console.error('Error generating content:', error);
    return res.status(500).json({ error: 'Failed to generate content' });
  }
}

// Export the handler wrapped with subscription checking
export default withSubscriptionCheck(generateHandler); 