import React from 'react';
import vocabData from '../data/vocab_master.json';
import { Lock, ChevronRight, Star, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

interface ThemeSelectionProps {
  profile: UserProfile;
  onSelect: (theme: string, modeIndex: number) => void;
}

export default function ThemeSelection({ profile, onSelect }: ThemeSelectionProps) {
  const [selectedTheme, setSelectedTheme] = React.useState<string | null>(null);
  const numericalSort = (a: string, b: string) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  };
  const themes = Array.from(new Set(vocabData.map(v => v.theme))).sort(numericalSort);
  
  const modes = [
    { name: 'L1: Meaning', diff: 'Easy' },
    { name: 'L1: Fill Blank', diff: 'Easy' },
    { name: 'L2: Listening', diff: 'Medium' },
    { name: 'L2: Dictation', diff: 'Medium' },
    { name: 'L3: Master', diff: 'Hard' },
  ];

  const getThemeProgress = (theme: string) => {
    return profile.themeProgress?.[theme] || [];
  };

  const calculateCompetence = (theme: string) => {
    const progress = getThemeProgress(theme);
    if (progress.length === 0) return 0;
    const completedCount = progress.filter(s => s >= 80).length;
    return Math.round((completedCount / modes.length) * 100);
  };

  const isLocked = (theme: string, modeIdx: number) => {
    if (modeIdx === 0) return false;
    const progress = getThemeProgress(theme);
    // Level is unlocked if previous level score is >= 80
    return (progress[modeIdx - 1] || 0) < 80;
  };

  if (selectedTheme) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedTheme(null)}
            className="flex items-center gap-2 text-slate-500 font-bold text-sm hover:text-indigo-600 transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Themes
          </button>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Competence</p>
            <p className="text-lg font-black text-indigo-600 leading-none mt-1">{calculateCompetence(selectedTheme)}%</p>
          </div>
        </div>

        <div className="bg-indigo-700 rounded-2xl p-6 text-white shadow-lg border border-indigo-600 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-1">{selectedTheme}</h3>
            <p className="text-indigo-100 text-xs font-medium uppercase tracking-widest opacity-80">Choose your level</p>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Star className="h-24 w-24 -rotate-12" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {modes.map((mode, mIdx) => {
            const locked = isLocked(selectedTheme, mIdx);
            const score = getThemeProgress(selectedTheme)[mIdx] || 0;
            return (
              <button
                key={mIdx}
                onClick={() => !locked && onSelect(selectedTheme, mIdx)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                  locked 
                    ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed" 
                    : "bg-white border-slate-100 hover:border-indigo-400 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-tighter shadow-sm shrink-0",
                    mode.diff === 'Easy' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                    mode.diff === 'Medium' ? "bg-amber-50 text-amber-700 border border-amber-100" :
                    "bg-red-50 text-red-700 border border-red-100"
                  )}>
                    LV {Math.floor(mIdx/2) + 1}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{mode.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{mode.diff}</p>
                      {score > 0 && (
                        <div className="h-1 w-1 bg-slate-300 rounded-full" />
                      )}
                      {score > 0 && (
                        <p className={cn("text-[9px] font-black", score >= 80 ? "text-emerald-500" : "text-amber-500")}>
                          BEST: {score}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {locked ? (
                  <Lock className="h-4 w-4 text-slate-300" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-indigo-700 rounded-2xl p-6 text-white shadow-lg border border-indigo-600 relative overflow-hidden">
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'home' }))}
          className="absolute top-4 right-4 z-20 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-1">Writing Exercise</h3>
          <p className="text-indigo-100 text-xs font-medium uppercase tracking-widest opacity-80">Choose a theme to practice</p>
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Star className="h-24 w-24 -rotate-12" />
        </div>
      </div>

      <div className="grid gap-4">
        {themes.map((theme) => {
          const comp = calculateCompetence(theme);
          return (
            <button 
              key={theme}
              onClick={() => setSelectedTheme(theme)}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex items-stretch hover:border-indigo-400 hover:shadow-md transition-all text-left group"
            >
              <div className="w-2 bg-indigo-600"></div>
              <div className="flex-1 p-5">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-800 text-lg">{theme}</h4>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Competence</p>
                    <p className="text-sm font-black text-indigo-600 leading-none">{comp}%</p>
                  </div>
                </div>
                <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-indigo-600 transition-all duration-500" 
                    style={{ width: `${comp}%` }}
                  />
                </div>
              </div>
              <div className="px-4 flex items-center bg-slate-50 group-hover:bg-indigo-50 transition-colors">
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
