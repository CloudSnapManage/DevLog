/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Stats } from './components/Stats';
import { Gallery } from './components/Gallery';
import { JournalEntry } from './types';
import { Terminal, BookOpen, Trophy, LogIn, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db, 
  googleProvider, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  User,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { Button } from './components/UI';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<'logs' | 'stats' | 'gallery'>('logs');

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listener
  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }

    const q = query(
      collection(db, 'entries'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as JournalEntry);
      setEntries(docs);
      
      // Auto-select first entry if none selected
      if (docs.length > 0 && !activeEntryId) {
        setActiveEntryId(docs[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'entries');
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_drive_token', credential.accessToken);
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const activeEntry = entries.find(e => e.id === activeEntryId);

  const handleNewEntry = async () => {
    if (!user) return;
    
    const id = Math.random().toString(36).substr(2, 9);
    const newEntry: JournalEntry = {
      id,
      userId: user.uid,
      date: new Date().toISOString(),
      content: '',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await setDoc(doc(db, 'entries', id), newEntry);
      setActiveEntryId(id);
      setView('logs');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `entries/${id}`);
    }
  };

  const handleSaveEntry = async (updates: Partial<JournalEntry>) => {
    if (!activeEntryId || !user || !activeEntry) return;
    
    setIsSaving(true);
    
    const finalUpdates = {
      ...activeEntry,
      ...updates,
      updatedAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'entries', activeEntryId), finalUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `entries/${activeEntryId}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'entries', id));
      if (activeEntryId === id) {
        setActiveEntryId(undefined);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `entries/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="text-blue-500 animate-spin" size={40} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20">
          <span className="text-white font-bold text-5xl">D</span>
        </div>
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Welcome to DevLog</h1>
        <p className="text-zinc-500 max-w-md mb-10 text-lg">
          The specialized journaling app for developers. Establish a habit, track your growth, and get AI-powered career insights.
        </p>
        <Button onClick={handleLogin} className="px-8 py-4 text-lg">
          <LogIn size={20} />
          Sign in with Google
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30">
      <Sidebar 
        entries={entries} 
        activeEntryId={activeEntryId}
        onSelectEntry={setActiveEntryId}
        onNewEntry={handleNewEntry}
        view={view}
        onViewChange={setView}
      />
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'stats' ? (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              <Stats entries={entries} />
            </motion.div>
          ) : view === 'gallery' ? (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              <Gallery />
            </motion.div>
          ) : activeEntry ? (
            <motion.div 
              key={activeEntry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <Editor 
                entry={activeEntry} 
                onSave={handleSaveEntry}
                onDelete={handleDeleteEntry}
                isSaving={isSaving}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800">
                <Terminal className="text-blue-500" size={40} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Ready to log your progress?</h2>
              <p className="text-zinc-500 max-w-md mb-8">
                Establish a healthy journaling habit. Track your wins, learn from bugs, and grow as a developer every single day.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl w-full">
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-left">
                  <BookOpen className="text-emerald-500 mb-2" size={20} />
                  <h3 className="text-sm font-bold mb-1">Daily Logs</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">Structured templates to help you reflect on your work and goals.</p>
                </div>
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-left">
                  <Trophy className="text-amber-500 mb-2" size={20} />
                  <h3 className="text-sm font-bold mb-1">Career Growth</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">Visualize your progress and identify areas for professional development.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
