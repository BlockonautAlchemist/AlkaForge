import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

type ResponseData = {
  url?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Parse form with uploaded file
    const form = formidable({ keepExtensions: true });
    
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Handle the file - formidable types have changed, so we need to check if it's an array
    const fileField = files.file;
    if (!fileField) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Get the first file if it's an array
    const file = Array.isArray(fileField) ? fileField[0] : fileField;
    
    const userId = fields.userId;
    const projectId = fields.projectId;
    
    // Ensure userId and projectId are strings
    if (!file || !userId || !projectId || Array.isArray(userId) || Array.isArray(projectId)) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Generate a unique file name
    const fileExt = file.originalFilename?.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${userId}/${projectId}/${fileName}`;
    
    // Read file content
    const fileContent = fs.readFileSync(file.filepath);
    
    // Upload to Supabase Storage
    const { error: uploadError, data } = await supabase.storage
      .from('knowledge_files')
      .upload(filePath, fileContent, {
        contentType: file.mimetype || undefined,
      });
      
    if (uploadError) {
      throw uploadError;
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('knowledge_files')
      .getPublicUrl(filePath);
      
    return res.status(200).json({ url: urlData.publicUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
} 