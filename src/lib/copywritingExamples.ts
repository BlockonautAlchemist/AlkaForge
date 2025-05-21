export interface CopywritingExample {
  category: string;
  examples: string[];
}

export const copywritingExamples: CopywritingExample[] = [
  {
    category: "Personal Brand/Thought Leadership",
    examples: [
      "I spent 10 years building a $50M business. Here are the 3 decisions that actually mattered.",
      "The biggest career mistake I made was chasing titles instead of skills. Skills compound. Titles fade.",
      "Most people try to change too many habits at once. Pick one keystone habit and master it. The rest will follow."
    ]
  },
  {
    category: "Product Marketing",
    examples: [
      "We built this because we were tired of spreadsheets that felt like math homework. Turns out, 25,000 other people were too.",
      "What if your email inbox sorted itself? Not someday. Today. [Product] is now in open beta.",
      "Good design feels obvious in hindsight. Great design feels inevitable."
    ]
  },
  {
    category: "Educational/Informative",
    examples: [
      "ChatGPT is just the beginning. The real revolution starts when AI models can reason about cause and effect.",
      "Three books that changed how I think about business: [Book A], [Book B], [Book C]. Not because they had all the answers, but because they asked better questions.",
      "The secret to productivity isn't time management. It's energy management."
    ]
  },
  {
    category: "Community Building",
    examples: [
      "Join 50,000 founders who get our Tuesday newsletter on building in public. No fluff. No spam. Just real lessons from the trenches.",
      "What's your biggest challenge with [specific topic]? Reply below and I'll share resources that helped me.",
      "The best communities aren't built on transactions. They're built on transformation."
    ]
  },
  {
    category: "Promotional",
    examples: [
      "We just released our annual [Industry] Report. 3 months of research, 500+ interviews, and 1 clear conclusion: [Insight]. Download free below.",
      "You don't need another tool. You need a solution. That's why we built [Product].",
      "We didn't want to create another [product category]. We wanted to reinvent it."
    ]
  }
];

// Helper function to get random example from a specific category
export function getRandomExample(category: string): string | null {
  const categoryData = copywritingExamples.find(c => c.category === category);
  if (!categoryData) return null;
  
  const randomIndex = Math.floor(Math.random() * categoryData.examples.length);
  return categoryData.examples[randomIndex];
}

// Helper function to get all examples from a specific category
export function getExamplesByCategory(category: string): string[] | null {
  const categoryData = copywritingExamples.find(c => c.category === category);
  return categoryData ? categoryData.examples : null;
}

// Helper function to get all categories
export function getAllCategories(): string[] {
  return copywritingExamples.map(c => c.category);
} 