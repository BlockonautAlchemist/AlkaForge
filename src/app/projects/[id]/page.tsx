'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { FiArrowLeft, FiEdit2, FiSave, FiTrash2, FiUpload, FiFile, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

type Project = {
  id: string;
  name: string;
  description: string;
  created_at: string;
};

type KnowledgeFile = {
  id: string;
  name: string;
  file_type: string;
  size: number;
  url: string;
  storage_path: string;
  project_id: string;
  user_id: string;
  created_at: string;
};

export default function ProjectPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Add new state variables for file upload
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id;

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    console.log("Fetching project with ID:", projectId);
    console.log("Current user:", user);
    fetchProject();
  }, [user, projectId, router]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      console.log("Starting fetchProject function");
      
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user?.id)
        .single();

      if (projectError) {
        console.error("Error fetching project:", projectError);
        if (projectError.code === 'PGRST116') {
          toast.error('Project not found or you do not have access to it.');
          router.push('/dashboard');
          return;
        }
        throw projectError;
      }

      console.log("Project data retrieved successfully:", projectData);
      setProject(projectData);
      setName(projectData.name);
      setDescription(projectData.description || '');

      // Check if knowledge_files table exists
      console.log("Checking if knowledge_files table exists");
      const { error: tableCheckError } = await supabase
        .from('knowledge_files')
        .select('id')
        .limit(1);
        
      if (tableCheckError) {
        console.error("Error checking knowledge_files table:", tableCheckError);
        return;
      }
      
      console.log("knowledge_files table exists, fetching files for project:", projectId);
      
      // Only fetch files if the table exists
      // Fetch files for this project
      const { data: filesData, error: filesError } = await supabase
        .from('knowledge_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (filesError) {
        console.error("Error fetching files:", filesError);
        console.error("Error details:", JSON.stringify(filesError, null, 2));
        console.error("Error code:", filesError.code);
        console.error("Error message:", filesError.message);
      } else if (filesData) {
        console.log("Files data received:", filesData);
        console.log("Number of files found:", filesData.length);
        
        // Log each file to check their properties
        filesData.forEach((file, index) => {
          console.log(`File ${index + 1}:`, file);
          console.log(`- ID: ${file.id}`);
          console.log(`- Name: ${file.name}`);
          console.log(`- Project ID: ${file.project_id}`);
          console.log(`- User ID: ${file.user_id}`);
        });
        
        setFiles(filesData);
      } else {
        console.log("No files data received, but no error either");
      }
    } catch (error) {
      console.error('Error in fetchProject:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      toast.error('Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async () => {
    if (!name.trim()) {
      toast.error('Project name is required.');
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: name.trim(),
          description: description.trim()
        })
        .eq('id', projectId)
        .eq('user_id', user?.id);

      if (error) throw error;

      if (project) {
        setProject({
          ...project,
          name: name.trim(),
          description: description.trim()
        });
      }
      
      setEditing(false);
      toast.success('Project updated successfully!');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Add file upload functions
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    }
  };

  const uploadFileToStorage = async () => {
    if (!uploadFile || !user || !project) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      console.log("Starting file upload process");
      console.log("File to upload:", uploadFile.name, uploadFile.type, uploadFile.size);
      console.log("User ID:", user.id);
      console.log("Project ID:", projectId);
      
      // Create a unique file path
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${projectId}/${fileName}`;
      
      console.log("Generated file path:", filePath);
      
      // Upload file to Supabase Storage
      console.log("Uploading file to Supabase Storage...");
      const { data: storageData, error: storageError } = await supabase.storage
        .from('knowledge_files')
        .upload(filePath, uploadFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        console.error("Error uploading to storage:", storageError);
        throw storageError;
      }

      console.log("File uploaded to storage successfully:", storageData);

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('knowledge_files')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      console.log("Generated public URL:", publicUrl);

      // Prepare file metadata
      const fileMetadata = {
        name: uploadFile.name,
        file_type: uploadFile.type,
        size: uploadFile.size,
        url: publicUrl,
        storage_path: filePath,
        project_id: projectId,
        user_id: user.id
      };
      
      console.log("Inserting file metadata into database:", fileMetadata);

      // Insert file metadata into the database
      const { data: fileData, error: fileError } = await supabase
        .from('knowledge_files')
        .insert([fileMetadata])
        .select();

      if (fileError) {
        console.error("Error inserting file metadata:", fileError);
        console.error("Error details:", JSON.stringify(fileError, null, 2));
        
        // If database insert fails, delete the uploaded file
        console.log("Cleaning up storage file due to database error");
        await supabase.storage
          .from('knowledge_files')
          .remove([filePath]);
        throw fileError;
      }

      console.log("File metadata inserted successfully:", fileData);

      // Add the new file to the files state
      if (fileData) {
        console.log("Adding file to UI state");
        setFiles([fileData[0] as KnowledgeFile, ...files]);
      }

      toast.success('File uploaded successfully!');
      setUploadFile(null);
      setShowUploadModal(false);
      
      // Refresh the file list
      console.log("Refreshing file list");
      fetchProject();
    } catch (error) {
      console.error('Error uploading file:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Add file delete function
  const deleteFile = async (fileId: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      // First delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('knowledge_files')
        .remove([storagePath]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Then delete the file record from the database
      const { error: dbError } = await supabase
        .from('knowledge_files')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        throw dbError;
      }

      // Update the files state
      setFiles(files.filter(file => file.id !== fileId));
      toast.success('File deleted successfully!');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-md p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Project not found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-sm transition duration-300"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <FiArrowLeft className="mr-2" /> Back to Dashboard
          </button>
        </div>

        <div className="bg-white dark:bg-dark-100 rounded-lg shadow-md p-6 mb-8">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Name*
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Project Name"
                  required
                />
              </div>
              <div>
                <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="projectDescription"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Describe your project"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setName(project.name);
                    setDescription(project.description || '');
                    setEditing(false);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-300 text-gray-700 dark:text-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-dark-300 transition duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={updateProject}
                  className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-sm transition duration-300"
                >
                  <FiSave className="mr-2" /> Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                <button
                  onClick={() => setEditing(true)}
                  className="text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                >
                  <FiEdit2 size={20} />
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {project.description || "No description provided"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Created on {formatDate(project.created_at)}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-dark-100 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Knowledge Files</h2>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-sm transition duration-300"
            >
              <FiUpload className="mr-2" /> Upload File
            </button>
          </div>

          {files.length === 0 ? (
            <div className="text-center py-8">
              <FiFile className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No files yet</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Upload files to build your knowledge base for this project.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-300">
                <thead className="bg-gray-50 dark:bg-dark-200">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Size
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-100 divide-y divide-gray-200 dark:divide-dark-300">
                  {files.map((file: KnowledgeFile) => (
                    <tr key={file.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{file.file_type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{formatDate(file.created_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-4">
                          View
                        </a>
                        <button
                          onClick={() => deleteFile(file.id, file.storage_path)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* File Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload File</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select File
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-200 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              {uploadFile && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>File: {uploadFile.name}</p>
                  <p>Size: {(uploadFile.size / 1024).toFixed(1)} KB</p>
                  <p>Type: {uploadFile.type}</p>
                </div>
              )}
              
              {isUploading && (
                <div className="w-full bg-gray-200 dark:bg-dark-300 rounded-full h-2.5">
                  <div 
                    className="bg-primary-600 h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-300 text-gray-700 dark:text-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-dark-300 transition duration-300"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  onClick={uploadFileToStorage}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-sm transition duration-300 flex items-center"
                  disabled={!uploadFile || isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 