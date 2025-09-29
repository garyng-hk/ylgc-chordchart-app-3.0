import { google } from 'googleapis';

// Cache the client instance to avoid re-authentication on every call in a warm function.
let driveClient: ReturnType<typeof google.drive> | null = null;

/**
 * Creates and configures an authenticated Google Drive API client using JWT.
 * Caches the client instance for reuse in subsequent invocations.
 * @returns An authenticated Google Drive API client instance.
 * @throws Will throw an error if required environment variables are not set or auth fails.
 */
export function getDriveClient() {
    console.log('[getDriveClient] Requesting Google Drive client...');
    if (driveClient) {
        console.log('[getDriveClient] Returning cached client instance.');
        return driveClient;
    }

    console.log('[getDriveClient] Creating new client instance...');
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        console.error('[getDriveClient] ERROR: Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY in environment variables.');
        throw new Error('Google Drive API environment variables (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY) are not configured on the server.');
    }
    
    try {
        // Use JWT auth for a more direct authentication flow in serverless environments.
        const auth = new google.auth.JWT(
            GOOGLE_SERVICE_ACCOUNT_EMAIL,
            undefined,
            GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/drive.readonly']
        );

        driveClient = google.drive({ version: 'v3', auth });
        console.log('[getDriveClient] New Google Drive client created and cached successfully.');
        return driveClient;
        
    } catch (e) {
        console.error('[getDriveClient] FATAL: Error during JWT auth or client creation:', e);
        // Ensure we don't cache a failed client
        driveClient = null;
        throw e;
    }
}
