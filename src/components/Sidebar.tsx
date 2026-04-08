import React from 'react';
import { Search, Plus, Calendar, Hash, Settings, LogOut, BarChart3, Book, Image as ImageIcon } from 'lucide-react';
import { Button } from './UI';
import { JournalEntry } from '../types';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface SidebarProps {
  entries: JournalEntry[];
  activeEntryId?: string;
  onSelectEntry: (id: string) => void;
  onNewEntry: () => void;
  view: 'logs' | 'stats' | 'gallery';
  onViewChange: (view: 'logs' | 'stats' | 'gallery') => void;
}

export const Sidebar = ({ entries, activeEntryId, onSelectEntry, onNewEntry, view, onViewChange }: SidebarProps) => {
  return (
    <div className="w-80 h-screen border-r border-zinc-800 bg-zinc-950 flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">D</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">DevLog</h1>
        </div>

        <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800 mb-6">
          <button 
            onClick={() => onViewChange('logs')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'logs' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Book size={14} />
            Logs
          </button>
          <button 
            onClick={() => onViewChange('gallery')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'gallery' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <ImageIcon size={14} />
            Gallery
          </button>
          <button 
            onClick={() => onViewChange('stats')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'stats' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <BarChart3 size={14} />
            Stats
          </button>
        </div>

        <Button onClick={onNewEntry} className="w-full justify-start mb-6">
          <Plus size={18} />
          New Entry
        </Button>

        <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">Recent Logs</p>
          {entries.length === 0 ? (
            <p className="text-sm text-zinc-600 px-2 italic">No entries yet</p>
          ) : (
            entries.map(entry => (
              <button
                key={entry.id}
                onClick={() => {
                  onViewChange('logs');
                  onSelectEntry(entry.id);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all group ${
                  activeEntryId === entry.id && view === 'logs'
                    ? 'bg-zinc-800 text-zinc-100' 
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={14} className="opacity-50" />
                  <span className="text-xs font-medium">
                    {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-sm font-medium truncate">
                  {entry.content.split('\n')[0] || 'Untitled Entry'}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="mt-auto p-6 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {auth.currentUser?.photoURL ? (
              <img 
                src={auth.currentUser.photoURL} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border border-zinc-700"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <span className="text-[10px] text-zinc-500 font-bold">
                  {auth.currentUser?.displayName?.charAt(0) || 'D'}
                </span>
              </div>
            )}
            <div className="text-sm">
              <p className="font-medium text-zinc-200 truncate max-w-[120px]">
                {auth.currentUser?.displayName || 'Developer'}
              </p>
              <p className="text-xs text-zinc-500">Free Plan</p>
            </div>
          </div>
          <Button variant="ghost" className="p-2 h-auto" onClick={() => signOut(auth)}>
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};
