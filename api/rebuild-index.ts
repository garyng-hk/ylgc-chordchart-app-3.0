import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { DriveFile } from '../src/types';
import { getDriveClient } from './_lib/drive-client';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Secure this endpoint with a secret key passed as a query parameter
  if (req.query.secret !== process.env.REBUILD_SECRET) {
    return res.status(401).json({ message: 'Unauthorized: Invalid or missing secret.' });
  }

  if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
      return res.status(500).json({ message: 'Google Drive folder ID (GOOGLE_DRIVE_FOLDER_ID) is not configured.' });
  }

  try {
    const drive = getDriveClient();
    
    console.log('Fetching all files from Google Drive folder...');
    
    const query = `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
    
    let allFiles: DriveFile[] = [];
    let pageToken: string | null | undefined = undefined;

    do {
        const response: any = await drive.files.list({
            q: query,
            fields: 'nextPageToken, files(id, name, mimeType)',
            pageToken: pageToken,
            pageSize: 1000, // Max page size
        });
        if(response.data.files) {
            allFiles.push(...response.data.files as DriveFile[]);
        }
        pageToken = response.data.nextPageToken;
    } while (pageToken);


    console.log(`Fetched ${allFiles.length} files.`);

    res.status(200).json({ success: true, count: allFiles.length, files: allFiles });

  } catch (error) {
    console.error('Error in /api/rebuild-index:', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
    res.status(500).json({ success: false, message: errorMessage });
  }
}