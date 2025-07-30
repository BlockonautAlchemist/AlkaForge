'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  FiPlus, 
  FiTrash, 
  FiEye, 
  FiKey, 
  FiClock, 
  FiActivity,
  FiBook,
  FiExternalLink
} from '@/lib/react-icons-compat';

interface ApiKey {
  id: string;
  key_name: string;
  api_key_prefix: string;
  monthly_usage: number;
  usage_reset_date: string;
  last_used_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  keyName: string;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, apiKey, keyName }: ApiKeyModalProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success('API key copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy API key');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-dark-100 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 sm:mx-0 sm:h-10 sm:w-10">
              <FiKey className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                API Key Created Successfully
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Your API key for "<strong>{keyName}</strong>" has been created. 
                  <br />
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    Copy it now - you won't be able to see it again!
                  </span>
                </p>
                
                <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
                      {apiKey}
                    </code>
                    <button
                      onClick={copyToClipboard}
                      className={`ml-2 flex-shrink-0 px-3 py-1 rounded text-sm font-medium transition-colors ${
                        copied 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-dark-300 dark:hover:bg-dark-400 dark:text-gray-300'
                      }`}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Next steps:</strong> Use this API key in your applications by adding it to the 
                    <code className="mx-1 px-1 bg-blue-100 dark:bg-blue-800 rounded">X-API-Key</code> 
                    header. Check the documentation for examples.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
              onClick={onClose}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-dark-100 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 sm:mx-0 sm:h-10 sm:w-10">
              <FiBook className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Developer API Documentation
              </h3>
              <div className="mt-4 max-h-96 overflow-y-auto">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h4>Quick Start</h4>
                  <p>Use your API key to generate content programmatically:</p>
                  
                  <div className="bg-gray-900 rounded-lg p-4 my-4">
                    <pre className="text-green-400 text-sm"><code>{`curl -X POST https://alkaforge.vercel.app/api/developer/generate \\
  -H "X-API-Key: your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Benefits of remote work",
    "contentType": "post",
    "tone": "informative"
  }'`}</code></pre>
                  </div>

                  <h4>Content Types</h4>
                  <ul>
                    <li><code>post</code> - Single social media post (280 chars)</li>
                    <li><code>thread</code> - Multi-part thread (JSON with 10 parts)</li>
                    <li><code>hook</code> - 3-sentence attention grabber</li>
                    <li><code>summary-cta</code> - Concise summary with CTA</li>
                    <li><code>reply</code> - Short reply (50 chars max)</li>
                    <li><code>discord</code> - Discord announcement</li>
                  </ul>

                  <h4>Tones</h4>
                  <ul>
                    <li><code>informative</code> - Professional and educational</li>
                    <li><code>viral</code> - Attention-grabbing and shareable</li>
                    <li><code>funny</code> - Witty and humorous</li>
                    <li><code>casual</code> - Friendly and conversational</li>
                  </ul>

                  <h4>JavaScript Example</h4>
                  <div className="bg-gray-900 rounded-lg p-4 my-4">
                    <pre className="text-green-400 text-sm"><code>{`const response = await fetch('/api/developer/generate', {
  method: 'POST',
  headers: {
    'X-API-Key': process.env.ALKAFORGE_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Benefits of AI automation',
    contentType: 'post',
    tone: 'viral'
  })
});

const data = await response.json();
console.log(data.content);`}</code></pre>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    For complete documentation, examples, and AI agent integration guides, 
                    visit our full documentation.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
              onClick={onClose}
            >
              Close
            </button>
            <a
              href="/DEVELOPER_API.md"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-dark-200 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
            >
              <FiExternalLink className="w-4 h-4 mr-2" />
              Full Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const ApiKeyManagement: React.FC = () => {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<{ key: string; name: string } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Helper function to get auth headers for API calls
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return {
        'Authorization': `Bearer ${session.access_token}`
      };
    }
    return {};
  };

  // Only show for Premium users
  if (!subscription || subscription.subscription_tier !== 'PREMIUM') {
    return null;
  }

  useEffect(() => {
    if (user) {
      fetchApiKeys();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch('/api/developer/keys/list', {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }

      const data = await response.json();
      setApiKeys(data.apiKeys || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for your API key');
      return;
    }

    try {
      setCreating(true);
      const headers = await getAuthHeaders();
      const response = await fetch('/api/developer/keys/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ keyName: newKeyName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create API key');
      }

      const data = await response.json();
      setCreatedApiKey({ key: data.apiKey, name: newKeyName.trim() });
      setShowApiKeyModal(true);
      setNewKeyName('');
      setShowCreateForm(false);
      
      // Refresh the list
      await fetchApiKeys();
      
      toast.success('API key created successfully!');
    } catch (error: any) {
      console.error('Error creating API key:', error);
      toast.error(error.message || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const revokeApiKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setRevoking(keyId);
      const headers = await getAuthHeaders();
      const response = await fetch('/api/developer/keys/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ keyId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke API key');
      }

      toast.success('API key revoked successfully');
      await fetchApiKeys();
    } catch (error: any) {
      console.error('Error revoking API key:', error);
      toast.error(error.message || 'Failed to revoke API key');
    } finally {
      setRevoking(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatLastUsed = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-100 rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-dark-100 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Developer API Keys</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage API keys for programmatic access to AlkaForge content generation
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowDocModal(true)}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-200 hover:bg-gray-200 dark:hover:bg-dark-300 rounded-md transition-colors"
            >
              <FiBook className="w-4 h-4 mr-2" />
              API Docs
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              disabled={apiKeys.length >= 5}
              className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md shadow-sm transition-colors"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              New API Key
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-4 mb-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Create New API Key</h4>
            <div className="flex space-x-3">
              <input
                type="text"
                value={newKeyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewKeyName(e.target.value)}
                placeholder="Enter a name for your API key"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-dark-100 text-gray-900 dark:text-white"
                maxLength={50}
              />
              <button
                onClick={createApiKey}
                disabled={creating || !newKeyName.trim()}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewKeyName('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-dark-300 hover:bg-gray-300 dark:hover:bg-dark-400 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Maximum 5 API keys per account. Choose a descriptive name to identify this key.
            </p>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <FiKey className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No API Keys Yet</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              API keys allow you to integrate AlkaForge's content generation into your applications, 
              AI agents, and automated workflows. Create your first key to get started.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md font-medium transition-colors"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Create Your First API Key
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-dark-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-100 divide-y divide-gray-200 dark:divide-gray-700">
                {apiKeys.map((apiKey: ApiKey) => (
                  <tr key={apiKey.id} className="hover:bg-gray-50 dark:hover:bg-dark-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {apiKey.key_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <code className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {apiKey.api_key_prefix}...
                        </code>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FiActivity className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {apiKey.monthly_usage.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          / unlimited
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FiClock className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatLastUsed(apiKey.last_used_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(apiKey.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => revokeApiKey(apiKey.id, apiKey.key_name)}
                        disabled={revoking === apiKey.id}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {revoking === apiKey.id ? (
                          <span className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                            Revoking...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <FiTrash className="w-4 h-4 mr-1" />
                            Revoke
                          </span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {apiKeys.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <p>
              You have {apiKeys.length} of 5 API keys created. 
              Premium users get unlimited API requests with monitoring for abuse.
            </p>
          </div>
        )}
      </div>

      {/* API Key Creation Success Modal */}
      {createdApiKey && (
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => {
            setShowApiKeyModal(false);
            setCreatedApiKey(null);
          }}
          apiKey={createdApiKey.key}
          keyName={createdApiKey.name}
        />
      )}

      {/* Documentation Modal */}
      <DocumentationModal
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
      />
    </>
  );
};

export default ApiKeyManagement;