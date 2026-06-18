export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  maxStreak: number;
  totalCorrect: number;
  totalAnswered: number;
  timeBonus: number;
  lifelines: {
    fiftyFifty: number;
    skipQuestion: number;
    doublePoints: number;
    freezeTime: number;
    spy: number;
    shield: number;
    secondChance: number;
    publicVote: number;
  };
  achievements: string[];
  categoryScores: Record<string, number>;
  lastPlayed: number;
}

export interface GameState {
  mode: 'menu' | 'playing' | 'results' | 'leaderboard' | 'categories' | 'duel' | 'survival' | 'blitz';
  currentQuestion: number;
  questions: number[];
  selectedCategory: string | null;
  selectedDifficulty: 'all' | 'easy' | 'medium' | 'hard';
  timeLeft: number;
  isTimerActive: boolean;
  isPaused: boolean;
  showAnswer: boolean;
  selectedAnswer: number | null;
  currentPlayer: Player;
  doublePointsActive: boolean;
  freezeTimeActive: boolean;
  comboMultiplier: number;
  totalQuestions: number;
  questionsPerRound: number;
  survivalLives: number;
  blitzTimeTotal: number;
}

export interface LeaderboardEntry {
  name: string;
  avatar: string;
  score: number;
  totalCorrect: number;
  totalAnswered: number;
  streak: number;
  date: string;
  mode: string;
}
