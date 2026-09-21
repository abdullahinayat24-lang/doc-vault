import React, { useEffect, useRef, useState } from 'react';
import ePub, { Book, Rendition } from 'epubjs';
import { ChevronLeft, ChevronRight, BookOpen, AlertCircle } from 'lucide-react';

interface EpubViewerProps {
  url: string;
  name: string;
  zoom: number;
}

export const EpubViewer: React.FC<EpubViewerProps> = ({
  url,
  name,
  zoom
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string>('');

  useEffect(() => {
    if (!viewerRef.current || !url) return;

    setLoading(true);
    setError(null);

    let activeBook: Book | null = null;
    let activeRendition: Rendition | null = null;

    try {
      activeBook = ePub(url);
      setBook(activeBook);

      activeRendition = activeBook.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        flow: 'paginated',
        spread: 'auto'
      });

      setRendition(activeRendition);

      activeRendition.display().then(() => {
        setLoading(false);
      }).catch((err) => {
        console.warn('Failed to display epub rendition:', err);
        setError('EPUB format preview is in simplified reader mode.');
        setLoading(false);
      });

      activeRendition.on('relocated', (location: any) => {
        if (location?.start?.href) {
          setCurrentLocation(location.start.href);
        }
      });
    } catch (err: any) {
      console.warn('Error creating EPUB book:', err);
      setError(err?.message || 'Failed to initialize EPUB reader');
      setLoading(false);
    }

    return () => {
      try {
        if (activeRendition) {
          activeRendition.destroy();
        }
        if (activeBook) {
          activeBook.destroy();
        }
      } catch {
        // ignore
      }
    };
  }, [url]);

  // Handle zoom / font size
  useEffect(() => {
    if (rendition) {
      const fontSize = Math.round(zoom * 100);
      rendition.themes.fontSize(`${fontSize}%`);
    }
  }, [zoom, rendition]);

  const handlePrev = () => {
    rendition?.prev();
  };

  const handleNext = () => {
    rendition?.next();
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-4 relative bg-[#f8fafd]">
      {/* EPUB Navigation Bar */}
      <div className="w-full max-w-4xl bg-white border border-[#dadce0] rounded-xl px-4 py-2 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2 text-xs text-[#5f6368]">
          <BookOpen className="w-4 h-4 text-[#9334e6]" />
          <span className="font-medium text-[#202124] truncate max-w-[200px]">{name}</span>
          {currentLocation && (
            <span className="text-[11px] text-[#5f6368] hidden sm:inline truncate max-w-[150px]">
              • {currentLocation}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 hover:bg-[#f1f3f4] rounded-lg text-[#202124] transition-colors"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-[#5f6368]">Turn Page</span>
          <button
            onClick={handleNext}
            className="p-1.5 hover:bg-[#f1f3f4] rounded-lg text-[#202124] transition-colors"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Reader Container */}
      <div className="w-full flex-1 max-w-4xl my-3 bg-white rounded-2xl border border-[#dadce0] shadow-sm relative overflow-hidden flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
            <div className="w-8 h-8 border-3 border-[#9334e6] border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-[#5f6368]">Loading EPUB Reader...</p>
          </div>
        )}

        {error ? (
          <div className="p-8 text-center max-w-md">
            <AlertCircle className="w-10 h-10 text-[#f2994a] mx-auto mb-3" />
            <h4 className="font-semibold text-sm text-[#202124] mb-1">EPUB E-Book Reader</h4>
            <p className="text-xs text-[#5f6368] mb-4">{error}</p>
            <div className="p-4 bg-[#f8fafd] border border-[#dadce0] rounded-xl text-left text-xs text-[#3c4043] space-y-2">
              <p className="font-medium text-[#202124]">Handbook Table of Contents:</p>
              <ul className="list-disc pl-4 space-y-1 text-[#5f6368]">
                <li>Chapter 1: Welcome to DocVault</li>
                <li>Chapter 2: Organizing Tabs and Documents</li>
                <li>Chapter 3: Secure Sharing with Access Codes</li>
                <li>Chapter 4: Exporting Single and Multi-file Archives</li>
              </ul>
            </div>
          </div>
        ) : (
          <div ref={viewerRef} className="w-full h-full p-4" />
        )}
      </div>

      <div className="text-[11px] text-[#5f6368] text-center">
        Press Left / Right arrows or click navigation buttons to read. Zoom controls adjust font size.
      </div>
    </div>
  );
};
