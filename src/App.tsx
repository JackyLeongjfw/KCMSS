import React, { useState, useEffect } from 'react';
import { auth, db, signIn } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from './types';
import Dashboard from './components/Dashboard';
import AIPlatform from './components/AIPlatform';
import VocabBank from './components/VocabBank';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';
import Shop from './components/Shop';
import Navigation from './components/Navigation';
import QuizGame from './components/QuizGame';
import ThemeSelection from './components/ThemeSelection';
import CharacterPreview from './components/CharacterPreview';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { useMissions } from './hooks/useMissions';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [quizConfig, setQuizConfig] = useState<{ theme: string; mode: number } | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Initialize missions tracking
  useMissions(profile);


  useEffect(() => {
    const handleTabChange = (e: any) => {
      setActiveTab(e.detail);
      setQuizConfig(null);
    };
    window.addEventListener('changeTab', handleTabChange);
    return () => window.removeEventListener('changeTab', handleTabChange);
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), 
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile({ id: user.uid, ...docSnap.data() } as UserProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Profile snapshot error:", error);
        toast.error("Error loading account data");
        setLoading(false);
      }
    );

    return () => unsubProfile();
  }, [user?.uid]);

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await signIn();
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // Normal cancellation, do nothing
      } else {
        console.error("Sign in error:", error);
        toast.error(`Sign in failed: ${error.message}`);
      }
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-indigo-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-4 text-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="bg-white p-4 rounded-full inline-block mb-6 shadow-xl">
            <span className="text-4xl text-indigo-600">🎓</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">KCMSS ENG APP</h1>
          <p className="text-indigo-100 mb-8 max-w-xs mx-auto">
            Your AI-powered companion for DSE English success. 
            Sign in with your school email to begin.
          </p>
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
          >
            {signingIn ? 'Signing in...' : 'Sign in with School Email'}
          </button>
          <p className="mt-4 text-xs text-indigo-200">Only @lstkcmss.edu.hk accounts allowed</p>
        </motion.div>
        <Toaster position="top-center" />
      </div>
    );
  }

  if (user && (!profile || !profile.setupComplete)) {
    return <Profile user={user} profile={profile} isSetup={true} />;
  }

  const renderContent = () => {
    if (quizConfig) {
      return (
        <QuizGame 
          profile={profile!} 
          theme={quizConfig.theme} 
          mode={quizConfig.mode} 
          onFinish={() => setQuizConfig(null)} 
        />
      );
    }

    switch (activeTab) {
      case 'home': return <Dashboard profile={profile} setActiveTab={setActiveTab} onStartQuiz={() => setActiveTab('quiz')} />;
      case 'ai': return <AIPlatform profile={profile!} />;
      case 'quiz': return <ThemeSelection profile={profile!} onSelect={(theme, mode) => setQuizConfig({ theme, mode })} />;
      case 'vocab': return <VocabBank profile={profile!} />;
      case 'leaderboard': return <Leaderboard currentUserId={user.uid} />;
      case 'shop': return <Shop profile={profile!} />;
      case 'profile': return <Profile user={user} profile={profile} isSetup={false} />;
      default: return <Dashboard profile={profile} setActiveTab={setActiveTab} onStartQuiz={() => setActiveTab('quiz')} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20 flex flex-col">
      <header className="bg-indigo-700 h-16 w-full px-4 flex items-center justify-between text-white shadow-lg sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 bg-indigo-700 rounded-sm"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-bold uppercase tracking-widest opacity-80 leading-none">KCMSS</span>
            <span className="text-sm font-black leading-none">AI ENGLISH</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-indigo-800/50 px-3 py-1.5 rounded-full border border-indigo-500/30 flex items-center gap-1.5">
            <span className="text-amber-400 font-bold text-xs">🔥 {profile?.total_score || 0}</span>
            <span className="text-[8px] uppercase font-bold tracking-tighter opacity-70">PTS</span>
          </div>
          
          <div className="relative group cursor-pointer" onClick={() => setActiveTab('profile')}>
            {profile && <CharacterPreview profile={profile} size="sm" />}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="p-4"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <Toaster position="top-center" />
    </div>
  );
}
