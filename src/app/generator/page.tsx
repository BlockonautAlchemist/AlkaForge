'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import UsageWarning from '@/components/subscription/UsageWarning';
import UsageDisplay from '@/components/subscription/UsageDisplay';
import { supabase } from '@/lib/supabase';
import { generateContent, generateXThreadHooks } from '@/lib/openrouter';
import { extractTextFromFiles } from '@/lib/fileUtils';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

type Project = {
  id: string;
  name: string;
};

type ToneType = 'informative' | 'viral' | 'funny' | 'casual';

type KnowledgeFile = {
  name: string;
  file_type: string;
  size: number;
};

type ContentType = 'post' | 'thread' | 'reply' | 'discord' | 'hook' | 'summary-cta';

// Define the generator config locally since we can't import it
const generatorConfig = {
  maxTokens: {
    post: 1000,
    thread: 2000,
    reply: 1000,
    discord: 1000,
    hook: 1000,
    'summary-cta': 1000
  }
};

// Utility to safely render generated content as a string
function getSafeContent(value: any): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(getSafeContent).join('\n');
  if (typeof value === 'object' && value !== null) {
    // Try common string properties
    for (const key of ['content', 'text', 'message', 'value', 'title', 'body']) {
      if (typeof value[key] === 'string') return value[key];
    }
    // Fallback: join all string values in the object
    const strings = Object.values(value).filter(v => typeof v === 'string');
    if (strings.length) return strings.join('\n');
    // Last resort: JSON
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

export default function ContentGenerator() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [contentType, setContentType] = useState<ContentType>('post');
  const [tone, setTone] = useState<ToneType>('informative');
  const [prompt, setPrompt] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [urlContent, setUrlContent] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [projectLoading, setProjectLoading] = useState(true);
  const [threadHooks, setThreadHooks] = useState<string[]>([]);
  const [selectedHook, setSelectedHook] = useState<string | null>(null);
  const [showHookSelection, setShowHookSelection] = useState(false);
  const [hookLoading, setHookLoading] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const { subscription, refreshSubscription } = useSubscription();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Get projectId from URL first
    const urlParams = new URLSearchParams(window.location.search);
    const projectIdFromUrl = urlParams.get('projectId');
    
    // Then fetch projects and handle the selection
    fetchProjects(projectIdFromUrl);
  }, [user, router]);

  const fetchProjects = async (projectIdFromUrl?: string | null) => {
    try {
      setProjectLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setProjects(data);
        // Set selected project based on URL parameter or default to first project
        if (projectIdFromUrl && data.some((project: Project) => project.id === projectIdFromUrl)) {
          setSelectedProject(projectIdFromUrl);
        } else if (data.length > 0) {
          setSelectedProject(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects.');
    } finally {
      setProjectLoading(false);
    }
  };

  const extractUrlContent = async () => {
    if (!sourceUrl.trim()) {
      toast.error('Please enter a URL.');
      return;
    }

    // Basic URL validation
    try {
      new URL(sourceUrl);
    } catch {
      toast.error('Please enter a valid URL.');
      return;
    }

    setUrlLoading(true);
    try {
      const response = await fetch('/api/extract-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: sourceUrl }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Show more specific error message from API
        throw new Error(data.error || 'Failed to extract URL content');
      }

      setUrlContent(data.content);
      
      // Show more detailed success message
      const contentType = sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be') ? 'video' : 'article';
      let message = `${contentType === 'video' ? 'Video' : 'Article'} content extracted successfully!`;
      
      if (data.truncated) {
        message += ` (${Math.round(data.originalLength / 1000)}k chars, truncated to 100k)`;
      } else {
        message += ` (${Math.round(data.originalLength / 1000)}k characters)`;
      }
      
      toast.success(message);
    } catch (error) {
      console.error('Error extracting URL content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract content from URL';
      
      // Provide helpful suggestions based on error type
      if (errorMessage.includes('forbidden') || errorMessage.includes('blocking')) {
        toast.error('This website is blocking automated requests. Try copying and pasting the content manually, or use a different URL.');
      } else if (errorMessage.includes('not found')) {
        toast.error('Page not found. Please check the URL and try again.');
      } else if (errorMessage.includes('rate limited')) {
        toast.error('Too many requests. Please wait a moment and try again.');
      } else if (errorMessage.includes('private') || errorMessage.includes('restricted')) {
        toast.error('This content appears to be private or restricted. Try a public URL instead.');
      } else {
        toast.error(`Failed to extract content: ${errorMessage}`);
      }
    } finally {
      setUrlLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt.');
      return;
    }

    if (!selectedProject) {
      toast.error('Please select a project.');
      return;
    }

    setLoading(true);
    setGeneratedContent('');

    // X Thread: Step 1 - Generate hooks first
    if (contentType === 'thread' && !selectedHook) {
      try {
        setHookLoading(true);
        const hooks = await generateXThreadHooks({ prompt, tone });
        setThreadHooks(hooks);
        setShowHookSelection(true);
      } catch (err) {
        toast.error('Failed to generate hooks.');
        setShowHookSelection(false);
      } finally {
        setHookLoading(false);
        setLoading(false);
      }
      return;
    }

    try {
      console.log("Starting content generation process");
      console.log("Selected project:", selectedProject);
      console.log("Content type:", contentType);
      console.log("Tone:", tone);
      console.log("Prompt:", prompt);
      
      // Get project knowledge files to provide context
      console.log("Fetching knowledge files for project");
      const { data: files, error: filesError } = await supabase
        .from('knowledge_files')
        .select('name, url, file_type, size')
        .eq('project_id', selectedProject);
        
      if (filesError) {
        console.error("Error fetching knowledge files:", filesError);
        console.error("Error details:", JSON.stringify(filesError, null, 2));
        toast.error("Failed to fetch knowledge files. Generating without knowledge context.");
      }

      let knowledgeContent = '';
      
      // Extract text from knowledge files if available
      if (files && files.length > 0) {
        toast.success(`Using ${files.length} knowledge files for context.`);
        console.log("Knowledge files found:", files.length);
        console.log("Files:", files.map((f: KnowledgeFile) => ({ name: f.name, type: f.file_type, size: f.size })));
        
        try {
          // Extract text from files
          knowledgeContent = await extractTextFromFiles(files);
          console.log("Knowledge content extracted, length:", knowledgeContent.length);
          
          // Truncate if too long (to avoid token limits)
          if (knowledgeContent.length > 100000) {
            console.log("Knowledge content too long, truncating");
            knowledgeContent = knowledgeContent.substring(0, 100000) + "... [content truncated due to length]";
          }
        } catch (extractError) {
          console.error("Error extracting text from files:", extractError);
          toast.error("Failed to extract text from knowledge files. Generating without knowledge context.");
          knowledgeContent = '';
        }
      } else {
        console.log("No knowledge files found for this project");
      }

      console.log("Calling OpenRouter API to generate content");
      
      // When generating the thread, prepend the selected hook if present
      let finalPrompt = contentType === 'thread' && selectedHook ? `${selectedHook}\n\n${prompt}` : prompt;
      
      // Add URL content to the prompt if available
      if (urlContent.trim()) {
        finalPrompt = `Based on this source content:\n\n${urlContent}\n\n---\n\n${finalPrompt}`;
      }
      
      // Generate content using Claude with knowledge context
      const content = await generateContent({
        prompt: finalPrompt,
        contentType,
        tone,
        maxTokens: contentType === 'thread' ? 2000 : 1000,
        knowledgeContent: knowledgeContent,
        customPrompt: customPrompt.trim() ? customPrompt : undefined
      });

      console.log("Content generated successfully, length:", content.length);
      setGeneratedContent(content);

      // Save the generated content to history
      console.log("Saving content to history");
      const { error: historyError } = await supabase.from('content_history').insert({
        user_id: user?.id,
        project_id: selectedProject,
        prompt: prompt,
        content: content,
        content_type: contentType,
        tone: tone
      });
      
      if (historyError) {
        console.error("Error saving to history:", historyError);
      } else {
        console.log("Content saved to history successfully");
      }

      // Refresh subscription usage after generation
      await refreshSubscription();

      toast.success('Content generated successfully!');
      setSelectedHook(null);
      setThreadHooks([]);
      setShowHookSelection(false);
    } catch (error) {
      console.error('Error generating content:', error);
      
      let errorMessage = 'Failed to generate content. Please try again.';
      
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // New function to handle generating the thread after hook selection
  const handleGenerateThreadWithHook = async (hook: string) => {
    setSelectedHook(hook);
    setShowHookSelection(false);
    setLoading(true);
    setGeneratedContent('');
    try {
      // Fetch knowledge files as in handleGenerate
      const { data: files, error: filesError } = await supabase
        .from('knowledge_files')
        .select('name, url, file_type, size')
        .eq('project_id', selectedProject);
      let knowledgeContent = '';
      if (files && files.length > 0) {
        try {
          knowledgeContent = await extractTextFromFiles(files);
          if (knowledgeContent.length > 100000) {
            knowledgeContent = knowledgeContent.substring(0, 100000) + '... [content truncated due to length]';
          }
        } catch {
          knowledgeContent = '';
        }
      }
      let threadPrompt = `${hook}\n\n${prompt}`;
      
      // Add URL content to the prompt if available
      if (urlContent.trim()) {
        threadPrompt = `Based on this source content:\n\n${urlContent}\n\n---\n\n${threadPrompt}`;
      }
      
      const content = await generateContent({
        prompt: threadPrompt,
        contentType,
        tone,
        maxTokens: 2000,
        knowledgeContent: knowledgeContent,
        customPrompt: customPrompt.trim() ? customPrompt : undefined,
        firstThreadHook: hook
      });
      setGeneratedContent(content);
      setSelectedHook(null);
      setThreadHooks([]);
      setShowHookSelection(false);
      // Save to history
      await supabase.from('content_history').insert({
        user_id: user?.id,
        project_id: selectedProject,
        prompt: threadPrompt,
        content: content,
        content_type: contentType,
        tone: tone
      });
      // Refresh subscription usage after generation
      await refreshSubscription();
      toast.success('Content generated successfully!');
    } catch (error) {
      toast.error('Failed to generate thread.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success('Copied to clipboard!');
  };

  const getContentTypeIcon = () => {
    return null; // Remove all icon components for now
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Content Generator</h1>

        {projectLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-md p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">No projects found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create a project in the dashboard first to generate content.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-sm transition duration-300"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Subscription Usage Display */}
            <UsageDisplay />
            
            {/* Usage Warning (appears when approaching limits) */}
            <UsageWarning />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Input Section */}
              <div className="bg-white dark:bg-dark-100 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Generate Content</h2>
                
                <div className="space-y-6">
                  <div>
                    <label htmlFor="project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Topic
                    </label>
                    <select
                      id="project"
                      value={selectedProject}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProject(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {projects.map((project: Project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Content Type
                      </label>
                      <select
                        id="contentType"
                        value={contentType}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setContentType(e.target.value as ContentType)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="post">X Post</option>
                        <option value="thread">X Thread</option>
                        <option value="reply">X Reply</option>
                        <option value="discord">Discord Announcement</option>
                        <option value="hook">3-Sentence Hook</option>
                        <option value="summary-cta">Concise Summary w/ CTA</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="tone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tone
                      </label>
                      <select
                        id="tone"
                        value={tone}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTone(e.target.value as ToneType)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="informative">Informative</option>
                        <option value="viral">Viral/Engaging</option>
                        <option value="funny">Funny/Troll</option>
                        <option value="casual">Casual/Conversational</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Custom Instructions (Optional)
                    </label>
                    <textarea
                      id="customPrompt"
                      value={customPrompt}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomPrompt(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Add any specific instructions or requirements for the content generation..."
                    />
                  </div>

                  <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Your Content
                    </label>
                    <textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter your content ideas or raw text here..."
                    />
                  </div>

                  <div>
                    <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Reference URL (Optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="sourceUrl"
                        type="url"
                        value={sourceUrl}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSourceUrl(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Paste a YouTube video, article, or webpage URL..."
                      />
                      <button
                        onClick={extractUrlContent}
                        disabled={urlLoading || !sourceUrl.trim()}
                        className={`px-4 py-2 rounded-md text-white font-medium whitespace-nowrap ${
                          urlLoading || !sourceUrl.trim()
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-secondary-600 hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2'
                        }`}
                      >
                        {urlLoading ? 'Extracting...' : 'Extract'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Works best with: YouTube videos, blog posts, news articles. Some sites may block automated access.
                    </p>
                    {urlContent && (
                      <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                              {sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be') ? 
                                'Video content extracted!' : 'Article content extracted!'}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-300">
                              {Math.round(urlContent.length / 1000)}k characters extracted
                              {urlContent.includes('Full Transcript:') ? ' (includes full transcript)' : 
                               urlContent.includes('[Note: Full transcript not available') ? ' (description + metadata only)' : 
                               ' (full article content)'}
                              . This will be used as reference for generation.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setUrlContent('');
                              setSourceUrl('');
                            }}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 ml-2"
                          >
                            ✕
                          </button>
                        </div>
                        <details className="mt-2">
                          <summary className="text-xs text-green-600 dark:text-green-300 cursor-pointer hover:text-green-800 dark:hover:text-green-200">
                            Preview extracted content
                          </summary>
                          <div className="mt-2 p-2 bg-white dark:bg-dark-200 rounded text-xs text-gray-600 dark:text-gray-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                            {urlContent.substring(0, 1000)}{urlContent.length > 1000 ? '...' : ''}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>

                  <div>
                    <button
                      onClick={handleGenerate}
                      disabled={loading || !prompt.trim() || !selectedProject}
                      className={`w-full flex justify-center items-center px-4 py-2 rounded-md text-white font-medium ${
                        loading || !prompt.trim() || !selectedProject
                          ? 'bg-primary-400 cursor-not-allowed'
                          : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
                      }`}
                    >
                      {loading ? 'Generating...' : 'Generate Content'}
                    </button>
                  </div>
                  {showHookSelection && threadHooks.length > 0 && (
                    <div className="mt-6 p-4 border border-primary-300 rounded-md bg-primary-50 dark:bg-dark-200">
                      <h3 className="text-lg font-semibold mb-2 text-primary-700 dark:text-primary-300">Choose a hook to start your thread:</h3>
                      <ul className="space-y-2">
                        {threadHooks.map((hook: string, idx: number) => (
                          <li key={idx}>
                            <button
                              className={`w-full text-left px-4 py-2 rounded-md border border-primary-300 bg-white dark:bg-dark-100 hover:bg-primary-100 dark:hover:bg-dark-300 transition ${selectedHook === hook ? 'ring-2 ring-primary-500' : ''}`}
                              onClick={() => handleGenerateThreadWithHook(hook)}
                              disabled={loading || hookLoading}
                            >
                              {hook}
                            </button>
                          </li>
                        ))}
                      </ul>
                      {hookLoading && (
                        <div className="flex justify-center items-center mt-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Output Section */}
              <div className="bg-white dark:bg-dark-100 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    {getContentTypeIcon()}
                    {contentType === 'post' && 'X Post'}
                    {contentType === 'thread' && 'X Thread'}
                    {contentType === 'reply' && 'X Reply'}
                    {contentType === 'discord' && 'Discord Announcement'}
                    {contentType === 'hook' && '3-Sentence Hook'}
                    {contentType === 'summary-cta' && 'Concise Summary w/ CTA'}
                  </h2>
                  {generatedContent && (
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      <span className="mr-1">Copy</span>
                    </button>
                  )}
                </div>

                <div className={`border border-gray-200 dark:border-dark-300 rounded-md p-4 min-h-[300px] max-h-[500px] overflow-y-auto ${contentType === 'discord' ? 'prose dark:prose-invert max-w-none' : ''}`}>
                  {loading && (!showHookSelection || contentType !== 'thread') ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                    </div>
                  ) : generatedContent ? (
                    contentType === 'discord' ? (
                      <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown children={getSafeContent(generatedContent)} />
                      </div>
                    ) : contentType === 'thread' ? (
                      <div className="space-y-3">
                        {generatedContent.split('\n\n').map((part: string, index: number) => (
                          <div key={index} className="p-3 bg-gray-100 dark:bg-dark-300 rounded-md mb-3">
                            <p>{part}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{getSafeContent(generatedContent)}</div>
                    )
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-full text-center">
                      <p>Generated content will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 