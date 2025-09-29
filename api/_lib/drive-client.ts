import { google } from 'googleapis';

// Cache the client instance to avoid re-authentication on every call in a warm function.
let driveClient: ReturnType<typeof google.drive> | null = null;

/**
 * Creates and configures an authenticated Google Drive API client using JWT.
 * Caches the client instance for reuse in subsequent invocations.
 * Prioritizes using a Base64 encoded private key for stability in serverless environments.
 * @returns An authenticated Google Drive API client instance.
 * @throws Will throw an error if required environment variables are not set or auth fails.
 */
export function getDriveClient() {
    console.log('[getDriveClient] Requesting Google Drive client...');
    if (driveClient) {
        console.log('[getDriveClient] Returning cached client instance.');
        return driveClient;
    }

    console.log('[getDriveClient] Creating new client instance. Validating environment variables...');
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_PRIVATE_KEY_BASE64 } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL) {
        console.error('[getDriveClient] FATAL: GOOGLE_SERVICE_ACCOUNT_EMAIL is not defined.');
        throw new Error('Server config error: Missing Google service account email.');
    }
    console.log(`[getDriveClient] Service Account Email found.`);

    let privateKey: string | undefined;

    // ** New Recommended Method: Base64 Encoded Key **
    // This is the most robust way to handle multi-line keys in serverless environments.
    if (GOOGLE_PRIVATE_KEY_BASE64) {
        console.log('[getDriveClient] Found GOOGLE_PRIVATE_KEY_BASE64. Decoding...');
        try {
            // In Node.js environments (like Vercel), Buffer is available globally.
            privateKey = Buffer.from(GOOGLE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
            console.log('[getDriveClient] Successfully decoded Base64 private key.');
        } catch (e) {
            console.error('[getDriveClient] FATAL: Failed to decode GOOGLE_PRIVATE_KEY_BASE64.', e);
            throw new Error('Server config error: The Base64 private key is malformed.');
        }
    } 
    // Fallback to the original method if the new one isn't provided.
    else if (GOOGLE_PRIVATE_KEY) {
        console.warn('[getDriveClient] WARNING: Using raw GOOGLE_PRIVATE_KEY. This method is less reliable. Please switch to GOOGLE_PRIVATE_KEY_BASE64.');
        // The replacement of escaped newlines is critical for Vercel.
        privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
        console.log('[getDriveClient] Processed raw private key (newlines replaced).');
    } 
    // If neither is found, throw an error.
    else {
        console.error('[getDriveClient] FATAL: Neither GOOGLE_PRIVATE_KEY_BASE64 nor GOOGLE_PRIVATE_KEY are defined.');
        throw new Error('Server config error: Missing Google private key. Please set GOOGLE_PRIVATE_KEY_BASE64.');
    }

    try {
        console.log('[getDriveClient] Attempting to create JWT auth client...');
        const auth = new google.auth.JWT(
            GOOGLE_SERVICE_ACCOUNT_EMAIL,
            undefined,
            privateKey,
            ['https://www.googleapis.com/auth/drive.readonly']
        );
        console.log('[getDriveClient] JWT auth client created successfully.');

        console.log('[getDriveClient] Initializing Google Drive service...');
        driveClient = google.drive({ version: 'v3', auth });
        console.log('[getDriveClient] New Google Drive client initialized and cached successfully.');
        
        return driveClient;
        
    } catch (e) {
        console.error('[getDriveClient] FATAL: An error occurred during JWT authentication or client creation.');
        if (e instanceof Error) {
            console.error(`[getDriveClient] Error Details: ${e.message}`);
        }
        // Ensure we don't cache a failed client
        driveClient = null;
        // Throw a new, more user-friendly error to be caught by the API handler.
        throw new Error('Failed to authenticate with Google Drive. Please check server credentials, especially the private key format.');
    }
}