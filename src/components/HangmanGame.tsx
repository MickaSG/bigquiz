import React, { useState, useEffect, useCallback } from 'react';
import { words, wordCategories, WordEntry } from '../data/words';
import { useSound } from '../hooks/useSound';
import { useConfetti } from '../hooks/useConfetti';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface HangmanProps {
  playerName: string;
  playerAvatar: string;
  onMenu: () => void;
  onGameEnd?: (score: number, wordsFound: number, bestStreak: number) => void;
  showLeaderboardOnly?: boolean;
  mode?: 'normal' | 'chrono' | 'mystery';
  categoryFilter?: string | null;
}

interface HangmanLeaderEntry {
  name: string; avatar: string; score: number; wordsFound: number; bestStreak: number; date: string;
}

const MAX_ERRORS = 7;
const KEYBOARD_ROWS = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];
const VOWELS = ['A', 'E', 'I', 'O', 'U', 'Y'];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function HangmanSVG({ errors }: { errors: number }) {
  return (
    <svg viewBox="0 0 200 220" className="w-full max-w-[180px] mx-auto">
      <line x1="20" y1="210" x2="180" y2="210" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="210" x2="60" y2="30" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="30" x2="140" y2="30" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <line x1="140" y1="30" x2="140" y2="55" stroke="white" strokeWidth="4" strokeLinecap="round" />
      {errors >= 1 && <circle cx="140" cy="72" r="18" stroke="#ff2d78" strokeWidth="3" fill="none" />}
      {errors >= 2 && <line x1="140" y1="90" x2="140" y2="145" stroke="#ff2d78" strokeWidth="3" strokeLinecap="round" />}
      {errors >= 3 && <line x1="140" y1="105" x2="115" y2="130" stroke="#ff2d78" strokeWidth="3" strokeLinecap="round" />}
      {errors >= 4 && <line x1="140" y1="105" x2="165" y2="130" stroke="#ff2d78" strokeWidth="3" strokeLinecap="round" />}
      {errors >= 5 && <line x1="140" y1="145" x2="115" y2="180" stroke="#ff2d78" strokeWidth="3" strokeLinecap="round" />}
      {errors >= 6 && <line x1="140" y1="145" x2="165" y2="180" stroke="#ff2d78" strokeWidth="3" strokeLinecap="round" />}
      {errors >= 7 && (<>
        <line x1="132" y1="66" x2="138" y2="72" stroke="#ff2d78" strokeWidth="2" />
        <line x1="138" y1="66" x2="132" y2="72" stroke="#ff2d78" strokeWidth="2" />
        <line x1="142" y1="66" x2="148" y2="72" stroke="#ff2d78" strokeWidth="2" />
        <line x1="148" y1="66" x2="142" y2="72" stroke="#ff2d78" strokeWidth="2" />
        <path d="M132 80 Q140 76 148 80" stroke="#ff2d78" strokeWidth="2" fill="none" />
      </>)}
      {errors === 0 && (<>
        <circle cx="134" cy="68" r="2" fill="#00e676" /><circle cx="146" cy="68" r="2" fill="#00e676" />
        <path d="M132 78 Q140 84 148 78" stroke="#00e676" strokeWidth="2" fill="none" />
      </>)}
    </svg>
  );
}

export const HangmanGame: React.FC<HangmanProps> = ({ playerName, playerAvatar, onMenu, onGameEnd, showLeaderboardOnly = false, mode = 'normal', categoryFilter = null }) => {
  const [leaderboard, setLeaderboard] = useLocalStorage<HangmanLeaderEntry[]>('pendu_leaderboard', []);
  const [showLeaderboard, setShowLeaderboard] = useState(showLeaderboardOnly);

  const [wordQueue, setWordQueue] = useState<WordEntry[]>([]);
  const [currentWord, setCurrentWord] = useState<WordEntry | null>(null);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState(0);
  const [maxErrors, setMaxErrors] = useState(MAX_ERRORS);
  const [score, setScore] = useState(0);
  const [wordsFound, setWordsFound] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [wordResult, setWordResult] = useState<'win' | 'lose' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [totalErrors, setTotalErrors] = useState(0);

  // Power-ups
  const [pwVowels, setPwVowels] = useState(1);
  const [pwFreeLetter, setPwFreeLetter] = useState(2);
  const [pwEliminate, setPwEliminate] = useState(1);
  const [pwExtraLife, setPwExtraLife] = useState(1);
  const [pwSkipWord, setPwSkipWord] = useState(1);
  const [eliminatedLetters, setEliminatedLetters] = useState<Set<string>>(new Set());

  const { playCorrect, playWrong, playClick, playStreak: playSoundStreak, playLevelUp, playGameOver: playSoundGameOver } = useSound();
  const { fire, fireStars } = useConfetti();

  const [chronoTime, setChronoTime] = useState(120);
  const [chronoActive, setChronoActive] = useState(false);
  const isMystery = mode === 'mystery';
  const isChrono = mode === 'chrono';

  // Chrono timer
  useEffect(() => {
    if (!isChrono || !chronoActive || gameOver) return;
    const t = setInterval(() => {
      setChronoTime(prev => {
        if (prev <= 1) { setChronoActive(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isChrono, chronoActive, gameOver]);

  // End when chrono runs out
  useEffect(() => {
    if (isChrono && chronoTime <= 0 && !gameOver) { endRun(); }
  }, [chronoTime, isChrono, gameOver]);

  useEffect(() => { startNewGame(); }, []);

  const startNewGame = useCallback(() => {
    const filtered = categoryFilter ? words.filter(w => w.category === categoryFilter) : words;
    const shuffled = shuffleArray(filtered.length > 0 ? filtered : words);
    setWordQueue(shuffled); setCurrentWord(shuffled[0]);
    setGuessedLetters(new Set()); setErrors(0); setMaxErrors(MAX_ERRORS);
    setScore(0); setWordsFound(0); setStreak(0); setBestStreak(0);
    setGameOver(false); setWordResult(null); setShowHint(false); setHintUsed(false); setTotalErrors(0);
    if (isChrono) { setChronoTime(120); setChronoActive(true); }
    setPwVowels(1); setPwFreeLetter(2); setPwEliminate(1); setPwExtraLife(1); setPwSkipWord(1);
    setEliminatedLetters(new Set());
  }, []);

  const nextWord = useCallback(() => {
    const nextIdx = wordsFound + 1;
    if (nextIdx >= wordQueue.length) { setGameOver(true); return; }
    setCurrentWord(wordQueue[nextIdx]);
    setGuessedLetters(new Set()); setErrors(0); setMaxErrors(MAX_ERRORS);
    setWordResult(null); setShowHint(false); setHintUsed(false);
    setEliminatedLetters(new Set());
  }, [wordsFound, wordQueue]);

  const guessLetter = useCallback((letter: string) => {
    if (!currentWord || guessedLetters.has(letter) || wordResult || eliminatedLetters.has(letter)) return;
    const newGuessed = new Set(guessedLetters); newGuessed.add(letter);
    setGuessedLetters(newGuessed);
    const normalizedWord = currentWord.word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalizedWord.includes(letter)) {
      playCorrect();
      const allFound = normalizedWord.split('').every(l => l === ' ' || l === '-' || l === '\'' || newGuessed.has(l));
      if (allFound) {
        const bonus = Math.max(0, (maxErrors - errors) * 50);
        const hintPenalty = hintUsed ? -30 : 0;
        const streakBonus = streak * 20;
        const mysteryMultiplier = isMystery ? 3 : 1;
        const points = (100 + bonus + streakBonus + hintPenalty) * mysteryMultiplier;
        setScore(s => s + points); setWordsFound(w => w + 1);
        const newStreak = streak + 1; setStreak(newStreak); setBestStreak(b => Math.max(b, newStreak));
        setWordResult('win');
        if (newStreak >= 3) { fire(); playSoundStreak(newStreak); }
        if (newStreak >= 5) fireStars();
        // 🎁 Recharge : +1 power-up aléatoire tous les 2 mots trouvés
        if (newStreak > 0 && newStreak % 2 === 0) {
          const options = [
            () => setPwVowels(p => p + 1),
            () => setPwFreeLetter(p => p + 1),
            () => setPwEliminate(p => p + 1),
            () => setPwExtraLife(p => p + 1),
            () => setPwSkipWord(p => p + 1),
          ];
          options[Math.floor(Math.random() * options.length)]();
        }
        playLevelUp();
      }
    } else {
      playWrong();
      const newErrors = errors + 1; setErrors(newErrors); setTotalErrors(t => t + 1);
      if (newErrors >= maxErrors) {
        if (isChrono) { setStreak(0); setWordResult('lose'); setTimeout(() => nextWord(), 1500); }
        else { setWordResult('lose'); setStreak(0); playSoundGameOver(); }
      }
    }
  }, [currentWord, guessedLetters, errors, maxErrors, wordResult, streak, hintUsed, eliminatedLetters, playCorrect, playWrong, playLevelUp, playSoundGameOver, playSoundStreak, fire, fireStars]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) guessLetter(key);
      if (e.key === 'Enter' && wordResult) { if (wordResult === 'lose') endRun(); else nextWord(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [guessLetter, wordResult, nextWord]);

  useEffect(() => {
    if (wordResult === 'win') { const t = setTimeout(nextWord, 1800); return () => clearTimeout(t); }
  }, [wordResult, nextWord]);

  // Power-up handlers
  const useVowels = useCallback(() => {
    if (!currentWord || pwVowels <= 0 || wordResult) return;
    const norm = currentWord.word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const newGuessed = new Set(guessedLetters);
    VOWELS.forEach(v => { if (norm.includes(v)) newGuessed.add(v); });
    setGuessedLetters(newGuessed); setPwVowels(p => p - 1); playClick();
    // Check if word complete
    const allFound = norm.split('').every(l => l === ' ' || l === '-' || l === '\'' || newGuessed.has(l));
    if (allFound) {
      const bonus = Math.max(0, (maxErrors - errors) * 50);
      setScore(s => s + 100 + bonus); setWordsFound(w => w + 1);
      const ns = streak + 1; setStreak(ns); setBestStreak(b => Math.max(b, ns));
      setWordResult('win'); playLevelUp(); if (ns >= 3) fire();
    }
  }, [currentWord, pwVowels, wordResult, guessedLetters, maxErrors, errors, streak, playClick, playLevelUp, fire]);

  const useFreeLetter = useCallback(() => {
    if (!currentWord || pwFreeLetter <= 0 || wordResult) return;
    const norm = currentWord.word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const unrevealed = norm.split('').filter(l => l !== ' ' && l !== '-' && l !== '\'' && !guessedLetters.has(l));
    if (unrevealed.length === 0) return;
    const letter = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const newGuessed = new Set(guessedLetters); newGuessed.add(letter);
    setGuessedLetters(newGuessed); setPwFreeLetter(p => p - 1); playClick();
    const allFound = norm.split('').every(l => l === ' ' || l === '-' || l === '\'' || newGuessed.has(l));
    if (allFound) {
      setScore(s => s + 100 + Math.max(0, (maxErrors - errors) * 50));
      setWordsFound(w => w + 1); const ns = streak + 1; setStreak(ns); setBestStreak(b => Math.max(b, ns));
      setWordResult('win'); playLevelUp(); if (ns >= 3) fire();
    }
  }, [currentWord, pwFreeLetter, wordResult, guessedLetters, maxErrors, errors, streak, playClick, playLevelUp, fire]);

  const useEliminate = useCallback(() => {
    if (!currentWord || pwEliminate <= 0 || wordResult) return;
    const norm = currentWord.word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const lettersInWord = new Set(norm.split(''));
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const notInWord = alphabet.filter(l => !lettersInWord.has(l) && !guessedLetters.has(l) && !eliminatedLetters.has(l));
    const toEliminate = shuffleArray(notInWord).slice(0, 5);
    setEliminatedLetters(prev => { const s = new Set(prev); toEliminate.forEach(l => s.add(l)); return s; });
    setPwEliminate(p => p - 1); playClick();
  }, [currentWord, pwEliminate, wordResult, guessedLetters, eliminatedLetters, playClick]);

  const useExtraLife = useCallback(() => {
    if (pwExtraLife <= 0 || wordResult) return;
    setMaxErrors(m => m + 1); setPwExtraLife(p => p - 1); playClick();
  }, [pwExtraLife, wordResult, playClick]);

  const useSkipWord = useCallback(() => {
    if (pwSkipWord <= 0 || wordResult) return;
    setPwSkipWord(p => p - 1); setWordsFound(w => w + 1); nextWord(); playClick();
  }, [pwSkipWord, wordResult, nextWord, playClick]);

  const endRun = useCallback(() => {
    setGameOver(true);
    if (onGameEnd) onGameEnd(score, wordsFound, bestStreak);
    const entry: HangmanLeaderEntry = { name: playerName, avatar: playerAvatar, score, wordsFound, bestStreak, date: new Date().toISOString() };
    setLeaderboard(prev => {
      const idx = prev.findIndex(e => e.name === entry.name);
      let nl;
      if (idx >= 0) { if (entry.score > prev[idx].score) { nl = [...prev]; nl[idx] = entry; } else nl = prev; }
      else nl = [...prev, entry];
      return nl.sort((a, b) => b.score - a.score);
    });
  }, [playerName, playerAvatar, score, wordsFound, bestStreak, setLeaderboard]);

  // Leaderboard screen
  if (showLeaderboard) {
    return (
      <div className="min-h-screen bg-main p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => { if (showLeaderboardOnly) onMenu(); else setShowLeaderboard(false); }} className="btn-secondary !py-2 !px-3 rounded-lg text-xs">◄ Retour</button>
            <h1 className="font-title text-2xl text-white">🏆 Classement Pendu</h1>
            <div />
          </div>
          {leaderboard.length === 0 ? (
            <div className="glow-panel rounded-2xl p-12 text-center"><div className="text-5xl mb-3">👻</div><p className="text-white/50 text-lg">Aucun score encore !</p></div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((e, i) => (
                <div key={i} className={`glow-panel rounded-xl p-3 ${i === 0 ? '!border-yellow-500/40 !shadow-[0_0_15px_rgba(255,214,0,0.15)]' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center">{i < 3 ? ['🥇','🥈','🥉'][i] : <span className="text-white/40 font-bold">#{i+1}</span>}</div>
                    <span className="text-2xl">{e.avatar}</span>
                    <div className="flex-1">
                      <div className="font-title text-white">{e.name}</div>
                      <div className="text-xs text-white/40">🎯 {e.wordsFound} mots · 🔥 {e.bestStreak} max</div>
                    </div>
                    <div className="font-score text-lg font-bold text-amber-400">{e.score.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Game over
  if (gameOver) {
    return (
      <div className="min-h-screen bg-main flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="glow-panel rounded-2xl p-6 text-center mb-5 animate-bounce-in">
            <div className="text-6xl mb-3">{wordsFound >= 10 ? '🏆' : wordsFound >= 5 ? '🌟' : '💀'}</div>
            <h1 className="font-title text-3xl text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-amber-400 mb-2">
              {wordsFound >= 10 ? 'INCROYABLE !' : wordsFound >= 5 ? 'BIEN JOUÉ !' : 'GAME OVER'}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-3xl">{playerAvatar}</span><span className="font-title text-xl text-white">{playerName}</span>
            </div>
            <div className="font-score text-4xl font-bold text-amber-400 mt-4">{score.toLocaleString()}</div>
            <div className="text-white/40 text-sm">points</div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[{ i: '🎯', v: wordsFound, l: 'Mots trouvés' }, { i: '🔥', v: bestStreak, l: 'Meilleure série' }, { i: '❌', v: totalErrors, l: 'Erreurs' }].map((s, idx) => (
              <div key={idx} className="glass-panel rounded-xl p-3 text-center"><div className="text-xl">{s.i}</div><div className="text-white font-bold">{s.v}</div><div className="text-white/40 text-xs">{s.l}</div></div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={onMenu} className="btn-secondary flex-1 py-4 rounded-xl text-sm">🏠 Menu</button>
            <button onClick={() => { setShowLeaderboard(true); playClick(); }} className="btn-secondary flex-1 py-4 rounded-xl text-sm">🏆 Scores</button>
            <button onClick={() => { startNewGame(); playClick(); }} className="btn-primary flex-1 py-4 rounded-xl text-sm">🔄 Rejouer</button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentWord) return null;
  const normalizedWord = currentWord.word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cat = wordCategories.find(c => c.id === currentWord.category);

  const powerUps = [
    { icon: '🔤', label: 'Voyelles', count: pwVowels, action: useVowels },
    { icon: '🔍', label: 'Lettre', count: pwFreeLetter, action: useFreeLetter },
    { icon: '❌', label: 'Éliminer', count: pwEliminate, action: useEliminate },
    { icon: '❤️', label: '+1 Vie', count: pwExtraLife, action: useExtraLife },
    { icon: '⏭️', label: 'Passer', count: pwSkipWord, action: useSkipWord },
  ];

  return (
    <div className="min-h-screen bg-main relative">
      <div className="max-w-2xl mx-auto p-4 pt-6">
        {/* HUD */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={endRun} className="btn-secondary !py-2 !px-3 rounded-lg text-xs">✕ Quitter</button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5"><span>⭐</span><span className="font-score text-lg font-bold text-amber-400">{score}</span></div>
            {streak > 0 && <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20 text-orange-300 text-sm font-bold">🔥 {streak}</div>}
          </div>
          <button onClick={() => { setShowLeaderboard(true); playClick(); }} className="btn-secondary !py-2 !px-3 rounded-lg text-xs">🏆</button>
        </div>

        {/* Info */}
        <div className="glow-panel rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {isMystery ? <><span>❓</span><span className="text-purple-300">Mystère (x3)</span></> : <><span>{cat?.icon}</span><span className="text-white/60">{cat?.name}</span></>}
          </div>
          <div className="flex items-center gap-3">
            {isChrono && <span className={`font-score text-sm font-bold ${chronoTime <= 10 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>⏱️ {chronoTime}s</span>}
            <span className="text-sm text-white/40">Mot #{wordsFound + 1}</span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: maxErrors }).map((_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i < errors ? 'bg-red-500 shadow-[0_0_5px_#ff3366]' : 'bg-white/20'}`} />
            ))}
          </div>
        </div>

        {/* SVG */}
        <div className="flex justify-center mb-4"><HangmanSVG errors={Math.min(errors, 7)} /></div>

        {/* Word */}
        <div className="flex justify-center gap-2 md:gap-3 flex-wrap mb-4">
          {currentWord.word.split('').map((letter, i) => {
            const nl = letter.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const isSpecial = nl === ' ' || nl === '-' || nl === '\'';
            const isRevealed = isSpecial || guessedLetters.has(nl) || wordResult === 'lose';
            return (
              <div key={i} className={`flex items-center justify-center transition-all ${isSpecial ? 'w-4' :
                `w-10 h-12 md:w-12 md:h-14 border-b-3 ${wordResult === 'lose' && !guessedLetters.has(nl) && !isSpecial ? 'border-red-500 bg-red-500/10' : wordResult === 'win' ? 'border-green-400 bg-green-500/10' : isRevealed ? 'border-amber-400' : 'border-white/30'}`}`}>
                <span className={`font-title text-2xl md:text-3xl transition-all ${wordResult === 'lose' && !guessedLetters.has(nl) ? 'text-red-400' : wordResult === 'win' ? 'text-green-400' : isRevealed ? 'text-white' : 'text-transparent'}`}>
                  {isRevealed ? letter : '_'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Hint (hidden in mystery mode) */}
        {!isMystery && (
          <div className="text-center mb-3">
            {showHint ? <p className="text-purple-300 text-sm glass-panel inline-block px-4 py-2 rounded-lg">💡 {currentWord.hint}</p>
            : !wordResult && <button onClick={() => { setShowHint(true); setHintUsed(true); playClick(); }} className="text-white/30 text-sm hover:text-white/50 transition-all">💡 Indice (-30 pts)</button>}
          </div>
        )}

        {/* Power-ups */}
        {!wordResult && (
          <div className="flex justify-center gap-1.5 mb-4 flex-wrap">
            {powerUps.map((p, i) => (
              <button key={i} onClick={p.action} disabled={p.count <= 0}
                className={`relative flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl border transition-all ${p.count <= 0 ? 'bg-white/5 border-white/5 opacity-30 cursor-not-allowed' : 'glass-panel hover:bg-white/10 hover:scale-105 cursor-pointer active:scale-95'}`}>
                <span className="text-lg">{p.icon}</span>
                <span className="text-[9px] text-white/60 font-semibold">{p.label}</span>
                {p.count > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center">{p.count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Result */}
        {wordResult && (
          <div className={`text-center mb-4 p-3 rounded-xl animate-bounce-in ${wordResult === 'win' ? 'bg-green-500/20 border border-green-400/40' : 'bg-red-500/20 border border-red-400/40'}`}>
            <span className="font-title text-lg">
              {wordResult === 'win' ? <span className="text-green-400">✓ BRAVO !</span>
              : <span className="text-red-400">✗ Le mot était : <span className="text-white">{currentWord.word}</span></span>}
            </span>
            {wordResult === 'lose' && <button onClick={endRun} className="btn-primary mt-3 px-6 py-2 rounded-lg text-sm block mx-auto">Voir les résultats</button>}
          </div>
        )}

        {/* Keyboard */}
        {!wordResult && (
          <div className="space-y-2">
            {KEYBOARD_ROWS.map((row, ri) => (
              <div key={ri} className="flex justify-center gap-1.5">
                {row.split('').map(letter => {
                  const isUsed = guessedLetters.has(letter);
                  const isCorrect = isUsed && normalizedWord.includes(letter);
                  const isWrong = isUsed && !normalizedWord.includes(letter);
                  const isEliminated = eliminatedLetters.has(letter);
                  return (
                    <button key={letter} onClick={() => guessLetter(letter)} disabled={isUsed || isEliminated}
                      className={`w-9 h-11 md:w-11 md:h-12 rounded-lg font-title text-sm md:text-base transition-all ${
                        isEliminated ? 'bg-white/5 border border-white/5 text-white/10' :
                        isCorrect ? 'bg-green-500/30 border border-green-400 text-green-400' :
                        isWrong ? 'bg-red-500/20 border border-red-500/30 text-red-400/50' :
                        'glass-panel text-white hover:bg-white/15 active:scale-90'}`}>
                      {letter}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
