import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  limit,
  orderBy,
  increment
} from 'firebase/firestore';
import { UserProfile, BattleRoom, BattlePlayer, BattleQuestion } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, Users, Loader2, Trophy, Zap, ChevronRight, X, CheckCircle2, Timer } from 'lucide-react';
import vocabData from '../data/vocab_master.json';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface BattleArenaProps {
  profile: UserProfile;
}

export default function BattleArena({ profile }: BattleArenaProps) {
  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [battleMode, setBattleMode] = useState<'lobby' | 'bot_config'>('lobby');
  const [botDifficulty, setBotDifficulty] = useState<'Easy' | 'Normal' | 'Hard'>('Normal');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [rewardDistributed, setRewardDistributed] = useState(false);

  // Distribution of rewards when room finishes
  useEffect(() => {
      if (room?.id && room?.status === 'finished' && room.winnerId && !rewardDistributed) {
      setRewardDistributed(true);
      const isWinner = room.winnerId === profile.id;
      const isTie = room.winnerId === 'TIE';
      
      const xpReward = isWinner ? 100 : (isTie ? 50 : -50);
      const ptsReward = isWinner ? 200 : (isTie ? 100 : -100);

      const userRef = doc(db, 'users', profile.id);
      const newXP = Math.max(0, (profile.xp || 0) + xpReward);
      const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;

      if (isWinner) toast.success("Glorious Victory! +100 XP / +200 PTS", { duration: 5000 });
      else if (isTie) toast("A respectful Tie. +50 XP / +100 PTS", { duration: 5000 });
      else toast.error("Defeat. -50 XP / -100 PTS", { duration: 5000 });

      updateDoc(userRef, {
        xp: newXP,
        level: newLevel,
        total_score: increment(ptsReward)
      }).catch(e => console.error("Profile reward error:", e));
    }
  }, [room?.status, room?.winnerId, profile.id, profile.xp, rewardDistributed]);

  // Bot Logic Effect
  const [botIndex, setBotIndex] = useState(0);

  useEffect(() => {
    if (room?.status === 'active' && room.players.some(p => p.uid === 'bot_ai') && !showResult) {
      const bot = room.players.find(p => p.uid === 'bot_ai');
      if (bot && !bot.finished) {
        // Difficulty settings: [min_delay, max_delay, accuracy_chance]
        const config = {
          'Easy': [5000, 8000, 0.6],
          'Normal': [3000, 5000, 0.8],
          'Hard': [1500, 3500, 0.95]
        }[botDifficulty];

        const delay = Math.random() * (config[1] - config[0]) + config[0];
        
        const botTimer = setTimeout(async () => {
          if (room.id !== room.id) return; // Basic staleness check

          const isCorrect = Math.random() < config[2];
          const timeBonus = Math.floor((10000 - delay) / 1000); // Inverse delay for bonus
          const points = isCorrect ? Math.max(10, 10 + timeBonus) : 0;
          
          const newBotIndex = botIndex + 1;
          const newProgress = (newBotIndex / room.questions.length) * 100;
          const isLast = newBotIndex === room.questions.length;

          const updatedPlayers = room.players.map(p => 
            p.uid === 'bot_ai' ? { 
              ...p, 
              score: p.score + points, 
              progress: newProgress,
              finished: isLast
            } : p
          );

          const allFinished = updatedPlayers.every(p => p.finished);
          const updateData: any = { players: updatedPlayers };

          if (allFinished) {
            updateData.status = 'finished';
            const sorted = [...updatedPlayers].sort((a,b) => b.score - a.score);
            const winner = sorted[0];
            const isTie = updatedPlayers[0].score === updatedPlayers[1].score;
            updateData.winnerId = isTie ? 'TIE' : winner.uid;
          }

          try {
            await updateDoc(doc(db, 'battle_rooms', room.id), updateData);
            setBotIndex(newBotIndex);
          } catch (e) {
            console.error("Bot update error:", e);
          }
        }, delay);

        return () => clearTimeout(botTimer);
      }
    } else if (room?.status !== 'active') {
      setBotIndex(0);
    }
  }, [room?.status, botIndex, room?.id, botDifficulty, showResult]);

  // Matchmaking
  const startMatchmaking = async (isBot = false) => {
    setSearching(true);
    setLoading(true);

    try {
      if (isBot) {
        const questions = generateBattleQuestions();
        const newRoomData: BattleRoom = {
          id: '', 
          status: 'active',
          players: [
            {
              uid: profile.id,
              name: profile.englishName || 'Guest User',
              score: 0,
              progress: 0,
              ready: true,
              finished: false
            },
            {
              uid: 'bot_ai',
              name: `AI Scholar (${botDifficulty})`,
              score: 0,
              progress: 0,
              ready: true,
              finished: false
            }
          ],
          questions,
          createdAt: new Date().toISOString(),
          playerUids: [profile.id, 'bot_ai']
        };
        const docRef = await addDoc(collection(db, 'battle_rooms'), newRoomData);
        setSearching(false);
        setLoading(false);
        setRoom({ id: docRef.id, ...newRoomData });
        return;
      }

      // Look for waiting rooms
      const roomsRef = collection(db, 'battle_rooms');
      const q = query(
        roomsRef, 
        where('status', '==', 'waiting'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Join existing room
        const roomDoc = querySnapshot.docs[0];
        const roomData = roomDoc.data();
        
        // Don't join if already in players
        if (roomData.players.some((p: any) => p.uid === profile.id)) {
           // Re-attach to existing room
           return;
        }

        const newPlayer: BattlePlayer = {
          uid: profile.id,
          name: profile.englishName,
          score: 0,
          progress: 0,
          ready: false,
          finished: false
        };

        await updateDoc(doc(db, 'battle_rooms', roomDoc.id), {
          players: [...roomData.players, newPlayer],
          playerUids: [...roomData.playerUids, profile.id],
          status: 'starting'
        });
      } else {
        // Create new room
        const questions = generateBattleQuestions();
        const newRoomData = {
          status: 'waiting',
          players: [{
            uid: profile.id,
            name: profile.englishName,
            score: 0,
            progress: 0,
            ready: false,
            finished: false
          }],
          playerUids: [profile.id],
          questions,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'battle_rooms'), newRoomData);
      }
    } catch (e) {
      console.error("Matchmaking error:", e);
      toast.error("Failed to find match");
      setSearching(false);
    } finally {
      setLoading(false);
    }
  };

  // Listen to room updates
  useEffect(() => {
    if (!searching && !room) return;

    const roomsRef = collection(db, 'battle_rooms');
    const q = query(roomsRef, where('playerUids', 'array-contains', profile.id));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeRoomDoc = snapshot.docs.find(d => {
        const data = d.data();
        return data.status !== 'finished';
      });

      if (activeRoomDoc) {
        setSearching(false);
        setLoading(false);
        setRoom({ id: activeRoomDoc.id, ...activeRoomDoc.data() } as BattleRoom);
      } else if (room && !searching) {
        // Only set room to null if we were in a room and it was finished/deleted
        setRoom(null);
      }
    }, (error) => {
      console.error("Room snapshot error:", error);
    });

    return () => unsubscribe();
  }, [searching, profile.id, !!room]);

  // Game Logic - Timer
  useEffect(() => {
    if (room?.status === 'active' && !showResult) {
      const timer = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            handleAnswer(null);
            return 10;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [room?.status, questionIndex, showResult, room?.id]);

  const generateBattleQuestions = (): BattleQuestion[] => {
    const shuffled = [...vocabData].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 10).map(word => {
      const wrongOptions = vocabData
        .filter(v => v.word !== word.word)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(v => v.meaning);
      return {
        word: word.word,
        meaning: word.meaning,
        options: [word.meaning, ...wrongOptions].sort(() => 0.5 - Math.random())
      };
    });
  };

  const setReady = async () => {
    if (!room || !room.id) return;
    const updatedPlayers = room.players.map(p => 
      p.uid === profile.id ? { ...p, ready: true } : p
    );
    
    const allReady = updatedPlayers.length === 2 && updatedPlayers.every(p => p.ready);
    
    await updateDoc(doc(db, 'battle_rooms', room.id), {
      players: updatedPlayers,
      status: allReady ? 'active' : room.status
    });
  };

  const handleAnswer = async (option: string | null) => {
    if (!room || !room.id || selectedOption) return;
    
    setSelectedOption(option || 'TIME_OUT');
    const isCorrect = option === room.questions[questionIndex].meaning;
    const timeBonus = Math.max(0, timeLeft);
    const points = isCorrect ? (10 + timeBonus) : 0;

    const newProgress = ((questionIndex + 1) / room.questions.length) * 100;
    const isLast = questionIndex === room.questions.length - 1;

    const updatedPlayers = room.players.map(p => 
      p.uid === profile.id ? { 
        ...p, 
        score: p.score + points, 
        progress: newProgress,
        finished: isLast
      } : p
    );

    const allFinished = updatedPlayers.every(p => p.finished);
    const updateData: any = { players: updatedPlayers };
    if (allFinished) {
      updateData.status = 'finished';
      const sorted = [...updatedPlayers].sort((a,b) => b.score - a.score);
      const winner = sorted[0];
      const isTie = updatedPlayers[0].score === updatedPlayers[1].score;
      updateData.winnerId = isTie ? 'TIE' : winner.uid;
    }

    try {
      await updateDoc(doc(db, 'battle_rooms', room.id), updateData);
    } catch (e) {
      console.error("Player answer update fail:", e);
      // Even if DB fails, let local state progress within reason, or reset
    }

    setTimeout(() => {
      setSelectedOption(null);
      setTimeLeft(10);
      if (!isLast) {
        setQuestionIndex(i => i + 1);
      }
    }, 1500);
  };

  const formatTime = (s: number) => `0:${s < 10 ? '0' : ''}${s}`;

  const leaveRoom = async () => {
    if (!room) return;
    setRoom(null);
    setSearching(false);
    setRewardDistributed(false);
    setQuestionIndex(0);
    setTimeLeft(10);
    setSelectedOption(null);
  };

  if (!room && !searching) {
    return (
      <div className="max-w-xl mx-auto space-y-8 py-10 px-4">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-100 rounded-full mb-4">
            <Swords className="h-12 w-12 text-indigo-600" />
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic">BATTLE ARENA</h2>
          <p className="text-slate-500 font-medium">Compete 1-on-1 for glory and double XP!</p>
        </div>

        {battleMode === 'lobby' ? (
          <div className="space-y-4">
            <button 
              onClick={() => startMatchmaking(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-8 rounded-[2.5rem] shadow-xl shadow-indigo-200 flex flex-col items-center justify-center gap-3 group transition-all"
            >
              <Zap className="h-8 w-8 text-amber-400 group-hover:scale-125 transition-transform" />
              <span className="font-black text-xl uppercase tracking-widest leading-none">Find Random Duel</span>
            </button>

            <button 
              onClick={() => setBattleMode('bot_config')}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 py-6 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col items-center justify-center gap-2 group transition-all"
            >
              <Users className="h-6 w-6 text-indigo-500" />
              <span className="font-black text-xs uppercase tracking-widest leading-none">AI Training Session</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] p-8 border-2 border-indigo-100 shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-slate-800 tracking-wider">AI DIFFICULTY</h3>
              <button onClick={() => setBattleMode('lobby')} className="p-2 hover:bg-slate-100 rounded-full"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {(['Easy', 'Normal', 'Hard'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setBotDifficulty(level)}
                  className={cn(
                    "py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all",
                    botDifficulty === level ? "bg-indigo-600 border-indigo-600 text-white shadow-lg" : "bg-slate-50 border-slate-100 text-slate-400"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>

            <button 
              onClick={() => startMatchmaking(true)}
              className="w-full bg-indigo-600 text-white py-6 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all"
            >
              Start AI Duel
            </button>
          </div>
        )}

        <div className="bg-white rounded-[2rem] p-8 border-2 border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Class Tournament Status
          </h3>
          <div className="space-y-4">
             <p className="text-sm font-medium text-slate-600 leading-relaxed">
               Winning a duel grants <span className="text-indigo-600 font-black">+100 Battle XP</span> and counts towards your global ranking.
             </p>
             <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-amber-400 rounded-full" />
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (searching) {
    return (
      <div className="fixed inset-0 bg-indigo-600 z-50 flex flex-col items-center justify-center p-8">
        <Loader2 className="h-12 w-12 text-white animate-spin mb-8" />
        <h2 className="text-3xl font-black text-white tracking-widest uppercase mb-2">Finding Rival...</h2>
        <p className="text-indigo-200 font-medium animate-pulse">Wait for a student to join your arena</p>
        
        <button 
          onClick={() => setSearching(false)}
          className="mt-12 text-indigo-200 font-black uppercase tracking-widest text-xs hover:text-white transition-colors"
        >
          Cancel Search
        </button>
      </div>
    );
  }

  if (room?.status === 'waiting' || room?.status === 'starting') {
    const opponent = room.players.find(p => p.uid !== profile.id);
    const me = room.players.find(p => p.uid === profile.id);

    return (
      <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden">
         <div className="w-full max-w-2xl flex flex-col items-center gap-12">
            <div className="flex items-center gap-8 sm:gap-16">
               {/* Player 1 (Me) */}
               <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full shadow-2xl flex items-center justify-center text-4xl sm:text-5xl border-4 border-white overflow-hidden">
                    {profile.avatar === 'avatar_eagle' ? '🦅' : profile.avatar === 'avatar_robot' ? '🤖' : '👨‍🎓'}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-800 uppercase tracking-widest">{profile.englishName}</p>
                    {me?.ready ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-600 font-black px-2 py-1 rounded-full uppercase tracking-tighter">READY</span>
                    ) : (
                      <span className="text-[10px] bg-slate-200 text-slate-500 font-black px-2 py-1 rounded-full uppercase tracking-tighter">WAITING</span>
                    )}
                  </div>
               </div>

               <div className="text-4xl sm:text-6xl font-black text-indigo-600/20 italic tracking-tighter">VS</div>

               {/* Player 2 (Opponent) */}
               <div className="flex flex-col items-center gap-4">
                  {opponent ? (
                    <>
                      <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full shadow-2xl flex items-center justify-center text-4xl sm:text-5xl border-4 border-white overflow-hidden">
                        👤
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-slate-800 uppercase tracking-widest">{opponent.name}</p>
                        {opponent.ready ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-600 font-black px-2 py-1 rounded-full uppercase tracking-tighter">READY</span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-500 font-black px-2 py-1 rounded-full uppercase tracking-tighter">WAITING</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-200 rounded-full flex items-center justify-center animate-pulse">
                        <Users className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Searching...</p>
                    </>
                  )}
               </div>
            </div>

            <div className="w-full space-y-6 flex flex-col items-center">
              {room.status === 'starting' && !me?.ready && (
                 <button 
                  onClick={setReady}
                  className="w-full max-w-sm bg-amber-400 hover:bg-amber-500 text-slate-900 py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-amber-200 flex items-center justify-center gap-2 group transition-all"
                 >
                   Ready To Fight
                   <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                 </button>
              )}
              
              {room.status === 'starting' && me?.ready && !opponent?.ready && (
                <p className="text-indigo-600 font-bold animate-bounce italic">Waiting for opponent to be ready...</p>
              )}

              <button 
                onClick={leaveRoom}
                className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-red-500 transition-colors"
              >
                Quit Room
              </button>
            </div>
         </div>
      </div>
    );
  }

  if (room?.status === 'active') {
    const me = room.players.find(p => p.uid === profile.id);
    const opponent = room.players.find(p => p.uid !== profile.id);
    const currentQuestion = room.questions[questionIndex];

    return (
      <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col p-4 sm:p-8">
         {/* Live Progress Bar Header */}
         <div className="max-w-3xl mx-auto w-full space-y-4 mb-4">
            <div className="flex justify-between items-center mb-2">
               <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">YOU: {me?.score}</div>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-indigo-600 font-black text-lg">
                    <Timer className="h-5 w-5" />
                    {formatTime(timeLeft)}
                  </div>
                  <button 
                    onClick={() => {
                      if (window.confirm("Surrender duel? You will lose Battle XP.")) {
                        leaveRoom();
                      }
                    }}
                    className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
               </div>
               <div className="bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">FOE: {opponent?.score}</div>
            </div>
            
            {/* Split Progress */}
            <div className="relative h-6 w-full bg-slate-200/50 rounded-full overflow-hidden border-2 border-white shadow-inner">
               <motion.div 
                 animate={{ width: `${me?.progress}%` }}
                 className="absolute left-0 top-0 bottom-0 bg-indigo-600 rounded-r-lg z-10"
               />
               <motion.div 
                 animate={{ width: `${opponent?.progress}%` }}
                 className="absolute right-0 top-0 bottom-0 bg-red-400 opacity-30"
               />
            </div>
         </div>

         {/* Question Area */}
         <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col justify-center gap-8">
            {!currentQuestion ? (
              <div className="text-center space-y-6">
                <div className="relative w-24 h-24 mx-auto">
                  <Loader2 className="h-24 w-24 text-indigo-100 animate-spin absolute inset-0" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic leading-none mb-2">WELL DONE!</h2>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Waiting for your opponent to finish...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Word {questionIndex + 1} of 10</p>
                   <h1 className="text-4xl sm:text-6xl font-black text-slate-800 tracking-tighter uppercase italic">{currentQuestion.word}</h1>
                </div>

                <div className="grid grid-cols-1 gap-4">
                   {currentQuestion.options.map((option, idx) => {
                     const isSelected = selectedOption === option;
                     const isCorrect = option === currentQuestion.meaning;
                     const showFeedback = selectedOption !== null;

                     return (
                       <button
                        key={idx}
                        disabled={!!selectedOption}
                        onClick={() => handleAnswer(option)}
                        className={cn(
                          "p-6 rounded-[2rem] border-2 text-left font-bold transition-all transform active:scale-95",
                          !showFeedback && "bg-white border-slate-100 hover:border-indigo-200 text-slate-700",
                          showFeedback && isCorrect && "bg-emerald-50 border-emerald-200 text-emerald-700 scale-[1.02]",
                          showFeedback && !isCorrect && isSelected && "bg-red-50 border-red-200 text-red-700",
                          showFeedback && !isCorrect && !isSelected && "opacity-40 border-transparent text-slate-400"
                        )}
                       >
                         <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black",
                              !showFeedback ? "bg-slate-100 text-slate-400" : (isCorrect ? "bg-emerald-500 text-white" : "bg-red-200 text-red-500")
                            )}>
                              {String.fromCharCode(65 + idx)}
                            </div>
                            {option}
                         </div>
                       </button>
                     );
                   })}
                </div>
              </>
            )}
         </div>
      </div>
    );
  }

  if (room?.status === 'finished') {
    const isWinner = room.winnerId === profile.id;
    const isTie = room.winnerId === 'TIE';
    const me = room.players.find(p => p.uid === profile.id);
    const opponent = room.players.find(p => p.uid !== profile.id);

    return (
      <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center p-8 overflow-y-auto">
         <motion.div 
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="w-full max-w-sm bg-white rounded-[3rem] p-10 text-center space-y-8 shadow-2xl shadow-indigo-500/20"
         >
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-indigo-50 mb-2">
               {isWinner ? <Trophy className="h-12 w-12 text-amber-500" /> : <X className="h-12 w-12 text-red-400" />}
            </div>

            <div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic leading-none mb-2">
                {isTie ? "IT'S A TIE!" : isWinner ? "VICTORY!" : "DEFEAT"}
              </h2>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                {isWinner ? "YOU OWNED THE ARENA" : isTie ? "EVENLY MATCHED" : "LEARN FROM THIS"}
              </p>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
               <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">YOU</p>
                  <p className="text-2xl font-black text-indigo-600">{me?.score}</p>
               </div>
               <div className="h-8 w-px bg-slate-200" />
               <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">FOE</p>
                  <p className="text-2xl font-black text-slate-800">{opponent?.score}</p>
               </div>
            </div>

             <div className="space-y-3">
              <div className={cn(
                "flex justify-between items-center p-4 rounded-2xl border",
                isWinner ? "bg-indigo-50 border-indigo-100" : (isTie ? "bg-slate-50 border-slate-100" : "bg-red-50 border-red-100")
              )}>
                 <div className="flex items-center gap-2">
                    <Zap className={cn("h-4 w-4", isWinner ? "text-indigo-600" : (isTie ? "text-slate-500" : "text-red-600"))} />
                    <span className={cn("text-xs font-black uppercase", isWinner ? "text-indigo-900" : (isTie ? "text-slate-900" : "text-red-900"))}>XP REWARD</span>
                 </div>
                 <span className={cn("text-xs font-black", isWinner ? "text-indigo-600" : (isTie ? "text-slate-600" : "text-red-600"))}>
                   {isWinner ? '+100' : isTie ? '+50' : '-50'}
                 </span>
              </div>
            </div>

            <button 
              onClick={leaveRoom}
              className="w-full bg-slate-800 text-white py-6 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all"
            >
              Back to Lobby
            </button>
         </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
    </div>
  );
}
