export interface VocabCard {
  id: string;
  theme: string;
  section: string;
  word: string;
  partOfSpeech: string;
  meaning: string;
  sentence: string;
  familiarity?: 'unknown' | 'forgot' | 'mastered';
}

export type Familiarity = 'unknown' | 'hard' | 'medium' | 'easy';

export interface ThemeLevelProgress {
  theme: string;
  levels: number[]; // Scores for each level (0-100)
}

export interface UserProfile {
  id: string;
  englishName: string;
  className: string;
  classNo: string;
  total_score: number;
  best_sort_key: number;
  best_display: string;
  best_stars: number;
  avatar: string;
  inventory: string[];
  activeBadge: string | null;
  activeSkin?: string | null;
  activeSuit?: string | null;
  activeDecoration?: string | null;
  setupComplete: boolean;
  email: string;
  themeProgress?: Record<string, number[]>; // theme -> [scoreL1, scoreL2, ...]
  xp: number;
  level: number;
  streak: number;
  lastActive?: string;
  lastMissionUpdate?: any;
  missions?: DailyMission[];
}

export interface BattlePlayer {
  uid: string;
  name: string;
  score: number;
  progress: number;
  ready: boolean;
  finished: boolean;
}

export interface BattleQuestion {
  word: string;
  meaning: string;
  options: string[];
}

export interface BattleRoom {
  id: string;
  status: 'waiting' | 'starting' | 'active' | 'finished';
  players: BattlePlayer[];
  questions: BattleQuestion[];
  winnerId?: string;
  createdAt: string;
  startTime?: string;
  playerUids: string[];
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
  type: 'quiz' | 'analysis' | 'pronunciation';
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  icon: string;
  category: 'badge' | 'avatar' | 'title' | 'skin' | 'suit' | 'decoration';
}

export interface EssaySuggestion {
  word: string;
  pos: string;
  meaning: string;
  example: string;
}
