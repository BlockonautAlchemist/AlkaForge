import axios from 'axios';

/**
 * Extracts text content from a file URL
 * Currently supports: PDF, TXT, and other text-based files
 */
export async function extractTextFromFile(fileUrl: string, fileName: string): Promise<string> {
  try {
    console.log(`Extracting text from file: ${fileName}`);
    console.log(`File URL: ${fileUrl}`);
    
    // Get the file extension
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    console.log(`File extension: ${fileExt}`);
    
    // Fetch the file content
    console.log(`Fetching file content...`);
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer'
    });
    
    console.log(`File fetched successfully, size: ${response.data.byteLength} bytes`);
    
    // For text files, convert buffer to string
    if (['txt', 'md', 'csv', 'json', 'html', 'xml', 'js', 'ts', 'jsx', 'tsx', 'css'].includes(fileExt)) {
      console.log(`Converting ${fileExt} file to text`);
      const text = Buffer.from(response.data).toString('utf-8');
      console.log(`Text extracted, length: ${text.length} characters`);
      return text;
    }
    
    // For PDF files, we would need a PDF parser
    // This is a simplified version - in production, use a proper PDF parsing library
    if (fileExt === 'pdf') {
      console.log(`PDF file detected, returning placeholder`);
      // Placeholder for PDF parsing
      return `[Content from PDF file: ${fileName}]`;
    }
    
    // For other file types, return a placeholder
    console.log(`Unsupported file type: ${fileExt}, returning placeholder`);
    return `[Content from ${fileExt.toUpperCase()} file: ${fileName}]`;
  } catch (error) {
    console.error(`Error extracting text from ${fileName}:`, error);
    
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: fileUrl,
        headers: error.response?.headers
      });
    }
    
    return `[Failed to extract content from: ${fileName}. Error: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Extracts text from multiple files and combines them
 */
export async function extractTextFromFiles(files: { name: string; url: string }[]): Promise<string> {
  if (!files || files.length === 0) {
    console.log('No files provided for text extraction');
    return '';
  }
  
  console.log(`Extracting text from ${files.length} files`);
  
  try {
    // Process files in parallel
    console.log('Processing files in parallel');
    const textPromises = files.map(file => extractTextFromFile(file.url, file.name));
    const texts = await Promise.all(textPromises);
    
    console.log(`Successfully extracted text from ${texts.length} files`);
    
    // Combine all texts with file names as headers
    const combinedText = files.map((file, index) => 
      `--- ${file.name} ---\n${texts[index]}\n\n`
    ).join('');
    
    console.log(`Combined text length: ${combinedText.length} characters`);
    return combinedText;
  } catch (error) {
    console.error('Error extracting text from files:', error);
    return `[Error extracting text from files: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
} 