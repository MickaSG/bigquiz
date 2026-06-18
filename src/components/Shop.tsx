import React from 'react';
import { PlayerProfile, PlayerLifelines } from '../types/game';

interface ShopProps {
  profile: PlayerProfile;
  onBuy: (item: keyof PlayerLifelines, cost: number) => void;
  onClose: () => void;
}

const SHOP_ITEMS: { key: keyof PlayerLifelines; icon: string; name: string; price: number; desc: string }[] = [
  { key: 'fiftyFifty', icon: '✂️', name: '50/50', price: 300, desc: 'Élimine 2 mauvaises réponses' },
  { key: 'skipQuestion', icon: '⏭️', name: 'Passer', price: 250, desc: 'Saute sans pénalité' },
  { key: 'doublePoints', icon: '×2', name: 'Double', price: 500, desc: 'Double les points' },
  { key: 'freezeTime', icon: '❄️', name: 'Gel', price: 400, desc: 'Arrête le chrono' },
  { key: 'spy', icon: '👁️', name: 'Espion', price: 600, desc: 'Flash la bonne réponse 1s' },
  { key: 'shield', icon: '🛡️', name: 'Bouclier', price: 500, desc: 'Protège le streak' },
  { key: 'secondChance', icon: '🔄', name: '2e Chance', price: 700, desc: 'Réessayer si faux' },
  { key: 'publicVote', icon: '📊', name: 'Public', price: 450, desc: 'Affiche les % du public' },
];

export const Shop: React.FC<ShopProps> = ({ profile, onBuy, onClose }) => {
  const budget = profile.quizTotalScore;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glow-panel rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-title text-xl text-white">🏪 Boutique</h2>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">⭐</span>
            <span className="font-score text-lg font-bold text-amber-400">{budget.toLocaleString()}</span>
          </div>
        </div>
        <p className="text-white/40 text-xs mb-4">Dépense tes points quiz pour acheter des power-ups !</p>

        <div className="grid gap-2">
          {SHOP_ITEMS.map(item => {
            const owned = profile.lifelines[item.key];
            const canAfford = budget >= item.price;
            return (
              <div key={item.key} className="flex items-center gap-3 p-3 glass-panel rounded-xl">
                <div className="text-2xl w-10 text-center">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">{item.name}</span>
                    <span className="text-white/30 text-xs">×{owned}</span>
                  </div>
                  <p className="text-white/40 text-[11px]">{item.desc}</p>
                </div>
                <button
                  onClick={() => onBuy(item.key, item.price)}
                  disabled={!canAfford}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    canAfford ? 'btn-primary !py-2 !px-3' : 'bg-white/5 text-white/20 cursor-not-allowed'
                  }`}
                >
                  ⭐ {item.price}
                </button>
              </div>
            );
          })}
        </div>

        <button onClick={onClose} className="btn-secondary w-full mt-4 py-3 rounded-xl text-sm">Fermer</button>
      </div>
    </div>
  );
};
