import React, { useState } from 'react';
import { LeaderboardEntry } from '../types/game';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  onBack: () => void;
  onClear: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries, onBack, onClear }) => {
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'accuracy'>('score');

  const filtered = entries
    .filter(e => filter === 'all' || e.mode === filter)
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
      return (b.totalCorrect / b.totalAnswered) - (a.totalCorrect / a.totalAnswered);
    });

  return (
    <div className="min-h-screen bg-main p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="btn-secondary !py-2 !px-3 rounded-lg text-xs">◄ Retour</button>
          <h1 className="font-title text-2xl text-white flex items-center gap-2">🏆 Classement</h1>
          <button onClick={onClear} className="btn-secondary !py-2 !px-3 rounded-lg text-xs text-red-400 border-red-500/30">🗑️</button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-3 justify-center flex-wrap">
          {['all', 'classique', 'survie', 'blitz'].map(m => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                filter === m ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'glass-panel text-white/50 hover:text-white'
              }`}
            >
              {m === 'all' ? '🌐 Tous' : m === 'classique' ? '🎯 Classic' : m === 'survie' ? '💀 Survie' : '⚡ Blitz'}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-2 mb-5 justify-center">
          {(['score', 'date', 'accuracy'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                sortBy === s ? 'bg-amber-500/20 text-amber-400' : 'text-white/30 hover:text-white/60'
              }`}
            >
              {s === 'score' ? '⭐ Score' : s === 'date' ? '📅 Date' : '🎯 Précision'}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="glow-panel rounded-2xl p-12 text-center">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-white/50 text-lg font-semibold">Aucun score</p>
            <p className="text-white/30 text-sm mt-1">Jouez pour apparaître ici !</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry, i) => {
              const accuracy = entry.totalAnswered > 0 ? Math.round((entry.totalCorrect / entry.totalAnswered) * 100) : 0;
              const medals = ['🥇', '🥈', '🥉'];

              return (
                <div
                  key={i}
                  className={`glow-panel rounded-xl p-3 transition-all ${
                    i === 0 ? '!border-yellow-500/40 !shadow-[0_0_15px_rgba(255,214,0,0.15)]' :
                    i === 1 ? '!border-gray-400/30' :
                    i === 2 ? '!border-amber-600/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center">
                      {i < 3 ? <span className="text-2xl">{medals[i]}</span> : <span className="text-white/40 font-bold">#{i + 1}</span>}
                    </div>
                    <div className="text-2xl">{entry.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-title text-white truncate">{entry.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">{entry.mode}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5">
                        <span>🎯 {accuracy}%</span>
                        <span>🔥 {entry.streak}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-score text-lg font-bold text-amber-400">{entry.score.toLocaleString()}</div>
                      <div className="text-[10px] text-white/30">{new Date(entry.date).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
