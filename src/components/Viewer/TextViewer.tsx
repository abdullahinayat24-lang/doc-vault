import React, { useState, useEffect } from 'react';
import { Copy, Check, AlignLeft, WrapText } from 'lucide-react';

interface TextViewerProps {
  url: string;
  name: string;
  zoom: number;
}

export const TextViewer: React.FC<TextViewerProps> = ({
  url,
  name,
  zoom
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [wrapLines, setWrapLines] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    if (url.startsWith('data:')) {
      try {
        const base64 = url.split(',')[1];
        const text = atob(base64);
        setContent(text);
      } catch {
        setContent('Preview not available');
      }
      setLoading(false);
    } else {
      fetch(url)
        .then((res) => res.text())
        .then((text) => {
          setContent(text);
          setLoading(false);
        })
        .catch(() => {
          setContent('Unable to load document content.');
          setLoading(false);
        });
    }
  }, [url]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = content.split('\n');

  return (
    <div className="w-full h-full flex flex-col p-4 bg-[#f8fafd] select-text">
      {/* Top Text Toolbar */}
      <div className="w-full max-w-4xl mx-auto mb-3 bg-white border border-[#dadce0] rounded-xl px-4 py-2 flex items-center justify-between text-xs shadow-xs">
        <div className="flex items-center gap-2 text-[#5f6368]">
          <AlignLeft className="w-4 h-4 text-[#1a73e8]" />
          <span className="font-semibold text-[#202124]">{name}</span>
          <span>• {lines.length} lines</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWrapLines(!wrapLines)}
            className={`px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
              wrapLines ? 'bg-[#e8f0fe] border-[#1a73e8] text-[#1a73e8]' : 'bg-white border-[#dadce0] text-[#5f6368]'
            }`}
            title="Toggle Word Wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
            <span>Wrap</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-2.5 py-1 bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-[#202124] rounded-lg transition-colors flex items-center gap-1"
            title="Copy Text to Clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#137333]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Text Container */}
      <div className="w-full max-w-4xl mx-auto flex-1 bg-white border border-[#dadce0] rounded-2xl shadow-sm overflow-auto p-6 font-mono text-xs leading-relaxed text-[#202124]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-[#5f6368]">
            <div className="w-6 h-6 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading text...</p>
          </div>
        ) : (
          <pre
            style={{ fontSize: `${Math.round(zoom * 13)}px` }}
            className={`m-0 ${wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}
          >
            {content}
          </pre>
        )}
      </div>
    </div>
  );
};
