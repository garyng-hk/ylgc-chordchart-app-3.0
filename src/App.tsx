import React, { useState, useCallback, useEffect } from 'react';
import { SearchBar } from './components/SearchBar';
import { ResultsList } from './components/ChordDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { searchFiles } from './services/geminiService';
import type { DriveFile } from './types';
import { SearchIcon } from './components/icons/SearchIcon';

// PDF Viewer Modal Component
const PdfViewerModal: React.FC<{ fileId: string | null; onClose: () => void }> = ({ fileId, onClose }) => {
    if (!fileId) return null;
    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in-fast"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-slate-800 rounded-lg shadow-2xl w-[95vw] h-[95vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-2 sm:p-4 bg-slate-900 border-b border-slate-700 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-slate-200">樂譜預覽</h3>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
                        aria-label="Close PDF viewer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </header>
                <div className="flex-grow">
                    <iframe 
                        src={embedUrl}
                        className="w-full h-full border-0"
                        title="PDF Viewer"
                        allow="fullscreen"
                    />
                </div>
            </div>
             <style>{`
                @keyframes fade-in-fast {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in-fast {
                    animation: fade-in-fast 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

// Server Status Indicator Component
const ServerStatusIndicator: React.FC<{ status: 'checking' | 'ok' | 'error', errorMessage?: string }> = ({ status, errorMessage }) => {
    const statusConfig = {
        checking: { color: 'bg-yellow-500', text: '正在檢查伺服器狀態...' },
        ok: { color: 'bg-green-500', text: '伺服器連線正常' },
        error: { color: 'bg-red-500', text: '伺服器連線失敗' },
    };

    return (
        <div className="fixed bottom-4 right-4 flex items-center bg-slate-800/80 backdrop-blur-sm p-2 rounded-full shadow-lg text-xs text-slate-300 group" title={errorMessage || statusConfig[status].text}>
            <div className={`w-3 h-3 rounded-full mr-2 ${statusConfig[status].color} animate-pulse-fast`} />
            <span className="hidden sm:inline">{statusConfig[status].text}</span>
            <style>{`
                @keyframes pulse-fast {
                    50% { opacity: .5; }
                }
                .animate-pulse-fast {
                    animation: pulse-fast 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
};


function App() {
  const [results, setResults] = useState<DriveFile[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [serverStatus, setServerStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [serverErrorMessage, setServerErrorMessage] = useState<string>('');

  // Health check on component mount
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api/ping');
        if (!response.ok) {
           throw new Error(`伺服器回應錯誤: ${response.status}`);
        }
        const data = await response.json();
        if (data.status === 'ok') {
          setServerStatus('ok');
        } else {
          setServerStatus('error');
          setServerErrorMessage(data.message || '伺服器設定不正確。');
          setError(`伺服器連線失敗：${data.message || '請檢查 Vercel 專案中的環境變數設定。'}`);
        }
      } catch (err) {
        setServerStatus('error');
        const defaultMessage = '無法連接至後端伺服器。請檢查網路連線或 Vercel 部署狀態。';
        setServerErrorMessage(err instanceof Error ? err.message : defaultMessage);
        setError(defaultMessage);
      }
    };
    checkServerStatus();
  }, []);

  const handleSearch = useCallback(async (params: { songTitle: string; key: string; lyrics: string; }) => {
    if (serverStatus !== 'ok') {
        setError(serverErrorMessage || '無法執行搜尋，因為伺服器連線失敗。');
        return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);
    try {
      const files = await searchFiles(params, setLoadingMessage);
      setResults(files);
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生未知錯誤');
    } finally {
      setIsLoading(false);
    }
  }, [serverStatus, serverErrorMessage]);

  const WelcomeScreen = () => (
    <div className="text-center p-8">
        <SearchIcon className="w-24 h-24 mx-auto mb-6 text-cyan-400" />
        <h2 className="text-3xl font-bold text-slate-100 mb-2">歡迎使用 YLGC 樂譜搜尋系統</h2>
        <p className="text-slate-400 max-w-md mx-auto">
            請在上方欄位輸入歌名、KEY 或部份歌詞來尋找樂譜。
        </p>
    </div>
  );
  
  const hasSearched = results !== null;
  const canSearch = serverStatus === 'ok';

  return (
    <>
        <div className="min-h-screen bg-slate-900 font-sans flex flex-col items-center p-4 sm:p-6">
            <header className="w-full max-w-5xl text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white">
                    YLGC 樂譜搜尋系統
                </h1>
            </header>
            <main className="w-full max-w-5xl flex-grow">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-slate-700">
                    <SearchBar onSearch={handleSearch} isLoading={isLoading || !canSearch} />
                    {!canSearch && <p className="text-center text-yellow-400 text-sm mt-4">正在等待伺服器連線，或連線失敗... 搜尋功能已暫時停用。</p>}
                </div>

                <div className="mt-8">
                    {isLoading && <LoadingSpinner message={loadingMessage} />}
                    {error && <ErrorMessage message={error} />}
                    {hasSearched && !isLoading && !error && (
                        <ResultsList files={results} onFileSelect={setSelectedFileId} />
                    )}
                    {!isLoading && !error && !hasSearched && <WelcomeScreen />}
                </div>
            </main>
            <footer className="w-full max-w-5xl text-center py-6 mt-8 text-slate-500 text-sm">
                <p>Powered by Google Drive API.</p>
            </footer>
        </div>
        <PdfViewerModal fileId={selectedFileId} onClose={() => setSelectedFileId(null)} />
        <ServerStatusIndicator status={serverStatus} errorMessage={serverErrorMessage} />
    </>
  );
}

export default App;