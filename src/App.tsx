import { useState, useEffect, useCallback, useRef } from 'react';
import { questions, categories } from './data/questions';
import { Player, LeaderboardEntry, ACHIEVEMENTS, GameState } from './types/game';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSound } from './hooks/useSound';
import { useConfetti } from './hooks/useConfetti';
import { QuizHeader } from './components/QuizHeader';
import { QuestionCard } from './components/QuestionCard';
import { Lifelines } from './components/Lifelines';
import { Leaderboard } from './components/Leaderboard';
import { ResultsScreen } from './components/ResultsScreen';
import { PauseModal } from './components/PauseModal';
import { PlayerSelect } from './components/PlayerSelect';

const DEFAULT_TIME = 20;
const BLITZ_TIME = 90;
const QUESTIONS_PER_ROUND = 20;

// Joueurs prédéfinis
const PLAYERS = [
  { name: 'Micka', avatar: '🧠' },
  { name: 'Pres', avatar: '🦊' },
  { name: 'Bryan', avatar: '🐲' },
];

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

  const [selectedPlayerIdx, setSelectedPlayerIdx] = useState(0);
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

  // Nettoie les doublons du leaderboard au chargement (garde le meilleur score par joueur+mode)
  useEffect(() => {
    setLeaderboard(prev => {
      const deduped = new Map<string, LeaderboardEntry>();
      for (const e of prev) {
        const key = `${e.name}__${e.mode}`;
        const existing = deduped.get(key);
        if (!existing || e.score > existing.score) {
          deduped.set(key, e);
        }
      }
      const result = Array.from(deduped.values()).sort((a, b) => b.score - a.score);
      // Vérifie si on a vraiment fait un changement
      if (result.length === prev.length && result.every((r, i) => r === prev[i])) return prev;
      return result;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    const p = PLAYERS[selectedPlayerIdx];
    const player = createPlayer(p.name, p.avatar);

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
  }, [selectedPlayerIdx, playClick]);

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

      // Save to leaderboard - garde uniquement le MEILLEUR score par joueur+mode
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
      setLeaderboard(prev => {
        // Cherche si ce joueur a déjà un score dans ce mode
        const existingIdx = prev.findIndex(e => e.name === entry.name && e.mode === entry.mode);
        let newList;
        if (existingIdx >= 0) {
          // Remplace seulement si le nouveau score est MEILLEUR
          if (entry.score > prev[existingIdx].score) {
            newList = [...prev];
            newList[existingIdx] = entry;
          } else {
            newList = prev; // Garde l'ancien meilleur score
          }
        } else {
          newList = [...prev, entry]; // Premier score pour ce joueur/mode
        }
        return newList.sort((a, b) => b.score - a.score);
      });
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
      <div className="min-h-screen bg-main relative overflow-hidden">
        {/* Score popup */}
        {scorePopup && (
          <div className="fixed z-50 pointer-events-none animate-float-up" style={{ left: `${scorePopup.x}%`, top: `${scorePopup.y}%`, transform: 'translate(-50%, -50%)' }}>
            <span className="font-score text-3xl font-bold text-amber-400 drop-shadow-lg">+{scorePopup.points}</span>
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
      <div className="min-h-screen bg-main relative">
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
      <div className="min-h-screen bg-main relative">
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
      <div className="min-h-screen bg-main p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setShowAchievements(false)} className="btn-secondary !py-2 !px-3 rounded-lg text-xs">◄ Retour</button>
            <h1 className="font-title text-2xl text-white flex items-center gap-2">🏅 Succès</h1>
            <div className="text-white/40 text-sm font-bold">{allAchievements.length}/{ACHIEVEMENTS.length}</div>
          </div>

          <div className="grid gap-2">
            {ACHIEVEMENTS.map(ach => {
              const unlocked = allAchievements.includes(ach.id);
              return (
                <div key={ach.id} className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                  unlocked ? 'glow-panel !border-amber-500/30' : 'glass-panel opacity-50'
                }`}>
                  <span className="text-3xl">{unlocked ? ach.icon : '🔒'}</span>
                  <div className="flex-1">
                    <div className={`font-bold ${unlocked ? 'text-amber-400' : 'text-white/50'}`}>{ach.name}</div>
                    <div className="text-white/40 text-sm">{ach.desc}</div>
                  </div>
                  {unlocked && <span className="text-green-400 text-xl">✓</span>}
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
      <div className="glow-panel rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-title text-2xl text-white text-center mb-6">⚙️ Configuration</h2>

        {/* Mode */}
        <div className="mb-5">
          <label className="text-white/50 text-sm font-semibold mb-2 block">Mode de jeu</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'classique' as const, icon: '🎯', name: 'Classique', desc: 'Standard' },
              { id: 'survie' as const, icon: '💀', name: 'Survie', desc: '3 vies' },
              { id: 'blitz' as const, icon: '⚡', name: 'Blitz', desc: '90 sec' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setSetupMode(m.id)}
                className={`p-3 rounded-xl text-center transition-all border-2 ${
                  setupMode === m.id ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="text-2xl mb-1">{m.icon}</div>
                <div className="text-white text-sm font-bold">{m.name}</div>
                <div className="text-white/40 text-[11px]">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="mb-5">
          <label className="text-white/50 text-sm font-semibold mb-2 block">Catégorie</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedSetupCategory(null)}
              className={`p-2.5 rounded-lg text-sm font-semibold transition-all ${
                !selectedSetupCategory ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'glass-panel text-white/60'
              }`}
            >
              🌐 Toutes
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedSetupCategory(cat.id)}
                className={`p-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
                  selectedSetupCategory === cat.id ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'glass-panel text-white/60'
                }`}
              >
                {cat.icon} {cat.name.split(' ').slice(1).join(' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-5">
          <label className="text-white/50 text-sm font-semibold mb-2 block">Difficulté</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'all' as const, label: 'Toutes', emoji: '🌐' },
              { id: 'easy' as const, label: 'Facile', emoji: '🟢' },
              { id: 'medium' as const, label: 'Moyen', emoji: '🟡' },
              { id: 'hard' as const, label: 'Dur', emoji: '🔴' },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedSetupDifficulty(d.id)}
                className={`p-2 rounded-lg text-center transition-all ${
                  selectedSetupDifficulty === d.id ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'glass-panel text-white/60'
                }`}
              >
                <div className="text-base">{d.emoji}</div>
                <div className="text-[11px] font-semibold">{d.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Question count */}
        {setupMode === 'classique' && (
          <div className="mb-5">
            <label className="text-white/50 text-sm font-semibold mb-2 block">
              Questions : <span className="text-pink-400">{questionsCount}</span>
            </label>
            <input
              type="range"
              min={5}
              max={Math.min(50, availableCount)}
              value={questionsCount}
              onChange={e => setQuestionsCount(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/30 mt-1">
              <span>5</span>
              <span>{availableCount} disponibles</span>
            </div>
          </div>
        )}

        <button
          onClick={() => startGame(setupMode, selectedSetupCategory, selectedSetupDifficulty, questionsCount)}
          disabled={availableCount === 0}
          className="btn-primary w-full py-4 rounded-xl text-base disabled:opacity-40"
        >
          🚀 Lancer ({availableCount} questions)
        </button>

        <button
          onClick={() => setShowSetup(false)}
          className="btn-secondary w-full mt-3 py-3 rounded-xl text-sm"
        >
          Annuler
        </button>
      </div>
    );
  }

  // ============ MAIN SCREEN : PLAYER SELECT ============
  return (
    <>
      <PlayerSelect
        onSelect={(idx) => { setSelectedPlayerIdx(idx); setShowSetup(true); playClick(); }}
        onLeaderboard={() => { setGameState(prev => ({ ...prev, mode: 'leaderboard' })); playClick(); }}
        onAchievements={() => { setShowAchievements(true); playClick(); }}
      />

      {/* Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSetup(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg">
            {renderSetupPanel()}
          </div>
        </div>
      )}
    </>
  );
}
