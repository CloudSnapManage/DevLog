import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { Button, Input, Card } from './UI';
import { Camera, Loader2, User, UserCircle, FolderPlus, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadToGoogleDrive, createFolder } from '../services/driveService';
import { db, auth, googleProvider } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface OnboardingProps {
  user: any;
  onComplete: (profile: UserProfile) => void;
}

export const Onboarding = ({ user, onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    gender: '',
    age: undefined,
    devNickname: '',
    photoURL: user.photoURL || '',
    onboardingComplete: false,
    createdAt: Date.now()
  });
  const [folders, setFolders] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [driveConnected, setDriveConnected] = useState(!!localStorage.getItem('google_drive_token'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const connectDrive = async () => {
    setLoading(true);
    try {
      googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_drive_token', credential.accessToken);
        setDriveConnected(true);
      }
    } catch (error) {
      console.error("Drive connection failed:", error);
      alert("Failed to connect Google Drive.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileName = `profile_${user.uid}_${Date.now()}`;
      const url = await uploadToGoogleDrive(file, fileName);
      setProfile(prev => ({ ...prev, photoURL: url }));
    } catch (error) {
      console.error("Profile photo upload failed:", error);
      alert("Failed to upload profile photo to Google Drive.");
    } finally {
      setLoading(false);
    }
  };

  const addFolder = () => {
    if (newFolderName.trim() && !folders.includes(newFolderName.trim())) {
      setFolders([...folders, newFolderName.trim()]);
      setNewFolderName('');
    }
  };

  const removeFolder = (name: string) => {
    setFolders(folders.filter(f => f !== name));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 1. Create folders in Google Drive if any and drive is connected
      if (folders.length > 0 && driveConnected) {
        await Promise.all(folders.map(name => createFolder(name)));
      }

      // 2. Save profile to Firestore
      const finalProfile: UserProfile = {
        ...profile as UserProfile,
        onboardingComplete: true,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'users', user.uid), finalProfile);
      onComplete(finalProfile);
    } catch (error) {
      console.error("Onboarding failed:", error);
      alert("Something went wrong during setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 overflow-y-auto">
      <Card className="w-full max-w-lg p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800">
          <motion.div 
            className="h-full bg-blue-600"
            initial={{ width: '33%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Personalize Your Profile</h2>
                <p className="text-zinc-500 text-sm">Let's get to know you better, developer.</p>
              </div>

              <div className="flex flex-col items-center mb-8">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-800 bg-zinc-900 flex items-center justify-center">
                    {profile.photoURL ? (
                      <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserCircle size={48} className="text-zinc-700" />
                    )}
                  </div>
                  {driveConnected ? (
                    <>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg transition-colors"
                      >
                        <Camera size={16} />
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    </>
                  ) : (
                    <button 
                      onClick={connectDrive}
                      className="absolute bottom-0 right-0 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full shadow-lg transition-colors border border-zinc-700"
                      title="Connect Google Drive to upload"
                    >
                      <FolderPlus size={16} className="text-blue-500" />
                    </button>
                  )}
                </div>
                {!driveConnected && (
                  <p className="mt-2 text-[10px] text-zinc-500">Connect Google Drive to upload photo</p>
                )}
                {loading && <div className="mt-2 flex items-center gap-2 text-xs text-blue-500"><Loader2 size={12} className="animate-spin" /> Processing...</div>}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Full Name</label>
                  <Input 
                    value={profile.displayName} 
                    onChange={e => setProfile({...profile, displayName: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Dev Nickname</label>
                  <Input 
                    value={profile.devNickname} 
                    onChange={e => setProfile({...profile, devNickname: e.target.value})}
                    placeholder="code_ninja"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Gender</label>
                    <select 
                      value={profile.gender}
                      onChange={e => setProfile({...profile, gender: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all appearance-none"
                    >
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Age</label>
                    <Input 
                      type="number"
                      value={profile.age || ''} 
                      onChange={e => setProfile({...profile, age: parseInt(e.target.value) || undefined})}
                      placeholder="25"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => setStep(2)} 
                className="w-full py-3 mt-4"
                disabled={!profile.displayName || loading}
              >
                Next Step
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Organize Your Gallery</h2>
                <p className="text-zinc-500 text-sm">Create folders for your screenshots, UI designs, or bug logs.</p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    placeholder="e.g., UI Components"
                    onKeyPress={e => e.key === 'Enter' && addFolder()}
                  />
                  <Button onClick={addFolder} variant="secondary" className="px-4">
                    <FolderPlus size={20} />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[100px] p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                  {folders.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center text-zinc-600 py-4">
                      <p className="text-xs italic">No folders added yet.</p>
                    </div>
                  ) : (
                    folders.map(folder => (
                      <span key={folder} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300">
                        {folder}
                        <button onClick={() => removeFolder(folder)} className="text-zinc-500 hover:text-red-400">
                          <X size={14} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1">Review</Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Ready to Start?</h2>
                <p className="text-zinc-500 text-sm">Review your details before we finalize your setup.</p>
              </div>

              <div className="space-y-4 bg-zinc-950 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <img src={profile.photoURL} className="w-16 h-16 rounded-full border border-zinc-800" referrerPolicy="no-referrer" />
                  <div>
                    <h3 className="font-bold text-lg">{profile.displayName}</h3>
                    <p className="text-zinc-500 text-sm">@{profile.devNickname || 'dev'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Gender</p>
                    <p className="capitalize">{profile.gender || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Age</p>
                    <p>{profile.age || 'Not specified'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Gallery Folders</p>
                    <p className="text-zinc-300">{folders.length > 0 ? folders.join(', ') : 'None'}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <Button variant="ghost" onClick={() => setStep(2)} className="flex-1" disabled={loading}>Back</Button>
                <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  Complete Setup
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};
