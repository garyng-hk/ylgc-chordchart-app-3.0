import { GoogleGenAI } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { DriveFile } from '../src/types';
import { getDriveClient } from './_lib/drive-client';

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

        if (!response.text) {
             console.error('ERROR: Gemini response text is empty.');
             throw new Error('Gemini failed to generate a search query (response text is empty).');
        }
        
        let driveQuery = response.text.trim();
        console.log('- Raw response from Gemini:', driveQuery);

        // Defensive cleanup: remove markdown code block fences if they exist.
        if (driveQuery.startsWith('```') && driveQuery.endsWith('```')) {
            driveQuery = driveQuery.substring(3, driveQuery.length - 3).trim();
            
            const firstNewlineIndex = driveQuery.indexOf('\n');
            if (firstNewlineIndex !== -1) {
                const firstLine = driveQuery.substring(0, firstNewlineIndex).trim();
                if (/^[a-z]+$/.test(firstLine)) {
                    driveQuery = driveQuery.substring(firstNewlineIndex + 1).trim();
                }
            }
        }

        console.log('- Cleaned & Generated Drive Query:', driveQuery);

        console.log('- Getting Google Drive client...');
        const drive = getDriveClient();
        console.log('- Google Drive client obtained.');

        console.log('- Executing search on Google Drive...');
        const searchResult = await drive.files.list({
            q: driveQuery,
            fields: 'files(id, name, mimeType)',
            pageSize: 50,
        });
        console.log('- Google Drive search successful.');

        const files: DriveFile[] = (searchResult.data.files as DriveFile[]) || [];
        console.log(`- Found ${files.length} files. Responding with 200.`);
        
        console.log('--- [/api/search] Handler finished successfully ---');
        return res.status(200).json(files);

    } catch (error) {
        console.error('--- FATAL ERROR in [/api/search] handler ---');
        
        if (error instanceof Error) {
            console.error(`[Error Details] Name: ${error.name}, Message: ${error.message}`);
            console.error(`[Error Stack] ${error.stack}`); 
            return res.status(500).json({ message: error.message });
        } else {
            console.error('An unknown, non-Error object was thrown:', error);
            return res.status(500).json({ message: 'An unexpected internal server error occurred.' });
        }
    }
}