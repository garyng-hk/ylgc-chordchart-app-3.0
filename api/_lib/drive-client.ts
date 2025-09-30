import { google, drive_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';

// Cache the client instance.
let driveClient: drive_v3.Drive | null = null;

/**
 * Asynchronously creates and configures an authenticated Google Drive API client
 * using the more direct and robust JWT authentication method.
 * @returns A promise that resolves to an authenticated Google Drive API client instance.
 */
export async function getDriveClient(): Promise<drive_v3.Drive> {
    console.log('[getDriveClient] Requesting Google Drive client...');
    if (driveClient) {
        console.log('[getDriveClient] Returning cached client instance.');
        return driveClient;
    }

    console.log('[getDriveClient] Creating new client. Validating credentials for JWT...');
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

        if (!credentials.client_email || !credentials.private_key) {
            console.error('[getDriveClient] FATAL: Credentials JSON is missing client_email or private_key.');
            throw new Error('Invalid credentials format: client_email or private_key missing.');
        }

        console.log('[getDriveClient] Creating JWT client from google-auth-library...');
        const jwtClient = new JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        console.log('[getDriveClient] JWT client created.');
        
        console.log('[getDriveClient] Authorizing JWT client...');
        await jwtClient.authorize();
        console.log('[getDriveClient] JWT client authorized successfully.');

        console.log('[getDriveClient] Initializing Google Drive service with JWT client...');
        const client = google.drive({ version: 'v3', auth: jwtClient });
        console.log('[getDriveClient] Google Drive service initialized.');

        // Cache the successfully created client for future use.
        driveClient = client;
        console.log('[getDriveClient] New client instance created and cached.');
        
        return driveClient;

    } catch (e) {
        console.error('[getDriveClient] FATAL: An error occurred during the JWT authentication process.');
        if (e instanceof Error) {
            console.error(`[getDriveClient] Error Details: ${e.name} - ${e.message}`);
            console.error(`[getDriveClient] Stack: ${e.stack}`);
        }
        // Ensure we don't cache a failed client.
        driveClient = null;
        throw new Error('Failed to authenticate with Google Drive using JWT. Please check the GOOGLE_CREDENTIALS_BASE64 variable and server logs.');
    }
}
