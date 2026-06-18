import React, { useState } from 'react';
import { PlayerProfile, getRank } from '../types/game';
import { wordCategories } from '../data/words';

interface PlayerSelectProps {
  profiles: PlayerProfile[];
  onSelect: (idx: number) => void;
  onDashboard: (idx: number) => void;
  onPenduMode: (idx: number, mode: 'normal' | 'chrono' | 'mystery', cat: string | null) => void;
  gameType: 'quiz' | 'pendu';
  onToggleGameType: () => void;
}

export const PlayerSelect: React.FC<PlayerSelectProps> = ({ profiles, onSelect, onDashboard, onPenduMode, gameType, onToggleGameType }) => {
  const [penduSetup, setPenduSetup] = useState<number | null>(null);
  const [penduMode, setPenduMode] = useState<'normal' | 'chrono' | 'mystery'>('normal');
  const [penduCat, setPenduCat] = useState<string | null>(null);
  const isQuiz = gameType === 'quiz';

  return (
    <div className="min-h-screen bg-main relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/5 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 md:p-6">
        {/* HEADER */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{isQuiz ? '🕹️' : '☠️'}</div>
          <button onClick={onToggleGameType} className="group cursor-pointer transition-all hover:scale-105 active:scale-95">
            {isQuiz ? (
              <h1 className="font-title text-4xl md:text-5xl text-white mb-1 tracking-wide">QUIZ<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-amber-400">MASTER</span></h1>
            ) : (
              <h1 className="font-title text-4xl md:text-5xl text-white mb-1 tracking-wide">LE <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">PENDU</span></h1>
            )}
            <p className="text-white/30 text-xs mt-1 group-hover:text-white/50">← {isQuiz ? 'Pendu ☠️' : 'Quiz 🕹️'} →</p>
          </button>
        </div>

        {/* CARDS */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-5 mb-6 w-full max-w-4xl justify-center items-center">
          {profiles.map((p, idx) => {
            const score = isQuiz ? p.quizTotalScore : p.penduTotalScore;
            const rank = getRank(score);
            const games = isQuiz ? p.quizGamesPlayed : p.penduGamesPlayed;
            const accuracy = isQuiz
              ? (p.quizTotalAnswered > 0 ? Math.round((p.quizTotalCorrect / p.quizTotalAnswered) * 100) : 0)
              : 0; // pendu doesn't have accuracy per se
            const getCardClass = (s: number) => {
              const r = getRank(s);
              if (r.name === 'Légende') return 'card-legend';
              if (r.name === 'Diamant') return 'card-diamond';
              if (r.name === 'Or') return 'card-gold';
              if (r.name === 'Argent') return 'card-silver';
              return 'card-bronze';
            };
            const cardClass = getCardClass(score);
            return (
              <div key={p.name} className="w-[220px] md:w-[240px]">
                <button onClick={() => { if (!isQuiz) setPenduSetup(idx); else onSelect(idx); }}
                  className={`${cardClass} w-full rounded-2xl p-1 transition-all duration-300 hover:scale-105 hover:z-10 active:scale-95 cursor-pointer group`}>
                  <div className="relative rounded-xl overflow-hidden">
                    <div className="absolute top-3 left-3 z-10">
                      <div className="flex items-center gap-1"><span>{rank.icon}</span><span className="font-title text-xs text-white/80">{rank.name}</span></div>
                    </div>
                    <div className="flex items-center justify-center py-6 pb-3">
                      <div className="text-7xl md:text-8xl drop-shadow-2xl group-hover:scale-110 transition-transform">{p.avatar}</div>
                    </div>
                    <div className="text-center py-2 bg-black/40">
                      <div className="font-title text-lg text-white tracking-widest">{p.name.toUpperCase()}</div>
                    </div>
                    <div className="px-3 py-2 space-y-1">
                      <div className="flex items-center justify-between"><span className="text-white/50 text-xs">Score</span><span className="text-white font-bold text-xs font-score">{score.toLocaleString()}</span></div>
                      <div className="flex items-center justify-between"><span className="text-white/50 text-xs">Parties</span><span className="text-white font-bold text-xs font-score">{games}</span></div>
                      {isQuiz ? (
                        <div className="flex items-center justify-between"><span className="text-white/50 text-xs">Précision</span><span className="text-white font-bold text-xs font-score">{accuracy}%</span></div>
                      ) : (
                        <div className="flex items-center justify-between"><span className="text-white/50 text-xs">Mots</span><span className="text-white font-bold text-xs font-score">{p.penduWordsFound}</span></div>
                      )}
                    </div>
                  </div>
                </button>
                <button onClick={() => onDashboard(idx)} className="w-full mt-1 py-1.5 text-center text-white/30 text-xs hover:text-white/60 transition-all">📊 Tableau de bord</button>
              </div>
            );
          })}
        </div>

        <div className="mt-2 text-center"><p className="text-white/20 text-sm">950+ questions · 9 catégories · 4 modes</p></div>
      </div>

      {/* Pendu setup */}
      {penduSetup !== null && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPenduSetup(null)}>
          <div onClick={e => e.stopPropagation()} className="glow-panel rounded-2xl p-6 max-w-sm w-full">
            <h2 className="font-title text-xl text-white text-center mb-4">☠️ Mode du Pendu</h2>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {([['normal','🎯','Normal'],['chrono','⏱️','Chrono'],['mystery','❓','Mystère']] as const).map(([id,icon,name]) => (
                <button key={id} onClick={() => setPenduMode(id)} className={`p-3 rounded-xl text-center transition-all border-2 ${penduMode === id ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 bg-white/5'}`}><div className="text-2xl mb-1">{icon}</div><div className="text-white text-xs font-bold">{name}</div></button>
              ))}
            </div>
            {penduMode === 'chrono' && <p className="text-amber-300/70 text-xs text-center mb-3">⏱️ 120s pour un max de mots !</p>}
            {penduMode === 'mystery' && <p className="text-purple-300/70 text-xs text-center mb-3">❓ Pas d'indice. Points x3 !</p>}
            {penduMode === 'normal' && (
              <div className="mb-4">
                <label className="text-white/50 text-xs font-semibold mb-2 block">Thème</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button onClick={() => setPenduCat(null)} className={`p-2 rounded-lg text-xs font-semibold ${!penduCat ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'glass-panel text-white/50'}`}>🌐 Tous</button>
                  {wordCategories.map(c => (<button key={c.id} onClick={() => setPenduCat(c.id)} className={`p-2 rounded-lg text-xs font-semibold ${penduCat === c.id ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'glass-panel text-white/50'}`}>{c.icon}</button>))}
                </div>
              </div>
            )}
            <button onClick={() => { onPenduMode(penduSetup, penduMode, penduCat); setPenduSetup(null); }} className="btn-primary w-full py-4 rounded-xl text-base">🚀 Jouer</button>
            <button onClick={() => setPenduSetup(null)} className="btn-secondary w-full mt-2 py-2 rounded-xl text-sm">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
};
