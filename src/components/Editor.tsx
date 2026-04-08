import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Save, Trash2, Tag as TagIcon, Loader2, FileText, Image as ImageIcon, X } from 'lucide-react';
import { Button, Card } from './UI';
import { JournalEntry, Mood } from '../types';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { TemplatePicker } from './TemplatePicker';
import { uploadToGoogleDrive } from '../services/driveService';

import { DriveImage } from './DriveImage';

interface EditorProps {
  entry: JournalEntry;
  onSave: (updates: Partial<JournalEntry>) => void;
  onDelete: (id: string) => void;
  isSaving?: boolean;
}

export const Editor = ({ entry, onSave, onDelete, isSaving }: EditorProps) => {
  const [content, setContent] = useState(entry.content);
  const [isPreview, setIsPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContent(entry.content);
  }, [entry.id]);

  const handleSave = () => {
    onSave({ content });
  };

  const handleTemplateSelect = (templateContent: string) => {
    setContent(prev => prev ? `${prev}\n\n${templateContent}` : templateContent);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate progress since fetch doesn't give it easily for small files
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const fileName = `devlog_${entry.id}_${Date.now()}`;
      const url = await uploadToGoogleDrive(file, fileName);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Update entry with image URL
      onSave({ imageUrl: url });
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (error: any) {
      console.error("Upload failed:", error);
      alert(error.message || "Failed to upload image to Google Drive.");
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (!entry.imageUrl) return;
    
    if (window.confirm("Are you sure you want to remove this image?")) {
      try {
        // We don't necessarily need to delete from storage if we want to keep history,
        // but for a clean app, we should.
        // However, we need the full path to delete. 
        // For now, let's just clear the URL in the document.
        onSave({ imageUrl: undefined });
      } catch (error) {
        console.error("Remove failed:", error);
      }
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-zinc-950 overflow-hidden">
      <header className="min-h-16 border-b border-zinc-800 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between py-4 md:py-0 gap-4 shrink-0">
        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto no-scrollbar">
          <span className="text-xs md:text-sm font-medium text-zinc-400 whitespace-nowrap">
            {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <div className="h-4 w-px bg-zinc-800 shrink-0" />
          <div className="flex gap-2 shrink-0">
            {entry.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
              accept="image/*"
            />
            <Button 
              variant="ghost" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !!entry.imageUrl}
              className="h-8 md:h-9 px-2 md:px-3 text-zinc-400 hover:text-zinc-100 relative overflow-hidden"
            >
              {isUploading ? (
                <>
                  <div 
                    className="absolute bottom-0 left-0 h-0.5 bg-blue-500 transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                  <Loader2 size={14} className="animate-spin" />
                </>
              ) : (
                <ImageIcon size={14} />
              )}
              <span className="hidden sm:inline ml-2 text-xs">
                {entry.imageUrl ? 'Attached' : isUploading ? 'Uploading...' : 'Image'}
              </span>
            </Button>

            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button 
                onClick={() => setIsPreview(false)}
                className={`px-2 md:px-3 py-1 text-[10px] md:text-xs font-medium rounded-md transition-all ${!isPreview ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Write
              </button>
              <button 
                onClick={() => setIsPreview(true)}
                className={`px-2 md:px-3 py-1 text-[10px] md:text-xs font-medium rounded-md transition-all ${isPreview ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Preview
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSave} 
              disabled={isSaving || (content === entry.content && !isUploading)}
              className="h-8 md:h-9 px-3 md:px-4"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span className="hidden sm:inline ml-2 text-xs">Save</span>
            </Button>
            <Button 
              variant="danger" 
              onClick={() => onDelete(entry.id)}
              className="h-8 w-8 md:h-9 md:w-9 p-0"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto flex">
        <div className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full">
          {!isPreview && <TemplatePicker onSelect={handleTemplateSelect} />}
          
          {entry.imageUrl && (
            <div className="relative group mb-8 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/50 shadow-2xl">
              <DriveImage 
                url={entry.imageUrl} 
                className="w-full h-auto max-h-[600px] object-contain bg-zinc-900 transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <button 
                onClick={handleRemoveImage}
                className="absolute top-4 right-4 p-2 bg-zinc-950/80 text-zinc-400 hover:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-zinc-800 z-10"
                title="Remove image"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {isPreview ? (
            <div className="prose prose-invert max-w-none prose-zinc">
              <ReactMarkdown>{content || '*No content yet. Start writing...*'}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What did you build today? Any bugs that kept you up? What's the plan for tomorrow?"
              className="flex-1 bg-transparent text-zinc-200 placeholder:text-zinc-700 resize-none focus:outline-none font-mono text-base md:text-lg leading-relaxed"
            />
          )}
        </div>
      </main>
    </div>
  );
};
