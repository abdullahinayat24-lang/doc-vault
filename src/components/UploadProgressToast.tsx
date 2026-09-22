import React from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export interface UploadProgressInfo {
  isUploading: boolean;
  totalFiles: number;
  currentFileIndex: number;
  currentFileName: string;
  status: 'uploading' | 'syncing' | 'completed' | 'error';
  errorMessage?: string;
}

interface UploadProgressToastProps {
  progress: UploadProgressInfo;
  onDismiss?: () => void;
}

export const UploadProgressToast: React.FC<UploadProgressToastProps> = ({
  progress,
  onDismiss
}) => {
  if (!progress.isUploading && progress.status !== 'completed' && progress.status !== 'error') {
    return null;
  }

  const percent = progress.totalFiles > 0 
    ? Math.round(((progress.currentFileIndex) / progress.totalFiles) * 100) 
    : 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200 select-none">
      <div className="bg-white/95 backdrop-blur-md border border-[#dadce0] rounded-2xl shadow-2xl p-4 max-w-sm w-80 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {progress.status === 'uploading' && (
              <div className="w-8 h-8 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center flex-shrink-0 animate-pulse">
                <UploadCloud className="w-4 h-4 animate-bounce" />
              </div>
            )}
            {progress.status === 'syncing' && (
              <div className="w-8 h-8 rounded-xl bg-[#fef7e0] text-[#b06000] flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
            )}
            {progress.status === 'completed' && (
              <div className="w-8 h-8 rounded-xl bg-[#e6f4ea] text-[#137333] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            {progress.status === 'error' && (
              <div className="w-8 h-8 rounded-xl bg-[#fce8e6] text-[#c5221f] flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#202124]">
                  {progress.status === 'uploading' && `Uploading (${progress.currentFileIndex}/${progress.totalFiles})`}
                  {progress.status === 'syncing' && 'Syncing to Cloud...'}
                  {progress.status === 'completed' && 'Upload Complete!'}
                  {progress.status === 'error' && 'Upload Note'}
                </span>
                {progress.status === 'uploading' && (
                  <span className="text-[11px] font-mono font-semibold text-[#1a73e8]">
                    {percent}%
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#5f6368] truncate mt-0.5 max-w-[200px]">
                {progress.status === 'completed' ? 'All files saved permanently' : progress.currentFileName}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {progress.status === 'uploading' && (
          <div className="mt-3 w-full bg-[#e8f0fe] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#1a73e8] h-1.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(percent, 8)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
