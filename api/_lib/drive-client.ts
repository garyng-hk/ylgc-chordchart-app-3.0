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

    console.log('[getDriveClient] Creating new client instance. Validating environment variables...');
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL) {
        console.error('[getDriveClient] FATAL: GOOGLE_SERVICE_ACCOUNT_EMAIL is not defined.');
        throw new Error('Server config error: Missing Google service account email.');
    }
    console.log(`[getDriveClient] Service Account Email found: ${GOOGLE_SERVICE_ACCOUNT_EMAIL.substring(0, 10)}...`);


    if (!GOOGLE_PRIVATE_KEY) {
        console.error('[getDriveClient] FATAL: GOOGLE_PRIVATE_KEY is not defined.');
        throw new Error('Server config error: Missing Google private key.');
    }
    
    // Basic validation of the private key format.
    if (!GOOGLE_PRIVATE_KEY.startsWith('-----BEGIN PRIVATE KEY-----') || !GOOGLE_PRIVATE_KEY.endsWith('-----END PRIVATE KEY-----\n')) {
         console.warn('[getDriveClient] WARNING: GOOGLE_PRIVATE_KEY does not seem to be in the correct PEM format.');
         // We'll still try to proceed, but this is a likely source of error.
    }
    
    // The replacement of escaped newlines is critical for Vercel.
    const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    console.log('[getDriveClient] Private key processed (newlines replaced).');

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
        // Log a more detailed error message to help debug auth issues.
        if (e instanceof Error) {
            console.error(`[getDriveClient] Error Name: ${e.name}`);
            console.error(`[getDriveClient] Error Message: ${e.message}`);
        } else {
            console.error('[getDriveClient] An unknown object was thrown:', e);
        }
        
        // Ensure we don't cache a failed client
        driveClient = null;

        // Throw a new, more user-friendly error to be caught by the API handler.
        throw new Error('Failed to authenticate with Google Drive. Please check server credentials.');
    }
}