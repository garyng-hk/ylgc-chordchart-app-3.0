import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * A simple health-check endpoint.
 * It verifies that essential environment variables are accessible by the serverless function.
 * This helps diagnose deployment and configuration issues without involving complex external APIs.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  // This list now reflects the ACTUAL variables required by the application.
  const requiredVars = [
    'API_KEY',
    'GOOGLE_DRIVE_FOLDER_ID',
    'GOOGLE_CREDENTIALS_BASE64', // This is the most critical variable for the current auth method.
  ];

  const missingVars = requiredVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    const errorMessage = `Server is running but misconfigured. Missing critical environment variables: ${missingVars.join(', ')}. Please check your Vercel project settings.`;
    console.error(`[HEALTH CHECK] FAILED: ${errorMessage}`);
    
    // The server itself is running, so return 200, but with an error status in the body.
    return res.status(200).json({ 
        status: 'error', 
        message: errorMessage
    });
  }

  console.log('[HEALTH CHECK] SUCCESS: All required environment variables are present.');
  return res.status(200).json({ status: 'ok' });
}