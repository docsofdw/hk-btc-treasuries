'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface EmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteUrl: string;
}

export default function EmbedModal({ isOpen, onClose, siteUrl }: EmbedModalProps) {
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('600');
  const [theme, setTheme] = useState('light');
  
  const embedUrl = `${siteUrl}?region=hk-cn&theme=${theme}`;
  const embedCode = `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);"></iframe>`;
  
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Embed code copied to clipboard!');
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Embed Hong Kong & China Bitcoin Treasuries</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Width</label>
              <input
                type="text"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="100% or 800"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Height (px)</label>
              <input
                type="text"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="600"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Theme</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 px-3 py-2 rounded border ${
                  theme === 'light' 
                    ? 'bg-brand text-white border-brand' 
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 px-3 py-2 rounded border ${
                  theme === 'dark' 
                    ? 'bg-brand text-white border-brand' 
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Dark
              </button>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Embed Code</label>
          <div className="relative">
            <textarea
              readOnly
              value={embedCode}
              className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-xs h-24 bg-gray-50"
            />
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 px-3 py-1 bg-brand text-white text-sm rounded hover:bg-brand-dark transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-600 mb-2">Preview:</p>
          <div className="border border-gray-300 rounded overflow-hidden" style={{ height: '200px' }}>
            <iframe 
              src={embedUrl} 
              width="100%" 
              height="100%" 
              frameBorder="0"
            />
          </div>
        </div>
        
        <p className="text-xs text-gray-500">
          This embed will automatically update with the latest Bitcoin treasury data.
        </p>
      </div>
    </div>
  );
} 