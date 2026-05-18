import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { MessageSquare, Send, ShieldCheck, Terminal, Gift } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

interface SupportProps {
  profile: UserProfile;
}

export default function Support({ profile }: SupportProps) {
  const [feedback, setFeedback] = useState('');
  const [type, setType] = useState<'bug' | 'feedback' | 'suggestion'>('feedback');
  const [submitting, setSubmitting] = useState(false);
  
  // Developer Mode State
  const [showDevMode, setShowDevMode] = useState(false);
  const [password, setPassword] = useState('');
  const [devUnlocked, setDevUnlocked] = useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'feedbacks'), {
        userId: profile.id,
        userName: profile.englishName,
        userEmail: profile.id.includes('@') ? profile.id : 'anonymous', // Handling guest/auth mix
        message: feedback,
        type,
        createdAt: new Date().toISOString()
      });
      
      toast.success("Feedback sent to developer! Thank you.");
      setFeedback('');
    } catch (error) {
      console.error("Feedback error:", error);
      toast.error("Failed to send feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDevUnlock = () => {
    if (password === '22340') {
      setDevUnlocked(true);
      toast.success("Developer Mode Unlocked!", { icon: '🔑' });
    } else {
      toast.error("Incorrect password");
    }
  };

  const handleGrantPoints = async () => {
    try {
      const userRef = doc(db, 'users', profile.id);
      await updateDoc(userRef, {
        total_score: 100000000
      });
      toast.success("100,000,000 Points Granted! 💰", { duration: 5000 });
    } catch (error) {
      console.error("Grant error:", error);
      toast.error("Failed to grant points. Ensure your profile is synced.");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-indigo-50 rounded-2xl">
            <MessageSquare className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">Support & Feedback</h2>
            <p className="text-slate-500 font-medium">Have a bug or a suggestion? Let us know!</p>
          </div>
        </div>

        <form onSubmit={handleSubmitFeedback} className="space-y-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            {(['feedback', 'bug', 'suggestion'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold capitalize transition-all ${
                  type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Type your message here..."
            className="w-full h-32 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
            required
          />

          <button
            type="submit"
            disabled={submitting || !feedback.trim()}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {submitting ? "Sending..." : (
              <>
                <Send className="h-5 w-5" />
                Send Feedback
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium italic">
            Direct Email: a223402770@gmail.com
          </p>
        </div>
      </div>

      {/* Developer Section */}
      <div className="pt-12">
        {!showDevMode ? (
          <button 
            onClick={() => setShowDevMode(true)}
            className="mx-auto block text-xs text-slate-300 hover:text-slate-400 font-medium transition-colors"
          >
            Developer Settings
          </button>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 text-slate-300 p-8 rounded-3xl border border-slate-800"
          >
            <div className="flex items-center gap-3 mb-6">
              <Terminal className="h-5 w-5 text-indigo-400" />
              <h3 className="font-black text-white italic uppercase tracking-widest text-sm">Restricted Area</h3>
            </div>

            {!devUnlocked ? (
              <div className="space-y-4">
                <p className="text-xs font-mono text-slate-500 italic">Authentication Required_</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Passcode"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 font-mono text-sm outline-none focus:border-indigo-500 transition-all"
                  />
                  <button
                    onClick={handleDevUnlock}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-sm hover:bg-indigo-700 transition-all"
                  >
                    Unlock
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl flex items-center gap-4">
                  <ShieldCheck className="h-10 w-10 text-indigo-400" />
                  <div>
                    <h4 className="text-white font-black">Mode: Superuser</h4>
                    <p className="text-xs text-indigo-300/70 font-mono">Status: Connected to live DB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={handleGrantPoints}
                    className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-2xl hover:bg-slate-700 hover:border-indigo-500 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Gift className="h-5 w-5 text-indigo-400" />
                      <span className="font-black text-white">Grant 100M Points</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 group-hover:text-indigo-400 uppercase">Execute_</span>
                  </button>
                </div>

                <button 
                  onClick={() => setShowDevMode(false)}
                  className="w-full text-center text-[10px] font-mono text-slate-600 hover:text-slate-500"
                >
                  Exit Control Panel
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
