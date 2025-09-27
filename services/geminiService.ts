import type { DriveFile } from '../types';

interface SearchParams {
  songTitle: string;
  key: string;
  lyrics: string;
}

/**
 * Calls the backend serverless function to search for files in Google Drive.
 * @param params - The search parameters (song title, key, lyrics).
 * @param setLoadingMessage - A callback to update the loading message on the UI.
 * @returns A promise that resolves to an array of DriveFile objects.
 */
export const searchFiles = async (
  params: SearchParams,
  setLoadingMessage: (message: string) => void
): Promise<DriveFile[]> => {
  setLoadingMessage('正在準備搜尋...');

  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    setLoadingMessage('正在從 Google Drive 資料庫搜尋...');

    if (!response.ok) {
      // Vercel's Hobby plan has a 10s timeout for serverless functions.
      // This specifically catches that timeout error.
      if (response.status === 504) {
        throw new Error('搜尋已逾時。您的樂譜資料庫可能過於龐大，已超過伺服器 10 秒的處理時間限制。');
      }
      
      const errorData = await response.json().catch(() => ({ message: '無法解析伺服器回應' }));
      throw new Error(errorData.message || `伺服器錯誤: ${response.status} ${response.statusText}`);
    }

    const files: DriveFile[] = await response.json();
    return files;

  } catch (error) {
    console.error('An error occurred during search:', error);
    if (error instanceof Error) {
      // For network errors like "Failed to fetch", provide a clearer message.
      if (error.message.includes('Failed to fetch')) {
        throw new Error('網路連線失敗。請檢查您的網路連線並再試一次。');
      }
      throw error;
    }
    throw new Error('發生未知的客戶端錯誤');
  }
};
