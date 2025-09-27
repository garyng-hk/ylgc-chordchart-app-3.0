import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';

// Singleton instance of the Drive client
let drive: drive_v3.Drive | null = null;

/**
 * Initializes and returns an authenticated Google Drive API client.
 * This function uses a singleton pattern to avoid re-initializing the client
 * on every function invocation in a warm serverless environment.
 */
export const getDriveClient = (): drive_v3.Drive => {
  if (drive) {
    return drive;
  }

  // Ensure environment variables are set
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error(
      'Google service account credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY) are not set in environment variables.'
    );
  }
  
  // Vercel escapes newlines in environment variables, so we need to un-escape them.
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

  // Authenticate using the service account
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  // Create the Drive client
  drive = google.drive({ version: 'v3', auth });

  return drive;
};
