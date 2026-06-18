import { useState, useEffect, useCallback, useRef } from 'react';
import { questions, categories } from './data/questions';
import { Player, GameState, PlayerProfile, PlayerLifelines, getRank, defaultProfile } from './types/game';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSound } from './hooks/useSound';
import { useConfetti } from './hooks/useConfetti';
import { QuizHeader } from './components/QuizHeader';
import { QuestionCard } from './components/QuestionCard';
import { Lifelines } from './components/Lifelines';
import { ResultsScreen } from './components/ResultsScreen';
import { PauseModal } from './components/PauseModal';
import { PlayerSelect } from './components/PlayerSelect';
import { HangmanGame } from './components/HangmanGame';
import { FortuneWheel } from './components/FortuneWheel';

const DEFAULT_TIME = 20;
const BLITZ_TIME = 90;

const PLAYERS_DEF = [
  { name: 'Micka', avatar: '🧠' },
  { name: 'Pres', avatar: '🦊' },
  { name: 'Bryan', avatar: '🐲' },
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a;
}

function createPlayer(profile: PlayerProfile): Player {
  return {
    id: Date.now().toString(), name: profile.name, avatar: profile.avatar,
    score: 0, streak: 0, maxStreak: 0, totalCorrect: 0, totalAnswered: 0, timeBonus: 0,
    lifelines: { ...profile.lifelines },
    achievements: [], categoryScores: {}, lastPlayed: Date.now(),
  };
}

export default function App() {
  const [profiles, setProfiles] = useLocalStorage<PlayerProfile[]>('player_profiles_v2',
    PLAYERS_DEF.map(p => defaultProfile(p.name, p.avatar))
  );

  const [gameState, setGameState] = useState<GameState>({
    mode: 'menu', currentQuestion: 0, questions: [], selectedCategory: null, selectedDifficulty: 'all',
    timeLeft: DEFAULT_TIME, isTimerActive: false, isPaused: false, showAnswer: false, selectedAnswer: null,
    currentPlayer: createPlayer(profiles[0]),
    doublePointsActive: false, freezeTimeActive: false, comboMultiplier: 1,
    totalQuestions: 20, questionsPerRound: 20, survivalLives: 3, blitzTimeTotal: BLITZ_TIME,
  });

  const [selectedPlayerIdx, setSelectedPlayerIdx] = useState(0);
  const [gameType, setGameType] = useState<'quiz' | 'pendu'>('quiz');
  const [playingHangman, setPlayingHangman] = useState(false);
  const [hangmanLeaderboardOnly, setHangmanLeaderboardOnly] = useState(false);
  const [hangmanMode, setHangmanMode] = useState<'normal' | 'chrono' | 'mystery'>('normal');
  const [hangmanCategory, setHangmanCategory] = useState<string | null>(null);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [setupMode, setSetupMode] = useState<'classique' | 'survie' | 'blitz' | 'random'>('classique');
  const [selectedSetupCategories, setSelectedSetupCategories] = useState<string[]>([]);
  const [selectedSetupDifficulty, setSelectedSetupDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [questionsCount, setQuestionsCount] = useState(20);
  const [scorePopup, setScorePopup] = useState<{ points: number; x: number; y: number } | null>(null);
  const [lastGameMode, setLastGameMode] = useState<string>('classique');
  const [spyReveal, setSpyReveal] = useState<number | null>(null);
  const [shieldActive, setShieldActive] = useState(false);
  const [secondChanceActive, setSecondChanceActive] = useState(false);
  const [secondChanceUsedThisQ, setSecondChanceUsedThisQ] = useState(false);
  const [publicVoteData, setPublicVoteData] = useState<number[] | null>(null);
  const [showFortuneWheel, setShowFortuneWheel] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardPlayerIdx, setDashboardPlayerIdx] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { playCorrect, playWrong, playClick, playTick, playStreak, playGameOver } = useSound();
  const { fire, fireStars } = useConfetti();

  // Timer
  useEffect(() => {
    if (gameState.isTimerActive && !gameState.isPaused && !gameState.showAnswer) {
      timerRef.current = setInterval(() => {
        setGameState(prev => {
          if (prev.freezeTimeActive) return prev;
          const nt = prev.timeLeft - 1;
          if (nt <= 5 && nt > 0) playTick();
          if (nt <= 0) {
            if (prev.mode === 'blitz') return { ...prev, timeLeft: 0, isTimerActive: false };
            return { ...prev, timeLeft: 0, showAnswer: true, isTimerActive: false, selectedAnswer: -1 };
          }
          return { ...prev, timeLeft: nt };
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.isTimerActive, gameState.isPaused, gameState.showAnswer, gameState.freezeTimeActive, playTick]);

  useEffect(() => { if (gameState.mode === 'blitz' && gameState.timeLeft <= 0 && !gameState.isTimerActive && !gameState.showAnswer) endGame(); }, [gameState.timeLeft, gameState.mode, gameState.isTimerActive, gameState.showAnswer]);
  useEffect(() => { if (gameState.showAnswer) { const t = setTimeout(() => nextQuestion(), 2000); return () => clearTimeout(t); } }, [gameState.showAnswer]);

  const getFilteredQuestions = useCallback((cats: string[], diff: 'all' | 'easy' | 'medium' | 'hard', isRandom: boolean) => {
    return questions.filter(q => {
      if (!isRandom && cats.length > 0 && !cats.includes(q.category)) return false;
      if (!isRandom && diff !== 'all' && q.difficulty !== diff) return false;
      return true;
    });
  }, []);

  const startGame = useCallback((mode: 'classique' | 'survie' | 'blitz' | 'random', cats: string[], diff: 'all' | 'easy' | 'medium' | 'hard', count: number) => {
    const filtered = shuffleArray(getFilteredQuestions(cats, diff, mode === 'random'));
    const total = (mode === 'survie' || mode === 'random') ? Math.min(count, filtered.length) : Math.min(count, filtered.length);
    const questionIds = filtered.slice(0, total).map(q => q.id);
    const player = createPlayer(profiles[selectedPlayerIdx]);
    setHiddenOptions([]); setSpyReveal(null); setPublicVoteData(null);
    setShieldActive(false); setSecondChanceActive(false); setSecondChanceUsedThisQ(false);
    setLastGameMode(mode === 'random' ? 'aléatoire' : mode);
    setGameState({
      mode: mode === 'classique' ? 'playing' : mode === 'survie' ? 'survival' : mode === 'random' ? 'random' : 'blitz',
      currentQuestion: 0, questions: questionIds, selectedCategory: null, selectedDifficulty: diff,
      timeLeft: mode === 'blitz' ? BLITZ_TIME : DEFAULT_TIME,
      isTimerActive: true, isPaused: false, showAnswer: false, selectedAnswer: null, currentPlayer: player,
      doublePointsActive: false, freezeTimeActive: false, comboMultiplier: 1,
      totalQuestions: questionIds.length, questionsPerRound: count, survivalLives: 3, blitzTimeTotal: BLITZ_TIME,
    });
    setShowSetup(false); playClick();
  }, [selectedPlayerIdx, profiles, playClick, getFilteredQuestions]);

  const handleAnswer = useCallback((index: number) => {
    if (gameState.showAnswer) return;
    const cq = questions.find(q => q.id === gameState.questions[gameState.currentQuestion]);
    if (!cq) return;
    const isCorrect = index === cq.correct;
    if (!isCorrect && secondChanceActive && !secondChanceUsedThisQ) {
      setSecondChanceUsedThisQ(true); setSecondChanceActive(false);
      setHiddenOptions(prev => [...prev, index]); playWrong(); return;
    }
    const timeBonus = Math.max(0, Math.floor(gameState.timeLeft * 2));
    const db = cq.difficulty === 'easy' ? 100 : cq.difficulty === 'medium' ? 200 : 300;
    setGameState(prev => {
      const ns = isCorrect ? prev.currentPlayer.streak + 1 : (shieldActive ? prev.currentPlayer.streak : 0);
      const nms = Math.max(prev.currentPlayer.maxStreak, ns);
      const combo = isCorrect ? Math.min(1 + (ns - 1) * 0.1, 3) : 1;
      const tp = isCorrect ? Math.floor((db + timeBonus) * combo * (prev.doublePointsActive ? 2 : 1)) : 0;
      if (isCorrect && tp > 0) { setScorePopup({ points: tp, x: 50, y: 30 }); setTimeout(() => setScorePopup(null), 1500); }
      const nl = !isCorrect && prev.mode === 'survival' ? prev.survivalLives - 1 : prev.survivalLives;
      return { ...prev, showAnswer: true, selectedAnswer: index, isTimerActive: false, comboMultiplier: combo, survivalLives: nl,
        currentPlayer: { ...prev.currentPlayer, score: prev.currentPlayer.score + tp, streak: ns, maxStreak: nms,
          totalCorrect: prev.currentPlayer.totalCorrect + (isCorrect ? 1 : 0), totalAnswered: prev.currentPlayer.totalAnswered + 1,
          timeBonus: prev.currentPlayer.timeBonus + (isCorrect ? timeBonus : 0) } };
    });
    if (!isCorrect && shieldActive) setShieldActive(false);
    setSpyReveal(null); setPublicVoteData(null);
    if (isCorrect) {
      playCorrect(); const ns = gameState.currentPlayer.streak + 1;
      if (ns % 5 === 0) { playStreak(ns); fire();
        const pks: (keyof PlayerLifelines)[] = ['fiftyFifty','skipQuestion','doublePoints','freezeTime','spy','shield','secondChance','publicVote'];
        const rk = pks[Math.floor(Math.random() * pks.length)];
        setGameState(prev => ({ ...prev, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, [rk]: prev.currentPlayer.lifelines[rk] + 1 } } }));
      }
      if (ns === 10) fireStars();
    } else playWrong();
  }, [gameState, secondChanceActive, secondChanceUsedThisQ, shieldActive, playCorrect, playWrong, playStreak, fire, fireStars]);

  const nextQuestion = useCallback(() => {
    setSpyReveal(null); setPublicVoteData(null); setSecondChanceUsedThisQ(false);
    setGameState(prev => {
      if (prev.mode === 'survival' && prev.survivalLives <= 0) return { ...prev, mode: 'results' as any };
      if (prev.currentQuestion >= prev.questions.length - 1) return { ...prev, mode: 'results' as any };
      setHiddenOptions([]);
      return { ...prev, currentQuestion: prev.currentQuestion + 1, showAnswer: false, selectedAnswer: null,
        timeLeft: prev.mode === 'blitz' ? prev.timeLeft : DEFAULT_TIME, isTimerActive: true, doublePointsActive: false, freezeTimeActive: false };
    });
  }, []);

  const endGame = useCallback(() => { setGameState(prev => ({ ...prev, mode: 'results' as any, isTimerActive: false })); }, []);

  // Save results + update quiz profile + show fortune wheel
  useEffect(() => {
    if (gameState.mode === 'results') {
      playGameOver();
      const p = gameState.currentPlayer;
      // Update quiz profile - category stats tracked correctly
      setProfiles(prev => prev.map((pr, i) => {
        if (i !== selectedPlayerIdx) return pr;
        const catStats = { ...pr.quizCategoryStats };
        // Track which questions were answered correctly
        for (let qi = 0; qi < Math.min(p.totalAnswered, gameState.questions.length); qi++) {
          const q = questions.find(x => x.id === gameState.questions[qi]);
          if (q) {
            if (!catStats[q.category]) catStats[q.category] = { correct: 0, total: 0 };
            catStats[q.category].total++;
          }
        }
        // Distribute correct answers proportionally to categories answered
        const catKeys = Object.keys(catStats);
        const totalQsThisGame = catKeys.reduce((s, k) => {
          const prev2 = pr.quizCategoryStats[k];
          return s + (catStats[k].total - (prev2?.total || 0));
        }, 0);
        if (totalQsThisGame > 0 && p.totalCorrect > 0) {
          const correctRatio = p.totalCorrect / p.totalAnswered;
          catKeys.forEach(k => {
            const prev2 = pr.quizCategoryStats[k];
            const newQs = catStats[k].total - (prev2?.total || 0);
            if (newQs > 0) {
              catStats[k].correct = (prev2?.correct || 0) + Math.round(newQs * correctRatio);
            }
          });
        }
        return {
          ...pr,
          quizTotalScore: pr.quizTotalScore + p.score,
          quizGamesPlayed: pr.quizGamesPlayed + 1,
          quizTotalCorrect: pr.quizTotalCorrect + p.totalCorrect,
          quizTotalAnswered: pr.quizTotalAnswered + p.totalAnswered,
          quizBestStreak: Math.max(pr.quizBestStreak, p.maxStreak),
          lifelines: { ...p.lifelines },
          quizCategoryStats: catStats,
        };
      }));
      setTimeout(() => setShowFortuneWheel(true), 500);
    }
  }, [gameState.mode]);

  const handleFortuneWheelClose = useCallback((prize: Partial<PlayerLifelines> | null) => {
    setShowFortuneWheel(false);
    if (prize) {
      setProfiles(prev => prev.map((pr, i) => {
        if (i !== selectedPlayerIdx) return pr;
        const nl = { ...pr.lifelines };
        (Object.keys(prize) as (keyof PlayerLifelines)[]).forEach(k => { nl[k] = (nl[k] || 0) + (prize[k] || 0); });
        return { ...pr, lifelines: nl };
      }));
    }
  }, [selectedPlayerIdx, setProfiles]);

  // Hangman results callback
  const handleHangmanEnd = useCallback((score: number, wordsFound: number, bestStreak: number) => {
    setProfiles(prev => prev.map((pr, i) => {
      if (i !== selectedPlayerIdx) return pr;
      return {
        ...pr,
        penduTotalScore: pr.penduTotalScore + score,
        penduGamesPlayed: pr.penduGamesPlayed + 1,
        penduWordsFound: pr.penduWordsFound + wordsFound,
        penduBestStreak: Math.max(pr.penduBestStreak, bestStreak),
      };
    }));
    // Show fortune wheel for pendu too
    setTimeout(() => setShowFortuneWheel(true), 500);
  }, [selectedPlayerIdx, setProfiles]);

  // Lifelines
  const useFiftyFifty = useCallback(() => { const q = questions.find(x => x.id === gameState.questions[gameState.currentQuestion]); if (!q || gameState.currentPlayer.lifelines.fiftyFifty <= 0 || gameState.showAnswer) return; setHiddenOptions(shuffleArray([0,1,2,3].filter(i => i !== q.correct)).slice(0, 2)); setGameState(prev => ({ ...prev, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, fiftyFifty: prev.currentPlayer.lifelines.fiftyFifty - 1 } } })); playClick(); }, [gameState, playClick]);
  const useSkipQuestion = useCallback(() => { if (gameState.currentPlayer.lifelines.skipQuestion <= 0 || gameState.showAnswer) return; setGameState(prev => ({ ...prev, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, skipQuestion: prev.currentPlayer.lifelines.skipQuestion - 1 } } })); setHiddenOptions([]); nextQuestion(); playClick(); }, [gameState, nextQuestion, playClick]);
  const useDoublePoints = useCallback(() => { if (gameState.currentPlayer.lifelines.doublePoints <= 0 || gameState.showAnswer || gameState.doublePointsActive) return; setGameState(prev => ({ ...prev, doublePointsActive: true, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, doublePoints: prev.currentPlayer.lifelines.doublePoints - 1 } } })); playClick(); }, [gameState, playClick]);
  const useFreezeTime = useCallback(() => { if (gameState.currentPlayer.lifelines.freezeTime <= 0 || gameState.showAnswer || gameState.freezeTimeActive) return; setGameState(prev => ({ ...prev, freezeTimeActive: true, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, freezeTime: prev.currentPlayer.lifelines.freezeTime - 1 } } })); playClick(); }, [gameState, playClick]);
  const useSpy = useCallback(() => { const q = questions.find(x => x.id === gameState.questions[gameState.currentQuestion]); if (!q || gameState.currentPlayer.lifelines.spy <= 0 || gameState.showAnswer) return; setSpyReveal(q.correct); setTimeout(() => setSpyReveal(null), 1000); setGameState(prev => ({ ...prev, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, spy: prev.currentPlayer.lifelines.spy - 1 } } })); playClick(); }, [gameState, playClick]);
  const useShield = useCallback(() => { if (gameState.currentPlayer.lifelines.shield <= 0 || gameState.showAnswer || shieldActive) return; setShieldActive(true); setGameState(prev => ({ ...prev, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, shield: prev.currentPlayer.lifelines.shield - 1 } } })); playClick(); }, [gameState, shieldActive, playClick]);
  const useSecondChance = useCallback(() => { if (gameState.currentPlayer.lifelines.secondChance <= 0 || gameState.showAnswer || secondChanceActive) return; setSecondChanceActive(true); setGameState(prev => ({ ...prev, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, secondChance: prev.currentPlayer.lifelines.secondChance - 1 } } })); playClick(); }, [gameState, secondChanceActive, playClick]);
  const usePublicVote = useCallback(() => { const q = questions.find(x => x.id === gameState.questions[gameState.currentQuestion]); if (!q || gameState.currentPlayer.lifelines.publicVote <= 0 || gameState.showAnswer) return; const v = [0,0,0,0]; v[q.correct] = 40 + Math.floor(Math.random() * 30); let rem = 100 - v[q.correct]; for (let i = 0; i < 4; i++) { if (i === q.correct) continue; const x = i < 3 ? Math.floor(Math.random() * rem * 0.6) : rem; v[i] = Math.max(2, x); rem -= v[i]; } v[q.correct] += 100 - v.reduce((a,b)=>a+b,0); setPublicVoteData(v); setGameState(prev => ({ ...prev, currentPlayer: { ...prev.currentPlayer, lifelines: { ...prev.currentPlayer.lifelines, publicVote: prev.currentPlayer.lifelines.publicVote - 1 } } })); playClick(); }, [gameState, playClick]);

  const goToMenu = useCallback(() => { setGameState(prev => ({ ...prev, mode: 'menu', isTimerActive: false })); setShowSetup(false); setShowDashboard(false); }, []);

  const currentQ = gameState.questions.length > 0 ? questions.find(q => q.id === gameState.questions[gameState.currentQuestion]) : null;
  const currentCat = currentQ ? categories.find(c => c.id === currentQ.category) : null;

  // ============ PLAYING ============
  if ((gameState.mode === 'playing' || gameState.mode === 'survival' || gameState.mode === 'blitz' || gameState.mode === 'random') && currentQ) {
    return (
      <div className="min-h-screen bg-main relative overflow-hidden">
        {scorePopup && <div className="fixed z-50 pointer-events-none animate-float-up" style={{ left: `${scorePopup.x}%`, top: `${scorePopup.y}%`, transform: 'translate(-50%, -50%)' }}><span className="font-score text-3xl font-bold text-amber-400 drop-shadow-lg">+{scorePopup.points}</span></div>}
        <div className="relative z-10 p-4 pt-6">
          <QuizHeader score={gameState.currentPlayer.score} streak={gameState.currentPlayer.streak} questionNum={gameState.currentQuestion + 1} totalQuestions={gameState.totalQuestions} timeLeft={gameState.timeLeft} maxTime={gameState.mode === 'blitz' ? BLITZ_TIME : DEFAULT_TIME} category={currentCat?.name || ''} difficulty={currentQ.difficulty} comboMultiplier={gameState.comboMultiplier} lives={gameState.mode === 'survival' ? gameState.survivalLives : undefined} onPause={() => setGameState(prev => ({ ...prev, isPaused: true }))} onQuit={endGame} doubleActive={gameState.doublePointsActive} freezeActive={gameState.freezeTimeActive} />
          <QuestionCard question={currentQ} selectedAnswer={gameState.selectedAnswer} showAnswer={gameState.showAnswer} onAnswer={handleAnswer} hiddenOptions={hiddenOptions} spyReveal={spyReveal} publicVoteData={publicVoteData} />
          <Lifelines fiftyFifty={gameState.currentPlayer.lifelines.fiftyFifty} skipQuestion={gameState.currentPlayer.lifelines.skipQuestion} doublePoints={gameState.currentPlayer.lifelines.doublePoints} freezeTime={gameState.currentPlayer.lifelines.freezeTime} spy={gameState.currentPlayer.lifelines.spy} shield={gameState.currentPlayer.lifelines.shield} secondChance={gameState.currentPlayer.lifelines.secondChance} publicVote={gameState.currentPlayer.lifelines.publicVote} onFiftyFifty={useFiftyFifty} onSkip={useSkipQuestion} onDouble={useDoublePoints} onFreeze={useFreezeTime} onSpy={useSpy} onShield={useShield} onSecondChance={useSecondChance} onPublicVote={usePublicVote} disabled={gameState.showAnswer} doubleActive={gameState.doublePointsActive} freezeActive={gameState.freezeTimeActive} shieldActive={shieldActive} secondChanceActive={secondChanceActive} />
        </div>
        {gameState.isPaused && <PauseModal onResume={() => setGameState(prev => ({ ...prev, isPaused: false }))} onQuit={endGame} />}
      </div>
    );
  }

  // ============ RESULTS ============
  if (gameState.mode === 'results') {
    return (
      <div className="min-h-screen bg-main relative">
        <ResultsScreen player={gameState.currentPlayer} mode={lastGameMode} onPlayAgain={() => setShowSetup(true)} onMenu={goToMenu} newAchievements={[]} />
        {showFortuneWheel && <FortuneWheel onClose={handleFortuneWheelClose} />}
        {showSetup && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSetup(false)}><div onClick={e => e.stopPropagation()} className="w-full max-w-lg">{renderSetupPanel()}</div></div>}
      </div>
    );
  }

  // ============ DASHBOARD ============
  if (showDashboard) {
    const profile = profiles[dashboardPlayerIdx];
    const isQuiz = gameType === 'quiz';
    const score = isQuiz ? profile.quizTotalScore : profile.penduTotalScore;
    const rank = getRank(score);
    const catEntries = isQuiz ? Object.entries(profile.quizCategoryStats).map(([catId, stats]) => {
      const cat = categories.find(c => c.id === catId);
      return { name: cat?.name || catId, icon: cat?.icon || '❓', pct: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0, total: stats.total };
    }).sort((a, b) => b.total - a.total) : [];

    return (
      <div className="min-h-screen bg-main p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setShowDashboard(false)} className="btn-secondary !py-2 !px-3 rounded-lg text-xs">◄ Retour</button>
            <h1 className="font-title text-xl text-white">📊 {isQuiz ? 'QuizMaster' : 'Le Pendu'}</h1>
            <div />
          </div>
          {/* Player switcher */}
          <div className="flex gap-2 justify-center mb-4">
            {profiles.map((p, i) => (
              <button key={i} onClick={() => setDashboardPlayerIdx(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${dashboardPlayerIdx === i ? 'bg-pink-500/20 border border-pink-500/40 text-white' : 'glass-panel text-white/40'}`}>
                <span className="text-xl">{p.avatar}</span>
                <span className="font-title text-sm">{p.name}</span>
              </button>
            ))}
          </div>
          {/* Game type toggle */}
          <div className="flex gap-2 justify-center mb-5">
            <button onClick={() => setGameType('quiz')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${gameType === 'quiz' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'glass-panel text-white/40'}`}>🕹️ Quiz</button>
            <button onClick={() => setGameType('pendu')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${gameType === 'pendu' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'glass-panel text-white/40'}`}>☠️ Pendu</button>
          </div>
          {/* Player card */}
          <div className="glow-panel rounded-2xl p-5 mb-4 text-center">
            <div className="text-5xl mb-2">{profile.avatar}</div>
            <div className="font-title text-2xl text-white">{profile.name}</div>
            <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-gradient-to-r ${rank.color} text-white text-sm font-bold`}>{rank.icon} {rank.name}</div>
            <div className="font-score text-3xl font-bold text-amber-400 mt-3">{score.toLocaleString()}</div>
            <div className="text-white/40 text-sm">points {isQuiz ? 'quiz' : 'pendu'}</div>
            {rank.next < 999999 && <div className="mt-3"><div className="text-xs text-white/30 mb-1">{(rank.next - score).toLocaleString()} pts → prochain rang</div><div className="progress-bar h-2 rounded-full w-48 mx-auto"><div className={`h-full rounded-full bg-gradient-to-r ${rank.color}`} style={{ width: `${Math.min(100, (score / rank.next) * 100)}%` }} /></div></div>}
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {isQuiz ? [
              { icon: '🎮', val: profile.quizGamesPlayed, label: 'Parties' },
              { icon: '🎯', val: `${profile.quizTotalAnswered > 0 ? Math.round((profile.quizTotalCorrect / profile.quizTotalAnswered) * 100) : 0}%`, label: 'Précision' },
              { icon: '🔥', val: profile.quizBestStreak, label: 'Meilleure série' },
              { icon: '✅', val: `${profile.quizTotalCorrect}/${profile.quizTotalAnswered}`, label: 'Correct/Total' },
            ].map((s, i) => (
              <div key={i} className="glass-panel rounded-xl p-3 text-center"><div className="text-xl">{s.icon}</div><div className="text-white font-bold text-sm">{s.val}</div><div className="text-white/40 text-[10px]">{s.label}</div></div>
            )) : [
              { icon: '🎮', val: profile.penduGamesPlayed, label: 'Parties' },
              { icon: '🎯', val: profile.penduWordsFound, label: 'Mots trouvés' },
              { icon: '🔥', val: profile.penduBestStreak, label: 'Meilleure série' },
              { icon: '⭐', val: profile.penduTotalScore.toLocaleString(), label: 'Score total' },
            ].map((s, i) => (
              <div key={i} className="glass-panel rounded-xl p-3 text-center"><div className="text-xl">{s.icon}</div><div className="text-white font-bold text-sm">{s.val}</div><div className="text-white/40 text-[10px]">{s.label}</div></div>
            ))}
          </div>
          {/* Power-ups (quiz only) */}
          {isQuiz && (
            <div className="glow-panel rounded-xl p-4 mb-4">
              <h3 className="text-white/50 text-sm font-semibold mb-3">🎒 Power-ups</h3>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: '✂️', l: '50/50', c: profile.lifelines.fiftyFifty },
                  { icon: '⏭️', l: 'Passer', c: profile.lifelines.skipQuestion },
                  { icon: '×2', l: 'Double', c: profile.lifelines.doublePoints },
                  { icon: '❄️', l: 'Gel', c: profile.lifelines.freezeTime },
                  { icon: '👁️', l: 'Espion', c: profile.lifelines.spy },
                  { icon: '🛡️', l: 'Bouclier', c: profile.lifelines.shield },
                  { icon: '🔄', l: '2e Chance', c: profile.lifelines.secondChance },
                  { icon: '📊', l: 'Public', c: profile.lifelines.publicVote },
                ].map((p, i) => (
                  <div key={i} className="glass-panel rounded-lg p-2 text-center"><div className="text-lg">{p.icon}</div><div className="font-score text-sm font-bold text-white">{p.c}</div><div className="text-white/30 text-[9px]">{p.l}</div></div>
                ))}
              </div>
            </div>
          )}
          {/* Category stats (quiz only) */}
          {isQuiz && catEntries.length > 0 && (
            <div className="glow-panel rounded-xl p-4">
              <h3 className="text-white/50 text-sm font-semibold mb-3">📂 Par catégorie</h3>
              <div className="space-y-2">
                {catEntries.map((c, i) => (
                  <div key={i} className="flex items-center gap-3"><span className="text-lg w-6">{c.icon}</span><div className="flex-1"><div className="flex items-center justify-between text-xs mb-1"><span className="text-white/60">{c.name}</span><span className="text-white font-bold">{c.pct}%</span></div><div className="progress-bar h-2 rounded-full"><div className={`h-full rounded-full ${c.pct >= 70 ? 'bg-green-500' : c.pct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${c.pct}%` }} /></div></div></div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ SETUP ============
  function renderSetupPanel() {
    const filtered = getFilteredQuestions(selectedSetupCategories, selectedSetupDifficulty, setupMode === 'random');
    const availableCount = filtered.length;
    const realCount = Math.min(questionsCount, availableCount);
    const toggleCat = (id: string) => setSelectedSetupCategories(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);

    return (
      <div className="glow-panel rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="mb-5">
          <label className="text-white/50 text-sm font-semibold mb-2 block">Mode</label>
          <div className="grid grid-cols-4 gap-2">
            {([['classique','🎯','Classic'],['survie','💀','Survie'],['blitz','⚡','Blitz'],['random','🎲','Aléatoire']] as const).map(([id, icon, name]) => (
              <button key={id} onClick={() => setSetupMode(id)} className={`p-3 rounded-xl text-center transition-all border-2 ${setupMode === id ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}><div className="text-2xl mb-1">{icon}</div><div className="text-white text-xs font-bold">{name}</div></button>
            ))}
          </div>
        </div>
        {setupMode === 'random' && <div className="mb-5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-sm text-purple-300">🎲 Tout est aléatoire !</div>}
        {setupMode !== 'random' && (<>
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2"><label className="text-white/50 text-sm font-semibold">Catégories</label><button onClick={() => setSelectedSetupCategories([])} className="text-xs text-white/30 hover:text-white/60">{selectedSetupCategories.length === 0 ? '✓ Toutes' : 'Tout sélectionner'}</button></div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map(cat => (<button key={cat.id} onClick={() => toggleCat(cat.id)} className={`p-2.5 rounded-lg text-sm font-semibold transition-all text-left ${selectedSetupCategories.includes(cat.id) ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : selectedSetupCategories.length === 0 ? 'bg-green-500/10 text-green-300/80 border border-green-500/20' : 'glass-panel text-white/40'}`}>{cat.icon} {cat.name.split(' ').slice(1).join(' ')}</button>))}
            </div>
          </div>
          <div className="mb-5">
            <label className="text-white/50 text-sm font-semibold mb-2 block">Difficulté</label>
            <div className="grid grid-cols-4 gap-2">
              {([['all','Toutes','🌐'],['easy','Facile','🟢'],['medium','Moyen','🟡'],['hard','Dur','🔴']] as const).map(([id, l, e]) => (<button key={id} onClick={() => setSelectedSetupDifficulty(id)} className={`p-2 rounded-lg text-center transition-all ${selectedSetupDifficulty === id ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'glass-panel text-white/60'}`}><div className="text-base">{e}</div><div className="text-[11px] font-semibold">{l}</div></button>))}
            </div>
          </div>
        </>)}
        {setupMode !== 'survie' && (
          <div className="mb-5">
            <label className="text-white/50 text-sm font-semibold mb-2 block">Questions : <span className="text-pink-400">{realCount}</span></label>
            <input type="range" min={5} max={availableCount} value={Math.min(questionsCount, availableCount)} onChange={e => setQuestionsCount(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between text-xs text-white/30 mt-1"><span>5</span><span>{availableCount} dispo</span></div>
          </div>
        )}
        <button onClick={() => startGame(setupMode, selectedSetupCategories, selectedSetupDifficulty, setupMode === 'survie' ? availableCount : realCount)} disabled={availableCount === 0} className="btn-primary w-full py-4 rounded-xl text-base disabled:opacity-40">🚀 Lancer ({realCount} questions)</button>
        <button onClick={() => setShowSetup(false)} className="btn-secondary w-full mt-3 py-3 rounded-xl text-sm">Annuler</button>
      </div>
    );
  }

  // ============ HANGMAN ============
  if (playingHangman) {
    const p = profiles[selectedPlayerIdx];
    return <HangmanGame playerName={p.name} playerAvatar={p.avatar}
      onMenu={() => { setPlayingHangman(false); setHangmanLeaderboardOnly(false); }}
      onGameEnd={handleHangmanEnd}
      showLeaderboardOnly={hangmanLeaderboardOnly} mode={hangmanMode} categoryFilter={hangmanCategory} />;
  }

  // Fortune wheel for pendu (when returning)
  if (showFortuneWheel) {
    return <div className="min-h-screen bg-main"><FortuneWheel onClose={handleFortuneWheelClose} /></div>;
  }

  // ============ MAIN ============
  return (
    <>
      <PlayerSelect profiles={profiles} gameType={gameType} onToggleGameType={() => { setGameType(prev => prev === 'quiz' ? 'pendu' : 'quiz'); playClick(); }}
        onSelect={(idx) => { setSelectedPlayerIdx(idx); if (gameType === 'pendu') { setHangmanMode('normal'); setHangmanCategory(null); setPlayingHangman(true); } else setShowSetup(true); playClick(); }}
        onDashboard={(idx) => { setDashboardPlayerIdx(idx); setShowDashboard(true); playClick(); }}
        onPenduMode={(idx, mode, cat) => { setSelectedPlayerIdx(idx); setHangmanMode(mode); setHangmanCategory(cat); setPlayingHangman(true); playClick(); }}
      />
      {showSetup && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSetup(false)}><div onClick={e => e.stopPropagation()} className="w-full max-w-lg">{renderSetupPanel()}</div></div>}
    </>
  );
}
