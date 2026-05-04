import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Trophy, Star, Medal, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import CharacterPreview from './CharacterPreview';

interface LeaderboardProps {
  currentUserId: string;
  isGuest?: boolean;
}

export default function Leaderboard({ currentUserId, isGuest }: LeaderboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filter, setFilter] = useState<'global' | 'class'>('global');
  const [myClass, setMyClass] = useState<string | null>(null);

  const MOCK_LEADERBOARD: UserProfile[] = [
    {
      id: 'mock_1',
      englishName: 'Emma Watson',
      className: '6A',
      classNo: '01',
      total_score: 5500,
      xp: 5500,
      level: 8,
      streak: 5,
      inventory: [],
      setupComplete: true,
      lastMissionUpdate: '',
      missions: [],
      best_display: 'Grandmaster (S1)',
      best_stars: 3,
      best_sort_key: 0,
      avatar: 'student_2',
      activeBadge: '🏆',
      email: 'emma@example.com'
    },
    {
      id: 'mock_2',
      englishName: 'John Doe',
      className: '6A',
      classNo: '02',
      total_score: 4800,
      xp: 4800,
      level: 7,
      streak: 3,
      inventory: [],
      setupComplete: true,
      lastMissionUpdate: '',
      missions: [],
      best_display: 'Expert',
      best_stars: 2,
      best_sort_key: 0,
      avatar: 'student_3',
      activeBadge: '⭐',
      email: 'john@example.com'
    },
    {
      id: 'guest_user',
      englishName: 'Guest Student (You)',
      className: 'GUEST',
      classNo: '00',
      total_score: 1000,
      xp: 1000,
      level: 4,
      streak: 2,
      inventory: [],
      setupComplete: true,
      lastMissionUpdate: '',
      missions: [],
      best_display: 'Explorer',
      best_stars: 0,
      best_sort_key: 0,
      avatar: 'student_1',
      activeBadge: null,
      email: 'guest@example.com'
    }
  ];

  useEffect(() => {
    if (isGuest) {
      setUsers(MOCK_LEADERBOARD.sort((a, b) => b.total_score - a.total_score));
      return;
    }

    const q = query(
      collection(db, 'users'), 
      where('setupComplete', '==', true),
      orderBy('total_score', 'desc'), 
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, 
      (snap) => {
        const userData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
        setUsers(userData);
      },
      (error) => {
        if (!isGuest) {
          console.error("Leaderboard snapshot error:", error);
          toast.error("Failed to load leaderboard");
        }
      }
    );

    return () => unsubscribe();
  }, [filter, isGuest]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-1.5 flex border border-slate-200 shadow-sm">
        <button
          onClick={() => setFilter('global')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
            filter === 'global' ? "bg-indigo-700 text-white shadow-md shadow-indigo-100" : "text-slate-400 hover:bg-slate-50"
          )}
        >
          <Trophy className="h-4 w-4" />
          Global
        </button>
        <button
          onClick={() => setFilter('class')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
            filter === 'class' ? "bg-indigo-700 text-white shadow-md shadow-indigo-100" : "text-slate-400 hover:bg-slate-50"
          )}
        >
          <Users className="h-4 w-4" />
          Class 6A
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="font-bold flex items-center gap-2 text-slate-800">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              KCMSS Hall of Fame
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Standings</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">TOTAL: {users.length}</span>
          </div>
        </div>
        
        <div className="divide-y divide-slate-50">
          {users.map((user, i) => {
            const isMe = user.id === currentUserId;
            const isTop3 = i < 3;
            return (
              <div 
                key={user.id} 
                className={cn(
                  "px-5 py-4 flex items-center transition-colors",
                  isMe ? "bg-indigo-50/40" : "hover:bg-slate-50/80",
                  isTop3 && i === 0 ? "bg-amber-50/30" : ""
                )}
              >
                <div className="w-8 flex justify-center">
                  {isTop3 ? (
                    <RankIcon rank={i + 1} />
                  ) : (
                    <span className="text-sm font-black text-slate-300">{i + 1}</span>
                  )}
                </div>
                
                <div className="ml-3">
                  <CharacterPreview profile={user} size="sm" />
                </div>
                
                <div className="flex-1 ml-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-bold text-sm", isMe ? "text-indigo-900" : "text-slate-800")}>
                      {user.englishName}
                    </span>
                    <span className="text-[10px] font-black text-white bg-indigo-600 px-1.5 rounded leading-none py-0.5">
                      LV.{user.level || 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter shrink-0">
                      {user.className} • {user.best_display?.replace(/\([^\)]+\)/, '') || 'Novice'}
                    </p>
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden max-w-[60px]">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(Math.round((Object.values(user.themeProgress || {}).reduce((acc, levels) => acc + (levels as number[]).filter(s => s >= 80).length, 0) / 15) * 100), 100)}%` }}
                        className="h-full bg-emerald-500" 
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex flex-col items-end">
                    <p className={cn(
                      "text-sm font-black",
                      isTop3 ? "text-amber-600" : "text-slate-700"
                    )}>
                      {user.total_score.toLocaleString()}
                    </p>
                    <div className="flex gap-0.5">
                      {[...Array(3)].map((_, idx) => (
                        <Star 
                          key={idx} 
                          className={cn(
                            "h-2 w-2", 
                            idx < (user.best_stars || 0) ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-100"
                          )} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100">
           <button className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-bold text-slate-500 hover:bg-slate-100 uppercase tracking-widest transition-colors">
             Refresh Leaderboard
           </button>
        </div>
      </div>
    </div>
  );
}

function RankIcon({ rank }: { rank: number }) {
  switch (rank) {
    case 1: return <Medal className="h-6 w-6 text-amber-500 fill-amber-100 mx-auto" />;
    case 2: return <Medal className="h-6 w-6 text-gray-400 fill-gray-100 mx-auto" />;
    case 3: return <Medal className="h-6 w-6 text-orange-400 fill-orange-100 mx-auto" />;
    default: return null;
  }
}
