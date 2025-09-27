import { GoogleGenAI } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import type { DriveFile } from '../src/types';

/**
 * Creates and configures an authenticated Google Drive API client.
 * @returns An authenticated Google Drive API client instance.
 * @throws Will throw an error if required environment variables are not set.
 */
function getDriveClient() {
    console.log('[getDriveClient] Attempting to create Google Drive client...');
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        console.error('[getDriveClient] ERROR: Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY in environment variables.');
        throw new Error('Google Drive API environment variables (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY) are not configured on the server.');
    }
    console.log('[getDriveClient] Service account credentials found.');

    try {
        console.log('[getDriveClient] Creating JWT auth...');
        const auth = new google.auth.JWT(
            GOOGLE_SERVICE_ACCOUNT_EMAIL,
            null,
            GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle newlines in env var
            ['https://www.googleapis.com/auth/drive.readonly']
        );
        console.log('[getDriveClient] JWT auth created successfully.');
        
        const client = google.drive({ version: 'v3', auth });
        console.log('[getDriveClient] Google Drive client created successfully.');
        return client;
    } catch (e) {
        console.error('[getDriveClient] FATAL: Error during JWT or client creation:', e);
        throw e;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('\n--- [/api/search] Handler started ---');
    
    if (req.method !== 'POST') {
        console.log(`- Method ${req.method} not allowed. Responding with 405.`);
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    try {
        console.log('- Checking for required server environment variables...');
        if (!process.env.API_KEY || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
            console.error('ERROR: Missing API_KEY or GOOGLE_DRIVE_FOLDER_ID.');
            return res.status(500).json({ message: 'Server environment is not configured correctly (missing API_KEY or GOOGLE_DRIVE_FOLDER_ID).' });
        }
        console.log('- Server environment variables OK.');

        const { songTitle, key, lyrics } = req.body;
        console.log('- Received search params:', { songTitle, key, lyrics });

        if (!songTitle && !key && !lyrics) {
            console.log('- No search parameters provided. Responding with 400.');
            return res.status(400).json({ message: 'At least one search parameter is required.' });
        }

        console.log('- Initializing GoogleGenAI client...');
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        console.log('- GoogleGenAI client initialized.');
        
        const prompt = `
You are an expert Google Drive API search query generator. Your task is to convert a user's search for a music sheet into an optimized 'q' parameter for the 'files.list' API method.

User's search criteria:
- Song Title: "${songTitle || 'N/A'}"
- Key (Music): "${key || 'N/A'}"
- Lyrics Snippet: "${lyrics || 'N/A'}"

Follow these rules for generating the query string:
1.  The search must be restricted to files within the folder with ID '${process.env.GOOGLE_DRIVE_FOLDER_ID}'. Use "'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents".
2.  Files must not be in the trash ('trashed = false').
3.  For 'Song Title' and 'Key', use the 'name contains' operator. If both are provided, chain them with 'and'.
4.  For 'Lyrics Snippet', use the 'fullText contains' operator.
5.  Combine all conditions with 'and'.
6.  If a criterion is 'N/A', do not include it in the query.
7.  Escape any single quotes in the search terms with a backslash (e.g., 'it\\'s').
8.  Return ONLY the raw query string, with no explanation or markdown formatting.

Example: For Title "Amazing Grace", Key "G", Lyrics "saved a wretch", the output should be:
'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false and name contains 'Amazing Grace' and name contains 'G' and fullText contains 'saved a wretch'
`;
        console.log('- Generated Gemini prompt.');

        console.log('- Calling Gemini API to generate search query...');
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        console.log('- Gemini API call successful.');

        const driveQuery = response.text.trim();
        console.log('- Generated Drive Query:', driveQuery);

        if (!driveQuery) {
            throw new Error('Gemini failed to generate a search query.');
        }

        console.log('- Getting Google Drive client...');
        const drive = getDriveClient();
        console.log('- Google Drive client obtained.');

        console.log('- Executing search on Google Drive...');
        const searchResult = await drive.files.list({
            q: driveQuery,
            fields: 'files(id, name, mimeType)',
            pageSize: 50, // Limit results to a reasonable number to avoid overwhelming the user
        });
        console.log('- Google Drive search successful.');

        const files: DriveFile[] = (searchResult.data.files as DriveFile[]) || [];
        console.log(`- Found ${files.length} files. Responding with 200.`);
        
        console.log('--- [/api/search] Handler finished successfully ---');
        return res.status(200).json(files);

    } catch (error) {
        console.error('--- FATAL ERROR in [/api/search] handler ---');
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
        return res.status(500).json({ message: errorMessage });
    }
}