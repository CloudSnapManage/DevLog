import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { fetchDriveFile } from '../services/driveService';

interface DriveImageProps {
  url: string;
  className?: string;
}

export const DriveImage = ({ url, className }: DriveImageProps) => {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);

        // Extract file ID from various possible URL formats
        // 1. https://drive.google.com/thumbnail?id=FILE_ID...
        // 2. https://lh3.googleusercontent.com/u/0/d/FILE_ID
        let fileId = '';
        if (url.includes('id=')) {
          fileId = url.split('id=')[1].split('&')[0];
        } else if (url.includes('/d/')) {
          fileId = url.split('/d/')[1].split('?')[0];
        } else {
          // Fallback if it's already just an ID or unknown format
          fileId = url;
        }

        if (!fileId) throw new Error('Invalid Google Drive URL');

        objectUrl = await fetchDriveFile(fileId);
        setSrc(objectUrl);
      } catch (err: any) {
        console.error('DriveImage load error:', err);
        setError(err.message || 'Failed to load image');
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup: Revoke the object URL to free memory
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-zinc-900/50 animate-pulse ${className}`}>
        <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className={`flex flex-col items-center justify-center bg-zinc-900/50 text-zinc-500 gap-2 p-4 border border-dashed border-zinc-800 ${className}`}>
        <AlertCircle className="w-6 h-6 text-zinc-700" />
        <span className="text-xs text-center">{error || 'Image unavailable'}</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt="Drive attachment" 
      className={className}
      referrerPolicy="no-referrer"
    />
  );
};
