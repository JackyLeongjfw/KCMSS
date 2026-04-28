import React from 'react';
import { UserProfile } from '../types';
import { Sparkles, BookText, BookOpen, GraduationCap, ChevronRight, Lock, Target, Gift, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { TEACHER_PASSWORD } from '../constants';
import CharacterPreview from './CharacterPreview';

interface DashboardProps {
  profile: UserProfile | null;
  setActiveTab: (tab: string) => void;
  onStartQuiz: () => void;
}

export default function Dashboard({ profile, setActiveTab, onStartQuiz }: DashboardProps) {
  if (!profile) return null;

  const openTeacherMode = () => {
    // ... (rest same)

    const pass = prompt("Teacher / Testing Mode\nEnter password to unlock all modules:");
    if (pass === TEACHER_PASSWORD) {
      toast.success("🔓 Testing Mode Activated: All Modules Unlocked!");
    } else if (pass !== null) {
      toast.error("❌ Wrong Password");
    }
  };

  const modules = [
    { 
      id: 'ai', 
      title: 'AI Assistance', 
      subtitle: 'Essay Helper & Vocab Builder', 
      icon: Sparkles, 
      color: 'bg-orange-500', 
      onClick: () => setActiveTab('ai') 
    },
    { 
      id: 'exercise', 
      title: 'Writing Exercise', 
      subtitle: 'Themes & Writing Practice', 
      icon: BookText, 
      color: 'bg-indigo-600', 
      onClick: onStartQuiz 
    },
    { 
      id: 'revision', 
      title: 'Revision Center', 
      subtitle: 'Flashcards & Anki Style', 
      icon: GraduationCap, 
      color: 'bg-teal-600', 
      onClick: () => setActiveTab('vocab')
    },
  ];

  return (
    <div className="space-y-6">
      {/* Daily Missions */}
      {profile?.missions && (
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-indigo-900 px-5 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Daily Missions</h3>
            </div>
            <span className="text-[9px] font-bold text-indigo-300 uppercase">Resets Daily</span>
          </div>
          <div className="p-4 space-y-3">
            {profile.missions.map((mission) => (
              <div key={mission.id} className="flex items-center gap-4 group">
                <div className={cn(
                  "p-2 rounded-xl transition-all",
                  mission.completed ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                )}>
                  {mission.completed ? <CheckCircle2 className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className={cn("text-[11px] font-black uppercase tracking-tight", mission.completed ? "text-slate-400 line-through" : "text-slate-700")}>
                      {mission.title}
                    </p>
                    <span className="text-[10px] font-bold text-amber-600">+{mission.reward} PTS</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-500", mission.completed ? "bg-emerald-500" : "bg-indigo-500")}
                      style={{ width: `${Math.min(100, (mission.current / mission.target) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 font-bold">
                    {mission.description} ({mission.current}/{mission.target})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-between items-center px-1">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Learning Hub</h3>
        <button 
          onClick={openTeacherMode}
          className="text-slate-300 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-white transition-all"
        >
          <Lock className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-4">
        {modules.map((m) => (
          <button
            key={m.id}
            onClick={m.onClick}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all text-left group"
          >
            <div className={cn("p-3 rounded-xl text-white shadow-sm transition-transform group-hover:scale-110", m.color)}>
              <m.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800">{m.title}</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{m.subtitle}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
          </button>
        ))}
      </div>


      {/* Tip Section */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-indigo-50 px-5 py-2 border-b border-slate-200 flex items-center gap-2">
           <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
           <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest">DSE Study Tip</span>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-600 leading-relaxed italic">
            "Regular revision is the key to deep memory. Try to visit the Word Bank at least once a day to maintain your streak!"
          </p>
        </div>
      </div>
    </div>
  );
}
