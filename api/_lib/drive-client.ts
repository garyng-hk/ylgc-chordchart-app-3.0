import { google, drive_v3 } from 'googleapis';

// Cache the client instance.
let driveClient: drive_v3.Drive | null = null;

/**
 * Asynchronously creates and configures an authenticated Google Drive API client.
 * This is the modern, recommended approach for serverless environments.
 * @returns A promise that resolves to an authenticated Google Drive API client instance.
 */
export async function getDriveClient(): Promise<drive_v3.Drive> {
    console.log('[getDriveClient] Requesting Google Drive client...');
    if (driveClient) {
        console.log('[getDriveClient] Returning cached client instance.');
        return driveClient;
    }

    console.log('[getDriveClient] Creating new client. Validating credentials...');
    const { GOOGLE_CREDENTIALS_BASE64 } = process.env;

    if (!GOOGLE_CREDENTIALS_BASE64) {
        console.error('[getDriveClient] FATAL: Missing GOOGLE_CREDENTIALS_BASE64 environment variable.');
        throw new Error('Server config error: Missing Google credentials.');
    }

    try {
        console.log('[getDriveClient] Decoding Base64 credentials...');
        const credsStr = Buffer.from(GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
        const credentials = JSON.parse(credsStr);
        console.log('[getDriveClient] Credentials decoded and parsed successfully.');

        console.log('[getDriveClient] Creating GoogleAuth instance...');
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        console.log('[getDriveClient] GoogleAuth instance created.');

        // getClient() is the async part that performs the actual authentication.
        console.log('[getDriveClient] Acquiring authorized client from GoogleAuth...');
        const authClient = await auth.getClient();
        console.log('[getDriveClient] Authorized client acquired.');

        console.log('[getDriveClient] Initializing Google Drive service with the authorized client...');
        const client = google.drive({ version: 'v3', auth: authClient });
        console.log('[getDriveClient] Google Drive service initialized.');

        // Cache the successfully created client for future use.
        driveClient = client;
        console.log('[getDriveClient] New client instance created and cached.');
        
        return driveClient;

    } catch (e) {
        console.error('[getDriveClient] FATAL: An error occurred during the async authentication process.');
        if (e instanceof Error) {
            console.error(`[getDriveClient] Error Details: ${e.name} - ${e.message}`);
            console.error(`[getDriveClient] Stack: ${e.stack}`);
        }
        // Ensure we don't cache a failed client.
        driveClient = null;
        throw new Error('Failed to authenticate with Google Drive. Please check the GOOGLE_CREDENTIALS_BASE64 variable and server logs.');
    }
}