import React, { useState, useEffect } from 'react';
import vocabData from '../data/vocab_master.json';
import { UserProfile, EssaySuggestion } from '../types';
import { analyzeEssay } from '../services/geminiService';
import { usePronunciation } from '../hooks/usePronunciation';
import { Sparkles, Send, Volume2, Languages, Book, Mic, CheckCircle2, X, Plus, History, Trash2, ChevronRight, Bookmark } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp, setDoc, collection, query, orderBy, onSnapshot, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useMissions } from '../hooks/useMissions';

interface SavedAnalysis {
  id: string;
  essay: string;
  sentencePairs: { original: string; translation: string }[];
  suggestions: EssaySuggestion[];
  createdAt: any;
}

interface AIPlatformProps {
  profile: UserProfile;
}

export default function AIPlatform({ profile }: AIPlatformProps) {
  const [essay, setEssay] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    sentencePairs: { original: string; translation: string }[];
    suggestions: EssaySuggestion[];
  } | null>(null);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddModal, setShowAddModal] = useState<EssaySuggestion | null>(null);
  const [newTheme, setNewTheme] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [activeTab, setActiveTab] = useState<'reading' | 'vocabulary'>('reading');
  
  const { speak, testPronunciation, isSynthesizing, isRecognizing } = usePronunciation();
  const { updateMissionProgress } = useMissions(profile);

  useEffect(() => {
    if (!profile || profile.id === 'guest_user') return;

    const q = query(
      collection(db, 'users', profile.id, 'analyses'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SavedAnalysis)));
    }, (error) => {
      console.error("AI History snapshot error:", error);
    });
    return () => unsubscribe();
  }, [profile?.id]);

  if (!profile) return null;

  const handleTestPronunciation = async (text: string) => {
    const score = await testPronunciation(text);
    
    // Mission Progress: Pronunciation
    updateMissionProgress('pronunciation', 1);

    if (score >= 80) {
      toast.success(`Great job! Pronunciation score: ${score}%`);
    } else {
      toast.error(`Keep practicing! Score: ${score}%`);
    }
  };

  const handleAnalyze = async () => {
    if (!essay.trim()) return;
    setAnalyzing(true);
    try {
      const data = await analyzeEssay(essay);
      setResult(data);
      setActiveTab('reading');
      toast.success("Essay analyzed successfully!");
      
      // Only update cloud if not a guest
      if (profile.id !== 'guest_user') {
        const docRef = doc(db, 'users', profile.id);
        await updateDoc(docRef, {
          total_score: (profile.total_score || 0) + 50
        });
      }

      // Mission Progress: Analysis
      updateMissionProgress('analysis', 1);
      
    } catch (error) {
      console.error(error);
      toast.error("Failed to analyze essay. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const saveAnalysis = async () => {
    if (!result || !essay) return;
    if (profile.id === 'guest_user') {
      toast.error("Analysis history is not available in Guest mode.");
      return;
    }
    try {
      const analysesRef = collection(db, 'users', profile.id, 'analyses');
      await addDoc(analysesRef, {
        essay,
        sentencePairs: result.sentencePairs,
        suggestions: result.suggestions,
        createdAt: serverTimestamp()
      });
      toast.success("Analysis saved to your history!");
    } catch (error) {
      toast.error("Failed to save analysis");
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', profile.id, 'analyses', id));
      toast.success("Analysis deleted");
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const addToBank = async () => {
    if (!showAddModal) return;
    if (profile.id === 'guest_user') {
      toast.error("Cloud Word Bank is not available in Guest mode.");
      return;
    }
    const theme = newTheme.trim() || selectedTheme;
    if (!theme) {
      toast.error("Please select or create a theme");
      return;
    }

    try {
      const vocabRef = doc(db, 'users', profile.id, 'vocabulary', `${theme}_${showAddModal.word}`);
      await setDoc(vocabRef, {
        word: showAddModal.word,
        meaning: showAddModal.meaning,
        partOfSpeech: showAddModal.pos,
        sentence: showAddModal.example,
        theme: theme,
        section: 'AI Suggested',
        createdAt: serverTimestamp()
      });
      toast.success(`"${showAddModal.word}" added to ${theme}!`);
      setShowAddModal(null);
      setNewTheme('');
    } catch (error) {
      console.error(error);
      toast.error("Failed to add word");
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* ... (previous header code) */}
      <div className="bg-indigo-700 rounded-2xl shadow-lg border border-indigo-600 overflow-hidden relative">
        {analyzing && (
          <div className="absolute inset-0 bg-indigo-900/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-white">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-indigo-400/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 font-black uppercase tracking-widest text-[10px] animate-pulse">Engaging AI Brain...</p>
            <button 
              onClick={() => setAnalyzing(false)}
              className="mt-6 text-[9px] font-bold uppercase tracking-tight py-1.5 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-all"
            >
              Cancel Request
            </button>
          </div>
        )}
        <div className="bg-indigo-800/50 px-5 py-3 border-b border-indigo-500/30 flex justify-between items-center">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-widest">AI Assistance</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-bold uppercase">Pro Enabled</span>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'home' }))}
              className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-6 text-white">
          <p className="text-indigo-100 text-sm leading-relaxed">
            Harness the power of AI to refine your DSE essays. Get instant Chinese translations and context-aware vocabulary suggestions.
          </p>
        </div>
      </div>

      {/* Suggestion Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="bg-indigo-600 p-6 text-white">
                <h3 className="text-xl font-black italic tracking-tighter">Add to Word Bank</h3>
                <p className="text-indigo-100 text-xs mt-1 font-bold uppercase tracking-widest opacity-80">Saving: {showAddModal.word}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Create New Theme</label>
                  <input 
                    type="text" 
                    value={newTheme}
                    onChange={(e) => setNewTheme(e.target.value)}
                    placeholder="e.g. Environmental Protection"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-[10px] font-black text-slate-300 uppercase">OR</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Existing</label>
                  <select 
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold"
                  >
                    <option value="">-- Choose Theme --</option>
                    {Array.from(new Set([
                      ...Array.from(new Set(vocabData.map(v => v.theme))),
                      // You'd ideally fetch profile's custom themes here too
                    ])).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setShowAddModal(null)}
                    className="flex-1 py-3 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addToBank}
                    className="flex-1 py-3 bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                  >
                    Confirm Save
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!result ? (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 space-y-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Draft Your Essay</label>
              {history.length > 0 && (
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1.5 text-indigo-600 text-[10px] font-black uppercase tracking-widest"
                >
                  <History className="h-3 w-3" />
                  {showHistory ? "Hide History" : `History (${history.length})`}
                </button>
              )}
            </div>
            
            <textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder="Paste your essay here for AI analysis..."
              className="w-full h-56 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm font-medium placeholder:text-slate-400 transition-all outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={handleAnalyze}
                disabled={analyzing || essay.length < 10}
                className={cn(
                  "flex-1 py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]",
                  analyzing || essay.length < 10 ? "bg-slate-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                )}
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Analyze Essay
                  </>
                )}
              </button>
            </div>
          </div>

          {showHistory && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-4 px-2">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previous Work</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
              
              <div className="grid gap-3">
                {history.map((h) => (
                  <div key={h.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 cursor-pointer" onClick={() => {
                        setResult({ sentencePairs: h.sentencePairs, suggestions: h.suggestions });
                        setEssay(h.essay);
                      }}>
                        <p className="text-sm font-bold text-slate-800 line-clamp-1">{h.essay}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(h.createdAt?.toDate()).toLocaleDateString()}</p>
                      </div>
                      <button 
                        onClick={() => deleteAnalysis(h.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        setResult({ sentencePairs: h.sentencePairs, suggestions: h.suggestions });
                        setEssay(h.essay);
                      }}
                      className="w-full py-2 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-2"
                    >
                      Restore Analysis
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 items-center">
            <button 
              onClick={() => { setResult(null); setEssay(''); }}
              className="flex items-center gap-2 text-slate-500 text-xs font-bold bg-white px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
            >
              ← Clear
            </button>
            <button 
              onClick={saveAnalysis}
              className="flex items-center gap-2 text-emerald-600 text-xs font-bold bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <Bookmark className={cn("h-4 w-4", history.some(h => h.essay === essay) ? "fill-emerald-600" : "")} />
              Save Result
            </button>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 ml-auto">
              <button
                onClick={() => setActiveTab('reading')}
                className={cn(
                  "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === 'reading' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Line-by-Line
              </button>
              <button
                onClick={() => setActiveTab('vocabulary')}
                className={cn(
                  "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === 'vocabulary' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Words to Learn
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'reading' ? (
              <motion.div 
                key="reading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {result.sentencePairs.map((pair, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                    <div className="p-5 flex gap-4">
                      <div className="flex-1 space-y-2">
                        <p className="text-slate-900 font-medium leading-relaxed">
                          {pair.original}
                        </p>
                        <p className="text-indigo-600 font-medium text-sm border-t border-slate-100 pt-2 opacity-90">
                          {pair.translation}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => speak(pair.original)}
                          className="p-2.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90"
                          title="Listen to sentence"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleTestPronunciation(pair.original)}
                          className="p-2.5 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90"
                          title="Practice pronunciation"
                        >
                          <Mic className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="vocabulary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-indigo-900 rounded-3xl shadow-xl overflow-hidden"
              >
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-400 rounded-xl">
                      <Book className="h-5 w-5 text-amber-900" />
                    </div>
                    <div>
                      <h4 className="text-white font-black uppercase tracking-tighter">Vocabulary Recommendations</h4>
                      <p className="text-indigo-400 text-[10px] uppercase font-bold tracking-widest">Master these to level up your writing</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-100 transition-opacity">
                        <div className="p-1.5 bg-white/10 rounded-full">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                      </div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-baseline gap-3">
                            <span className="font-black text-2xl text-white tracking-tighter">{s.word}</span>
                            <span className="text-xs text-indigo-400 font-serif italic">[{s.pos}]</span>
                          </div>
                          <p className="text-amber-400 font-bold mt-1 text-sm">{s.meaning}</p>
                        </div>
                        <button 
                          onClick={() => setShowAddModal(s)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
                        >
                          <Plus className="h-3 w-3" />
                          Add to Bank
                        </button>
                      </div>
                      <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <p className="text-indigo-200 text-xs italic leading-relaxed">
                          "{s.example}"
                        </p>
                        <div className="flex gap-2 mt-4">
                          <button 
                            onClick={() => speak(s.word)}
                            className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-all text-white flex items-center gap-2"
                          >
                            <Volume2 className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Pronounce</span>
                          </button>
                          <button 
                            onClick={() => handleTestPronunciation(s.word)}
                            className="bg-emerald-500/20 p-2.5 rounded-xl hover:bg-emerald-500/40 transition-all text-emerald-400 border border-emerald-500/30 flex items-center gap-2"
                          >
                            <Mic className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Practice</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
