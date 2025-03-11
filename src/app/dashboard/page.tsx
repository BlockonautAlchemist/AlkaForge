'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiFolder, FiEdit2, FiTrash2, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';

type Project = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  file_count: number;
};

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [createError, setCreateError] = useState('');

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
        const projectsWithFileCount = data.map(project => ({
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

      if (data) {
        const newProject = {
          ...data[0],
          file_count: 0
        };
        setProjects([newProject as Project, ...projects]);
        toast.success('Project created successfully!');
        setNewProjectName('');
        setNewProjectDescription('');
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

      setProjects(projects.filter(p => p.id !== projectId));
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
            <FiPlus className="mr-2" /> New Project
          </button>
        </div>

        {showNewProject && (
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create New Project</h2>
            {createError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-md mb-4">
                <p className="font-medium">Error creating project:</p>
                <p>{createError}</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Name*
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="My Project"
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
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Describe your project"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowNewProject(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-300 text-gray-700 dark:text-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-dark-300 transition duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewProject}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-sm transition duration-300"
                >
                  Create Project
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
            <FiFolder className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No projects found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first project to start organizing your content.
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-sm transition duration-300"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white dark:bg-dark-100 rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 truncate">{project.name}</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/projects/${project.id}`)}
                        className="text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {project.description || "No description provided"}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center">
                      <FiFileText className="mr-1" /> {project.file_count} files
                    </span>
                    <span>Created {formatDate(project.created_at)}</span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-dark-200 px-6 py-3">
                  <button
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="w-full text-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    View Project
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
} 