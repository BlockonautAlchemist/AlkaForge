'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiFolder, FiEdit, FiTrash, FiFile } from 'react-icons/fi';
import toast from 'react-hot-toast';

type Project = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  file_count: number;
};

type RawProject = {
  id: string;
  name: string;
  description: string;
  created_at: string;
};

type File = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  webkitRelativePath: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
  slice: (start?: number, end?: number, contentType?: string) => Blob;
  text: () => Promise<string>;
  stream: () => ReadableStream;
};

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [createError, setCreateError] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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
      setLoading(true);
      console.log("Fetching projects for user:", user?.id);
      
      // First check if the projects table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('projects')
        .select('id')
        .limit(1);
        
      if (tableError) {
        console.error("Error checking projects table:", tableError);
        console.error("Table check error details:", JSON.stringify(tableError, null, 2));
        throw new Error(`Failed to check projects table: ${tableError.message}`);
      }
      
      // Try a simpler query first without the knowledge_files join
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          created_at
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching projects:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log("Projects data received:", data);

      if (data) {
        // Set file_count to 0 for all projects since we're not querying knowledge_files
        const projectsWithFileCount = data.map((project: RawProject) => ({
          ...project,
          file_count: 0
        }));

        setProjects(projectsWithFileCount as Project[]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      toast.error('Failed to fetch projects.');
    } finally {
      setLoading(false);
    }
  };

  const createNewProject = async () => {
    setCreateError('');
    
    if (!newProjectName.trim()) {
      toast.error('Project name is required.');
      return;
    }

    try {
      setIsUploading(true);
      console.log("Creating new project with name:", newProjectName);
      console.log("User ID:", user?.id);
      console.log("User object:", JSON.stringify(user, null, 2));
      
      if (!user || !user.id) {
        const errorMsg = "Cannot create project: User is not authenticated or missing ID";
        console.error(errorMsg);
        setCreateError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      
      // Check if the projects table exists
      const { data: tableExists, error: tableCheckError } = await supabase
        .from('projects')
        .select('id')
        .limit(1);
        
      if (tableCheckError) {
        console.error("Error checking projects table:", tableCheckError);
        console.error("Table check error details:", JSON.stringify(tableCheckError, null, 2));
        setCreateError(`Table check error: ${tableCheckError.message}`);
        toast.error(`Failed to check projects table: ${tableCheckError.message}`);
        return;
      }
      
      console.log("Table check result:", tableExists);
      
      // Attempt to insert the new project
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          name: newProjectName.trim(),
          description: newProjectDescription.trim(),
          user_id: user.id
        }])
        .select();

      if (error) {
        console.error("Error creating project:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", JSON.stringify(error, null, 2));
        
        let errorMessage = `Failed to create project: ${error.message}`;
        if (error.code === '42P01') {
          errorMessage = "The projects table doesn't exist. Please create it first.";
        } else if (error.code === '23503') {
          errorMessage = "Foreign key violation. Make sure your user ID exists in the auth.users table.";
        } else if (error.code === '42501') {
          errorMessage = "Permission denied. Check your RLS policies.";
        }
        
        setCreateError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      console.log("Project created successfully:", data);

      // Handle file uploads if there are any
      if (data && uploadFiles.length > 0) {
        const projectId = data[0].id;
        const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
        const validFiles = uploadFiles.filter((file: File) => allowedTypes.includes(file.type));
        
        if (validFiles.length === 0) {
          toast.error('Only PDF, TXT, and MD files are allowed.');
        } else {
          try {
            toast.success('Project created! Now uploading files...');
            
            for (const file of validFiles) {
              const fileExt = file.name.split('.').pop();
              const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
              const filePath = `${user.id}/${projectId}/${fileName}`;
              
              // Upload file to Supabase Storage
              const { error: uploadError } = await supabase.storage
                .from('knowledge_files')
                .upload(filePath, file as unknown as Blob);
                
              if (uploadError) {
                console.error("Error uploading file:", uploadError);
                toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
                continue;
              }
              
              // Get the public URL
              const { data: urlData } = supabase.storage
                .from('knowledge_files')
                .getPublicUrl(filePath);
                
              // Save file metadata to the database
              await supabase
                .from('knowledge_files')
                .insert({
                  name: file.name,
                  file_type: fileExt,
                  size: file.size,
                  url: urlData.publicUrl,
                  project_id: projectId,
                  user_id: user.id,
                  storage_path: filePath
                });
            }
            
            toast.success(`${validFiles.length} file(s) uploaded successfully!`);
          } catch (uploadError) {
            console.error('Error uploading files:', uploadError);
            toast.error('Some files could not be uploaded. Please add them later from the project page.');
          }
        }
      }

      if (data) {
        const newProject = {
          ...data[0],
          file_count: uploadFiles.length
        };
        setProjects([newProject as Project, ...projects]);
        toast.success('Project created successfully!');
        setNewProjectName('');
        setNewProjectDescription('');
        setUploadFiles([]);
        setShowNewProject(false);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      setCreateError(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to create project. Check console for details.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadFiles(filesArray);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? All associated files will be deleted.')) {
      return;
    }

    try {
      // Check if knowledge_files table exists before trying to delete from it
      const { error: checkError } = await supabase
        .from('knowledge_files')
        .select('id')
        .limit(1);
      
      // Only try to delete files if the table exists
      if (!checkError) {
        // Delete all files associated with this project
        const { error: filesError } = await supabase
          .from('knowledge_files')
          .delete()
          .eq('project_id', projectId);

        if (filesError) {
          console.error("Error deleting files:", filesError);
          console.error("Error details:", JSON.stringify(filesError, null, 2));
          // Continue with project deletion even if file deletion fails
        }
      } else {
        console.log("Skipping file deletion as knowledge_files table doesn't exist yet");
      }

      // Then delete the project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        console.error("Error deleting project:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
      }

      setProjects(projects.filter((p: Project) => p.id !== projectId));
      toast.success('Project deleted successfully!');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <button
            onClick={() => setShowNewProject(!showNewProject)}
            className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-sm transition duration-300"
          >
            <FiPlus size={20} /> New Topic
          </button>
        </div>

        {showNewProject && (
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create New Topic</h2>
            {createError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-md mb-4">
                <p className="font-medium">Error creating topic:</p>
                <p>{createError}</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Topic Name*
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={newProjectName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="My Topic"
                  required
                />
              </div>
              <div>
                <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="projectDescription"
                  value={newProjectDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewProjectDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Describe your topic"
                />
              </div>
              <div>
                <label htmlFor="knowledgeFiles" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Add Knowledge Files (Optional)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-dark-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <FiFile size={20} className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white dark:bg-dark-200 rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>Upload files</span>
                        <input 
                          id="file-upload" 
                          name="file-upload" 
                          type="file" 
                          className="sr-only"
                          multiple
                          accept=".pdf,.txt,.md" 
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PDF, TXT, or MD up to 10MB
                    </p>
                    {uploadFiles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {uploadFiles.length} file(s) selected
                        </p>
                        <ul className="mt-1 text-xs text-left text-gray-500 max-h-24 overflow-y-auto">
                          {uploadFiles.map((file: File, index: number) => (
                            <li key={index} className="truncate">
                              {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowNewProject(false);
                    setNewProjectName('');
                    setNewProjectDescription('');
                    setUploadFiles([]);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-300 text-gray-700 dark:text-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-dark-300 transition duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewProject}
                  disabled={isUploading}
                  className={`flex items-center px-4 py-2 ${isUploading ? 'bg-primary-400' : 'bg-primary-600 hover:bg-primary-700'} text-white rounded-md shadow-sm transition duration-300`}
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>Create Topic</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-md p-8 text-center">
            <FiFolder size={20} className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No topics found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first topic to start organizing your content.
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-sm transition duration-300"
            >
              Create Your First Topic
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: Project) => (
              <div key={project.id} className="bg-white dark:bg-dark-100 rounded-lg shadow-md overflow-hidden flex flex-col h-full">
                <div className="p-6 flex-grow">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 truncate">{project.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {project.description || "No description provided"}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <span className="flex items-center">
                      <FiFile size={20} className="mr-1" /> {project.file_count} files
                    </span>
                    <span>Created {formatDate(project.created_at)}</span>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => router.push(`/generator?projectId=${project.id}`)}
                      className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-sm transition duration-300"
                    >
                      <FiFile size={20} className="mr-2" />
                      Generate Content
                    </button>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/projects/${project.id}`)}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-dark-200 dark:hover:bg-dark-300 text-gray-700 dark:text-gray-300 rounded-md shadow-sm transition duration-300"
                      >
                        <FiEdit size={20} className="mr-2" />
                        Edit Topic
                      </button>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md shadow-sm transition duration-300"
                      >
                        <FiTrash size={20} className="mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
} 