export interface ViralStrategy {
  name: string;
  description: string;
  examples: string[];
  keyPrinciple: string;
}

export interface DwellTimeOptimization {
  strategy: string;
  description: string;
  examples: string[];
}

export const viralStrategies: ViralStrategy[] = [
  {
    name: "Pattern Interrupt (3-Second Rule)",
    description: "First 3 words must stop the scroll. Challenge assumptions immediately.",
    keyPrinciple: "Pattern interrupt + curiosity gap + open loop",
    examples: [
      "You're being scammed. Not by who you think. And it's costing you $1,000/month.",
      "Your calendar is broken. But not how you think. Here's the 3-minute fix that changed everything.",
      "Stop posting content. Start creating scroll-stoppers. The difference? 10 likes vs 10 million views.",
      "Most people are invisible. Not because they're boring. Because they're predictable. Here's how to break the pattern.",
      "Your business is dying. Slowly. And you won't see it coming. But I can show you the exact moment it started."
    ]
  },
  {
    name: "Dwell Time Masters",
    description: "Create content that makes people pause and think. Not just read, but engage mentally.",
    keyPrinciple: "3 seconds = dead content. 10+ seconds = viral potential",
    examples: [
      "The algorithm doesn't care about your likes. It cares about dwell time. 3 seconds = dead. 10+ seconds = viral potential. Your content should make people stop scrolling and actually think.",
      "Text beats video on X. Every time. Why? People come here to READ, not watch. That 15-second TikTok? Dead on arrival. But a 280-character hook that makes you pause? Gold.",
      "Want 10M+ impressions? Study this structure: [Shocking statement] + [Unexpected twist] + [Promise of value]. Works every single time. The algorithm rewards what humans reward: attention.",
      "Before you post, do this 3-second test: Scroll past your own tweet. Did you stop? No? Delete it. Your content should punch you in the face with curiosity.",
      "Every scroll is a battle for 3 seconds of attention. Win those 3 seconds, and the algorithm becomes your biggest fan. Lose them, and you're invisible."
    ]
  },
  {
    name: "Curiosity Gap",
    description: "Create gaps in knowledge that demand to be filled. Make people NEED to know more.",
    keyPrinciple: "Create knowledge gaps that demand to be filled",
    examples: [
      "I found the secret to viral content. It's not what you think. And it's hiding in plain sight.",
      "The biggest mistake creators make? They answer questions nobody asked. Here's what people actually want to know.",
      "There's a faster way to learn any skill. No courses. No books. Just this 3-step method that actually sticks.",
      "Most people don't get rich by saving. They do it by understanding leverage. Let me show you how that actually works.",
      "Your calendar isn't broken — your priorities are. Here's how I fixed both in under 15 minutes a week."
    ]
  },
  {
    name: "Open Loop",
    description: "End with a promise that creates anticipation. Make people want the next piece.",
    keyPrinciple: "End with a promise that creates anticipation",
    examples: [
      "The biggest reason your business isn't growing? You're working on the wrong thing. This thread will show you where to redirect your focus.",
      "You weren't lazy — you were uninspired. The trick is not discipline, it's design. Here's how to build your day around momentum.",
      "Most health advice overcomplicates things. You don't need a stack of supplements — just these 3 habits. They changed everything for me.",
      "The internet moves fast. Here's what just dropped, what's gaining momentum, and what you don't want to miss this week.",
      "There's a pattern to viral content that most people miss. It's not about being clever. It's about being irresistible. Let me show you the formula."
    ]
  }
];

export const dwellTimeOptimizations: DwellTimeOptimization[] = [
  {
    strategy: "The 3-Second Test",
    description: "Before posting, ask: 'Would I stop scrolling if I saw this?' If no, delete it.",
    examples: [
      "Your content should punch you in the face with curiosity",
      "Make people pause and actually think",
      "Create mental engagement, not just passive reading"
    ]
  },
  {
    strategy: "Text Over Video",
    description: "People come to X to READ, not watch. Focus on compelling text that makes them pause.",
    examples: [
      "280-character hooks that make you pause are gold",
      "15-second TikTok videos are dead on arrival",
      "Compelling text beats video every time"
    ]
  },
  {
    strategy: "Viral Formula",
    description: "[Shocking statement] + [Unexpected twist] + [Promise of value] = Viral potential",
    examples: [
      "You're being scammed. Not by who you think. And it's costing you $1,000/month.",
      "Your calendar is broken. But not how you think. Here's the 3-minute fix that changed everything.",
      "Stop posting content. Start creating scroll-stoppers. The difference? 10 likes vs 10 million views."
    ]
  }
];

// Helper functions for viral content generation
export function getRandomViralStrategy(): ViralStrategy {
  const randomIndex = Math.floor(Math.random() * viralStrategies.length);
  return viralStrategies[randomIndex];
}

export function getViralStrategyByName(name: string): ViralStrategy | null {
  return viralStrategies.find(strategy => strategy.name === name) || null;
}

export function getRandomExampleFromStrategy(strategyName: string): string | null {
  const strategy = getViralStrategyByName(strategyName);
  if (!strategy) return null;
  
  const randomIndex = Math.floor(Math.random() * strategy.examples.length);
  return strategy.examples[randomIndex];
}

export function analyzeContentForDwellTime(content: string): {
  score: number;
  suggestions: string[];
  issues: string[];
} {
  let score = 0;
  const suggestions: string[] = [];
  const issues: string[] = [];

  // Check for pattern interrupt (first 3 words)
  const firstThreeWords = content.split(' ').slice(0, 3).join(' ').toLowerCase();
  const patternInterruptWords = ['you', 'stop', 'most', 'your', 'the', 'this', 'here', 'want', 'need', 'get'];
  
  if (patternInterruptWords.some(word => firstThreeWords.includes(word))) {
    score += 2;
  } else {
    issues.push("First 3 words don't create a pattern interrupt");
    suggestions.push("Start with words that challenge assumptions or create curiosity");
  }

  // Check for curiosity gaps
  const curiosityIndicators = ['but', 'however', 'actually', 'really', 'not', 'never', 'always', 'secret', 'hidden', 'surprising'];
  if (curiosityIndicators.some(indicator => content.toLowerCase().includes(indicator))) {
    score += 2;
  } else {
    issues.push("No curiosity gaps detected");
    suggestions.push("Add unexpected twists or revelations");
  }

  // Check for open loops
  const openLoopIndicators = ['here\'s', 'this will', 'let me show', 'you\'ll see', 'coming up', 'next', 'follow', 'thread'];
  if (openLoopIndicators.some(indicator => content.toLowerCase().includes(indicator))) {
    score += 2;
  } else {
    issues.push("No open loops detected");
    suggestions.push("End with a promise of value or continuation");
  }

  // Check length for dwell time potential
  const wordCount = content.split(' ').length;
  if (wordCount >= 20 && wordCount <= 50) {
    score += 1;
  } else if (wordCount < 10) {
    issues.push("Content too short for meaningful dwell time");
    suggestions.push("Add more substance while maintaining engagement");
  } else if (wordCount > 100) {
    issues.push("Content too long - risk of losing attention");
    suggestions.push("Break into shorter, punchier segments");
  }

  // Check for power words
  const powerWords = ['secret', 'hidden', 'shocking', 'amazing', 'incredible', 'unbelievable', 'game-changing', 'revolutionary'];
  if (powerWords.some(word => content.toLowerCase().includes(word))) {
    score += 1;
  } else {
    suggestions.push("Consider adding power words for emotional impact");
  }

  return {
    score: Math.min(score, 10), // Cap at 10
    suggestions,
    issues
  };
}

export function generateViralHook(topic: string, tone: 'informative' | 'viral' | 'funny' | 'casual'): string {
  const strategies = viralStrategies.filter(s => s.name === "Pattern Interrupt (3-Second Rule)" || s.name === "Curiosity Gap");
  const randomStrategy = strategies[Math.floor(Math.random() * strategies.length)];
  const randomExample = randomStrategy.examples[Math.floor(Math.random() * randomStrategy.examples.length)];
  
  // Replace generic elements with topic-specific content
  return randomExample
    .replace(/calendar/g, topic)
    .replace(/business/g, topic)
    .replace(/content/g, topic)
    .replace(/people/g, `people in ${topic}`)
    .replace(/creators/g, `${topic} professionals`);
}

export function getViralContentTips(): string[] {
  return [
    "Dwell time is the metric that matters - 3 seconds = dead, 10+ seconds = viral potential",
    "First 3 words must stop the scroll with a pattern interrupt",
    "Create curiosity gaps that make people NEED to know more",
    "End with open loops that create anticipation for the next piece",
    "Text beats video on X - people come here to READ, not watch",
    "Use the 3-second test: Would you stop scrolling if you saw this?",
    "The viral formula: [Shocking statement] + [Unexpected twist] + [Promise of value]",
    "Stop posting what YOU want to say. Start posting what THEY can't ignore",
    "Every scroll is a battle for 3 seconds of attention",
    "The algorithm rewards what humans reward: attention and engagement"
  ];
}

export function validateViralContent(content: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const analysis = analyzeContentForDwellTime(content);
  const isValid = analysis.score >= 6 && analysis.issues.length === 0;
  
  const feedback = [
    `Dwell Time Score: ${analysis.score}/10`,
    ...analysis.suggestions,
    ...analysis.issues.map(issue => `⚠️ ${issue}`)
  ];

  return {
    isValid,
    score: analysis.score,
    feedback
  };
} 