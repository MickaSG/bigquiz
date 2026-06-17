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
    'from-blue-500/20 to-blue-600/20 border-blue-500/30 hover:border-blue-400',
    'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 hover:border-emerald-400',
    'from-amber-500/20 to-amber-600/20 border-amber-500/30 hover:border-amber-400',
    'from-purple-500/20 to-purple-600/20 border-purple-500/30 hover:border-purple-400',
  ];

  return (
    <div className={`w-full max-w-3xl mx-auto transition-all duration-500 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {/* Question */}
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 mb-6 border border-white/10 shadow-2xl">
        <div className="flex items-start gap-3 mb-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            question.difficulty === 'easy' ? 'bg-green-500/20 text-green-300' :
            question.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-300' :
            'bg-red-500/20 text-red-300'
          }`}>
            {question.difficulty === 'easy' ? '+100' : question.difficulty === 'medium' ? '+200' : '+300'}
          </span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
          {question.question}
        </h2>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {question.options.map((option, idx) => {
          if (hiddenOptions.includes(idx)) return (
            <div key={idx} className="p-4 rounded-2xl border border-white/5 bg-white/2 opacity-30">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white/30">
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
              className={`relative p-4 rounded-2xl border-2 transition-all duration-300 text-left group
                ${showCorrect ? 'bg-emerald-500/30 border-emerald-400 scale-[1.02] shadow-lg shadow-emerald-500/20' :
                  showWrong ? 'bg-red-500/30 border-red-400 scale-[0.98] shadow-lg shadow-red-500/20' :
                  isSelected && !showAnswer ? 'bg-white/15 border-white/40 scale-[1.02]' :
                  `bg-gradient-to-r ${optionColors[idx]} border cursor-pointer hover:scale-[1.02] hover:bg-white/10 active:scale-[0.98]`
                }
              `}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all
                  ${showCorrect ? 'bg-emerald-500 text-white' :
                    showWrong ? 'bg-red-500 text-white' :
                    'bg-white/10 text-white group-hover:bg-white/20'
                  }
                `}>
                  {showCorrect ? '✓' : showWrong ? '✗' : optionLabels[idx]}
                </span>
                <span className={`font-medium text-base ${
                  showCorrect ? 'text-emerald-200' : showWrong ? 'text-red-200' : 'text-white'
                }`}>
                  {option}
                </span>
              </div>
              {showCorrect && (
                <div className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Fun Fact */}
      {showAnswer && question.funFact && (
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 animate-fade-in">
          <div className="flex items-start gap-2">
            <span className="text-xl">💡</span>
            <div>
              <p className="text-purple-200 text-sm font-medium">Le saviez-vous ?</p>
              <p className="text-white/80 text-sm mt-1">{question.funFact}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
