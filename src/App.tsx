import React, { useState, useEffect } from 'react';
import { auth, db, signIn } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import Dashboard from './components/Dashboard';
import AIPlatform from './components/AIPlatform';
import VocabBank from './components/VocabBank';
import BattleArena from './components/BattleArena';
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
  const [isGuest, setIsGuest] = useState(false);

  // Initialize missions tracking
  useMissions(profile);


  useEffect(() => {
    const handleTabChange = (e: CustomEvent<string>) => {
      setActiveTab(e.detail);
      setQuizConfig(null);
    };
    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
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
    if (!user || isGuest) return;

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
        // Only log if not a "permission-denied" in guest mode (safety check)
        if (!isGuest) {
          console.error("Profile snapshot error:", error);
          toast.error("Error loading account data");
        }
        setLoading(false);
      }
    );

    return () => unsubProfile();
  }, [user?.uid, isGuest]);

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await signIn();
    } catch (error: any) {
      console.error("Sign in full error object:", error);
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // Normal cancellation, do nothing
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error("Domain not authorized! Add 'localhost' to Firebase Console Authorized Domains.");
      } else {
        toast.error(`Sign in error (${error.code}): ${error.message}`);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleGuestMode = () => {
    setIsGuest(true);
    const guestUser = {
      uid: 'guest_user',
      displayName: 'Guest Student',
      email: 'guest@example.com',
      photoURL: null,
    } as unknown as User;
    
    const guestProfile: UserProfile = {
      id: 'guest_user',
      englishName: 'Guest Student',
      className: 'GUEST',
      classNo: '00',
      total_score: 1000,
      xp: 1000,
      level: 4,
      streak: 1,
      inventory: ['item_1'],
      setupComplete: true,
      lastMissionUpdate: new Date().toISOString(),
      missions: [],
      best_display: 'Explorer',
      best_stars: 0,
      best_sort_key: 0,
      avatar: 'student_1',
      activeBadge: null,
      email: 'guest@example.com'
    };
    
    setUser(guestUser);
    setProfile(guestProfile);
    setLoading(false);
    toast.success("Welcome! Entered Guest Mode (Progress not saved to cloud)");
  };

  // streak check
  useEffect(() => {
    if (!profile || isGuest || !user) return;

    const today = new Date().toDateString();
    const lastActive = profile.lastActive ? new Date(profile.lastActive).toDateString() : '';

    if (today !== lastActive) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      const userRef = doc(db, 'users', user.uid);
      
      let newStreak = 1;
      if (lastActive === yesterdayStr) {
        newStreak = (profile.streak || 0) + 1;
        toast.success(`Daily Streak: ${newStreak} Days! 🔥`, { icon: '🔥' });
      } else if (lastActive === '') {
        newStreak = 1;
      } else {
        toast("Streak reset. Log in daily to maintain it!", { icon: '❄️' });
        newStreak = 1;
      }

      updateDoc(userRef, {
        lastActive: new Date().toISOString(),
        streak: newStreak
      }).catch(e => console.error("Streak update failed:", e));
    }
  }, [profile?.id]);

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
            className="w-full bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mb-3"
          >
            {signingIn ? 'Signing in...' : 'Sign in with School Email'}
          </button>
          
          <button
            onClick={handleGuestMode}
            className="w-full bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold border border-indigo-400 hover:bg-indigo-400 transition-colors"
          >
            Try as Guest (Demo)
          </button>
          
          <p className="mt-4 text-xs text-indigo-200">Only @lstkcmss.edu.hk accounts allowed</p>
        </motion.div>
        <Toaster position="top-center" />
      </div>
    );
  }

  if (user && (!profile || !profile.setupComplete)) {
    return <Profile 
      user={user} 
      profile={profile} 
      isSetup={true} 
      onSignOut={() => {
        if (isGuest) {
          setIsGuest(false);
          setUser(null);
          setProfile(null);
        } else {
          auth.signOut();
        }
      }} 
    />;
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
      case 'battle': return <BattleArena profile={profile!} />;
      case 'leaderboard': return <Leaderboard currentUserId={user.uid} isGuest={isGuest} />;
      case 'shop': return <Shop profile={profile!} />;
      case 'profile': return <Profile 
        user={user} 
        profile={profile} 
        isSetup={false} 
        onSignOut={() => {
          if (isGuest) {
            setIsGuest(false);
            setUser(null);
            setProfile(null);
          } else {
            auth.signOut();
          }
        }} 
      />;
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

        <div className="flex items-center gap-2">
          <div className="bg-indigo-800/40 px-2.5 py-1 rounded-lg border border-white/10 flex flex-col items-center">
            <span className="text-[7px] font-black uppercase tracking-tighter opacity-70">Level</span>
            <span className="text-xs font-black leading-none">{profile?.level || 1}</span>
          </div>

          <div className="bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 flex flex-col items-center">
            <span className="text-[7px] font-black text-amber-500 uppercase tracking-tighter">Streak</span>
            <span className="text-xs font-black text-amber-500 leading-none">{profile?.streak || 0}</span>
          </div>

          <div className="bg-indigo-800/50 px-3 py-1.5 rounded-full border border-indigo-500/30 flex items-center gap-1.5 ml-1">
            <span className="text-amber-400 font-bold text-xs">{profile?.total_score?.toLocaleString() || 0}</span>
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
