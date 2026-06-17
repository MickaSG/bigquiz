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

export const AVATARS = ['🧠', '🦊', '🐱', '🦁', '🐸', '🦉', '🐺', '🦄', '🐲', '🦅', '🐼', '🐨', '🦋', '🌟', '⚡', '🔥', '💎', '🎯', '🏆', '👑'];

export const ACHIEVEMENTS = [
  { id: 'first_game', name: 'Première Partie', icon: '🎮', desc: 'Terminer votre première partie' },
  { id: 'perfect_10', name: 'Sans Faute ×10', icon: '💯', desc: '10 bonnes réponses de suite' },
  { id: 'perfect_20', name: 'Imbattable ×20', icon: '🔥', desc: '20 bonnes réponses de suite' },
  { id: 'speed_demon', name: 'Speed Demon', icon: '⚡', desc: 'Répondre en moins de 3 secondes' },
  { id: 'category_master', name: 'Maître de Catégorie', icon: '🏅', desc: '100% dans une catégorie' },
  { id: 'all_categories', name: 'Polyvalent', icon: '🌈', desc: 'Jouer dans toutes les catégories' },
  { id: 'score_1000', name: 'Millénaire', icon: '💎', desc: 'Atteindre 1000 points' },
  { id: 'score_5000', name: 'Légende', icon: '👑', desc: 'Atteindre 5000 points' },
  { id: 'survival_20', name: 'Survivant', icon: '🛡️', desc: 'Survivre 20 questions en mode survie' },
  { id: 'blitz_master', name: 'Maître du Blitz', icon: '💨', desc: '15 bonnes réponses en mode Blitz' },
];
