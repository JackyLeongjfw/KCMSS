import React, { useState, useEffect } from 'react';
import vocabData from '../data/vocab_master.json';
import { UserProfile, VocabCard } from '../types';
import { Volume2, Search, ChevronDown, ChevronUp, Play, RotateCcw, Check, X, Mic, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePronunciation } from '../hooks/usePronunciation';
import { cn } from '../lib/utils';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface RevisionCenterProps {
  profile: UserProfile;
}

export default function VocabBank({ profile }: RevisionCenterProps) {
  const [editingCard, setEditingCard] = useState<VocabCard | null>(null);
  const [sessionPage, setSessionPage] = useState<'list' | 'config' | 'session'>('list');
  const [sessionCards, setSessionCards] = useState<VocabCard[]>([]);
  const [sessionConfig, setSessionConfig] = useState<{
    themes: string[];
    sections: string[];
    count: number;
  }>({
    themes: [],
    sections: [],
    count: 10
  });

  const [search, setSearch] = useState('');
  const [userVocab, setUserVocab] = useState<VocabCard[]>([]);
  const [combinedVocab, setCombinedVocab] = useState<VocabCard[]>([]);
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});
  const { speak, testPronunciation, isSynthesizing, isRecognizing } = usePronunciation();

  useEffect(() => {
    const fetchUserVocab = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users', profile.id, 'vocabulary'));
        const words = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VocabCard));
        setUserVocab(words);
      } catch (e) {
        console.error(e);
      }
    };
    fetchUserVocab();
  }, [profile.id]);

  useEffect(() => {
    // Merge: Firestore words override master words if the 'word' is the same
    const master = vocabData as VocabCard[];
    const mergedMap = new Map<string, VocabCard>();
    
    // Fill with master first
    master.forEach(card => mergedMap.set(card.word.toLowerCase(), card));
    // Override with user edits
    userVocab.forEach(card => mergedMap.set(card.word.toLowerCase(), card));
    
    setCombinedVocab(Array.from(mergedMap.values()));
  }, [userVocab]);

  const groupedData = combinedVocab.reduce((acc, card) => {
    if (!acc[card.theme]) acc[card.theme] = {};
    if (!acc[card.theme][card.section || 'General']) acc[card.theme][card.section || 'General'] = [];
    acc[card.theme][card.section || 'General'].push(card);
    return acc;
  }, {} as Record<string, Record<string, VocabCard[]>>);

  const toggleTheme = (theme: string) => {
    setExpandedThemes(prev => ({ ...prev, [theme]: !prev[theme] }));
  };

  const filteredData = combinedVocab.filter(c => 
    c.word.toLowerCase().includes(search.toLowerCase()) || 
    c.meaning.includes(search)
  );

  const startConfig = () => {
    const allThemes = Array.from(new Set(combinedVocab.map(v => v.theme)));
    const allSections = Array.from(new Set(combinedVocab.map(v => v.section || 'General')));
    setSessionConfig({
      themes: allThemes,
      sections: allSections,
      count: 10
    });
    setSessionPage('config');
  };

  const availableCount = combinedVocab.filter(v => 
    (sessionConfig.themes.length === 0 || sessionConfig.themes.includes(v.theme)) &&
    (sessionConfig.sections.length === 0 || sessionConfig.sections.includes(v.section || 'General'))
  ).length;

  const startSession = () => {
    const filtered = combinedVocab.filter(v => 
      (sessionConfig.themes.length === 0 || sessionConfig.themes.includes(v.theme)) &&
      (sessionConfig.sections.length === 0 || sessionConfig.sections.includes(v.section || 'General'))
    ).sort(() => Math.random() - 0.5);
    
    // Take as many as available up to the count
    const limited = filtered.slice(0, sessionConfig.count);
    
    if (limited.length === 0) {
      toast.error("No words found for this selection.");
      return;
    }
    
    setSessionCards(limited);
    setSessionPage('session');
    toast.success(`Starting session with ${limited.length} words.`);
  };

  const saveEdit = async (card: VocabCard) => {
    try {
      const vocabRef = doc(db, 'users', profile.id, 'vocabulary', card.word.toLowerCase());
      await setDoc(vocabRef, {
        ...card,
        updatedAt: new Date().toISOString()
      });
      setUserVocab(prev => {
        const existingIdx = prev.findIndex(v => v.word.toLowerCase() === card.word.toLowerCase());
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = card;
          return updated;
        }
        return [...prev, card];
      });
      toast.success("Word updated!");
      setEditingCard(null);
    } catch (e) {
      toast.error("Failed to save changes");
    }
  };

  if (sessionPage === 'session') {
    return <RevisionSession cards={sessionCards} onExit={() => setSessionPage('list')} speak={speak} testPronunciation={testPronunciation} />;
  }

  if (sessionPage === 'config') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setSessionPage('list')} className="p-2 hover:bg-slate-100 rounded-xl">
            <X className="h-5 w-5 text-slate-400" />
          </button>
          <h2 className="text-xl font-black italic">Configure Session</h2>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
          <div>
            <div className="flex justify-between items-end mb-3 px-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Number of Words</label>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{availableCount} available</span>
            </div>
            <div className="flex gap-2">
              {[5, 10, 20, 50].map(n => (
                <button
                  key={n}
                  onClick={() => setSessionConfig(prev => ({ ...prev, count: n }))}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-black text-sm transition-all",
                    sessionConfig.count === n ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-slate-50 text-slate-400 border border-slate-100"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Filter by Theme</label>
            <div className="space-y-1 max-h-40 overflow-y-auto px-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
              {Array.from(new Set(combinedVocab.map(v => v.theme))).map(theme => (
                <label key={theme} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={sessionConfig.themes.includes(theme)}
                    onChange={(e) => {
                      const newThemes = e.target.checked 
                        ? [...sessionConfig.themes, theme]
                        : sessionConfig.themes.filter(t => t !== theme);
                      setSessionConfig(prev => ({ ...prev, themes: newThemes }));
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] font-bold text-slate-700 leading-tight">{theme}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Filter by Module</label>
            <div className="space-y-1 max-h-40 overflow-y-auto px-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
              {Array.from(new Set(combinedVocab.filter(v => sessionConfig.themes.includes(v.theme)).map(v => v.section || 'General'))).map(section => (
                <label key={section} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={sessionConfig.sections.includes(section)}
                    onChange={(e) => {
                      const newSections = e.target.checked 
                        ? [...sessionConfig.sections, section]
                        : sessionConfig.sections.filter(s => s !== section);
                      setSessionConfig(prev => ({ ...prev, sections: newSections }));
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] font-bold text-slate-700 leading-tight">{section}</span>
                </label>
              ))}
            </div>
          </div>

          <button 
            onClick={startSession}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 active:scale-95 transition-all"
          >
            Start Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-indigo-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl border border-indigo-800">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="h-6 w-6 text-amber-400" />
            <h2 className="text-2xl font-black italic tracking-tighter">Revision Center</h2>
          </div>
          <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest opacity-80 max-w-[200px]">
            Master {combinedVocab.length} words with Anki-style cards.
          </p>
          <button 
            onClick={startConfig}
            className="mt-6 bg-white text-indigo-900 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-black/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Play className="h-4 w-4 fill-indigo-900" />
            Start Daily Session
          </button>
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-10">
          <Brain className="h-48 w-48" />
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Lookup vocabulary..."
          className="w-full pl-10 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:ring-4 focus:ring-indigo-50 shadow-sm transition-all outline-none text-sm font-bold"
        />
      </div>

      <div className="space-y-4">
        {search ? (
          <div className="space-y-2">
            {filteredData.map((card) => (
              <VocabItem 
                key={card.id || card.word} 
                card={card} 
                speak={speak} 
                isSynthesizing={isSynthesizing} 
                onEdit={() => setEditingCard(card)}
              />
            ))}
          </div>
        ) : (
          Object.entries(groupedData).map(([theme, sections]) => (
            <div key={theme} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleTheme(theme)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
              >
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                  {theme}
                </h4>
                <div className="bg-slate-100 p-1.5 rounded-xl">
                  {expandedThemes[theme] ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </div>
              </button>
              
              {expandedThemes[theme] && (
                <div className="px-6 pb-6 space-y-6">
                  {Object.entries(sections).map(([section, cards]) => (
                    <div key={section} className="space-y-2">
                      <h5 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest px-1 italic">
                        {section}
                      </h5>
                      {cards.map((card) => (
                        <VocabItem 
                          key={card.id || card.word} 
                          card={card} 
                          speak={speak} 
                          isSynthesizing={isSynthesizing} 
                          onEdit={() => setEditingCard(card)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {editingCard && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="bg-indigo-600 p-6 text-white">
                <h3 className="text-xl font-black italic tracking-tighter">Edit Vocabulary</h3>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Word</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={editingCard.word} 
                    className="w-full p-3 bg-slate-100 rounded-xl text-sm font-bold text-slate-500 mt-1 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meaning</label>
                  <input 
                    type="text" 
                    value={editingCard.meaning} 
                    onChange={e => setEditingCard({...editingCard, meaning: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold mt-1 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Example Sentence</label>
                  <textarea 
                    rows={3}
                    value={editingCard.sentence} 
                    onChange={e => setEditingCard({...editingCard, sentence: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium mt-1 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEditingCard(null)} className="flex-1 py-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cancel</button>
                  <button onClick={() => saveEdit(editingCard)} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px]">Save Changes</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VocabItem({ card, speak, isSynthesizing, onEdit }: { card: VocabCard, speak: any, isSynthesizing: boolean, onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-transparent hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all group">
      <div className="flex-1 cursor-pointer" onClick={onEdit}>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-black text-slate-800 text-sm italic group-hover:text-indigo-600 transition-colors">{card.word}</span>
          <span className="text-[8px] text-slate-400 font-serif font-black uppercase tracking-tighter opacity-80 px-1.5 py-0.5 border border-slate-200 rounded">
            {card.partOfSpeech}
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium leading-tight">{card.meaning}</p>
        <p className="text-[10px] text-slate-400 mt-2 italic line-clamp-1">{card.sentence}</p>
      </div>
      <button
        onClick={() => speak(card.word)}
        className={cn(
          "w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm shrink-0",
          isSynthesizing ? "bg-indigo-100 text-indigo-400" : "bg-white text-indigo-600 hover:bg-indigo-700 hover:text-white"
        )}
      >
        <Volume2 className="h-5 w-5" />
      </button>
    </div>
  );
}

function RevisionSession({ cards, onExit, speak, testPronunciation }: { cards: VocabCard[], onExit: () => void, speak: any, testPronunciation: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-100 z-50 flex flex-col items-center justify-center p-6">
        <p className="text-slate-500 font-bold mb-4">No words found for this selection.</p>
        <button onClick={onExit} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs">Go Back</button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(c => c + 1);
      setFlipped(false);
    } else {
      toast.success("Daily Session Complete! 🔥");
      onExit();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(c => c - 1);
      setFlipped(false);
    }
  };

  const handlePronunciation = async () => {
    const score = await testPronunciation(currentCard.word);
    if (score >= 80) toast.success("Perfect Pronunciation!");
    else toast.error(`Keep practicing! Score: ${score}%`);
  };

  return (
    <div className="fixed inset-0 bg-slate-100 z-50 flex flex-col p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <button onClick={onExit} className="p-3 hover:bg-white rounded-2xl text-slate-400 font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <X className="h-4 w-4" />
          Exit
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Card {currentIndex + 1} of {cards.length}</p>
          <div className="flex gap-1 mt-1 justify-center">
            {cards.map((_, i) => (
              <div key={i} className={cn("h-1 rounded-full transition-all", i < currentIndex ? "w-2 bg-indigo-200" : i === currentIndex ? "w-6 bg-indigo-600" : "w-1 bg-slate-200")} />
            ))}
          </div>
        </div>
        <button onClick={() => setFlipped(!flipped)} className="p-3 bg-white shadow-sm rounded-2xl text-indigo-600 transition-colors">
          <RotateCcw className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        {/* Navigation Arrows */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-between px-2 pointer-events-none z-30">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={cn(
              "p-4 rounded-full bg-white shadow-xl pointer-events-auto transition-all active:scale-95",
              currentIndex === 0 ? "opacity-0 scale-50 pointer-events-none" : "opacity-100"
            )}
          >
            <ChevronLeft className="h-6 w-6 text-indigo-600" />
          </button>
          <button 
            onClick={handleNext}
            className={cn(
              "p-4 rounded-full bg-white shadow-xl pointer-events-auto transition-all active:scale-95 hover:bg-indigo-50",
              "opacity-100"
            )}
          >
            <ChevronRight className="h-6 w-6 text-indigo-600" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center perspective-1000 w-full">
          <motion.div 
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="relative w-full max-w-[280px] h-[380px] cursor-pointer preserve-3d"
            onClick={() => !flipped && setFlipped(true)}
          >
          {/* Front */}
          <div className="absolute inset-0 bg-white rounded-[2.5rem] shadow-xl border border-slate-200 flex flex-col items-center justify-center p-8 backface-hidden">
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-4 text-center">{currentCard.word}</h2>
            <div className="absolute bottom-10 py-2 px-6 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              Tap to Flip
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); speak(currentCard.word); }}
              className="absolute top-6 right-6 w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-indigo-100/50 shadow-lg z-20"
            >
              <Volume2 className="h-6 w-6" />
            </button>
          </div>

          {/* Back */}
          <div className="absolute inset-0 bg-indigo-700 rounded-[2.5rem] shadow-xl border border-indigo-600 flex flex-col items-center justify-center p-8 backface-hidden rotate-y-180 text-white">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-4">{currentCard.partOfSpeech}</span>
            <h3 className="text-xl font-black mb-4 text-center">{currentCard.meaning}</h3>
            <p className="text-xs text-indigo-100 text-center italic opacity-80 mb-8 max-w-[240px] leading-relaxed">
              "{currentCard.sentence}"
            </p>
            <div className="flex gap-4">
              <button 
                onClick={(e) => { e.stopPropagation(); speak(currentCard.word); }}
                className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all border border-white/20"
              >
                <Volume2 className="h-5 w-5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handlePronunciation(); }}
                className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-emerald-900/20"
              >
                <Mic className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.div>

        <div className="mt-12 flex gap-4 w-full max-w-sm">
          <button 
            onClick={handleNext} 
            className="flex-1 bg-white text-slate-800 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-lg border border-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            I forgot
            <X className="h-4 w-4 text-red-500" />
          </button>
          <button 
            onClick={handleNext} 
            className="flex-1 bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Got it
            <Check className="h-4 w-4 text-emerald-300" />
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
