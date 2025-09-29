import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDriveClient } from './_lib/drive-client';

/**
 * An isolated endpoint to test the initialization of the Google Drive client.
 * This helps confirm if the authentication process itself is the source of server crashes.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    console.log('\n--- [/api/test-drive] Handler started ---');
    console.log('- Attempting to initialize Google Drive client...');
    
    // This is the critical operation we want to test in isolation.
    getDriveClient();
    
    console.log('- Google Drive client initialized successfully.');
    console.log('--- [/api/test-drive] Handler finished successfully ---');
    return res.status(200).json({ 
        status: 'ok', 
        message: '成功初始化 Google Drive API 客戶端。驗證憑證有效。' 
    });

  } catch (error) {
    console.error('--- FATAL ERROR in [/api/test-drive] handler ---');
    const message = error instanceof Error ? error.message : '初始化過程中發生未知的伺服器錯誤。';
    
    if (error instanceof Error) {
        console.error(`[Error Details] Name: ${error.name}, Message: ${error.message}`);
        console.error(`[Error Stack] ${error.stack}`); 
    } else {
        console.error('An unknown, non-Error object was thrown:', error);
    }

    return res.status(500).json({ status: 'error', message });
  }
}
