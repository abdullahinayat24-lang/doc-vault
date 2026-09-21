import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DocVault ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  private handleClearStorageAndReset = () => {
    if (confirm('Clear temporary document cache and reload? Your saved clients and tabs will be preserved.')) {
      try {
        localStorage.removeItem('docvault_documents');
      } catch {}
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8fafd] flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-white border border-[#dadce0] shadow-md flex items-center justify-center mb-4 text-[#d93025]">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="font-['Google_Sans',sans-serif] text-xl font-bold text-[#202124]">
            Something went wrong while rendering DocVault
          </h2>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-2 max-w-md">
            An unexpected error occurred while processing or displaying document data.
          </p>
          {this.state.error?.message && (
            <div className="mt-4 p-3 bg-[#fce8e6] text-[#d93025] rounded-xl text-xs font-mono max-w-md text-left overflow-x-auto border border-[#ea4335]/20">
              {this.state.error.message}
            </div>
          )}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload App</span>
            </button>
            <button
              onClick={this.handleClearStorageAndReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#fce8e6] text-[#d93025] border border-[#ea4335]/30 rounded-xl text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Cache & Reload</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
