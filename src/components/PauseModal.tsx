import React from 'react';

interface PauseModalProps {
  onResume: () => void;
  onQuit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onQuit }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glow-panel rounded-2xl p-8 max-w-sm w-full mx-4">
        <div className="text-center">
          <div className="text-5xl mb-3">⏸️</div>
          <h2 className="font-title text-2xl text-white mb-1">PAUSE</h2>
          <p className="text-white/50 mb-6">Le chrono est arrêté</p>
          <div className="space-y-3">
            <button onClick={onResume} className="btn-primary w-full py-4 rounded-xl text-base">
              ▶ Reprendre
            </button>
            <button onClick={onQuit} className="btn-secondary w-full py-3 rounded-xl text-sm">
              Quitter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
