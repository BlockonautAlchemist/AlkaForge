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

// Helper function to get browser-like headers with more realistic values
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
    'Cache-Control': 'max-age=0',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"'
  };
}

// Improved content extraction function
function extractContentFromHtml(html: string, isYoutube: boolean = false): { title: string; content: string } {
  // Extract title with better regex
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
  
  if (isYoutube) {
    // For YouTube, focus ONLY on transcript extraction
    let content = '';
    
    // Method 1: Try to extract transcript from JSON-LD structured data
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const jsonLdMatch of jsonLdMatches) {
        try {
          const jsonContent = jsonLdMatch.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          const jsonData = JSON.parse(jsonContent);
          
          // Handle both single objects and arrays
          const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
          
          for (const item of dataArray) {
            // Only look for transcript data, ignore descriptions
            if (item.transcript) {
              content += item.transcript + '\n\n';
            }
            if (item.captions) {
              content += item.captions + '\n\n';
            }
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }
    }
    
    // Method 2: Try to extract from YouTube's transcript API data
    const transcriptPatterns = [
      /"transcript":"([^"]+)"/g,
      /"transcript":\s*"([^"]+)"/g,
      /"captions":\s*\{[^}]*"text":"([^"]+)"/g,
      /"captionTracks":\s*\[[^\]]*"text":"([^"]+)"/g,
      /"transcriptText":"([^"]+)"/g,
      /"transcriptText":\s*"([^"]+)"/g,
      /"text":"([^"]+)"[^}]*"startMs":/g,
      /"text":"([^"]+)"[^}]*"start":/g
    ];
    
    for (const pattern of transcriptPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        for (const match of matches) {
          const text = match.replace(pattern, '$1');
          if (text.length > 100 && !content.includes(text)) {
            content += text + '\n\n';
          }
        }
      }
    }
    
    // Method 3: Try to extract from YouTube's ytInitialData for transcript
    const ytDataMatch = html.match(/var ytInitialData = ({[\s\S]*?});/);
    if (ytDataMatch) {
      try {
        const ytData = JSON.parse(ytDataMatch[1]);
        
        // Look specifically for transcript data in the YouTube structure
        const transcriptPaths = [
          'contents.twoColumnWatchNextResults.results.results.contents.1.transcriptRenderer.body.transcriptBodyRenderer.cueGroups',
          'contents.twoColumnWatchNextResults.results.results.contents.1.transcriptRenderer',
          'contents.twoColumnWatchNextResults.results.results.contents.1',
          'contents.twoColumnWatchNextResults.results.results.contents',
          'contents.twoColumnWatchNextResults.results.results',
          'contents.twoColumnWatchNextResults.results',
          'contents.twoColumnWatchNextResults',
          'contents'
        ];
        
        for (const path of transcriptPaths) {
          const pathParts = path.split('.');
          let current = ytData;
          let found = true;
          
          for (const part of pathParts) {
            if (current && typeof current === 'object' && part in current) {
              current = current[part];
            } else {
              found = false;
              break;
            }
          }
          
          if (found && current) {
            // Extract transcript text from the structure
            if (Array.isArray(current)) {
              const transcriptText = current
                .filter(item => item && typeof item === 'object')
                .map(item => {
                  if (item.cueGroupRenderer && item.cueGroupRenderer.cues) {
                    return item.cueGroupRenderer.cues
                      .filter((cue: any) => cue.transcriptCueRenderer && cue.transcriptCueRenderer.cue)
                      .map((cue: any) => cue.transcriptCueRenderer.cue.simpleText)
                      .join(' ');
                  }
                  return null;
                })
                .filter(text => text && text.length > 0)
                .join(' ');
              
              if (transcriptText.length > 100) {
                content += transcriptText + '\n\n';
                break;
              }
            }
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // Method 4: Try to extract from transcript-specific patterns in HTML
    const htmlTranscriptPatterns = [
      /<div[^>]*class="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*id="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<span[^>]*class="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
      /<div[^>]*class="[^"]*caption[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*id="[^"]*caption[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
    ];
    
    for (const pattern of htmlTranscriptPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        for (const match of matches) {
          const text = match
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (text.length > 100 && !content.includes(text)) {
            content += text + '\n\n';
          }
        }
      }
    }
    
    // If no transcript found, return empty content
    if (!content || content.length < 50) {
      return { title, content: 'No transcript available for this video.' };
    }
    
    return { title, content: content.trim() };
  } else {
    // For regular web pages, use improved content extraction
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
      .replace(/<div[^>]*class="[^"]*menu[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*cookie[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*popup[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // Try multiple content extraction strategies
    const contentSelectors = [
      // Semantic HTML elements
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
      /<section[^>]*>([\s\S]*?)<\/section>/gi,
      
      // Common content class names
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*entry[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*class="[^"]*body[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      
      // Common content IDs
      /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*id="[^"]*main[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*id="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<div[^>]*id="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      
      // Paragraph content as fallback
      /<p[^>]*>([\s\S]*?)<\/p>/gi
    ];
    
    // Try each selector and find the best content
    let bestContent = '';
    let bestScore = 0;
    
    for (const selector of contentSelectors) {
      const matches = cleanHtml.match(selector);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          // Extract text content from the HTML
          const textContent = match
            .replace(/<[^>]*>/g, ' ') // Remove HTML tags
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
            .trim();
          
          // Score the content based on length and quality
          if (textContent.length > 200) {
            const score = textContent.length + (textContent.match(/[.!?]/g)?.length || 0) * 10;
            if (score > bestScore) {
              bestContent = textContent;
              bestScore = score;
            }
          }
        }
      }
    }
    
    content = bestContent;
    
    // If no good content found, try extracting all paragraphs
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
    
    return { title, content: content.trim() };
  }
}

// Helper function to try to get YouTube transcript directly from the transcript API
async function getYouTubeTranscript(videoId: string): Promise<string> {
  try {
    // Method 1: Try to get the transcript using YouTube's internal transcript API with JSON format
    const transcriptUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&fmt=json3`;
    
    const response = await fetch(transcriptUrl, {
      headers: getBrowserHeaders()
    });
    
    if (response.ok) {
      const transcriptData = await response.json();
      
      if (transcriptData && transcriptData.events) {
        const transcript = transcriptData.events
          .filter((event: any) => event.segs && event.segs.length > 0)
          .map((event: any) => {
            return event.segs
              .map((seg: any) => seg.utf8)
              .join('')
              .trim();
          })
          .filter((text: string) => text && text.length > 0)
          .join(' ');
        
        if (transcript.length > 100) {
          return transcript;
        }
      }
    }
  } catch (error) {
    console.log('Could not fetch transcript from YouTube API (JSON format)');
  }
  
  // Method 2: Try alternative transcript API endpoint with XML format
  try {
    const altTranscriptUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`;
    
    const response = await fetch(altTranscriptUrl, {
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
    console.log('Could not fetch transcript from alternative API (XML format)');
  }
  
  // Method 3: Try to get transcript list first, then fetch the best available
  try {
    const listUrl = `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`;
    
    const listResponse = await fetch(listUrl, {
      headers: getBrowserHeaders()
    });
    
    if (listResponse.ok) {
      const listXml = await listResponse.text();
      
      // Parse available transcript tracks
      const trackMatches = listXml.match(/<track[^>]*lang_code="([^"]*)"[^>]*>/g);
      if (trackMatches) {
        // Try English first, then any other language
        const languages = ['en', 'en-US', 'en-GB'];
        
        for (const lang of languages) {
          const langMatch = trackMatches.find(track => track.includes(`lang_code="${lang}"`));
          if (langMatch) {
            const transcriptResponse = await fetch(`https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}`, {
              headers: getBrowserHeaders()
            });
            
            if (transcriptResponse.ok) {
              const transcriptXml = await transcriptResponse.text();
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
          }
        }
        
        // If no English transcript, try the first available language
        if (trackMatches.length > 0) {
          const firstTrack = trackMatches[0];
          const langMatch = firstTrack.match(/lang_code="([^"]*)"/);
          
          if (langMatch) {
            const lang = langMatch[1];
            const transcriptResponse = await fetch(`https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}`, {
              headers: getBrowserHeaders()
            });
            
            if (transcriptResponse.ok) {
              const transcriptXml = await transcriptResponse.text();
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
          }
        }
      }
    }
  } catch (error) {
    console.log('Could not fetch transcript list');
  }
  
  return '';
}

// Helper function to get YouTube content with better error handling
async function getYouTubeContent(videoId: string): Promise<string> {
  try {
    console.log(`Attempting to extract YouTube content for video ID: ${videoId}`);
    
    // First, try to get the transcript directly from YouTube's API
    const transcript = await getYouTubeTranscript(videoId);
    
    if (transcript && transcript.length > 100) {
      console.log(`Successfully extracted transcript, length: ${transcript.length} characters`);
      return transcript;
    }
    
    console.log('No transcript found via API, trying page extraction...');
    
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: getBrowserHeaders(),
      redirect: 'follow'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Video not found - The video may have been removed or made private');
      } else if (response.status === 403) {
        throw new Error('Access forbidden - YouTube is blocking automated requests');
      } else {
        throw new Error(`Failed to fetch YouTube page (${response.status})`);
      }
    }
    
    const html = await response.text();
    console.log(`Successfully fetched YouTube page, HTML length: ${html.length}`);
    
    const { title, content } = extractContentFromHtml(html, true);
    
    console.log(`Extracted content length: ${content.length} characters`);
    console.log(`Content preview: ${content.substring(0, 200)}...`);
    
    // Build comprehensive content
    let enhancedContent = content;
    
    if (!enhancedContent.trim()) {
      enhancedContent = 'No transcript available for this video. The video may not have captions enabled, may be in a different language, or may require manual transcription.';
    }
    
    return enhancedContent;
  } catch (error) {
    console.error('Error fetching YouTube content:', error);
    throw new Error(`Failed to extract YouTube video content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to try extraction via a third-party service as fallback
async function extractViaFallbackService(url: string): Promise<string> {
  try {
    console.log(`Attempting fallback extraction for: ${url}`);
    
    // Try using a public API service as fallback
    // Note: This is a placeholder - you would need to implement with a real service
    const fallbackResponse = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&meta=true&embed=text`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });
    
    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();
      if (data.data && data.data.description) {
        return data.data.description;
      }
    }
  } catch (error) {
    console.log('Fallback service also failed:', error);
  }
  
  throw new Error('All extraction methods failed. The content may require JavaScript or be behind a paywall.');
}

// Helper function to extract content from regular web pages with improved error handling
async function extractWebPageContent(url: string): Promise<string> {
  const maxRetries = 3;
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Attempting to extract web page content (attempt ${attempt + 1}): ${url}`);
      
      const response = await fetch(url, {
        headers: getBrowserHeaders(),
        redirect: 'follow',
        // Add timeout
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (!response.ok) {
        // Handle specific HTTP errors with better messages
        if (response.status === 403) {
          throw new Error('Access forbidden - The website is blocking automated requests. Try copying the content manually.');
        } else if (response.status === 404) {
          throw new Error('Page not found - The URL may be incorrect or the page may have been removed.');
        } else if (response.status === 429) {
          throw new Error('Rate limited - Too many requests to this website. Please wait a moment and try again.');
        } else if (response.status >= 500) {
          throw new Error('Server error - The website is experiencing issues. Please try again later.');
        } else {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
      }
      
      const html = await response.text();
      console.log(`Successfully fetched web page, HTML length: ${html.length}`);
      
      const { title, content } = extractContentFromHtml(html, false);
      
      // Additional content cleanup and enhancement
      let enhancedContent = content;
      
      // Remove common unwanted text patterns
      enhancedContent = enhancedContent
        .replace(/\b(cookies?|privacy policy|terms of service|subscribe|newsletter|advertisement|ads?)\b[^\n]*/gi, '')
        .replace(/\b(follow us|share this|like us|tweet|facebook|twitter|instagram|linkedin)\b[^\n]*/gi, '')
        .replace(/\bcopyrights?[^\n]*/gi, '')
        .replace(/\b(accept|decline|got it|understand)\b[^\n]*/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Check if we got meaningful content
      if (!enhancedContent || enhancedContent.length < 100) {
        throw new Error('Could not extract meaningful content from the page. The page may be empty, require JavaScript, or have a complex layout.');
      }
      
      return enhancedContent;
    } catch (error) {
      console.error(`Error extracting web page content (attempt ${attempt + 1}):`, error);
      lastError = error as Error;
      
      // If it's a network error or timeout, we might want to retry
      if (attempt < maxRetries - 1 && 
          ((error as Error).message.includes('fetch') || 
           (error as Error).message.includes('timeout') ||
           (error as Error).message.includes('network'))) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1))); // Exponential backoff
        continue;
      }
      
      // Don't retry for client errors like 403, 404
      break;
    }
  }
  
  // If all direct attempts failed, try fallback service
  console.log('Direct extraction failed, trying fallback service...');
  return await extractViaFallbackService(url);
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
    
    // Check for unsupported protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are supported' });
    }
    
    let content: string;
    let extractionMethod = 'direct';
    
    // Check if it's a YouTube URL
    const youtubeVideoId = getYouTubeVideoId(url);
    if (youtubeVideoId) {
      console.log(`Processing YouTube URL: ${url} (video ID: ${youtubeVideoId})`);
      content = await getYouTubeContent(youtubeVideoId);
    } else {
      // Extract content from regular web page
      console.log(`Processing web page URL: ${url}`);
      try {
        content = await extractWebPageContent(url);
      } catch (error) {
        console.log('Direct extraction failed, trying fallback...');
        content = await extractViaFallbackService(url);
        extractionMethod = 'fallback';
      }
    }
    
    // Limit content length to avoid token limits
    let contentLength = content.length;
    if (content.length > 100000) {
      content = content.substring(0, 100000) + '... [content truncated due to length - showing first 100,000 characters]';
    }
    
    console.log(`Successfully extracted content using ${extractionMethod} method, length: ${contentLength} characters`);
    
    return res.status(200).json({
      content,
      url: url,
      originalLength: contentLength,
      truncated: contentLength > 100000,
      extractionMethod
    });
    
  } catch (error) {
    console.error('Error processing URL:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to extract content from URL' 
    });
  }
}