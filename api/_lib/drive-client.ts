import { google } from 'googleapis';

/**
 * Creates and configures an authenticated Google Drive API client.
 * @returns An authenticated Google Drive API client instance.
 * @throws Will throw an error if required environment variables are not set.
 */
export function getDriveClient() {
    console.log('[getDriveClient] Attempting to create Google Drive client...');
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        console.error('[getDriveClient] ERROR: Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY in environment variables.');
        throw new Error('Google Drive API environment variables (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY) are not configured on the server.');
    }
    console.log('[getDriveClient] Service account credentials found.');

    try {
        console.log('[getDriveClient] Creating GoogleAuth client...');
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        console.log('[getDriveClient] GoogleAuth client created successfully.');
        
        const client = google.drive({ version: 'v3', auth });
        console.log('[getDriveClient] Google Drive client created successfully.');
        return client;
    } catch (e) {
        console.error('[getDriveClient] FATAL: Error during GoogleAuth or client creation:', e);
        throw e;
    }
}
