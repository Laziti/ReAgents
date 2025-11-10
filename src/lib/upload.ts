import { supabase, supabaseUrl, supabaseAnonKey } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/validation';

/**
 * Upload a file to R2 via Supabase Edge Function
 * @param file - The file to upload
 * @param folder - Optional folder path (e.g., 'listing-images', 'receipts', 'profile-avatars')
 * @returns Promise resolving to the public URL of the uploaded file
 */
export async function uploadToR2(
  file: File,
  folder: string = 'uploads'
): Promise<string> {
  try {
    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error('Not authenticated. Please log in to upload files.');
    }

    // Verify the session token is valid by checking user
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !currentUser) {
      logger.error('User verification failed:', userError);
      throw new Error('Session expired. Please log in again.');
    }

    // Refresh session to ensure token is valid
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
    const activeSession = refreshedSession || session;

    if (refreshError) {
      logger.warn('Session refresh failed, using existing session:', refreshError);
    }

    if (!activeSession?.access_token) {
      throw new Error('No valid access token available');
    }

    // Verify Supabase configuration
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL or anon key not configured');
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    // Check rate limit
    const rateLimitKey = `upload_${currentUser.id}`;
    if (!checkRateLimit(rateLimitKey, 20, 60000)) {
      throw new Error('Too many upload attempts. Please try again in a minute.');
    }
    
    // Debug: Log request details
    logger.log('Upload request:', {
      url: `${supabaseUrl}/functions/v1/upload-to-r2`,
      hasToken: !!activeSession.access_token,
      tokenLength: activeSession.access_token?.length,
      hasApiKey: !!supabaseAnonKey,
      fileSize: file.size,
      fileName: file.name,
      folder,
    });

    // Call the Edge Function - DO NOT set Content-Type header for FormData
    // The browser will set it automatically with the boundary
    const response = await fetch(`${supabaseUrl}/functions/v1/upload-to-r2`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeSession.access_token}`,
        apikey: supabaseAnonKey,
      },
      // Don't set Content-Type - browser sets it automatically for FormData
      body: formData,
    });

    if (!response.ok) {
      // Try to get error details
      let errorData;
      let responseText;
      try {
        responseText = await response.text();
        errorData = responseText ? JSON.parse(responseText) : { error: 'Unknown error' };
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      const errorMessage = errorData.error || errorData.details || `Upload failed: ${response.statusText}`;
      logger.error('Upload failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        headers: Object.fromEntries(response.headers.entries()),
        responseText: responseText || 'Could not read response text',
      });
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    logger.error('Upload error:', error);
    throw error;
  }
}

/**
 * Upload multiple files to R2
 * @param files - Array of files to upload
 * @param folder - Optional folder path
 * @returns Promise resolving to an array of public URLs
 */
export async function uploadMultipleToR2(
  files: File[],
  folder: string = 'uploads'
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadToR2(file, folder));
  return Promise.all(uploadPromises);
}

