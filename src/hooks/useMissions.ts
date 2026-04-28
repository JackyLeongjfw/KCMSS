import { useState, useEffect } from 'react';
import { UserProfile, DailyMission } from '../types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const MISSIONS: Omit<DailyMission, 'current' | 'completed'>[] = [
  { id: 'mission_quiz', title: 'Study Buff', description: 'Complete 1 Writing Exercise', target: 1, reward: 200, type: 'quiz' },
  { id: 'mission_pronounce', title: 'Loud & Clear', description: 'Speak aloud 1 time', target: 1, reward: 100, type: 'pronunciation' },
];

export function useMissions(profile: UserProfile | null) {
  useEffect(() => {
    if (!profile || profile.id === 'guest_user') return;

    const today = new Date().toDateString();
    const lastUpdate = profile.lastMissionUpdate ? new Date(profile.lastMissionUpdate).toDateString() : '';

    if (today !== lastUpdate) {
      // Generate 3 random missions for today
      const selectedMissions = [...MISSIONS]
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(m => ({
          ...m,
          current: 0,
          completed: false
        }));

      const userRef = doc(db, 'users', profile.id);
      updateDoc(userRef, {
        missions: selectedMissions,
        lastMissionUpdate: serverTimestamp()
      }).catch(e => console.error("Auto mission reset failed:", e));
    }
  }, [profile?.id]);

  const updateMissionProgress = async (type: DailyMission['type'], amount: number = 1) => {
    if (!profile || !profile.missions || profile.id === 'guest_user') return 0;

    let updatedMissions = [...profile.missions];
    let pointsEarned = 0;
    let anyChanges = false;

    updatedMissions = updatedMissions.map(m => {
      if (m.type === type && !m.completed) {
        const newCurrent = m.current + amount;
        const newlyCompleted = newCurrent >= m.target;
        if (newlyCompleted) pointsEarned += m.reward;
        anyChanges = true;
        return {
          ...m,
          current: newCurrent,
          completed: newlyCompleted
        };
      }
      return m;
    });

    if (anyChanges) {
      const userRef = doc(db, 'users', profile.id);
      await updateDoc(userRef, {
        missions: updatedMissions,
        total_score: profile.total_score + pointsEarned
      });
      return pointsEarned;
    }
    return 0;
  };

  return { updateMissionProgress };
}
