import React from 'react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface CharacterPreviewProps {
  profile: UserProfile;
  size?: 'sm' | 'md' | 'lg';
}

export default function CharacterPreview({ profile, size = 'md' }: CharacterPreviewProps) {
  const containerClasses = {
    sm: 'w-12 h-12 rounded-xl text-2xl',
    md: 'w-24 h-24 rounded-3xl text-4xl',
    lg: 'w-40 h-40 rounded-[3rem] text-6xl'
  };

  return (
    <div className={cn(
      "relative flex items-center justify-center bg-slate-100 border border-slate-200 overflow-hidden shadow-inner shrink-0",
      containerClasses[size]
    )}>
      {/* Decoration / Aura */}
      {profile.activeDecoration && (
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 flex items-center justify-center opacity-40 text-7xl select-none pointer-events-none"
        >
          {profile.activeDecoration}
        </motion.div>
      )}

      {/* Main Character Body (Skin) */}
      <div className="relative z-10 transition-transform hover:scale-110 cursor-pointer">
        {profile.activeSkin || '👨‍🎓'}
      </div>

      {/* Suit / Equipment overlay */}
      {profile.activeSuit && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none translate-y-3 opacity-80">
          <span className="text-3xl filter drop-shadow-md">{profile.activeSuit}</span>
        </div>
      )}

      {/* Badge Overlay */}
      {profile.activeBadge && (
        <div className={cn(
          "absolute p-1 bg-white rounded-full shadow-md border border-slate-100 flex items-center justify-center z-30",
          size === 'sm' ? "-bottom-1 -right-1 text-[8px]" : "-bottom-2 -right-2 text-sm"
        )}>
          {profile.activeBadge}
        </div>
      )}
    </div>
  );
}
