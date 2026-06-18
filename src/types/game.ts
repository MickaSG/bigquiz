export interface PlayerLifelines {
  fiftyFifty: number;
  skipQuestion: number;
  doublePoints: number;
  freezeTime: number;
  spy: number;
  shield: number;
  secondChance: number;
  publicVote: number;
}

export const DEFAULT_LIFELINES: PlayerLifelines = {
  fiftyFifty: 2, skipQuestion: 2, doublePoints: 1, freezeTime: 1,
  spy: 1, shield: 1, secondChance: 1, publicVote: 1,
};

export interface PlayerProfile {
  name: string;
  avatar: string;
  // Quiz stats
  quizTotalScore: number;
  quizGamesPlayed: number;
  quizTotalCorrect: number;
  quizTotalAnswered: number;
  quizBestStreak: number;
  quizCategoryStats: Record<string, { correct: number; total: number }>;
  lifelines: PlayerLifelines;
  // Pendu stats
  penduTotalScore: number;
  penduGamesPlayed: number;
  penduWordsFound: number;
  penduBestStreak: number;
}

export function getRank(score: number): { name: string; icon: string; color: string; next: number } {
  if (score >= 50000) return { name: 'Légende', icon: '👑', color: 'from-yellow-400 to-amber-500', next: 999999 };
  if (score >= 15000) return { name: 'Diamant', icon: '💎', color: 'from-cyan-400 to-blue-500', next: 50000 };
  if (score >= 5000) return { name: 'Or', icon: '🥇', color: 'from-yellow-500 to-amber-600', next: 15000 };
  if (score >= 1000) return { name: 'Argent', icon: '🥈', color: 'from-gray-300 to-gray-400', next: 5000 };
  return { name: 'Bronze', icon: '🥉', color: 'from-amber-600 to-orange-700', next: 1000 };
}

export interface Player {
  id: string; name: string; avatar: string;
  score: number; streak: number; maxStreak: number;
  totalCorrect: number; totalAnswered: number; timeBonus: number;
  lifelines: PlayerLifelines;
  achievements: string[];
  categoryScores: Record<string, number>;
  lastPlayed: number;
}

export interface GameState {
  mode: 'menu' | 'playing' | 'results' | 'leaderboard' | 'categories' | 'duel' | 'survival' | 'blitz' | 'random';
  currentQuestion: number; questions: number[];
  selectedCategory: string | null; selectedDifficulty: 'all' | 'easy' | 'medium' | 'hard';
  timeLeft: number; isTimerActive: boolean; isPaused: boolean;
  showAnswer: boolean; selectedAnswer: number | null;
  currentPlayer: Player;
  doublePointsActive: boolean; freezeTimeActive: boolean; comboMultiplier: number;
  totalQuestions: number; questionsPerRound: number; survivalLives: number; blitzTimeTotal: number;
}

export interface LeaderboardEntry {
  name: string; avatar: string; score: number;
  totalCorrect: number; totalAnswered: number; streak: number;
  date: string; mode: string;
}

export function defaultProfile(name: string, avatar: string): PlayerProfile {
  return {
    name, avatar,
    quizTotalScore: 0, quizGamesPlayed: 0, quizTotalCorrect: 0, quizTotalAnswered: 0,
    quizBestStreak: 0, quizCategoryStats: {}, lifelines: { ...DEFAULT_LIFELINES },
    penduTotalScore: 0, penduGamesPlayed: 0, penduWordsFound: 0, penduBestStreak: 0,
  };
}
