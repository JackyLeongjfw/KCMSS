import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, VocabCard } from '../types';
import vocabData from '../data/vocab_master.json';
import { generateQuiz } from '../lib/quizUtils';
import { usePronunciation } from '../hooks/usePronunciation';
import { Volume2, Mic, Send, Timer, Star, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { useMissions } from '../hooks/useMissions';

interface QuizGameProps {
  profile: UserProfile;
  theme: string;
  mode: number;
  onFinish: () => void;
}

export default function QuizGame({ profile, theme, mode, onFinish }: QuizGameProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [answered, setAnswered] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [lastPoints, setLastPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  
  const { speak, testPronunciation, isSynthesizing, isRecognizing } = usePronunciation();
  const { updateMissionProgress } = useMissions(profile);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  if (!profile) return null;

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleAnswer = async (answer: string) => {
    if (answered) return;
    stopTimer();
    setAnswered(true);
    setUserAnswer(answer);

    const q = questions[currentIndex];
    const isCorrect = answer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();

    let points = 0;
    if (isCorrect) {
      const base = mode < 2 ? 5 : mode < 4 ? 10 : 20;
      const comboBonus = Math.min(streak * (mode < 2 ? 2 : mode < 4 ? 5 : 10), 100);
      
      // Daily Streak Multiplier: +5% per streak day (up to +50%)
      const streakMult = 1 + (Math.min(profile.streak || 0, 10) * 0.05);
      points = Math.round((base + comboBonus) * streakMult);
      
      setScore(s => s + points);
      setCorrectCount(c => c + 1);
      setStreak(s => s + 1);
      setLastPoints(points);
      updateMissionProgress('quiz_correct', 1);
    } else {
      setStreak(0);
      setLastPoints(0);
    }

    // Auto next after delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(c => c + 1);
        setAnswered(false);
        setUserAnswer('');
        setTimeLeft(mode < 2 ? 10 : 15);
      } else {
        handleFinish();
      }
    }, 2000);
  };

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAnswer(''); // Timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    const themePool = (vocabData as VocabCard[]).filter(v => v.theme === theme);
    setQuestions(generateQuiz(themePool, mode));
  }, [theme, mode]);

  useEffect(() => {
    if (questions.length > 0 && !answered) {
      setTimeLeft(mode < 2 ? 10 : 15);
      startTimer();
      
      // Auto-play audio for listening modes
      if (mode === 2 || mode === 3) {
        setTimeout(() => speak(questions[currentIndex].correctAnswer), 500);
      }
    }
    return () => stopTimer();
  }, [currentIndex, questions]);

  const handleFinish = async () => {
    const scorePercent = Math.round((correctCount / questions.length) * 100);
    const passed = scorePercent >= 80;

    try {
      // Mission Progress: Quiz
      updateMissionProgress('quiz', 1);

      if (profile.id !== 'guest_user') {
        const userRef = doc(db, 'users', profile.id);
        
        const newProgress = { ...(profile.themeProgress || {}) };
        const themeLevels = [...(newProgress[theme] || Array(5).fill(0))];
        themeLevels[mode] = Math.max(themeLevels[mode], scorePercent);
        newProgress[theme] = themeLevels;

        const accuracyBonus = scorePercent === 100 ? 50 : 0;
        const totalPoints = score + accuracyBonus;
        
        // XP calculation: 1 XP per point
        const totalXP = (profile.xp || 0) + totalPoints;
        // Level logic: Level = Floor(Sqrt(XP/100)) + 1
        // Level 2: 400 XP, Level 3: 900 XP, Level 4: 1600 XP, Level 5: 2500 XP, etc.
        const newLevel = Math.floor(Math.sqrt(totalXP / 100)) + 1;

        if (accuracyBonus > 0) toast.success("Perfect Score! +50 Accuracy Bonus ✨");

        await updateDoc(userRef, {
          total_score: increment(totalPoints),
          xp: totalXP,
          level: newLevel,
          themeProgress: newProgress
        });
      }

      toast.success(passed ? "Level Passed with 80%+! 🎉" : `Score: ${scorePercent}%. Need 80% to unlock next level.`);
    } catch (error) {
      console.error(error);
    }
    onFinish();
  };

  if (questions.length === 0) return null;

  const currentQ = questions[currentIndex];
  const isCorrect = userAnswer.toLowerCase().trim() === currentQ.correctAnswer.toLowerCase().trim();

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center px-1">
        <button 
          onClick={onFinish}
          className="h-10 px-4 bg-white hover:bg-slate-50 rounded-xl text-slate-600 font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 border border-slate-200 transition-all shadow-sm active:scale-95"
        >
          <XCircle className="h-4 w-4" />
          Exit Quiz
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">SCORE</span>
          <span className="text-lg font-black text-indigo-700 leading-none">{score.toLocaleString()}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">PROGRESS</span>
          <span className="text-lg font-black text-slate-700 leading-none">{currentIndex + 1}<span className="text-slate-300">/{questions.length}</span></span>
        </div>
      </div>

      <div className="relative h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner border border-slate-300/20">
        <motion.div 
          className={cn(
            "h-full transition-colors", 
            timeLeft < 5 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
          )}
          initial={{ width: '100%' }}
          animate={{ width: `${(timeLeft / (mode < 2 ? 10 : 15)) * 100}%` }}
        />
      </div>

      {streak >= 2 && (
        <motion.div 
          initial={{ scale: 0.5, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-1.5 py-1 px-4 bg-amber-100/50 border border-amber-200 rounded-full text-amber-600 font-bold text-xs self-center shadow-sm"
        >
          <span className="text-sm">🔥</span> Streak x{streak}!
        </motion.div>
      )}

      <div className="flex-1 flex flex-col justify-center items-stretch space-y-6 py-6">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center min-h-[160px] flex flex-col items-center justify-center relative">
          <div className="absolute top-4 left-4 w-6 h-6 bg-slate-50 border border-slate-100 rounded flex items-center justify-center text-[10px] font-black text-slate-300">Q</div>
          <h3 className="text-xl font-bold text-slate-800 leading-relaxed max-w-xs">
            {currentQ.questionText}
          </h3>
        </div>

        {(mode === 2 || mode === 3) && (
          <button
            onClick={() => speak(currentQ.correctAnswer)}
            disabled={answered}
            className="mx-auto w-16 h-16 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-4 border-white"
          >
            <Volume2 className="h-6 w-6" />
          </button>
        )}

        <div className="grid gap-3">
          {currentQ.type === 'mc' ? (
            currentQ.options.map((opt: string, i: number) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                disabled={answered}
                className={cn(
                  "py-4 px-6 rounded-2xl font-bold border transition-all text-left relative overflow-hidden group",
                  answered && opt === currentQ.correctAnswer ? "bg-emerald-500 border-emerald-500 text-white shadow-lg ring-4 ring-emerald-100" :
                  answered && opt === userAnswer ? "bg-red-500 border-red-500 text-white ring-4 ring-red-100" :
                  "bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-slate-50"
                )}
              >
                <div className="relative z-10 flex justify-between items-center">
                  <span>{opt}</span>
                  {answered && opt === currentQ.correctAnswer && <CheckCircle2 className="h-5 w-5 text-white/80" />}
                  {answered && opt === userAnswer && opt !== currentQ.correctAnswer && <XCircle className="h-5 w-5 text-white/80" />}
                </div>
              </button>
            ))
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  disabled={answered}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnswer(userAnswer)}
                  placeholder="Type your answer..."
                  className="w-full px-6 py-5 rounded-3xl border-2 border-slate-100 focus:border-indigo-500 bg-slate-50 focus:bg-white shadow-inner outline-none transition-all text-center text-xl font-bold text-slate-800 placeholder:text-slate-300"
                />
              </div>
              <button
                onClick={() => handleAnswer(userAnswer)}
                disabled={answered || !userAnswer.trim()}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs",
                  answered || !userAnswer.trim() ? "bg-slate-200 text-slate-400" : "bg-indigo-600 text-white shadow-indigo-100"
                )}
              >
                Submit Answer
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "p-5 rounded-3xl flex items-center gap-4 border-2 shadow-sm",
              isCorrect ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
              isCorrect ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
            )}>
              {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className="font-black text-sm uppercase tracking-tight">{isCorrect ? 'Correct!' : 'Incorrect'}</p>
              {!isCorrect && <p className="text-[11px] font-bold opacity-80">The correct answer is: <span className="underline">{currentQ.correctAnswer}</span></p>}
            </div>
            {isCorrect && (
              <div className="text-right">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Points earned</p>
                <div className="text-lg font-black leading-none mt-0.5">+{lastPoints}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
