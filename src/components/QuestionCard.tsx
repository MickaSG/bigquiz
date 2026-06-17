import React, { useState, useEffect } from 'react';
import { Question } from '../data/questions';

interface QuestionCardProps {
  question: Question;
  selectedAnswer: number | null;
  showAnswer: boolean;
  onAnswer: (index: number) => void;
  hiddenOptions: number[];
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question, selectedAnswer, showAnswer, onAnswer, hiddenOptions
}) => {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(false);
    const t = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(t);
  }, [question.id]);

  const optionLabels = ['A', 'B', 'C', 'D'];
  const optionColors = [
    { bg: 'from-cyan-500/10 to-cyan-600/10', border: 'border-cyan-500/30 hover:border-cyan-400', label: 'bg-cyan-500/20 text-cyan-400' },
    { bg: 'from-green-500/10 to-green-600/10', border: 'border-green-500/30 hover:border-green-400', label: 'bg-green-500/20 text-green-400' },
    { bg: 'from-amber-500/10 to-amber-600/10', border: 'border-amber-500/30 hover:border-amber-400', label: 'bg-amber-500/20 text-amber-400' },
    { bg: 'from-pink-500/10 to-pink-600/10', border: 'border-pink-500/30 hover:border-pink-400', label: 'bg-pink-500/20 text-pink-400' },
  ];

  const points = question.difficulty === 'easy' ? 100 : question.difficulty === 'medium' ? 200 : 300;

  return (
    <div className={`w-full max-w-3xl mx-auto transition-all duration-500 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      {/* Question */}
      <div className="glow-panel rounded-2xl p-5 md:p-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/40 text-sm font-medium">Question</span>
          <span className={`text-xs px-2.5 py-1 rounded-md font-bold ${
            question.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
            question.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
            'bg-pink-500/20 text-pink-400'
          }`}>+{points} pts</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
          {question.question}
        </h2>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {question.options.map((option, idx) => {
          if (hiddenOptions.includes(idx)) return (
            <div key={idx} className="p-4 rounded-xl border border-white/5 bg-white/2 opacity-25">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white/30">
                  {optionLabels[idx]}
                </span>
                <span className="text-white/30 line-through">{option}</span>
              </div>
            </div>
          );

          const isSelected = selectedAnswer === idx;
          const isCorrect = idx === question.correct;
          const showCorrect = showAnswer && isCorrect;
          const showWrong = showAnswer && isSelected && !isCorrect;

          return (
            <button
              key={idx}
              onClick={() => !showAnswer && onAnswer(idx)}
              disabled={showAnswer}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left
                ${showCorrect ? 'bg-green-500/20 border-green-400 scale-[1.02] shadow-lg shadow-green-500/20' :
                  showWrong ? 'bg-red-500/20 border-red-400 scale-[0.98] shadow-lg shadow-red-500/20' :
                  isSelected && !showAnswer ? 'bg-white/10 border-white/40 scale-[1.02]' :
                  `bg-gradient-to-r ${optionColors[idx].bg} ${optionColors[idx].border} cursor-pointer hover:scale-[1.02] active:scale-[0.98]`
                }
              `}
            >
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all
                  ${showCorrect ? 'bg-green-500 text-white' :
                    showWrong ? 'bg-red-500 text-white' :
                    optionColors[idx].label
                  }
                `}>
                  {showCorrect ? '✓' : showWrong ? '✗' : optionLabels[idx]}
                </span>
                <span className={`font-semibold text-base ${
                  showCorrect ? 'text-green-200' : showWrong ? 'text-red-200' : 'text-white'
                }`}>
                  {option}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Fun Fact */}
      {showAnswer && question.funFact && (
        <div className="mt-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 animate-fade-in">
          <div className="flex items-start gap-2">
            <span className="text-xl">💡</span>
            <div>
              <p className="text-purple-300 text-sm font-bold">Le saviez-vous ?</p>
              <p className="text-white/80 text-sm mt-1">{question.funFact}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
