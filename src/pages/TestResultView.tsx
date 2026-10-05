import React from 'react';
import { Award, CheckCircle, XCircle, Clock, EyeOff, ArrowLeft, UserCheck, HelpCircle } from 'lucide-react';
import { TestResultData, ResultBreakdownItem } from '../types.ts';

interface TestResultViewProps {
  result: TestResultData;
  showCorrectAnswers: boolean;
  breakdown?: ResultBreakdownItem[];
  onBackToDashboard: () => void;
  onGoToProfile: () => void;
}

export const TestResultView: React.FC<TestResultViewProps> = ({
  result,
  showCorrectAnswers,
  breakdown,
  onBackToDashboard,
  onGoToProfile
}) => {
  const minutes = Math.floor(result.time_spent_seconds / 60);
  const seconds = result.time_spent_seconds % 60;
  const timeFormatted = `${minutes} daqiqa ${seconds} soniya`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      {/* Result Hero Banner */}
      <div
        className={`glass-panel rounded-3xl p-6 md:p-8 text-center border relative overflow-hidden mb-8 shadow-2xl ${
          result.passed
            ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-slate-950/70'
            : 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 to-slate-950/70'
        }`}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 shadow-xl">
          {result.passed ? (
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/40">
              <XCircle className="w-10 h-10 text-rose-400" />
            </div>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
          {result.passed ? 'Tabriklaymiz! Siz Testdan O‘tdingiz' : 'Afsuski, O‘tish Balli To‘planmadi'}
        </h1>
        <p className="text-xs md:text-sm text-slate-300 max-w-md mx-auto mb-6">
          {result.passed
            ? 'Siz belgilangan o‘tish foizini muvaffaqiyatli bajardingiz.'
            : 'Xatolaringiz ustida ishlab, qayta urinib ko‘rishingiz mumkin.'}
        </p>

        {/* Stats 4-Column Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 mb-6 text-slate-200">
          <div>
            <span className="text-[11px] text-slate-400 block">To‘plangan Ball</span>
            <span className="text-xl md:text-2xl font-mono font-bold text-white">
              {result.score} <span className="text-xs font-normal text-slate-400">/ {result.max_score}</span>
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Natija Foizi</span>
            <span className={`text-xl md:text-2xl font-mono font-bold ${result.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
              {result.percentage}%
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Sarflangan Vaqt</span>
            <span className="text-xs md:text-sm font-mono font-medium text-slate-200 block pt-1.5">
              {timeFormatted}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Oynadan Chiqishlar</span>
            <span className={`text-xl md:text-2xl font-mono font-bold ${result.tab_switch_count > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {result.tab_switch_count} <span className="text-xs font-normal text-slate-400">marta</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Testlar Ro‘yxati
          </button>
          <button
            onClick={onGoToProfile}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all"
          >
            <UserCheck className="w-4 h-4" />
            Mening Natijalarim
          </button>
        </div>
      </div>

      {/* Questions Breakdown (Only if teacher enabled show_correct_answers) */}
      {showCorrectAnswers && breakdown && breakdown.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              Savollar Tahlili va To‘g‘ri Javoblar
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              {breakdown.length} ta savol
            </span>
          </div>

          {breakdown.map((item, index) => (
            <div
              key={item.question_id || index}
              className={`p-4 md:p-5 rounded-2xl border transition-all ${
                item.is_correct
                  ? 'bg-emerald-950/15 border-emerald-500/30'
                  : 'bg-rose-950/15 border-rose-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded">
                  #{index + 1}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    item.is_correct
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {item.is_correct ? `To‘g‘ri (+${item.earned_points} ball)` : 'Noto‘g‘ri (0 ball)'}
                </span>
              </div>

              <h4 className="text-sm md:text-base font-semibold text-white mb-3">
                {item.question_text}
              </h4>

              {/* Options */}
              {item.options && (
                <div className="space-y-1.5 mb-3 text-xs">
                  {item.options.map((opt) => {
                    const isSelected = item.selected_option_id === opt.id;
                    const isCorrect = opt.is_correct || opt.id === item.correct_option_id;

                    return (
                      <div
                        key={opt.id}
                        className={`p-2 rounded-lg border flex items-center justify-between ${
                          isCorrect
                            ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200'
                            : isSelected
                            ? 'bg-rose-500/20 border-rose-500/60 text-rose-200'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{opt.option_label})</span>
                          <span>{opt.option_text}</span>
                        </div>
                        {isCorrect && (
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                            To‘g‘ri javob
                          </span>
                        )}
                        {!isCorrect && isSelected && (
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                            Sizning javobingiz
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Explanation */}
              {item.explanation && (
                <div className="mt-2 p-2.5 bg-slate-900/70 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <span className="font-semibold text-cyan-400">O‘qituvchi izohi: </span>
                  {item.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6 text-center border border-slate-800 text-slate-400">
          <p className="text-xs">
            O‘qituvchi ushbu test uchun to‘g‘ri javoblarni ko‘rsatishni o‘chirib qo‘ygan.
          </p>
        </div>
      )}
    </div>
  );
};
