import React from 'react';
import { Home, Sparkles, BookOpen, Swords, Trophy, ShoppingBag, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'ai', icon: Sparkles, label: 'AI Assistance' },
    { id: 'vocab', icon: BookOpen, label: 'Revision' },
    { id: 'battle', icon: Swords, label: 'Arena' },
    { id: 'leaderboard', icon: Trophy, label: 'Ranking' },
    { id: 'shop', icon: ShoppingBag, label: 'Shop' },
    { id: 'profile', icon: User, label: 'Me' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 flex justify-around py-3 px-1 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 transition-all relative",
              isActive ? "text-indigo-600 scale-110" : "text-slate-400 hover:text-slate-600"
            )}
          >
            {isActive && (
              <motion.div 
                layoutId="nav-glow"
                className="absolute -top-3 w-8 h-1 bg-indigo-600 rounded-full"
              />
            )}
            <Icon className={cn("h-5 w-5 mb-1", isActive ? "fill-indigo-50" : "")} />
            <span className="text-[9px] font-black uppercase tracking-tighter leading-none">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
