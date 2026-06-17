import { useState, useEffect, useCallback, useRef } from 'react';
import { questions, categories } from './data/questions';
import { Player, LeaderboardEntry, AVATARS, ACHIEVEMENTS, GameState } from './types/game';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSound } from './hooks/useSound';
import { useConfetti } from './hooks/useConfetti';
import { QuizHeader } from './components/QuizHeader';
import { QuestionCard } from './components/QuestionCard';
import { Lifelines } from './components/Lifelines';
import { Leaderboard } from './components/Leaderboard';
import { ResultsScreen } from './components/ResultsScreen';
import { PauseModal } from './components/PauseModal';

const DEFAULT_TIME = 20;
const BLITZ_TIME = 90;
const QUESTIONS_PER_ROUND = 20;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createPlayer(name: string, avatar: string): Player {
  return {
    id: Date.now().toString(),
    name, avatar, score: 0, streak: 0, maxStreak: 0,
    totalCorrect: 0, totalAnswered: 0, timeBonus: 0,
    lifelines: { fiftyFifty: 2, skipQuestion: 2, doublePoints: 1, freezeTime: 1 },
    achievements: [],
    categoryScores: {},
    lastPlayed: Date.now(),
  };
}

export default function App() {
  const [leaderboard, setLeaderboard] = useLocalStorage<LeaderboardEntry[]>('quiz_leaderboard', []);
  const [allAchievements, setAllAchievements] = useLocalStorage<string[]>('quiz_achievements', []);

  const [gameState, setGameState] = useState<GameState>({
    mode: 'menu',
    currentQuestion: 0,
    questions: [],
    selectedCategory: null,
    selectedDifficulty: 'all',
    timeLeft: DEFAULT_TIME,
    isTimerActive: false,
    isPaused: false,
    showAnswer: false,
    selectedAnswer: null,
    currentPlayer: createPlayer('Joueur', '🧠'),
    doublePointsActive: false,
    freezeTimeActive: false,
    comboMultiplier: 1,
    totalQuestions: QUESTIONS_PER_ROUND,
    questionsPerRound: QUESTIONS_PER_ROUND,
    survivalLives: 3,
    blitzTimeTotal: BLITZ_TIME,
  });

  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🧠');
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [setupMode, setSetupMode] = useState<'classique' | 'survie' | 'blitz'>('classique');
  const [selectedSetupCategory, setSelectedSetupCategory] = useState<string | null>(null);
  const [selectedSetupDifficulty, setSelectedSetupDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [questionsCount, setQuestionsCount] = useState(20);
  const [showAchievements, setShowAchievements] = useState(false);
  const [scorePopup, setScorePopup] = useState<{points: number, x: number, y: number} | null>(null);
  const [lastGameMode, setLastGameMode] = useState<string>('classique');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { playCorrect, playWrong, playClick, playTick, playStreak, playLevelUp, playGameOver } = useSound();
  const { fire, fireStars } = useConfetti();

  // Timer logic
  useEffect(() => {
    if (gameState.isTimerActive && !gameState.isPaused && !gameState.showAnswer) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (prev.freezeTimeActive) return prev;
          const newTime = prev.timeLeft - 1;
          if (newTime <= 5 && newTime > 0) playTick();
          if (newTime <= 0) {
            // Time's up
            if (prev.mode === 'blitz') {
              return { ...prev, timeLeft: 0, isTimerActive: false };
            }
            return { ...prev, timeLeft: 0, showAnswer: true, isTimerActive: false, selectedAnswer: -1 };
          }
          return { ...prev, timeLeft: newTime };
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.isTimerActive, gameState.isPaused, gameState.showAnswer, gameState.freezeTimeActive, playTick]);

  // Handle time up for blitz
  useEffect(() => {
    if (gameState.mode === 'blitz' && gameState.timeLeft <= 0 && gameState.isTimerActive === false && !gameState.showAnswer) {
      endGame();
    }
  }, [gameState.timeLeft, gameState.mode, gameState.isTimerActive, gameState.showAnswer]);

  // Handle auto-advance after showing answer
  useEffect(() => {
    if (gameState.showAnswer) {
      const timeout = setTimeout(() => {
        nextQuestion();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [gameState.showAnswer]);

  const startGame = useCallback((mode: 'classique' | 'survie' | 'blitz', cat: string | null, diff: 'all' | 'easy' | 'medium' | 'hard', count: number) => {
    let filtered = questions.filter(q => {
      if (cat && q.category !== cat) return false;
      if (diff !== 'all' && q.difficulty !== diff) return false;
      return true;
    });
    filtered = shuffleArray(filtered);
    const total = mode === 'survie' ? filtered.length : Math.min(count, filtered.length);
    const questionIds = filtered.slice(0, total).map(q => q.id);

    const name = playerName.trim() || 'Joueur';
    const player = createPlayer(name, selectedAvatar);

    setHiddenOptions([]);
    setNewAchievements([]);
    setLastGameMode(mode === 'classique' ? 'classique' : mode === 'survie' ? 'survie' : 'blitz');
    setGameState({
      mode: mode === 'classique' ? 'playing' : mode === 'survie' ? 'survival' : 'blitz',
      currentQuestion: 0,
      questions: questionIds,
      selectedCategory: cat,
      selectedDifficulty: diff,
      timeLeft: mode === 'blitz' ? BLITZ_TIME : DEFAULT_TIME,
      isTimerActive: true,
      isPaused: false,
      showAnswer: false,
      selectedAnswer: null,
      currentPlayer: player,
      doublePointsActive: false,
      freezeTimeActive: false,
      comboMultiplier: 1,
      totalQuestions: questionIds.length,
      questionsPerRound: count,
      survivalLives: 3,
      blitzTimeTotal: BLITZ_TIME,
    });
    setShowSetup(false);
    playClick();
  }, [playerName, selectedAvatar, playClick]);

  const handleAnswer = useCallback((index: number) => {
    if (gameState.showAnswer) return;

    const currentQ = questions.find(q => q.id === gameState.questions[gameState.currentQuestion]);
    if (!currentQ) return;

    const isCorrect = index === currentQ.correct;
    const timeBonus = Math.max(0, Math.floor(gameState.timeLeft * 2));
    const difficultyBonus = currentQ.difficulty === 'easy' ? 100 : currentQ.difficulty === 'medium' ? 200 : 300;

    setGameState(prev => {
      const newStreak = isCorrect ? prev.currentPlayer.streak + 1 : 0;
      const newMaxStreak = Math.max(prev.currentPlayer.maxStreak, newStreak);
      const combo = isCorrect ? Math.min(1 + (newStreak - 1) * 0.1, 3) : 1;
      const basePoints = isCorrect ? difficultyBonus : 0;
      const totalPoints = isCorrect ? Math.floor((basePoints + timeBonus) * combo * (prev.doublePointsActive ? 2 : 1)) : 0;

      // Show score popup
      if (isCorrect && totalPoints > 0) {
        setScorePopup({ points: totalPoints, x: 50, y: 30 });
        setTimeout(() => setScorePopup(null), 1500);
      }

      const newLives = !isCorrect && prev.mode === 'survival' ? prev.survivalLives - 1 : prev.survivalLives;

      return {
        ...prev,
        showAnswer: true,
        selectedAnswer: index,
        isTimerActive: false,
        comboMultiplier: combo,
        survivalLives: newLives,
        currentPlayer: {
          ...prev.currentPlayer,
          score: prev.currentPlayer.score + totalPoints,
          streak: newStreak,
          maxStreak: newMaxStreak,
          totalCorrect: prev.currentPlayer.totalCorrect + (isCorrect ? 1 : 0),
          totalAnswered: prev.currentPlayer.totalAnswered + 1,
          timeBonus: prev.currentPlayer.timeBonus + (isCorrect ? timeBonus : 0),
        },
      };
    });

    if (isCorrect) {
      playCorrect();
      const newStreak = gameState.currentPlayer.streak + 1;
      if (newStreak % 5 === 0) {
        playStreak(newStreak);
        fire();
      }
      if (newStreak === 10) fireStars();
    } else {
      playWrong();
    }
  }, [gameState, playCorrect, playWrong, playStreak, fire, fireStars]);

  const nextQuestion = useCallback(() => {
    setGameState(prev => {
      // Check survival death
      if (prev.mode === 'survival' && prev.survivalLives <= 0) {
        return { ...prev, mode: 'results' as any };
      }
      // Check end of questions
      if (prev.currentQuestion >= prev.questions.length - 1) {
        return { ...prev, mode: 'results' as any };
      }
      // Next question
      setHiddenOptions([]);
      return {
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
        showAnswer: false,
        selectedAnswer: null,
        timeLeft: prev.mode === 'blitz' ? prev.timeLeft : DEFAULT_TIME,
        isTimerActive: true,
        doublePointsActive: false,
        freezeTimeActive: false,
      };
    });
  }, []);

  const endGame = useCallback(() => {
    setGameState(prev => ({ ...prev, mode: 'results' as any, isTimerActive: false }));
  }, []);

  // Check achievements when reaching results
  useEffect(() => {
    if (gameState.mode === 'results') {
      const p = gameState.currentPlayer;
      const gained: string[] = [];

      if (!allAchievements.includes('first_game')) gained.push('first_game');
      if (p.maxStreak >= 10 && !allAchievements.includes('perfect_10')) gained.push('perfect_10');
      if (p.maxStreak >= 20 && !allAchievements.includes('perfect_20')) gained.push('perfect_20');
      if (p.score >= 1000 && !allAchievements.includes('score_1000')) gained.push('score_1000');
      if (p.score >= 5000 && !allAchievements.includes('score_5000')) gained.push('score_5000');

      if (gained.length > 0) {
        setNewAchievements(gained);
        setAllAchievements(prev => [...prev, ...gained]);
        playLevelUp();
      } else {
        playGameOver();
      }

      // Save to leaderboard
      const modeStr = lastGameMode;
      const entry: LeaderboardEntry = {
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        totalCorrect: p.totalCorrect,
        totalAnswered: p.totalAnswered,
        streak: p.maxStreak,
        date: new Date().toISOString(),
        mode: modeStr,
      };
      setLeaderboard(prev => [...prev, entry].sort((a, b) => b.score - a.score).slice(0, 50));
    }
  }, [gameState.mode]);

  // Lifelines
  const useFiftyFifty = useCallback(() => {
    const currentQ = questions.find(q => q.id === gameState.questions[gameState.currentQuestion]);
    if (!currentQ || gameState.currentPlayer.lifelines.fiftyFifty <= 0 || gameState.showAnswer) return;

    const wrongIndices = [0, 1, 2, 3].filter(i => i !== currentQ.correct);
    const toHide = shuffleArray(wrongIndices).slice(0, 2);
    setHiddenOptions(toHide);

    setGameState(prev => ({
      ...prev,
      currentPlayer: {
        ...prev.currentPlayer,
        lifelines: { ...prev.currentPlayer.lifelines, fiftyFifty: prev.currentPlayer.lifelines.fiftyFifty - 1 }
      }
    }));
    playClick();
  }, [gameState, playClick]);

  const useSkipQuestion = useCallback(() => {
    if (gameState.currentPlayer.lifelines.skipQuestion <= 0 || gameState.showAnswer) return;
    setGameState(prev => ({
      ...prev,
      currentPlayer: {
        ...prev.currentPlayer,
        lifelines: { ...prev.currentPlayer.lifelines, skipQuestion: prev.currentPlayer.lifelines.skipQuestion - 1 }
      }
    }));
    setHiddenOptions([]);
    nextQuestion();
    playClick();
  }, [gameState, nextQuestion, playClick]);

  const useDoublePoints = useCallback(() => {
    if (gameState.currentPlayer.lifelines.doublePoints <= 0 || gameState.showAnswer || gameState.doublePointsActive) return;
    setGameState(prev => ({
      ...prev,
      doublePointsActive: true,
      currentPlayer: {
        ...prev.currentPlayer,
        lifelines: { ...prev.currentPlayer.lifelines, doublePoints: prev.currentPlayer.lifelines.doublePoints - 1 }
      }
    }));
    playClick();
  }, [gameState, playClick]);

  const useFreezeTime = useCallback(() => {
    if (gameState.currentPlayer.lifelines.freezeTime <= 0 || gameState.showAnswer || gameState.freezeTimeActive) return;
    setGameState(prev => ({
      ...prev,
      freezeTimeActive: true,
      currentPlayer: {
        ...prev.currentPlayer,
        lifelines: { ...prev.currentPlayer.lifelines, freezeTime: prev.currentPlayer.lifelines.freezeTime - 1 }
      }
    }));
    playClick();
  }, [gameState, playClick]);

  const goToMenu = useCallback(() => {
    setGameState(prev => ({ ...prev, mode: 'menu', isTimerActive: false }));
    setShowSetup(false);
    setShowAchievements(false);
  }, []);

  // Current question data
  const currentQ = gameState.questions.length > 0 ? questions.find(q => q.id === gameState.questions[gameState.currentQuestion]) : null;
  const currentCat = currentQ ? categories.find(c => c.id === currentQ.category) : null;

  // ============ RENDER ============

  // Playing mode
  if ((gameState.mode === 'playing' || gameState.mode === 'survival' || gameState.mode === 'blitz') && currentQ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/50 to-gray-900 relative overflow-hidden">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/5 rounded-full blur-3xl" />
        </div>

        {/* Score popup */}
        {scorePopup && (
          <div className="fixed z-50 pointer-events-none animate-float-up" style={{ left: `${scorePopup.x}%`, top: `${scorePopup.y}%`, transform: 'translate(-50%, -50%)' }}>
            <span className="text-3xl font-black text-yellow-400 drop-shadow-lg">+{scorePopup.points}</span>
          </div>
        )}

        <div className="relative z-10 p-4 pt-6">
          <QuizHeader
            score={gameState.currentPlayer.score}
            streak={gameState.currentPlayer.streak}
            questionNum={gameState.currentQuestion + 1}
            totalQuestions={gameState.totalQuestions}
            timeLeft={gameState.timeLeft}
            maxTime={gameState.mode === 'blitz' ? BLITZ_TIME : DEFAULT_TIME}
            category={currentCat?.name || ''}
            difficulty={currentQ.difficulty}
            comboMultiplier={gameState.comboMultiplier}
            lives={gameState.mode === 'survival' ? gameState.survivalLives : undefined}
            onPause={() => setGameState(prev => ({ ...prev, isPaused: true }))}
            onQuit={endGame}
            doubleActive={gameState.doublePointsActive}
            freezeActive={gameState.freezeTimeActive}
          />

          <QuestionCard
            question={currentQ}
            selectedAnswer={gameState.selectedAnswer}
            showAnswer={gameState.showAnswer}
            onAnswer={handleAnswer}
            hiddenOptions={hiddenOptions}
          />

          <Lifelines
            fiftyFifty={gameState.currentPlayer.lifelines.fiftyFifty}
            skipQuestion={gameState.currentPlayer.lifelines.skipQuestion}
            doublePoints={gameState.currentPlayer.lifelines.doublePoints}
            freezeTime={gameState.currentPlayer.lifelines.freezeTime}
            onFiftyFifty={useFiftyFifty}
            onSkip={useSkipQuestion}
            onDouble={useDoublePoints}
            onFreeze={useFreezeTime}
            disabled={gameState.showAnswer}
            doubleActive={gameState.doublePointsActive}
            freezeActive={gameState.freezeTimeActive}
          />
        </div>

        {/* Pause Modal */}
        {gameState.isPaused && (
          <PauseModal
            onResume={() => setGameState(prev => ({ ...prev, isPaused: false }))}
            onQuit={endGame}
          />
        )}
      </div>
    );
  }

  // Results
  if (gameState.mode === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/50 to-gray-900">
        <ResultsScreen
          player={gameState.currentPlayer}
          mode={lastGameMode}
          onPlayAgain={() => setShowSetup(true)}
          onMenu={goToMenu}
          newAchievements={newAchievements}
        />
        {showSetup && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSetup(false)}>
            <div onClick={e => e.stopPropagation()} className="w-full max-w-lg">
              {renderSetupPanel()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Leaderboard
  if (gameState.mode === 'leaderboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/50 to-gray-900">
        <Leaderboard
          entries={leaderboard}
          onBack={goToMenu}
          onClear={() => { setLeaderboard([]); playClick(); }}
        />
      </div>
    );
  }

  // Achievements screen
  if (showAchievements) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/50 to-gray-900 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setShowAchievements(false)} className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-3xl font-bold text-white">🏅 Succès</h1>
            <div className="text-white/40 text-sm">{allAchievements.length}/{ACHIEVEMENTS.length}</div>
          </div>

          <div className="grid gap-3">
            {ACHIEVEMENTS.map(ach => {
              const unlocked = allAchievements.includes(ach.id);
              return (
                <div key={ach.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  unlocked ? 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/30' : 'bg-white/5 border-white/10 opacity-50'
                }`}>
                  <span className="text-3xl">{unlocked ? ach.icon : '🔒'}</span>
                  <div className="flex-1">
                    <div className="text-white font-bold">{ach.name}</div>
                    <div className="text-white/50 text-sm">{ach.desc}</div>
                  </div>
                  {unlocked && <span className="text-emerald-400 text-xl">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderSetupPanel() {
    const availableCount = questions.filter(q => {
      if (selectedSetupCategory && q.category !== selectedSetupCategory) return false;
      if (selectedSetupDifficulty !== 'all' && q.difficulty !== selectedSetupDifficulty) return false;
      return true;
    }).length;

    return (
      <div className="bg-gray-900/95 rounded-3xl p-6 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">⚙️ Configuration</h2>

        {/* Player setup */}
        <div className="mb-6">
          <label className="text-white/60 text-sm mb-2 block">Votre pseudo</label>
          <input
            type="text"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Entrez votre pseudo..."
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-all"
            maxLength={20}
          />
        </div>

        {/* Avatar selection */}
        <div className="mb-6">
          <label className="text-white/60 text-sm mb-2 block">Votre avatar</label>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => setSelectedAvatar(a)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                  selectedAvatar === a ? 'bg-purple-500/30 border-2 border-purple-400 scale-110' : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div className="mb-6">
          <label className="text-white/60 text-sm mb-2 block">Mode de jeu</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'classique' as const, icon: '📝', name: 'Classique', desc: 'Quiz standard' },
              { id: 'survie' as const, icon: '💀', name: 'Survie', desc: '3 vies max' },
              { id: 'blitz' as const, icon: '⚡', name: 'Blitz', desc: '90s chrono' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setSetupMode(m.id)}
                className={`p-3 rounded-xl text-center transition-all ${
                  setupMode === m.id ? 'bg-purple-500/30 border-2 border-purple-400' : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="text-2xl mb-1">{m.icon}</div>
                <div className="text-white text-sm font-bold">{m.name}</div>
                <div className="text-white/40 text-[10px]">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="mb-6">
          <label className="text-white/60 text-sm mb-2 block">Catégorie</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedSetupCategory(null)}
              className={`p-2.5 rounded-xl text-sm font-medium transition-all ${
                !selectedSetupCategory ? 'bg-purple-500/30 border-2 border-purple-400 text-white' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              🌐 Toutes
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedSetupCategory(cat.id)}
                className={`p-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  selectedSetupCategory === cat.id ? 'bg-purple-500/30 border-2 border-purple-400 text-white' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                {cat.icon} {cat.name.split(' ').slice(1).join(' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-6">
          <label className="text-white/60 text-sm mb-2 block">Difficulté</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'all' as const, label: '🌐 Toutes' },
              { id: 'easy' as const, label: '🟢 Facile' },
              { id: 'medium' as const, label: '🟡 Moyen' },
              { id: 'hard' as const, label: '🔴 Difficile' },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedSetupDifficulty(d.id)}
                className={`p-2 rounded-xl text-xs font-medium transition-all ${
                  selectedSetupDifficulty === d.id ? 'bg-purple-500/30 border-2 border-purple-400 text-white' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Question count (for classic mode) */}
        {setupMode === 'classique' && (
          <div className="mb-6">
            <label className="text-white/60 text-sm mb-2 block">Nombre de questions: {questionsCount}</label>
            <input
              type="range"
              min={5}
              max={Math.min(50, availableCount)}
              value={questionsCount}
              onChange={e => setQuestionsCount(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-white/30">
              <span>5</span>
              <span>{availableCount} disponibles</span>
            </div>
          </div>
        )}

        {/* Start button */}
        <button
          onClick={() => startGame(setupMode, selectedSetupCategory, selectedSetupDifficulty, questionsCount)}
          disabled={availableCount === 0}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🚀 Lancer la partie ({availableCount} questions dispo)
        </button>

        <button
          onClick={() => setShowSetup(false)}
          className="w-full py-3 mt-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-medium hover:bg-white/10 transition-all"
        >
          Annuler
        </button>
      </div>
    );
  }

  // ============ MENU ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/50 to-gray-900 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-40 right-20 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-6xl md:text-7xl mb-4 animate-bounce" style={{ animationDuration: '3s' }}>🧠</div>
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent mb-3">
            QuizMaster
          </h1>
          <p className="text-white/40 text-lg">500 questions • 10 catégories • 3 modes de jeu</p>
        </div>

        {/* Quick stats */}
        <div className="flex gap-4 mb-10">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">500</div>
            <div className="text-xs text-white/40">Questions</div>
          </div>
          <div className="w-px bg-white/10" />
          <div className="text-center">
            <div className="text-2xl font-bold text-white">10</div>
            <div className="text-xs text-white/40">Catégories</div>
          </div>
          <div className="w-px bg-white/10" />
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{leaderboard.length}</div>
            <div className="text-xs text-white/40">Parties</div>
          </div>
        </div>

        {/* Main buttons */}
        <div className="w-full max-w-md space-y-3 mb-8">
          <button
            onClick={() => { setShowSetup(true); playClick(); }}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-xl hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <span className="text-2xl">🎮</span> Nouvelle Partie
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setGameState(prev => ({ ...prev, mode: 'leaderboard' })); playClick(); }}
              className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="text-xl">🏆</span> Classement
            </button>
            <button
              onClick={() => { setShowAchievements(true); playClick(); }}
              className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="text-xl">🏅</span> Succès
            </button>
          </div>
        </div>

        {/* Category Preview */}
        <div className="w-full max-w-2xl">
          <h3 className="text-white/40 text-sm font-medium mb-3 text-center">📂 Catégories disponibles</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {categories.map(cat => {
              const count = questions.filter(q => q.category === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-all cursor-default group"
                >
                  <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{cat.icon}</div>
                  <div className="text-white text-xs font-medium">{cat.name.split(' ').slice(1).join(' ')}</div>
                  <div className="text-white/30 text-[10px]">{count} Q</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Game modes preview */}
        <div className="w-full max-w-2xl mt-8">
          <h3 className="text-white/40 text-sm font-medium mb-3 text-center">🎯 Modes de jeu</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
              <div className="text-2xl mb-2">📝</div>
              <h4 className="text-white font-bold mb-1">Classique</h4>
              <p className="text-white/40 text-xs">Choisissez le nombre de questions, la catégorie et la difficulté. Prenez votre temps !</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20">
              <div className="text-2xl mb-2">💀</div>
              <h4 className="text-white font-bold mb-1">Survie</h4>
              <p className="text-white/40 text-xs">3 vies seulement ! Chaque erreur vous rapproche de la fin. Combien de questions survivrez-vous ?</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
              <div className="text-2xl mb-2">⚡</div>
              <h4 className="text-white font-bold mb-1">Blitz</h4>
              <p className="text-white/40 text-xs">90 secondes pour répondre à un maximum de questions ! Vitesse et précision !</p>
            </div>
          </div>
        </div>

        {/* Features highlight */}
        <div className="w-full max-w-2xl mt-8 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { icon: '🔥', label: 'Combos & Séries' },
              { icon: '✂️', label: '50/50 & Jokers' },
              { icon: '❄️', label: 'Gel du Temps' },
              { icon: '🎵', label: 'Effets Sonores' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-lg">{f.icon}</span>
                <span className="text-white/50 text-xs">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSetup(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg">
            {renderSetupPanel()}
          </div>
        </div>
      )}
    </div>
  );
}
