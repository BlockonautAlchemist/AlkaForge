import { copywritingExamples, getRandomExample } from './copywritingExamples';

interface XPostTemplate {
  category: string;
  template: string;
  variables?: string[];
}

const xPostTemplates: XPostTemplate[] = [
  {
    category: "Personal Brand/Thought Leadership",
    template: "🎯 {insight}\n\n{personal_experience}\n\nWhat's your biggest lesson learned?",
    variables: ["insight", "personal_experience"]
  },
  {
    category: "Product Marketing",
    template: "🚀 {problem}\n\n{product_solution}\n\nTry it now: {link}",
    variables: ["problem", "product_solution", "link"]
  },
  {
    category: "Educational/Informative",
    template: "📚 {question}\n\n{answer}\n\n{call_to_action}",
    variables: ["question", "answer", "call_to_action"]
  },
  {
    category: "Community Building",
    template: "👥 {community_value}\n\n{invitation}\n\n{benefit}",
    variables: ["community_value", "invitation", "benefit"]
  },
  {
    category: "Promotional",
    template: "🎁 {announcement}\n\n{value_proposition}\n\n{action}",
    variables: ["announcement", "value_proposition", "action"]
  }
];

export function generateXPost(category: string, variables: Record<string, string>): string {
  // Get a random example from the category for inspiration
  const example = getRandomExample(category);
  if (!example) return '';

  // Find the matching template
  const template = xPostTemplates.find(t => t.category === category);
  if (!template) return '';

  // Replace variables in the template
  let post = template.template;
  for (const [key, value] of Object.entries(variables)) {
    // Replace all instances of the placeholder, not just the first
    const pattern = new RegExp(`\\{${key}\\}`, 'g');
    post = post.replace(pattern, value);
  }

  // Ensure the post is within X's character limit (280 characters)
  if (post.length > 280) {
    post = post.substring(0, 277) + '...';
  }

  return post;
}

// Example usage:
/*
const post = generateXPost('Product Marketing', {
  problem: "Tired of messy spreadsheets?",
  product_solution: "We built a tool that makes data analysis feel like magic.",
  link: "https://example.com"
});
*/

export function getXPostSuggestions(category: string): string[] {
  const examples = copywritingExamples.find(c => c.category === category)?.examples || [];
  return examples.map(example => {
    // Convert example to X post format
    return example
      .replace(/\[.*?\]/g, '') // Remove placeholder brackets
      .trim();
  });
}

// Helper function to analyze post length and provide feedback
export function analyzeXPost(post: string): {
  length: number;
  remainingChars: number;
  isWithinLimit: boolean;
} {
  const length = post.length;
  const remainingChars = 280 - length;
  const isWithinLimit = length <= 280;

  return {
    length,
    remainingChars,
    isWithinLimit
  };
} 