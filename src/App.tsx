/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Stats } from './components/Stats';
import { Gallery } from './components/Gallery';
import { Onboarding } from './components/Onboarding';
import { JournalEntry, UserProfile } from './types';
import { Terminal, BookOpen, Trophy, LogIn, Loader2, X } from 'lucide-react';
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
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { Button, Input } from './components/UI';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<'logs' | 'stats' | 'gallery'>('logs');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [emailMode, setEmailMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showDriveWarning, setShowDriveWarning] = useState(!localStorage.getItem('google_drive_token'));

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Fetch profile
        try {
          const profileDoc = await getDoc(doc(db, 'users', u.uid));
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data() as UserProfile);
          }
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        }
      } else {
        setUserProfile(null);
      }
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
    setAuthError(null);
    try {
      googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_drive_token', credential.accessToken);
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      setAuthError(error.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsAuthenticating(true);
    setAuthError(null);
    
    try {
      if (emailMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Email auth failed:", error);
      setAuthError(error.message);
    } finally {
      setIsAuthenticating(false);
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
      <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 md:w-20 md:h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/20"
        >
          <span className="text-white font-bold text-3xl md:text-4xl">D</span>
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl md:text-3xl font-bold mb-2 tracking-tight"
        >
          DevLog
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-zinc-500 max-w-sm mb-8 text-sm md:text-base"
        >
          The specialized journaling app for developers.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-sm"
        >
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8">
            {authMode === 'google' ? (
              <div className="space-y-4">
                <Button onClick={handleLogin} className="w-full py-3 text-base">
                  <LogIn size={18} />
                  Sign in with Google
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span></div>
                </div>
                <Button variant="ghost" onClick={() => setAuthMode('email')} className="w-full text-sm">
                  Email & Password
                </Button>
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="text-left space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Email Address</label>
                    <Input 
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="dev@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Password</label>
                    <Input 
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                {authError && (
                  <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">
                    {authError}
                  </p>
                )}

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-500 leading-relaxed text-left">
                  <p className="font-bold uppercase mb-1 flex items-center gap-1">
                    ⚠️ Critical Warning
                  </p>
                  <p>
                    There is currently <strong>no way to recover your password</strong> if forgotten. 
                    Please ensure you save your credentials securely.
                  </p>
                </div>

                <Button type="submit" className="w-full py-3" disabled={isAuthenticating}>
                  {isAuthenticating ? <Loader2 size={18} className="animate-spin" /> : (emailMode === 'login' ? 'Sign In' : 'Create Account')}
                </Button>

                <div className="flex flex-col gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setEmailMode(emailMode === 'login' ? 'signup' : 'login')}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {emailMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setAuthMode('google');
                      setAuthError(null);
                    }}
                    className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    Back to Google Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (!userProfile || !userProfile.onboardingComplete) {
    return <Onboarding user={user} onComplete={setUserProfile} />;
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          entries={entries} 
          activeEntryId={activeEntryId}
          onSelectEntry={(id) => {
            setActiveEntryId(id);
            setIsSidebarOpen(false);
          }}
          onNewEntry={() => {
            handleNewEntry();
            setIsSidebarOpen(false);
          }}
          view={view}
          onViewChange={(v) => {
            setView(v);
            setIsSidebarOpen(false);
          }}
          profile={userProfile}
        />
      </div>
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 bg-zinc-950/50 backdrop-blur-md z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <Terminal size={24} className="text-blue-500" />
          </button>
          <h1 className="text-sm font-bold tracking-tight">DevLog</h1>
          <div className="w-10" /> {/* Spacer */}
        </header>

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

        {/* Google Drive Warning */}
        <AnimatePresence>
          {user && userProfile?.onboardingComplete && showDriveWarning && !localStorage.getItem('google_drive_token') && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-lg"
            >
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex items-center gap-4 backdrop-blur-md">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Terminal size={20} className="text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Google Drive not connected. You can still write logs and track stats, but you won't be able to attach images or use the gallery.
                  </p>
                </div>
                <button 
                  onClick={() => setShowDriveWarning(false)}
                  className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
