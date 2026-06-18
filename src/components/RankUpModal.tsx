import React, { useEffect } from 'react';
import { useConfetti } from '../hooks/useConfetti';

interface RankUpModalProps {
  rankName: string;
  rankIcon: string;
  rankColor: string;
  onClose: () => void;
}

export const RankUpModal: React.FC<RankUpModalProps> = ({ rankName, rankIcon, rankColor, onClose }) => {
  const { fire, fireStars, fireSides } = useConfetti();

  useEffect(() => {
    fire();
    setTimeout(fireStars, 300);
    setTimeout(fireSides, 600);
    setTimeout(fire, 900);
  }, [fire, fireStars, fireSides]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="text-center animate-rank-up" onClick={e => e.stopPropagation()}>
        <div className="text-8xl mb-4">{rankIcon}</div>
        <h1 className="font-title text-3xl md:text-4xl text-white mb-2">RANG SUPÉRIEUR !</h1>
        <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r ${rankColor} text-white text-xl font-bold mb-6 shadow-lg`}>
          {rankIcon} {rankName}
        </div>
        <div>
          <button onClick={onClose} className="btn-primary px-8 py-3 rounded-xl text-base">
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
};
