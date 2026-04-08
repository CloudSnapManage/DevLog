import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, 
  Image as ImageIcon, 
  Plus, 
  Upload, 
  ChevronLeft, 
  Loader2, 
  FolderPlus,
  MoreVertical,
  Trash2,
  ExternalLink,
  Search,
  X,
  CheckSquare,
  Square,
  Copy,
  Scissors,
  ClipboardPaste,
  XCircle,
  Check,
  Download
} from 'lucide-react';
import { 
  listFolders, 
  listFiles, 
  createFolder, 
  uploadToGoogleDrive, 
  deleteFile, 
  searchFiles,
  moveFile,
  copyFile,
  fetchDriveFile
} from '../services/driveService';
import { DriveImage } from './DriveImage';
import { Button } from './UI';
import { motion, AnimatePresence } from 'motion/react';

export const Gallery = () => {
  const [folders, setFolders] = useState<{ id: string, name: string }[]>([]);
  const [currentFolder, setCurrentFolder] = useState<{ id: string, name: string } | null>(null);
  const [files, setFiles] = useState<{ id: string, name: string, webViewLink?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ id: string, name: string, webViewLink?: string } | null>(null);
  const [imageToDelete, setImageToDelete] = useState<{ id: string, name: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [clipboard, setClipboard] = useState<{ ids: string[], type: 'copy' | 'cut', sourceFolderId: string | null } | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const delayDebounceFn = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else if (currentFolder) {
      loadFiles(currentFolder.id);
    }
  }, [searchQuery, currentFolder]);

  const handleSearch = async () => {
    try {
      setIsSearching(true);
      const results = await searchFiles(searchQuery, currentFolder?.id);
      setFiles(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete) return;

    try {
      setLoading(true);
      await deleteFile(imageToDelete.id);
      setFiles(prev => prev.filter(f => f.id !== imageToDelete.id));
      setImageToDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete image');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      setLoading(true);
      await Promise.all(selectedIds.map(id => deleteFile(id)));
      setFiles(prev => prev.filter(f => !selectedIds.includes(f.id)));
      setSelectedIds([]);
      setIsSelectionMode(false);
      setIsBulkDeleting(false);
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('Failed to delete some images');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCopy = () => {
    if (selectedIds.length === 0) return;
    setClipboard({ ids: [...selectedIds], type: 'copy', sourceFolderId: currentFolder?.id || null });
    setSelectedIds([]);
    setIsSelectionMode(false);
  };

  const handleCut = () => {
    if (selectedIds.length === 0) return;
    setClipboard({ ids: [...selectedIds], type: 'cut', sourceFolderId: currentFolder?.id || null });
    setSelectedIds([]);
    setIsSelectionMode(false);
  };

  const handlePaste = async () => {
    if (!clipboard || !currentFolder) return;
    
    try {
      setLoading(true);
      const { ids, type, sourceFolderId } = clipboard;
      
      if (type === 'cut' && sourceFolderId) {
        if (sourceFolderId === currentFolder.id) {
          alert('Cannot paste into the same folder');
          return;
        }
        await Promise.all(ids.map(id => moveFile(id, currentFolder.id, sourceFolderId)));
      } else {
        await Promise.all(ids.map(id => copyFile(id, currentFolder.id)));
      }
      
      setClipboard(null);
      loadFiles(currentFolder.id);
    } catch (error) {
      console.error('Paste failed:', error);
      alert('Failed to paste some images');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      setIsDownloading(true);
      const url = await fetchDriveFile(fileId);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image');
    } finally {
      setIsDownloading(false);
    }
  };

  const loadFolders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listFolders();
      setFolders(data);
    } catch (err: any) {
      console.error('Failed to load folders:', err);
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (folderId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await listFiles(folderId);
      setFiles(data);
    } catch (err: any) {
      console.error('Failed to load files:', err);
      setError(err.message || 'Failed to list files');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      setLoading(true);
      const id = await createFolder(newFolderName);
      setFolders(prev => [...prev, { id, name: newFolderName }]);
      setNewFolderName('');
      setShowNewFolderModal(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !currentFolder) return;

    try {
      setIsUploading(true);
      setUploadProgress({ current: 0, total: selectedFiles.length });

      const uploadPromises = Array.from(selectedFiles).map(async (file, index) => {
        const fileName = `${Date.now()}_${file.name}`;
        await uploadToGoogleDrive(file, fileName, currentFolder.id);
        setUploadProgress(prev => ({ ...prev, current: index + 1 }));
      });

      await Promise.all(uploadPromises);
      
      // Refresh files
      loadFiles(currentFolder.id);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('One or more uploads failed');
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading && !folders.length && !currentFolder) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen flex flex-col bg-zinc-950 overflow-hidden">
      <header className="h-16 border-b border-zinc-800 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          {currentFolder && (
            <button 
              onClick={() => setCurrentFolder(null)}
              className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <h2 className="text-lg font-semibold text-zinc-100">
            {currentFolder ? currentFolder.name : 'Gallery'}
          </h2>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={currentFolder ? `Search in ${currentFolder.name}...` : "Search all images..."}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentFolder && (
            <>
              {isSelectionMode ? (
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1">
                  <span className="text-xs font-medium text-zinc-400 px-2">{selectedIds.length} selected</span>
                  <Button 
                    variant="ghost" 
                    onClick={handleCopy}
                    disabled={selectedIds.length === 0}
                    className="p-2 h-auto"
                    title="Copy"
                  >
                    <Copy size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={handleCut}
                    disabled={selectedIds.length === 0}
                    className="p-2 h-auto"
                    title="Cut"
                  >
                    <Scissors size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsBulkDeleting(true)}
                    disabled={selectedIds.length === 0}
                    className="p-2 h-auto text-red-400 hover:text-red-300"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </Button>
                  <div className="w-px h-4 bg-zinc-800 mx-1" />
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedIds([]);
                    }}
                    className="p-2 h-auto"
                  >
                    <X size={16} />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {clipboard && (
                    <Button 
                      onClick={handlePaste} 
                      variant="ghost" 
                      className="gap-2 text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20"
                    >
                      <ClipboardPaste size={18} />
                      Paste ({clipboard.ids.length})
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsSelectionMode(true)}
                    className="gap-2"
                  >
                    <CheckSquare size={18} />
                    Select
                  </Button>
                </div>
              )}
            </>
          )}
          {!currentFolder ? (
            <Button onClick={() => setShowNewFolderModal(true)} variant="ghost" className="gap-2">
              <FolderPlus size={18} />
              New Folder
            </Button>
          ) : (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleUpload} 
                className="hidden" 
                accept="image/*"
                multiple
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Uploading {uploadProgress.current}/{uploadProgress.total}...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Upload Images
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <XCircle className="w-12 h-12 mb-4 text-red-500/50" />
              <p className="text-zinc-400 mb-6">{error}</p>
              <Button 
                onClick={() => currentFolder ? loadFiles(currentFolder.id) : loadFolders()}
                variant="secondary"
              >
                Retry
              </Button>
            </div>
          ) : !currentFolder ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {folders.map(folder => (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={folder.id}
                  onClick={() => setCurrentFolder(folder)}
                  className="group flex flex-col items-center p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:bg-zinc-900 hover:border-zinc-700 transition-all"
                >
                  <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Folder className="w-8 h-8 text-blue-500" />
                  </div>
                  <span className="text-sm font-medium text-zinc-200 text-center truncate w-full">
                    {folder.name}
                  </span>
                </motion.button>
              ))}
              {folders.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-500">
                  <Folder className="w-12 h-12 mb-4 opacity-20" />
                  <p>No folders found. Create one to get started!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {files.map(file => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={file.id}
                  className={`relative group aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer ${
                    selectedIds.includes(file.id) 
                      ? 'border-blue-500 ring-2 ring-blue-500/20' 
                      : 'border-zinc-800 bg-zinc-900'
                  }`}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelect(file.id);
                    } else {
                      setSelectedImage(file);
                    }
                  }}
                >
                  <DriveImage 
                    url={`https://drive.google.com/thumbnail?id=${file.id}&sz=w1000`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  
                  {isSelectionMode && (
                    <div className="absolute top-3 left-3 z-10">
                      {selectedIds.includes(file.id) ? (
                        <div className="bg-blue-500 rounded-md p-0.5">
                          <Check size={14} className="text-white" />
                        </div>
                      ) : (
                        <div className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-md w-5 h-5" />
                      )}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-white truncate font-medium flex-1">{file.name}</p>
                      {!isSelectionMode && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setImageToDelete(file);
                          }}
                          className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {files.length === 0 && !isUploading && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-500">
                  <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                  <p>This folder is empty.</p>
                </div>
              )}
              {isUploading && (
                <div className="aspect-square rounded-xl border border-dashed border-zinc-800 flex items-center justify-center bg-zinc-900/30 animate-pulse">
                  <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-full"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm">
                <div className="flex flex-col">
                  <h3 className="text-sm font-semibold text-zinc-100 truncate max-w-md">
                    {selectedImage.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDownload(selectedImage.id, selectedImage.name)}
                    disabled={isDownloading}
                    className="p-2 text-zinc-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                    title="Download"
                  >
                    {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                  </button>
                  {selectedImage.webViewLink && (
                    <a 
                      href={selectedImage.webViewLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-zinc-400 hover:text-blue-400 transition-colors"
                      title="View in Google Drive"
                    >
                      <ExternalLink size={20} />
                    </a>
                  )}
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/20">
                <DriveImage 
                  url={`https://drive.google.com/thumbnail?id=${selectedImage.id}&sz=w2000`}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              </div>
            </motion.div>
          </div>
        )}

        {imageToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setImageToDelete(null)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="text-red-500" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Delete Image?</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Are you sure you want to delete <span className="text-zinc-200 font-medium">"{imageToDelete.name}"</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setImageToDelete(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleDeleteImage}
                  className="bg-red-600 hover:bg-red-700 text-white border-none"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {isBulkDeleting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkDeleting(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="text-red-500" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Delete {selectedIds.length} Images?</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Are you sure you want to delete these <span className="text-zinc-200 font-medium">{selectedIds.length}</span> images? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsBulkDeleting(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700 text-white border-none"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 'Delete All'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {showNewFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewFolderModal(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">Create New Folder</h3>
              <form onSubmit={handleCreateFolder}>
                <input
                  autoFocus
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name (e.g., UI Screenshots)"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-6"
                />
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setShowNewFolderModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!newFolderName.trim() || loading}>
                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Create Folder'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
