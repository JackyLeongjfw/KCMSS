import React, { useState } from 'react';
import { auth, db, signOut } from '../lib/firebase';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { Settings, LogOut, ChevronRight, User as UserIcon, Shield, Check, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import CharacterPreview from './CharacterPreview';

interface ProfileProps {
  user: User;
  profile?: UserProfile | null;
  isSetup: boolean;
  onComplete?: () => void;
}

export default function Profile({ user, profile, isSetup, onComplete }: ProfileProps) {
  const [form, setForm] = useState({
    englishName: profile?.englishName || user.displayName || '',
    className: profile?.className || '',
    classNo: profile?.classNo || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.englishName || !form.className || !form.classNo) {
      toast.error("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const data: Partial<UserProfile> = {
        englishName: form.englishName,
        className: form.className.toUpperCase(),
        classNo: form.classNo,
        email: user.email!,
        setupComplete: true,
        total_score: profile?.total_score || 0,
        inventory: profile?.inventory || [],
        avatar: profile?.avatar || 'default',
        best_sort_key: profile?.best_sort_key || 0,
        best_stars: profile?.best_stars || 0,
        best_display: profile?.best_display || 'Beginner',
      };
      
      await setDoc(doc(db, 'users', user.uid), data, { merge: true });
      toast.success(isSetup ? "Setup complete! Ready for DSE." : "Profile updated!");
      if (onComplete) onComplete();
    } catch (error) {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (isSetup) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex flex-col items-stretch justify-center">
        <div className="bg-white rounded-[2rem] p-8 shadow-xl max-w-sm mx-auto w-full border border-slate-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <UserIcon className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Student Setup</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Initialize your KCMSS account</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">English Name</label>
              <input
                type="text"
                placeholder="e.g. Peter Chan"
                value={form.englishName}
                onChange={(e) => setForm({ ...form, englishName: e.target.value })}
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 font-bold"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Class</label>
                <input
                  type="text"
                  placeholder="e.g. 6A"
                  value={form.className}
                  onChange={(e) => setForm({ ...form, className: e.target.value })}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none uppercase transition-all placeholder:text-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Class No.</label>
                <input
                  type="text"
                  placeholder="e.g. 16"
                  value={form.classNo}
                  onChange={(e) => setForm({ ...form, classNo: e.target.value })}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300 font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 uppercase tracking-widest text-xs"
            >
              {saving ? 'Initializing...' : 'Complete Profile'}
              {!saving && <ChevronRight className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-indigo-50 to-white" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="p-3 bg-white rounded-[4rem] shadow-xl mb-6 ring-8 ring-indigo-50/50">
            {profile && <CharacterPreview profile={profile} size="lg" />}
          </div>
          
          <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none">{profile?.englishName}</h3>
          <div className="flex items-center gap-2 mt-3">
             <span className="text-[10px] bg-indigo-600 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
               Class {profile?.className}
             </span>
             <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">
               No. {profile?.classNo}
             </span>
          </div>
          
          <div className="mt-6 flex gap-6">
            <div className="text-center">
              <span className="block text-xl font-black text-slate-800">{profile?.total_score.toLocaleString()}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Points</span>
            </div>
            <div className="w-px h-10 bg-slate-100" />
            <div className="text-center">
              <span className="block text-xl font-black text-slate-800">{profile?.inventory.length}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Items</span>
            </div>
            <div className="w-px h-10 bg-slate-100" />
            <div className="text-center">
              <span className="block text-xl font-black text-slate-800">{profile?.best_stars || 0}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stars</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 divide-y divide-slate-50 overflow-hidden">
        <button 
          onClick={() => {}} 
          className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-center gap-4 text-slate-700">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all text-slate-500">
              <Settings className="h-5 w-5" />
            </div>
            <span className="font-bold text-sm">Account Preferences</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </button>
        <button 
          onClick={signOut}
          className="w-full px-6 py-5 flex items-center justify-between hover:bg-red-50 transition-colors group"
        >
          <div className="flex items-center gap-4 text-red-600">
             <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
              <LogOut className="h-5 w-5" />
            </div>
            <span className="font-bold text-sm">Sign Out System</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-red-300" />
        </button>
      </div>

      <div className="bg-indigo-900 rounded-3xl p-6 text-white text-center shadow-lg border border-indigo-800 relative overflow-hidden">
        <Shield className="absolute -right-4 -top-4 h-24 w-24 opacity-5" />
        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-3 italic">Strategy Intelligence</h4>
        <p className="text-sm font-medium leading-relaxed opacity-90">
          "The best way to predict the future is to create it. Keep hitting your daily goals."
        </p>
      </div>
    </div>
  );
}
