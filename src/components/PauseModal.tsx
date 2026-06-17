import React from 'react';

interface PauseModalProps {
  onResume: () => void;
  onQuit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onQuit }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900/95 rounded-3xl p-8 border border-white/10 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="text-5xl mb-4">⏸️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Pause</h2>
          <p className="text-white/50 mb-8">Prenez une pause, le temps est arrêté</p>
          <div className="space-y-3">
            <button
              onClick={onResume}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-95"
            >
              ▶️ Reprendre
            </button>
            <button
              onClick={onQuit}
              className="w-full py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition-all active:scale-95"
            >
              🚪 Quitter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
