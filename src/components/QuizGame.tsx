import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { UserProfile, VocabCard } from '../types';
import vocabData from '../data/vocab_master.json';
import { generateQuiz } from '../lib/quizUtils';
import { usePronunciation } from '../hooks/usePronunciation';
import { Volume2, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useMissions } from '../hooks/useMissions';

interface QuizGameProps {
  profile: UserProfile;
  theme: string;
  mode: number;
  onFinish: () => void;
}

export default function QuizGame({ profile, theme, mode, onFinish }: QuizGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(() => (mode < 2 ? 10 : 15));
  const [answered, setAnswered] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [lastPoints, setLastPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<{question: string, correct: string, user: string}[]>([]);
  
  const { speak } = usePronunciation();
  const { updateMissionProgress } = useMissions(profile);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const questions = useMemo(() => {
    if (!profile) return [];
    const themePool = (vocabData as VocabCard[]).filter(v => v.theme === theme);
    return generateQuiz(themePool, mode);
  }, [theme, mode, profile]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleFinish = useCallback(async (finalCorrect?: number, finalScore?: number) => {
    if (!profile) return;
    const count = finalCorrect !== undefined ? finalCorrect : correctCount;
    const totalPoints = finalScore !== undefined ? finalScore : score;
    const scorePercent = Math.round((count / (questions.length || 1)) * 100);

    try {
      // Mission Progress: Quiz
      updateMissionProgress('quiz', 1);

      if (profile.id !== 'guest_user') {
        const userRef = doc(db, 'users', profile.id);
        
        const newProgress = { ...(profile.themeProgress || {}) };
        const themeLevels = [...(newProgress[theme] || Array(5).fill(0))];
        themeLevels[mode] = Math.max(themeLevels[mode] || 0, scorePercent);
        newProgress[theme] = themeLevels;

        // Use the accumulated score + perfection bonus
        const accuracyBonus = scorePercent === 100 ? 10 : 0;
        const totalPointsEarned = totalPoints + accuracyBonus;
        
        const totalXP = (profile.xp || 0) + totalPointsEarned;
        const newLevel = Math.floor(Math.sqrt(totalXP / 100)) + 1;

        await updateDoc(userRef, {
          total_score: increment(totalPointsEarned),
          xp: totalXP,
          level: newLevel,
          themeProgress: newProgress
        });
      }
      setQuizFinished(true);
    } catch (error) {
      console.error(error);
      setQuizFinished(true);
    }
  }, [profile, correctCount, questions.length, updateMissionProgress, theme, mode, score]);

  const handleAnswer = useCallback(async (answer: string) => {
    if (answered) return;
    stopTimer();
    setAnswered(true);
    setUserAnswer(answer);

    const q = questions[currentIndex];
    const isCorrect = answer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();

    let newCount = correctCount;
    let newScore = score;

    if (isCorrect) {
      const pointsPerQuestion = 10;
      
      newCount = correctCount + 1;
      newScore = score + pointsPerQuestion;
      
      setScore(s => s + pointsPerQuestion);
      setCorrectCount(c => c + 1);
      setStreak(s => s + 1);
      setLastPoints(pointsPerQuestion);
      updateMissionProgress('quiz_correct', 1);
    } else {
      setStreak(0);
      setLastPoints(0);
      setWrongAnswers(prev => [...prev, {
        question: q.questionText,
        correct: q.correctAnswer,
        user: answer || '(Timed out)'
      }]);
    }

    // Auto next after delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(c => c + 1);
        setAnswered(false);
        setUserAnswer('');
        setTimeLeft(mode < 2 ? 10 : 15);
      } else {
        handleFinish(newCount, newScore);
      }
    }, 2000);
  }, [answered, stopTimer, questions, currentIndex, updateMissionProgress, handleFinish, correctCount, score]);

  const startTimer = useCallback(() => {
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
  }, [stopTimer, handleAnswer]);

  useEffect(() => {
    if (questions.length > 0 && !quizFinished) {
      if (!answered) {
        // Reset timer exactly when a new question becomes active or mode changes
        startTimer();
      } else {
        stopTimer();
      }
      
      // Auto-play audio for dictation level (Level 3 or Level 4)
      if (mode >= 2 && !answered) {
        const audioTimer = setTimeout(() => speak(questions[currentIndex].correctAnswer), 500);
        return () => {
          clearTimeout(audioTimer);
        };
      }
    }
    return () => stopTimer();
  }, [currentIndex, questions, answered, mode, speak, startTimer, stopTimer, quizFinished]);

  if (!profile || questions.length === 0) return null;

  if (quizFinished) {
    const scorePercent = Math.round((correctCount / questions.length) * 100);
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col h-full items-center justify-center space-y-8 py-8"
      >
        <div className="text-center space-y-2">
          <div className="text-6xl mb-4">
            {scorePercent === 100 ? '👑' : scorePercent >= 80 ? '🎉' : '📚'}
          </div>
          <h2 className="text-3xl font-black text-slate-800">Quiz Complete!</h2>
          <p className="text-slate-500 font-medium">Great effort on {theme}</p>
        </div>

        <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-xl w-full max-w-sm text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Score</p>
              <p className="text-5xl font-black text-indigo-600">{score.toLocaleString()}</p>
              {scorePercent === 100 && (
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">
                  ✨ +10 Perfection Bonus! ✨
                </p>
              )}
            </div>
            <div className="flex justify-around items-center border-t border-slate-50 pt-6">
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Correct</p>
                <p className="text-xl font-bold text-emerald-600">{correctCount}</p>
              </div>
              <div className="w-px h-8 bg-slate-100"></div>
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Accuracy</p>
                <p className="text-xl font-bold text-indigo-600">{scorePercent}%</p>
              </div>
            </div>
          </div>
        </div>

        {wrongAnswers.length > 0 && (
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-red-50 px-4 py-2 border-b border-red-100">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Review Corrections ({wrongAnswers.length})</p>
            </div>
            <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-50">
              {wrongAnswers.map((item, idx) => (
                <div key={idx} className="p-3 text-left">
                  <p className="text-xs font-bold text-slate-800 mb-1">{item.question}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-red-400 uppercase line-through">{item.user}</span>
                    <ChevronRight className="h-2 w-2 text-slate-300" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded">{item.correct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onFinish}
          className="w-full max-w-sm py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all"
        >
          Finish & Return
        </button>
      </motion.div>
    );
  }

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
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 leading-relaxed max-w-xs">
              {currentQ.questionText}
            </h3>
            
            {mode === 2 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1.5"
              >
                <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                  {currentQ.card.partOfSpeech}
                </div>
                <p className="text-xl font-black text-slate-500">
                  {currentQ.card.meaning}
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {mode === 2 && (
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
