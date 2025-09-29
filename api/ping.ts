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

  const requiredVars = [
    'API_KEY',
    'GOOGLE_DRIVE_FOLDER_ID',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  ];

  const missingVars = requiredVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    console.error(`[HEALTH CHECK] FAILED: Missing environment variables: ${missingVars.join(', ')}`);
    // Still return 200 OK but with an error status in the body,
    // as the server *itself* is running, but is misconfigured.
    return res.status(200).json({ 
        status: 'error', 
        message: `Server is running but misconfigured. Missing critical environment variables: ${missingVars.join(', ')}`
    });
  }

  // Check for at least one of the private key variables
  if (!process.env.GOOGLE_PRIVATE_KEY && !process.env.GOOGLE_PRIVATE_KEY_BASE64) {
      console.error(`[HEALTH CHECK] FAILED: Missing both GOOGLE_PRIVATE_KEY and GOOGLE_PRIVATE_KEY_BASE64.`);
      return res.status(200).json({
          status: 'error',
          message: 'Server is running but misconfigured. Missing Google Private Key variable.'
      });
  }

  console.log('[HEALTH CHECK] SUCCESS: All required environment variables are present.');
  return res.status(200).json({ status: 'ok' });
}
