import type { NextApiRequest, NextApiResponse } from 'next';
import { withSubscriptionCheck } from '@/lib/subscriptionMiddleware';
import { incrementUserUsage } from '@/lib/subscription';
import { 
  analyzeContentForDwellTime, 
  validateViralContent, 
  getViralContentTips,
  getRandomViralStrategy,
  generateViralHook,
  viralStrategies,
  dwellTimeOptimizations
} from '@/lib/viralContentStrategies';

type ResponseData = {
  analysis?: {
    score: number;
    suggestions: string[];
    issues: string[];
    isValid: boolean;
    feedback: string[];
  };
  optimization?: {
    strategy: string;
    description: string;
    examples: string[];
  };
  viralHook?: string;
  tips?: string[];
  error?: string;
  subscription_tier?: string;
  monthly_usage?: number;
};

type RequestData = {
  content: string;
  topic?: string;
  tone?: 'informative' | 'viral' | 'funny' | 'casual';
  action: 'analyze' | 'optimize' | 'generate-hook' | 'get-tips' | 'get-strategies';
};

async function viralAnalyzerHandler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  userId: string,
  subscription: any
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, topic, tone, action } = req.body as RequestData;

    if (!action) {
      return res.status(400).json({ error: 'Missing required parameter: action' });
    }

    let responseData: ResponseData = {};

    switch (action) {
      case 'analyze':
        if (!content) {
          return res.status(400).json({ error: 'Missing required parameter: content for analysis' });
        }
        
        const analysis = analyzeContentForDwellTime(content);
        const validation = validateViralContent(content);
        
        responseData.analysis = {
          score: analysis.score,
          suggestions: analysis.suggestions,
          issues: analysis.issues,
          isValid: validation.isValid,
          feedback: validation.feedback
        };
        break;

      case 'optimize':
        if (!content) {
          return res.status(400).json({ error: 'Missing required parameter: content for optimization' });
        }
        
        const analysisForOptimization = analyzeContentForDwellTime(content);
        const randomOptimization = dwellTimeOptimizations[Math.floor(Math.random() * dwellTimeOptimizations.length)];
        
        responseData.optimization = {
          strategy: randomOptimization.strategy,
          description: randomOptimization.description,
          examples: randomOptimization.examples
        };
        break;

      case 'generate-hook':
        if (!topic) {
          return res.status(400).json({ error: 'Missing required parameter: topic for hook generation' });
        }
        
        const hook = generateViralHook(topic, tone || 'viral');
        responseData.viralHook = hook;
        break;

      case 'get-tips':
        const tips = getViralContentTips();
        responseData.tips = tips;
        break;

      case 'get-strategies':
        const randomStrategy = getRandomViralStrategy();
        responseData.optimization = {
          strategy: randomStrategy.name,
          description: randomStrategy.description,
          examples: randomStrategy.examples
        };
        break;

      default:
        return res.status(400).json({ error: 'Invalid action. Must be one of: analyze, optimize, generate-hook, get-tips, get-strategies' });
    }

    // Increment usage for all actions
    try {
      await incrementUserUsage(userId);
    } catch (usageError) {
      console.error('Error incrementing usage:', usageError);
      // Don't fail the request if usage tracking fails
    }

    return res.status(200).json({
      ...responseData,
      subscription_tier: subscription.subscription_tier,
      monthly_usage: subscription.monthly_usage
    });

  } catch (error) {
    console.error('Error in viral analyzer:', error);
    return res.status(500).json({ error: 'Failed to analyze content' });
  }
}

export default withSubscriptionCheck(viralAnalyzerHandler); 