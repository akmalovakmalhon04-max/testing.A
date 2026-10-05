import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, FileText, Trash2, Edit3, X, Save } from 'lucide-react';
import mammoth from 'mammoth';

export interface ParsedOption {
  option_label: string;
  option_text: string;
  is_correct: boolean;
}

export interface ParsedQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  points: number;
  explanation: string;
  options: ParsedOption[];
  hasError: boolean;
  errorMessage?: string;
}

interface QuestionImporterProps {
  onQuestionsConfirmed: (questions: ParsedQuestion[]) => void;
  onCancel: () => void;
}

export const QuestionImporter: React.FC<QuestionImporterProps> = ({
  onQuestionsConfirmed,
  onCancel
}) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedList, setParsedList] = useState<ParsedQuestion[] | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // File upload (.docx or .txt)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setInputText(result.value);
        parseQuestionsFromRaw(result.value);
      } else {
        const text = await file.text();
        setInputText(text);
        parseQuestionsFromRaw(text);
      }
    } catch (err: any) {
      alert('Faylni o‘qishda xatolik: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Parser logic with error detection
  const parseQuestionsFromRaw = (raw: string) => {
    if (!raw.trim()) return;

    // Normalize line endings
    const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split blocks by double newline or numbered items like "1.", "1)" or "Savol:"
    const lines = normalized.split('\n');
    const questionBlocks: string[][] = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (currentBlock.length > 0) {
          questionBlocks.push([...currentBlock]);
          currentBlock = [];
        }
        continue;
      }

      // Check if new question start (e.g. "1.", "1)", "1-savol", "Savol 1")
      const isNewQuestionHeader = /^(?:\d+[\.\)]|\d+-(?:savol|topshiriq)|savol\s*\d+)/i.test(trimmed);

      if (isNewQuestionHeader && currentBlock.length > 0) {
        questionBlocks.push([...currentBlock]);
        currentBlock = [trimmed];
      } else {
        currentBlock.push(trimmed);
      }
    }

    if (currentBlock.length > 0) {
      questionBlocks.push([...currentBlock]);
    }

    const parsed: ParsedQuestion[] = [];

    questionBlocks.forEach((blockLines, idx) => {
      let questionText = '';
      const options: ParsedOption[] = [];
      let explanation = '';
      let hasError = false;
      let errorMessage = '';

      let parsingOptions = false;

      for (let i = 0; i < blockLines.length; i++) {
        const line = blockLines[i];

        // Explanation line check
        if (/^(?:izoh|tushuntirish|sharh)[:\s]/i.test(line)) {
          explanation = line.replace(/^(?:izoh|tushuntirish|sharh)[:\s]*/i, '').trim();
          continue;
        }

        // Check if option line: A), *A), A., *A., or True/False
        const optionMatch = line.match(/^(\*?)\s*([A-Da-d])[\.\)]\s*(.*)$/);

        if (optionMatch) {
          parsingOptions = true;
          const isCorrect = optionMatch[1] === '*';
          const label = optionMatch[2].toUpperCase();
          const optText = optionMatch[3].trim();

          options.push({
            option_label: label,
            option_text: optText,
            is_correct: isCorrect
          });
        } else if (!parsingOptions) {
          // Clean question number if present
          const cleanLine = line.replace(/^(?:\d+[\.\)]|\d+-(?:savol|topshiriq)|savol\s*\d+[:\s]*)/i, '').trim();
          questionText += (questionText ? ' ' : '') + cleanLine;
        } else {
          // If we are parsing options, and line doesn't have A) label, append to last option or question
          if (options.length > 0) {
            options[options.length - 1].option_text += ' ' + line;
          }
        }
      }

      // Validations
      if (!questionText.trim()) {
        hasError = true;
        errorMessage = 'Savol matni kiritilmagan';
      } else if (options.length < 2) {
        hasError = true;
        errorMessage = 'Variantlar soni kamida 2 ta bo‘lishi kerak (A, B...)';
      } else {
        const correctCount = options.filter(o => o.is_correct).length;
        if (correctCount === 0) {
          hasError = true;
          errorMessage = 'To‘g‘ri javob belgilanmagan! (To‘g‘ri variant oldiga * yulduzcha qo‘ying, masalan *B) javob)';
        } else if (correctCount > 1) {
          hasError = true;
          errorMessage = 'Faqat bitta to‘g‘ri variant tanlanishi kerak';
        }
      }

      // Check if True/False
      const isTrueFalse = options.length === 2 &&
        options.some(o => /to['‘`]?g['‘`]?ri|rost|ha/i.test(o.option_text)) &&
        options.some(o => /noto['‘`]?g['‘`]?ri|yolg['‘`]?on|yo['‘`]?q/i.test(o.option_text));

      parsed.push({
        id: 'imported-q-' + (idx + 1),
        question_text: questionText.trim() || `Savol ${idx + 1}`,
        question_type: isTrueFalse ? 'true_false' : 'multiple_choice',
        points: 1,
        explanation: explanation.trim(),
        options,
        hasError,
        errorMessage
      });
    });

    setParsedList(parsed);
  };

  const handleStartParsing = () => {
    parseQuestionsFromRaw(inputText);
  };

  const handleUpdateOption = (qId: string, optIndex: number, text: string) => {
    if (!parsedList) return;
    setParsedList(parsedList.map(q => {
      if (q.id !== qId) return q;
      const newOpts = [...q.options];
      newOpts[optIndex].option_text = text;
      return { ...q, options: newOpts };
    }));
  };

  const handleSetCorrect = (qId: string, optIndex: number) => {
    if (!parsedList) return;
    setParsedList(parsedList.map(q => {
      if (q.id !== qId) return q;
      const newOpts = q.options.map((opt, i) => ({
        ...opt,
        is_correct: i === optIndex
      }));
      return {
        ...q,
        options: newOpts,
        hasError: false,
        errorMessage: undefined
      };
    }));
  };

  const handleUpdateQuestionText = (qId: string, text: string) => {
    if (!parsedList) return;
    setParsedList(parsedList.map(q => q.id === qId ? { ...q, question_text: text } : q));
  };

  const handleUpdatePoints = (qId: string, points: number) => {
    if (!parsedList) return;
    setParsedList(parsedList.map(q => q.id === qId ? { ...q, points } : q));
  };

  const handleDeleteQuestion = (qId: string) => {
    if (!parsedList) return;
    setParsedList(parsedList.filter(q => q.id !== qId));
  };

  const errorCount = parsedList ? parsedList.filter(q => q.hasError).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl glass-panel rounded-2xl border border-slate-700/60 p-6 my-8 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Savollarni Tezkor Qo‘shish (Word / Matn)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Word (.docx) faylini yuklang yoki matnni nusxalab joylashtiring. Yulduzcha (*) to‘g‘ri javobni bildiradi.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!parsedList ? (
          <div className="mt-5 space-y-4">
            {/* Word File Upload Area */}
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl p-6 text-center transition-colors bg-slate-900/40">
              <input
                type="file"
                id="docUpload"
                accept=".docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
              <label htmlFor="docUpload" className="cursor-pointer flex flex-col items-center">
                <Upload className="w-10 h-10 text-cyan-400 mb-2" />
                <span className="text-sm font-semibold text-white">Word (.docx) yoki .txt faylni tanlang</span>
                <span className="text-xs text-slate-400 mt-1">Avtomatik matn ajratib olinadi</span>
              </label>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Yoki matnni to‘g‘ridan-to‘g‘ri joylang:</label>
                <button
                  type="button"
                  onClick={() => setInputText(`1. O'zbekiston poytaxti qaysi shahar?
A) Samarqand
*B) Toshkent
C) Buxoro
D) Xiva
Izoh: Toshkent O'zbekistonning rasmiy poytaxti hisoblanadi.

2. 2 + 2 * 2 amali nechiga teng?
A) 8
*B) 6
C) 4
D) 10`)}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Namuna kiritish
                </button>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={10}
                placeholder={`1. Savol matni?\nA) variant\n*B) to'g'ri variant\nC) variant\nD) variant\nIzoh: savol izohi...`}
                className="w-full rounded-xl bg-slate-900/80 border border-slate-700 p-3.5 text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={!inputText.trim() || isProcessing}
                onClick={handleStartParsing}
                className="px-5 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-lg shadow-cyan-600/30 transition-all"
              >
                {isProcessing ? 'Tahlil qilinmoqda...' : 'Savollarni Tahlil Qilish (Preview)'}
              </button>
            </div>
          </div>
        ) : (
          /* PREVIEW STAGE WITH INLINE EDITING AND ERROR HIGHLIGHTING */
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between bg-slate-900/70 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Aniqlangan savollar: {parsedList.length} ta</span>
                {errorCount > 0 ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                    <AlertCircle className="w-3.5 h-3.5" /> {errorCount} ta xato bor!
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Barcha savollar to‘g‘ri formatlangan
                  </span>
                )}
              </div>
              <button
                onClick={() => setParsedList(null)}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Qaytadan matn kiritish
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
              {parsedList.map((q, idx) => (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border transition-all ${
                    q.hasError
                      ? 'border-rose-500/60 bg-rose-950/20'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <span className="text-xs text-slate-400">Ball:</span>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={q.points}
                          onChange={(e) => handleUpdatePoints(q.id, Number(e.target.value) || 1)}
                          className="w-16 px-1.5 py-0.5 text-xs bg-slate-800 border border-slate-700 rounded text-center text-white"
                        />
                      </div>
                      <input
                        type="text"
                        value={q.question_text}
                        onChange={(e) => handleUpdateQuestionText(q.id, e.target.value)}
                        className="w-full text-sm font-medium text-white bg-slate-800/60 border border-slate-700 rounded-lg p-2 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Savolni o‘chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                          opt.is_correct
                            ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-200'
                            : 'border-slate-800 bg-slate-900/80 text-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSetCorrect(q.id, oIdx)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            opt.is_correct
                              ? 'bg-emerald-500 text-slate-950 shadow-md'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                          title="To‘g‘ri javob deb belgilash"
                        >
                          {opt.option_label}
                        </button>
                        <input
                          type="text"
                          value={opt.option_text}
                          onChange={(e) => handleUpdateOption(q.id, oIdx, e.target.value)}
                          className="flex-1 text-xs bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-100"
                        />
                        {opt.is_correct && (
                          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                            To‘g‘ri
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Error Notification */}
                  {q.hasError && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-400 font-medium bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{q.errorMessage}</span>
                    </div>
                  )}

                  {/* Explanation preview */}
                  {q.explanation && (
                    <div className="mt-2 text-xs text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-800/80">
                      <span className="font-semibold text-slate-300">Izoh:</span> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
              >
                Bekor qilish
              </button>

              <div className="flex items-center gap-2">
                {errorCount > 0 && (
                  <span className="text-xs text-rose-400 font-medium mr-2">
                    Saqlashdan oldin xatoliklarni to‘g‘rilang!
                  </span>
                )}
                <button
                  type="button"
                  disabled={errorCount > 0 || parsedList.length === 0}
                  onClick={() => onQuestionsConfirmed(parsedList)}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none rounded-lg shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <Save className="w-4 h-4" />
                  Savollarni Saqlash ({parsedList.length} ta)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
