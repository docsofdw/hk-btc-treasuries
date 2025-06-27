'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';
import { Share2, Download, Check } from 'lucide-react';
import { Button } from './button';

interface ShareButtonProps {
  targetId?: string;
  className?: string;
}

export function ShareButton({ targetId = 'treasury-table', className }: ShareButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const captureScreenshot = async () => {
    setIsCapturing(true);
    
    try {
      // Find the element to capture
      const element = document.getElementById(targetId);
      if (!element) {
        console.error('Target element not found');
        return;
      }

      // Add a temporary class for screenshot styling
      element.classList.add('screenshot-mode');
      
      // Create a wrapper div with background and padding for the screenshot
      const wrapper = document.createElement('div');
      wrapper.style.backgroundColor = '#ffffff';
      wrapper.style.padding = '40px';
      wrapper.style.borderRadius = '12px';
      wrapper.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      
      // Add watermark/branding
      const watermark = document.createElement('div');
      watermark.style.position = 'absolute';
      watermark.style.bottom = '20px';
      watermark.style.right = '20px';
      watermark.style.fontSize = '14px';
      watermark.style.color = '#6b7280';
      watermark.style.fontWeight = '500';
      watermark.innerHTML = `Asia's Bitcoin Treasuries • ${new Date().toLocaleDateString()} • ${window.location.hostname}`;
      
      // Clone the element to avoid modifying the original
      const clonedElement = element.cloneNode(true) as HTMLElement;
      clonedElement.style.position = 'relative';
      
      wrapper.appendChild(clonedElement);
      wrapper.appendChild(watermark);
      
      // Temporarily add to body
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';
      document.body.appendChild(wrapper);

      // Capture the screenshot
      const canvas = await html2canvas(wrapper, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        windowWidth: 1200,
        windowHeight: 800,
      });

      // Remove the temporary wrapper
      document.body.removeChild(wrapper);
      element.classList.remove('screenshot-mode');

      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        // Check if Web Share API is available and supports sharing files
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'asia-bitcoin-treasuries.png', { type: 'image/png' })] })) {
          try {
            await navigator.share({
              title: "Asia's Bitcoin Treasuries",
              text: 'Check out the latest Bitcoin holdings by Asian companies',
              files: [new File([blob], 'asia-bitcoin-treasuries.png', { type: 'image/png' })],
            });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
          } catch (err) {
            // User cancelled or error occurred, fall back to download
            downloadImage(blob);
          }
        } else {
          // Fallback: Download the image
          downloadImage(blob);
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const downloadImage = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asia-bitcoin-treasuries-${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <Button
      onClick={captureScreenshot}
      disabled={isCapturing}
      className={className}
      variant="default"
      size="default"
    >
      {isCapturing ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-0 sm:mr-2" />
          <span className="hidden sm:inline">Capturing...</span>
        </>
      ) : showSuccess ? (
        <>
          <Check className="h-4 w-4 mr-0 sm:mr-2" />
          <span className="hidden sm:inline">Saved!</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4 mr-0 sm:mr-2" />
          <span className="hidden sm:inline">Share</span>
        </>
      )}
    </Button>
  );
} 