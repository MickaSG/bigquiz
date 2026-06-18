import { useState, useEffect, useCallback, useRef } from 'react';
import { questions, categories } from './data/questions';
import { Player, LeaderboardEntry, GameState } from './types/game';
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
import { HangmanGame } from './components/HangmanGame';

const DEFAULT_TIME = 20;
const BLITZ_TIME = 90;
const QUESTIONS_PER_ROUND = 20;

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
    lifelines: { fiftyFifty: 2, skipQuestion: 2, doublePoints: 1, freezeTime: 1, spy: 1, shield: 1, secondChance: 1, publicVote: 1 },
    achievements: [],
    categoryScores: {},
    lastPlayed: Date.now(),
  };
}

export default function App() {
  const [leaderboard, setLeaderboard] = useLocalStorage<LeaderboardEntry[]>('quiz_leaderboard', []);

  const [gameState, setGameState] = useState<GameState>({
    mode: 'menu',
    currentQuestion: 0, questions: [], selectedCategory: null, selectedDifficulty: 'all',
    timeLeft: DEFAULT_TIME, isTimerActive: false, isPaused: false,
    showAnswer: false, selectedAnswer: null,
    currentPlayer: createPlayer('Joueur', '🧠'),
    doublePointsActive: false, freezeTimeActive: false, comboMultiplier: 1,
    totalQuestions: QUESTIONS_PER_ROUND, questionsPerRound: QUESTIONS_PER_ROUND,
    survivalLives: 3, blitzTimeTotal: BLITZ_TIME,
  });

  const [selectedPlayerIdx, setSelectedPlayerIdx] = useState(0);
  const [gameType, setGameType] = useState<'quiz' | 'pendu'>('quiz');
  const [playingHangman, setPlayingHangman] = useState(false);
  const [hangmanLeaderboardOnly, setHangmanLeaderboardOnly] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [setupMode, setSetupMode] = useState<'classique' | 'survie' | 'blitz'>('classique');
  const [selectedSetupCategories, setSelectedSetupCategories] = useState<string[]>([]);
  const [selectedSetupDifficulty, setSelectedSetupDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [questionsCount, setQuestionsCount] = useState(20);
  const [scorePopup, setScorePopup] = useState<{points: number, x: number, y: number} | null>(null);
  const [lastGameMode, setLastGameMode] = useState<string>('classique');
  const [spyReveal, setSpyReveal] = useState<number | null>(null);
  const [shieldActive, setShieldActive] = useState(false);
  const [secondChanceActive, setSecondChanceActive] = useState(false);
  const [secondChanceUsedThisQ, setSecondChanceUsedThisQ] = useState(false);
  const [publicVoteData, setPublicVoteData] = useState<number[] | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { playCorrect, playWrong, playClick, playTick, playStreak, playGameOver } = useSound();
  const { fire, fireStars } = useConfetti();

  // Dedup leaderboard on load
  useEffect(() => {
    setLeaderboard(prev => {
      const deduped = new Map<string, LeaderboardEntry>();
      for (const e of prev) {
        const key = `${e.name}__${e.mode}`;
        const existing = deduped.get(key);
        if (!existing || e.score > existing.score) deduped.set(key, e);
      }
      const result = Array.from(deduped.values()).sort((a, b) => b.score - a.score);
      if (result.length === prev.length && result.every((r, i) => r === prev[i])) return prev;
      return result;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer
  useEffect(() => {
    if (gameState.isTimerActive && !gameState.isPaused && !gameState.showAnswer) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (prev.freezeTimeActive) return prev;
          const newTime = prev.timeLeft - 1;
          if (newTime <= 5 && newTime > 0) playTick();
          if (newTime <= 0) {
            if (prev.mode === 'blitz') return { ...prev, timeLeft: 0, isTimerActive: false };
            return { ...prev, timeLeft: 0, showAnswer: true, isTimerActive: false, selectedAnswer: -1 };
          }
          return { ...prev, timeLeft: newTime };
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.isTimerActive, gameState.isPaused, gameState.showAnswer, gameState.freezeTimeActive, playTick]);

  useEffect(() => {
    if (gameState.mode === 'blitz' && gameState.timeLeft <= 0 && !gameState.isTimerActive && !gameState.showAnswer) endGame();
  }, [gameState.timeLeft, gameState.mode, gameState.isTimerActive, gameState.showAnswer]);

  useEffect(() => {
    if (gameState.showAnswer) {
      const timeout = setTimeout(() => nextQuestion(), 2000);
      return () => clearTimeout(timeout);
    }
  }, [gameState.showAnswer]);

  const startGame = useCallback((mode: 'classique' | 'survie' | 'blitz', cats: string[], diff: 'all' | 'easy' | 'medium' | 'hard', count: number) => {
    let filtered = questions.filter(q => {
      if (cats.length > 0 && !cats.includes(q.category)) return false;
      if (diff !== 'all' && q.difficulty !== diff) return false;
      return true;
    });
    filtered = shuffleArray(filtered);
    const total = mode === 'survie' ? filtered.length : Math.min(count, filtered.length);
    const questionIds = filtered.slice(0, total).map(q => q.id);

    const p = PLAYERS[selectedPlayerIdx];
    const player = createPlayer(p.name, p.avatar);

    setHiddenOptions([]);
    setLastGameMode(mode);
    setGameState({
      mode: mode === 'classique' ? 'playing' : mode === 'survie' ? 'survival' : 'blitz',
      currentQuestion: 0, questions: questionIds,
      selectedCategory: null, selectedDifficulty: diff,
      timeLeft: mode === 'blitz' ? BLITZ_TIME : DEFAULT_TIME,
      isTimerActive: true, isPaused: false, showAnswer: false, selectedAnswer: null,
      currentPlayer: player,
      doublePointsActive: false, freezeTimeActive: false, comboMultiplier: 1,
      totalQuestions: questionIds.length, questionsPerRound: count,
      survivalLives: 3, blitzTimeTotal: BLITZ_TIME,
    });
    setShowSetup(false);
    playClick();
  }, [selectedPlayerIdx, playClick]);

  const handleAnswer = useCallback((index: number) => {
    if (gameState.showAnswer) return;
    const currentQ = questions.find(q => q.id === gameState.questions[gameState.currentQuestion]);
    if (!currentQ) return;

    const isCorrect = index === currentQ.correct;

    // Seconde chance : si actif et faux, on consomme la seconde chance au lieu de valider
    if (!isCorrect && secondChanceActive && !secondChanceUsedThisQ) {
      setSecondChanceUsedThisQ(true);
      setSecondChanceActive(false);
      setHiddenOptions(prev => [...prev, index]); // grise la mauvaise réponse
      playWrong();
      return; // ne valide pas, le joueur peut réessayer
    }

    const timeBonus = Math.max(0, Math.floor(gameState.timeLeft * 2));
    const difficultyBonus = currentQ.difficulty === 'easy' ? 100 : currentQ.difficulty === 'medium' ? 200 : 300;

    setGameState(prev => {
      // Shield : protège le streak si faux
      const newStreak = isCorrect ? prev.currentPlayer.streak + 1 : (shieldActive ? prev.currentPlayer.streak : 0);
      const newMaxStreak = Math.max(prev.currentPlayer.maxStreak, newStreak);
      const combo = isCorrect ? Math.min(1 + (newStreak - 1) * 0.1, 3) : 1;
      const basePoints = isCorrect ? difficultyBonus : 0;
      const totalPoints = isCorrect ? Math.floor((basePoints + timeBonus) * combo * (prev.doublePointsActive ? 2 : 1)) : 0;

      if (isCorrect && totalPoints > 0) {
        setScorePopup({ points: totalPoints, x: 50, y: 30 });
        setTimeout(() => setScorePopup(null), 1500);
      }

      const newLives = !isCorrect && prev.mode === 'survival' ? prev.survivalLives - 1 : prev.survivalLives;

      return {
        ...prev, showAnswer: true, selectedAnswer: index, isTimerActive: false,
        comboMultiplier: combo, survivalLives: newLives,
        currentPlayer: {
          ...prev.currentPlayer,
          score: prev.currentPlayer.score + totalPoints,
          streak: newStreak, maxStreak: newMaxStreak,
          totalCorrect: prev.currentPlayer.totalCorrect + (isCorrect ? 1 : 0),
          totalAnswered: prev.currentPlayer.totalAnswered + 1,
          timeBonus: prev.currentPlayer.timeBonus + (isCorrect ? timeBonus : 0),
        },
      };
    });

    if (!isCorrect && shieldActive) setShieldActive(false); // consomme le shield
    setSpyReveal(null);
    setPublicVoteData(null);

    if (isCorrect) {
      playCorrect();
      const newStreak = gameState.currentPlayer.streak + 1;
      if (newStreak % 5 === 0) {
        playStreak(newStreak);
        fire();
        // 🎁 Recharge : +1 power-up aléatoire tous les 5 streak
        const powerUpKeys: (keyof Player['lifelines'])[] = ['fiftyFifty', 'skipQuestion', 'doublePoints', 'freezeTime', 'spy', 'shield', 'secondChance', 'publicVote'];
        const randomPU = powerUpKeys[Math.floor(Math.random() * powerUpKeys.length)];
        setGameState(prev => ({
          ...prev,
          currentPlayer: {
            ...prev.currentPlayer,
            lifelines: { ...prev.currentPlayer.lifelines, [randomPU]: prev.currentPlayer.lifelines[randomPU] + 1 }
          }
        }));
        setScorePopup({ points: 0, x: 50, y: 50 }); // will show power-up gain
      }
      if (newStreak === 10) fireStars();
    } else {
      playWrong();
    }
  }, [gameState, secondChanceActive, secondChanceUsedThisQ, shieldActive, playCorrect, playWrong, playStreak, fire, fireStars]);

  const nextQuestion = useCallback(() => {
    setSpyReveal(null);
    setPublicVoteData(null);
    setSecondChanceUsedThisQ(false);
    setGameState(prev => {
      if (prev.mode === 'survival' && prev.survivalLives <= 0) return { ...prev, mode: 'results' as any };
      if (prev.currentQuestion >= prev.questions.length - 1) return { ...prev, mode: 'results' as any };
      setHiddenOptions([]);
      return {
        ...prev, currentQuestion: prev.currentQuestion + 1,
        showAnswer: false, selectedAnswer: null,
        timeLeft: prev.mode === 'blitz' ? prev.timeLeft : DEFAULT_TIME,
        isTimerActive: true, doublePointsActive: false, freezeTimeActive: false,
      };
    });
  }, []);

  const endGame = useCallback(() => {
    setGameState(prev => ({ ...prev, mode: 'results' as any, isTimerActive: false }));
  }, []);

  // Save to leaderboard on results
  useEffect(() => {
    if (gameState.mode === 'results') {
      playGameOver();
      const p = gameState.currentPlayer;
      const entry: LeaderboardEntry = {
        name: p.name, avatar: p.avatar, score: p.score,
        totalCorrect: p.totalCorrect, totalAnswered: p.totalAnswered,
        streak: p.maxStreak, date: new Date().toISOString(), mode: lastGameMode,
      };
      setLeaderboard(prev => {
        const existingIdx = prev.findIndex(e => e.name === entry.name && e.mode === entry.mode);
        let newList;
        if (existingIdx >= 0) {
          if (entry.score > prev[existingIdx].score) { newList = [...prev]; newList[existingIdx] = entry; }
          else { newList = prev; }
        } else { newList = [...prev, entry]; }
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
    setGameState(prev => ({ ...prev, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, fiftyFifty: prev.currentPlayer.lifelines.fiftyFifty - 1 } } }));
    playClick();
  }, [gameState, playClick]);

  const useSkipQuestion = useCallback(() => {
    if (gameState.currentPlayer.lifelines.skipQuestion <= 0 || gameState.showAnswer) return;
    setGameState(prev => ({ ...prev, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, skipQuestion: prev.currentPlayer.lifelines.skipQuestion - 1 } } }));
    setHiddenOptions([]);
    nextQuestion();
    playClick();
  }, [gameState, nextQuestion, playClick]);

  const useDoublePoints = useCallback(() => {
    if (gameState.currentPlayer.lifelines.doublePoints <= 0 || gameState.showAnswer || gameState.doublePointsActive) return;
    setGameState(prev => ({ ...prev, doublePointsActive: true, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, doublePoints: prev.currentPlayer.lifelines.doublePoints - 1 } } }));
    playClick();
  }, [gameState, playClick]);

  const useFreezeTime = useCallback(() => {
    if (gameState.currentPlayer.lifelines.freezeTime <= 0 || gameState.showAnswer || gameState.freezeTimeActive) return;
    setGameState(prev => ({ ...prev, freezeTimeActive: true, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, freezeTime: prev.currentPlayer.lifelines.freezeTime - 1 } } }));
    playClick();
  }, [gameState, playClick]);

  // 👁️ Spy: flash correct answer for 1 second
  const useSpy = useCallback(() => {
    const q = questions.find(q2 => q2.id === gameState.questions[gameState.currentQuestion]);
    if (!q || gameState.currentPlayer.lifelines.spy <= 0 || gameState.showAnswer) return;
    setSpyReveal(q.correct);
    setTimeout(() => setSpyReveal(null), 1000);
    setGameState(prev => ({ ...prev, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, spy: prev.currentPlayer.lifelines.spy - 1 } } }));
    playClick();
  }, [gameState, playClick]);

  // 🛡️ Shield: protects streak on wrong answer
  const useShield = useCallback(() => {
    if (gameState.currentPlayer.lifelines.shield <= 0 || gameState.showAnswer || shieldActive) return;
    setShieldActive(true);
    setGameState(prev => ({ ...prev, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, shield: prev.currentPlayer.lifelines.shield - 1 } } }));
    playClick();
  }, [gameState, shieldActive, playClick]);

  // 🔄 Second chance: can retry if wrong
  const useSecondChance = useCallback(() => {
    if (gameState.currentPlayer.lifelines.secondChance <= 0 || gameState.showAnswer || secondChanceActive) return;
    setSecondChanceActive(true);
    setGameState(prev => ({ ...prev, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, secondChance: prev.currentPlayer.lifelines.secondChance - 1 } } }));
    playClick();
  }, [gameState, secondChanceActive, playClick]);

  // 📊 Public vote: show fake percentages
  const usePublicVote = useCallback(() => {
    const q = questions.find(q2 => q2.id === gameState.questions[gameState.currentQuestion]);
    if (!q || gameState.currentPlayer.lifelines.publicVote <= 0 || gameState.showAnswer) return;
    const votes = [0, 0, 0, 0];
    votes[q.correct] = 40 + Math.floor(Math.random() * 30); // correct: 40-70%
    let remaining = 100 - votes[q.correct];
    for (let i = 0; i < 4; i++) {
      if (i === q.correct) continue;
      const v = i < 3 ? Math.floor(Math.random() * remaining * 0.6) : remaining;
      votes[i] = Math.max(2, v);
      remaining -= votes[i];
    }
    // Ensure total = 100
    const total = votes.reduce((a, b) => a + b, 0);
    votes[q.correct] += 100 - total;
    setPublicVoteData(votes);
    setGameState(prev => ({ ...prev, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, publicVote: prev.currentPlayer.lifelines.publicVote - 1 } } }));
    playClick();
  }, [gameState, playClick]);

  const goToMenu = useCallback(() => {
    setGameState(prev => ({ ...prev, mode: 'menu', isTimerActive: false }));
    setShowSetup(false);
  }, []);

  const currentQ = gameState.questions.length > 0 ? questions.find(q => q.id === gameState.questions[gameState.currentQuestion]) : null;
  const currentCat = currentQ ? categories.find(c => c.id === currentQ.category) : null;

  // ============ PLAYING ============
  if ((gameState.mode === 'playing' || gameState.mode === 'survival' || gameState.mode === 'blitz') && currentQ) {
    return (
      <div className="min-h-screen bg-main relative overflow-hidden">
        {scorePopup && (
          <div className="fixed z-50 pointer-events-none animate-float-up" style={{ left: `${scorePopup.x}%`, top: `${scorePopup.y}%`, transform: 'translate(-50%, -50%)' }}>
            <span className="font-score text-3xl font-bold text-amber-400 drop-shadow-lg">+{scorePopup.points}</span>
          </div>
        )}
        <div className="relative z-10 p-4 pt-6">
          <QuizHeader score={gameState.currentPlayer.score} streak={gameState.currentPlayer.streak}
            questionNum={gameState.currentQuestion + 1} totalQuestions={gameState.totalQuestions}
            timeLeft={gameState.timeLeft} maxTime={gameState.mode === 'blitz' ? BLITZ_TIME : DEFAULT_TIME}
            category={currentCat?.name || ''} difficulty={currentQ.difficulty}
            comboMultiplier={gameState.comboMultiplier}
            lives={gameState.mode === 'survival' ? gameState.survivalLives : undefined}
            onPause={() => setGameState(prev => ({ ...prev, isPaused: true }))} onQuit={endGame}
            doubleActive={gameState.doublePointsActive} freezeActive={gameState.freezeTimeActive} />
          <QuestionCard question={currentQ} selectedAnswer={gameState.selectedAnswer}
            showAnswer={gameState.showAnswer} onAnswer={handleAnswer} hiddenOptions={hiddenOptions}
            spyReveal={spyReveal} publicVoteData={publicVoteData} />
          <Lifelines fiftyFifty={gameState.currentPlayer.lifelines.fiftyFifty}
            skipQuestion={gameState.currentPlayer.lifelines.skipQuestion}
            doublePoints={gameState.currentPlayer.lifelines.doublePoints}
            freezeTime={gameState.currentPlayer.lifelines.freezeTime}
            spy={gameState.currentPlayer.lifelines.spy}
            shield={gameState.currentPlayer.lifelines.shield}
            secondChance={gameState.currentPlayer.lifelines.secondChance}
            publicVote={gameState.currentPlayer.lifelines.publicVote}
            onFiftyFifty={useFiftyFifty} onSkip={useSkipQuestion} onDouble={useDoublePoints} onFreeze={useFreezeTime}
            onSpy={useSpy} onShield={useShield} onSecondChance={useSecondChance} onPublicVote={usePublicVote}
            disabled={gameState.showAnswer} doubleActive={gameState.doublePointsActive} freezeActive={gameState.freezeTimeActive}
            shieldActive={shieldActive} secondChanceActive={secondChanceActive} />
        </div>
        {gameState.isPaused && <PauseModal onResume={() => setGameState(prev => ({ ...prev, isPaused: false }))} onQuit={endGame} />}
      </div>
    );
  }

  // ============ RESULTS ============
  if (gameState.mode === 'results') {
    return (
      <div className="min-h-screen bg-main relative">
        <ResultsScreen player={gameState.currentPlayer} mode={lastGameMode}
          onPlayAgain={() => setShowSetup(true)} onMenu={goToMenu} newAchievements={[]} />
        {showSetup && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSetup(false)}>
            <div onClick={e => e.stopPropagation()} className="w-full max-w-lg">{renderSetupPanel()}</div>
          </div>
        )}
      </div>
    );
  }

  // ============ LEADERBOARD ============
  if (gameState.mode === 'leaderboard') {
    return (
      <div className="min-h-screen bg-main relative">
        <Leaderboard entries={leaderboard} onBack={goToMenu} onClear={() => { setLeaderboard([]); playClick(); }} />
      </div>
    );
  }

  // ============ SETUP PANEL ============
  function renderSetupPanel() {
    const availableCount = questions.filter(q => {
      if (selectedSetupCategories.length > 0 && !selectedSetupCategories.includes(q.category)) return false;
      if (selectedSetupDifficulty !== 'all' && q.difficulty !== selectedSetupDifficulty) return false;
      return true;
    }).length;

    const toggleCategory = (catId: string) => {
      setSelectedSetupCategories(prev =>
        prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
      );
    };

    return (
      <div className="glow-panel rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Mode */}
        <div className="mb-5">
          <label className="text-white/50 text-sm font-semibold mb-2 block">Mode de jeu</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'classique' as const, icon: '🎯', name: 'Classique', desc: 'Standard' },
              { id: 'survie' as const, icon: '💀', name: 'Survie', desc: '3 vies' },
              { id: 'blitz' as const, icon: '⚡', name: 'Blitz', desc: '90 sec' },
            ].map(m => (
              <button key={m.id} onClick={() => setSetupMode(m.id)}
                className={`p-3 rounded-xl text-center transition-all border-2 ${setupMode === m.id ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <div className="text-2xl mb-1">{m.icon}</div>
                <div className="text-white text-sm font-bold">{m.name}</div>
                <div className="text-white/40 text-[11px]">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Categories - MULTI-SELECT */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/50 text-sm font-semibold">Catégories</label>
            <button onClick={() => setSelectedSetupCategories([])} className="text-xs text-white/30 hover:text-white/60 transition-all">
              {selectedSetupCategories.length === 0 ? '✓ Toutes' : 'Tout sélectionner'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => {
              const isSelected = selectedSetupCategories.includes(cat.id);
              const isAllSelected = selectedSetupCategories.length === 0;
              return (
                <button key={cat.id} onClick={() => toggleCategory(cat.id)}
                  className={`p-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
                    isSelected ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' :
                    isAllSelected ? 'bg-green-500/10 text-green-300/80 border border-green-500/20' :
                    'glass-panel text-white/40'
                  }`}>
                  {cat.icon} {cat.name.split(' ').slice(1).join(' ')}
                </button>
              );
            })}
          </div>
          {selectedSetupCategories.length === 0 && (
            <p className="text-green-400/60 text-xs mt-1.5 text-center">✓ Toutes les catégories sélectionnées</p>
          )}
          {selectedSetupCategories.length > 0 && (
            <p className="text-pink-400/60 text-xs mt-1.5 text-center">{selectedSetupCategories.length} catégorie{selectedSetupCategories.length > 1 ? 's' : ''} sélectionnée{selectedSetupCategories.length > 1 ? 's' : ''}</p>
          )}
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
              <button key={d.id} onClick={() => setSelectedSetupDifficulty(d.id)}
                className={`p-2 rounded-lg text-center transition-all ${selectedSetupDifficulty === d.id ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'glass-panel text-white/60'}`}>
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
            <input type="range" min={5} max={availableCount} value={Math.min(questionsCount, availableCount)}
              onChange={e => setQuestionsCount(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between text-xs text-white/30 mt-1">
              <span>5</span><span>{availableCount} disponibles</span>
            </div>
          </div>
        )}

        <button onClick={() => startGame(setupMode, selectedSetupCategories, selectedSetupDifficulty, questionsCount)}
          disabled={availableCount === 0} className="btn-primary w-full py-4 rounded-xl text-base disabled:opacity-40">
          🚀 Lancer ({availableCount} questions)
        </button>
        <button onClick={() => setShowSetup(false)} className="btn-secondary w-full mt-3 py-3 rounded-xl text-sm">Annuler</button>
      </div>
    );
  }

  // ============ HANGMAN ============
  if (playingHangman) {
    const p = PLAYERS[selectedPlayerIdx];
    return <HangmanGame playerName={p.name} playerAvatar={p.avatar}
      onMenu={() => { setPlayingHangman(false); setHangmanLeaderboardOnly(false); }}
      showLeaderboardOnly={hangmanLeaderboardOnly} />;
  }

  // ============ MAIN SCREEN ============
  return (
    <>
      <PlayerSelect
        onSelect={(idx) => {
          setSelectedPlayerIdx(idx);
          if (gameType === 'pendu') setPlayingHangman(true);
          else setShowSetup(true);
          playClick();
        }}
        onLeaderboard={() => {
          if (gameType === 'quiz') {
            setGameState(prev => ({ ...prev, mode: 'leaderboard' }));
          } else {
            setHangmanLeaderboardOnly(true);
            setPlayingHangman(true);
          }
          playClick();
        }}
        gameType={gameType}
        onToggleGameType={() => { setGameType(prev => prev === 'quiz' ? 'pendu' : 'quiz'); playClick(); }}
      />
      {showSetup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSetup(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg">{renderSetupPanel()}</div>
        </div>
      )}
    </>
  );
}
