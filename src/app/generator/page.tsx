'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { generateContent } from '@/lib/openrouter';
import { FiCpu, FiCopy, FiTwitter, FiMessageSquare, FiMessageCircle, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

type Project = {
  id: string;
  name: string;
};

type ContentType = 'post' | 'thread' | 'reply' | 'discord';
type ToneType = 'informative' | 'viral' | 'professional' | 'casual';

export default function ContentGenerator() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [contentType, setContentType] = useState<ContentType>('post');
  const [tone, setTone] = useState<ToneType>('informative');
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [projectLoading, setProjectLoading] = useState(true);

  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchProjects();
  }, [user, router]);

  const fetchProjects = async () => {
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
        if (data.length > 0) {
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

    try {
      // Get project knowledge files to provide context
      const { data: files } = await supabase
        .from('knowledge_files')
        .select('name, url')
        .eq('project_id', selectedProject)
        .limit(5);

      // Enhance the prompt with project context if available
      let enhancedPrompt = prompt;
      if (files && files.length > 0) {
        enhancedPrompt += `\n\nRelevant context files: ${files.map(f => f.name).join(', ')}`;
      }

      // Generate content using Claude-3.7-Sonnet
      const content = await generateContent({
        prompt: enhancedPrompt,
        contentType,
        tone,
        maxTokens: contentType === 'thread' ? 2000 : 1000
      });

      setGeneratedContent(content);

      // Save the generated content to history
      await supabase.from('content_history').insert({
        user_id: user?.id,
        project_id: selectedProject,
        prompt: prompt,
        content: content,
        content_type: contentType,
        tone: tone,
        created_at: new Date().toISOString()
      });

      toast.success('Content generated successfully!');
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success('Copied to clipboard!');
  };

  const getContentTypeIcon = () => {
    switch (contentType) {
      case 'post':
        return <FiTwitter className="mr-2" />;
      case 'thread':
        return <FiMessageCircle className="mr-2" />;
      case 'reply':
        return <FiMessageSquare className="mr-2" />;
      case 'discord':
        return <FiSend className="mr-2" />;
      default:
        return null;
    }
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="bg-white dark:bg-dark-100 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Generate Content</h2>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project
                  </label>
                  <select
                    id="project"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {projects.map((project) => (
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
                      onChange={(e) => setContentType(e.target.value as ContentType)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="post">X Post</option>
                      <option value="thread">X Thread</option>
                      <option value="reply">X Reply</option>
                      <option value="discord">Discord Announcement</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tone
                    </label>
                    <select
                      id="tone"
                      value={tone}
                      onChange={(e) => setTone(e.target.value as ToneType)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="informative">Informative</option>
                      <option value="viral">Viral/Engaging</option>
                      <option value="professional">Professional</option>
                      <option value="casual">Casual/Conversational</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your Prompt
                  </label>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your content ideas or raw text here..."
                  />
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
                    <FiCpu className="mr-2" />
                    {loading ? 'Generating...' : 'Generate Content'}
                  </button>
                </div>
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
                </h2>
                {generatedContent && (
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                  >
                    <FiCopy className="mr-1" /> Copy
                  </button>
                )}
              </div>

              <div className={`border border-gray-200 dark:border-dark-300 rounded-md p-4 min-h-[300px] max-h-[500px] overflow-y-auto ${contentType === 'discord' ? 'prose dark:prose-invert max-w-none' : ''}`}>
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                ) : generatedContent ? (
                  contentType === 'discord' ? (
                    <ReactMarkdown>{generatedContent}</ReactMarkdown>
                  ) : (
                    <div className="whitespace-pre-wrap">{generatedContent}</div>
                  )
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-full text-center">
                    <FiCpu className="h-12 w-12 mb-4 text-gray-300 dark:text-gray-600" />
                    <p>Generated content will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 