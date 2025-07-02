interface ExtractUrlResponse {
  content: string;
  title?: string;
  url: string;
}

// Helper function to extract YouTube video ID from URL
function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Helper function to extract comprehensive content from HTML string
function extractContentFromHtml(html: string, isYoutube: boolean = false): { title: string; content: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
  
  if (isYoutube) {
    // For YouTube, try to get more comprehensive info
    let content = '';
    
    // Try to extract video description from various places
    const ogDescriptionMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const metaDescriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    
    // Try to find video description in JSON-LD or page data
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const jsonLdMatch of jsonLdMatches) {
        try {
          const jsonContent = jsonLdMatch.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          const jsonData = JSON.parse(jsonContent);
          if (jsonData.description) {
            content += jsonData.description + '\n\n';
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }
    }
    
    // Add meta descriptions if we haven't found content yet
    if (!content) {
      content = ogDescriptionMatch?.[1] || metaDescriptionMatch?.[1] || '';
    }
    
    // Try to extract captions/transcript if available (basic attempt)
    const captionMatches = html.match(/\"captions\":\{[^}]*\"playerCaptionsTracklistRenderer\":\{[^}]*\"captionTracks\":\[([\s\S]*?)\]/);
    if (captionMatches) {
      content += '\n\n[Note: Video has captions available but full transcript extraction requires specialized tools]';
    }
    
    return { title, content };
  } else {
    // For regular web pages, extract full article content
    let content = '';
    
    // Remove unwanted elements first
    let cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*menu[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // Try to find main content areas (in order of preference)
    const contentSelectors = [
      // Article content
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*entry[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*id="[^"]*main[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      // Paragraph content
      /<p[^>]*>([\s\S]*?)<\/p>/gi
    ];
    
    for (const selector of contentSelectors) {
      const matches = cleanHtml.match(selector);
      if (matches && matches.length > 0) {
        // Take the largest match (likely the main content)
        const largestMatch = matches.reduce((prev, current) => 
          current.length > prev.length ? current : prev
        );
        
        // Extract text content from the HTML
        const textContent = largestMatch
          .replace(/<[^>]*>/g, ' ') // Remove HTML tags
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
          .trim();
        
        if (textContent.length > 200) { // Only use if substantial content
          content = textContent;
          break;
        }
      }
    }
    
    // Fallback: if no main content found, extract all paragraph text
    if (!content || content.length < 200) {
      const paragraphs = cleanHtml.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
      if (paragraphs) {
        const allParagraphs = paragraphs
          .map(p => p.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
          .filter(p => p.length > 20) // Filter out very short paragraphs
          .join('\n\n');
        
        if (allParagraphs.length > content.length) {
          content = allParagraphs;
        }
      }
    }
    
    // Final fallback: extract all text from body
    if (!content || content.length < 100) {
      const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        content = bodyMatch[1]
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    
    return { title, content };
  }
}

// Helper function to get browser-like headers
function getBrowserHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0'
  };
}

// Helper function to extract YouTube transcript data
async function extractYouTubeTranscript(videoId: string): Promise<string> {
  try {
    // Try to get transcript from YouTube's internal API
    const transcriptApiUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`;
    
    const response = await fetch(transcriptApiUrl, {
      headers: getBrowserHeaders()
    });
    
    if (response.ok) {
      const transcriptXml = await response.text();
      
      // Parse the XML transcript
      const textMatches = transcriptXml.match(/<text[^>]*>([^<]+)<\/text>/g);
      if (textMatches) {
        const transcript = textMatches
          .map(match => match.replace(/<[^>]*>/g, '').trim())
          .filter(text => text.length > 0)
          .join(' ');
        
        if (transcript.length > 100) {
          return transcript;
        }
      }
    }
  } catch (error) {
    console.log('Could not fetch transcript from API, trying page extraction');
  }
  
  return '';
}

// Helper function to get YouTube content
async function getYouTubeContent(videoId: string): Promise<string> {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: getBrowserHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube page (${response.status})`);
    }
    
    const html = await response.text();
    const { title, content } = extractContentFromHtml(html, true); // Pass true for YouTube
    
    // Try to get the full transcript
    const transcript = await extractYouTubeTranscript(videoId);
    
    // Build comprehensive content
    let enhancedContent = content;
    
    // Try to extract video duration
    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
    if (durationMatch) {
      const duration = Math.round(parseInt(durationMatch[1]) / 60);
      enhancedContent += `\n\nVideo Duration: ${duration} minutes`;
    }
    
    // Try to extract view count
    const viewCountMatch = html.match(/"viewCount":"(\d+)"/);
    if (viewCountMatch) {
      const views = parseInt(viewCountMatch[1]).toLocaleString();
      enhancedContent += `\nView Count: ${views} views`;
    }
    
    // Try to extract upload date
    const uploadDateMatch = html.match(/"uploadDate":"([^"]+)"/);
    if (uploadDateMatch) {
      enhancedContent += `\nUpload Date: ${uploadDateMatch[1]}`;
    }
    
    // Add transcript if available
    if (transcript && transcript.length > 100) {
      enhancedContent += `\n\nFull Transcript:\n${transcript}`;
    } else {
      enhancedContent += `\n\n[Note: Full transcript not available - using video description and metadata]`;
    }
    
    return `YouTube Video: ${title}\n\n${enhancedContent}`;
  } catch (error) {
    console.error('Error fetching YouTube content:', error);
    throw new Error('Failed to extract YouTube video content. The video may be private or restricted.');
  }
}

// Helper function to extract content from regular web pages with retry logic
async function extractWebPageContent(url: string): Promise<string> {
  const maxRetries = 2;
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: getBrowserHeaders(),
        redirect: 'follow'
      });
      
      if (!response.ok) {
        // Handle specific HTTP errors
        if (response.status === 403) {
          throw new Error('Access forbidden - The website is blocking automated requests');
        } else if (response.status === 404) {
          throw new Error('Page not found - The URL may be incorrect or the page may have been removed');
        } else if (response.status === 429) {
          throw new Error('Rate limited - Too many requests to this website');
        } else if (response.status >= 500) {
          throw new Error('Server error - The website is experiencing issues');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      const html = await response.text();
      const { title, content } = extractContentFromHtml(html, false); // Pass false for regular web pages
      
      // Additional content cleanup and enhancement
      let enhancedContent = content;
      
      // Remove common unwanted text patterns
      enhancedContent = enhancedContent
        .replace(/\b(cookies?|privacy policy|terms of service|subscribe|newsletter|advertisement|ads?)\b[^\n]*/gi, '')
        .replace(/\b(follow us|share this|like us|tweet|facebook|twitter|instagram|linkedin)\b[^\n]*/gi, '')
        .replace(/\bcopyrights?[^\n]*/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      return `Article: ${title}\n\nContent: ${enhancedContent}`;
    } catch (error) {
      console.error(`Error extracting web page content (attempt ${attempt + 1}):`, error);
      lastError = error as Error;
      
      // If it's a network error or server error, we might want to retry
      if (attempt < maxRetries - 1 && (error as Error).message.includes('fetch')) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        continue;
      }
      
      // Don't retry for client errors like 403, 404
      break;
    }
  }
  
  throw lastError!;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Validate URL
    const urlObj = new URL(url);
    
    let content: string;
    
    // Check if it's a YouTube URL
    const youtubeVideoId = getYouTubeVideoId(url);
    if (youtubeVideoId) {
      content = await getYouTubeContent(youtubeVideoId);
    } else {
      // Extract content from regular web page
      content = await extractWebPageContent(url);
    }
    
    // Limit content length to avoid token limits (increased for better extraction)
    let contentLength = content.length;
    if (content.length > 100000) {
      content = content.substring(0, 100000) + '... [content truncated due to length - showing first 100,000 characters]';
    }
    
    return res.status(200).json({
      content,
      url: url,
      originalLength: contentLength,
      truncated: contentLength > 100000
    });
    
  } catch (error) {
    console.error('Error processing URL:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to extract content from URL' 
    });
  }
} 