import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Clock, Check, ChevronLeft, ChevronRight, AlertTriangle, Wifi, WifiOff, Send, HelpCircle, EyeOff } from 'lucide-react';
import { Question, TestResultData, ResultBreakdownItem } from '../types.ts';

interface StudentTestRoomProps {
  testId: string;
  onFinish: (result: TestResultData, showCorrect: boolean, breakdown?: ResultBreakdownItem[]) => void;
  onCancel: () => void;
}

export const StudentTestRoom: React.FC<StudentTestRoomProps> = ({
  testId,
  onFinish,
  onCancel
}) => {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [testTitle, setTestTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // Timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const expiresAtRef = useRef<number | null>(null);

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [tabSwitchAlert, setTabSwitchAlert] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Offline queue for answers
  const offlineQueueRef = useRef<Record<string, string>>({});

  // 1. Initialize or Resume Test Attempt
  useEffect(() => {
    let isMounted = true;
    const initTest = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('cosmo_student_token');
        const res = await fetch(`/api/student/tests/${testId}/start`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Testni boshlashda xatolik yuz berdi');

        if (!isMounted) return;

        setAttemptId(data.attemptId);
        setTestTitle(data.test.title);
        setQuestions(data.questions || []);

        // Load saved answers (server + local recovery if any)
        const localCached = localStorage.getItem(`cosmo_attempt_${data.attemptId}`);
        let initialAnswers = data.currentAnswers || {};
        if (localCached) {
          try {
            initialAnswers = { ...initialAnswers, ...JSON.parse(localCached) };
          } catch (e) {
            console.error(e);
          }
        }
        setCurrentAnswers(initialAnswers);

        // Compute remaining seconds from server expiresAt
        const expiresMs = new Date(data.expiresAt).getTime();
        expiresAtRef.current = expiresMs;
        const nowMs = new Date(data.serverTime).getTime();
        const diffSec = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
        setTimeLeftSeconds(diffSec);
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initTest();

    return () => {
      isMounted = false;
    };
  }, [testId]);

  // 2. Server-Authoritative Timer
  useEffect(() => {
    if (timeLeftSeconds === null) return;

    const timer = setInterval(() => {
      if (expiresAtRef.current) {
        const remaining = Math.max(0, Math.floor((expiresAtRef.current - Date.now()) / 1000));
        setTimeLeftSeconds(remaining);

        if (remaining <= 0) {
          clearInterval(timer);
          // Auto submit when time expired!
          handleAutoSubmitOnTimeout();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeftSeconds]);

  // 3. Tab-Switch & Visibility Monitoring (Section 12)
  useEffect(() => {
    if (!attemptId) return;

    const logTabSwitch = async (type: string) => {
      setTabSwitchAlert(true);
      setTimeout(() => setTabSwitchAlert(false), 4500);

      try {
        const token = localStorage.getItem('cosmo_student_token');
        await fetch(`/api/student/attempts/${attemptId}/tab-switch`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ eventType: type })
        });
      } catch (e) {
        console.error('Tab switch log xatosi:', e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logTabSwitch('visibility_hidden');
      } else {
        logTabSwitch('visibility_visible');
      }
    };

    const handleBlur = () => {
      logTabSwitch('blur');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [attemptId]);

  // 4. Offline / Online Connectivity Listeners & Sync (Section 10, 11)
  const syncOfflineAnswers = useCallback(async () => {
    if (!attemptId || Object.keys(offlineQueueRef.current).length === 0) return;

    try {
      setSavingStatus('saving');
      const token = localStorage.getItem('cosmo_student_token');
      const res = await fetch(`/api/student/attempts/${attemptId}/autosave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers: offlineQueueRef.current })
      });
      if (res.ok) {
        offlineQueueRef.current = {};
        setSavingStatus('saved');
      }
    } catch (e) {
      console.error('Offline sinxronlash xatosi:', e);
      setSavingStatus('offline');
    }
  }, [attemptId]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineAnswers();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSavingStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineAnswers]);

  // 5. Debounced Autosave on Answer Selection
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const saveAnswerToServer = useCallback((answersToSave: Record<string, string>) => {
    if (!attemptId) return;

    // Cache locally immediately in case of abrupt reload
    localStorage.setItem(`cosmo_attempt_${attemptId}`, JSON.stringify(answersToSave));

    if (!navigator.onLine) {
      offlineQueueRef.current = { ...offlineQueueRef.current, ...answersToSave };
      setSavingStatus('offline');
      return;
    }

    setSavingStatus('saving');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('cosmo_student_token');
        const res = await fetch(`/api/student/attempts/${attemptId}/autosave`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ answers: answersToSave })
        });
        const data = await res.json();
        if (data.saved) {
          setSavingStatus('saved');
        } else if (data.isExpired) {
          handleAutoSubmitOnTimeout();
        }
      } catch (err) {
        console.warn('Autosave xatosi:', err);
        setSavingStatus('offline');
        offlineQueueRef.current = { ...offlineQueueRef.current, ...answersToSave };
      }
    }, 600);
  }, [attemptId]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    const updated = {
      ...currentAnswers,
      [questionId]: optionId
    };
    setCurrentAnswers(updated);
    saveAnswerToServer(updated);
  };

  // 6. Submit Handlers
  const handleAutoSubmitOnTimeout = async () => {
    if (!attemptId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('cosmo_student_token');
      const res = await fetch(`/api/student/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers: currentAnswers })
      });
      const data = await res.json();
      localStorage.removeItem(`cosmo_attempt_${attemptId}`);
      onFinish(data.result, data.show_correct_answers, data.breakdown);
    } catch (err: any) {
      alert('Vaqt tugadi va test topshirildi: ' + (err.message || ''));
      onCancel();
    }
  };

  const handleFinalSubmit = async () => {
    if (!attemptId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('cosmo_student_token');
      const res = await fetch(`/api/student/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers: currentAnswers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Natijani hisoblashda xatolik yuz berdi');

      localStorage.removeItem(`cosmo_attempt_${attemptId}`);
      onFinish(data.result, data.show_correct_answers, data.breakdown);
    } catch (err: any) {
      alert('Testni yakunlashda xatolik: ' + err.message);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Test yuklanmoqda va server bilan sinxronlanmoqda...</p>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="max-w-lg mx-auto my-12 p-6 glass-panel rounded-2xl text-center border border-rose-500/30">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">Xatolik</h2>
        <p className="text-sm text-slate-300 mb-6">{error || 'Ushbu testda savollar mavjud emas'}</p>
        <button
          onClick={onCancel}
          className="px-5 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
        >
          Testlar Ro‘yxatiga Qaytish
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(currentAnswers).length;
  const progressPercent = (answeredCount / questions.length) * 100;

  // Format timer MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 md:py-6">
      {/* Tab Switch Warning Toast */}
      {tabSwitchAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-amber-500/95 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl animate-bounce text-xs md:text-sm">
          <EyeOff className="w-4 h-4 shrink-0" />
          <span>Diqqat: Test oynasidan chiqish qayd etildi va tizimga yozildi!</span>
        </div>
      )}

      {/* Top Test Header Bar */}
      <div className="glass-panel rounded-2xl p-4 mb-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-cyan-400">
              Savol {currentIndex + 1} / {questions.length}
            </span>
            <span className="text-slate-600">·</span>
            {savingStatus === 'saving' ? (
              <span className="text-[11px] text-amber-400 flex items-center gap-1">
                Saqlanmoqda...
              </span>
            ) : savingStatus === 'offline' ? (
              <span className="text-[11px] text-rose-400 flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> Offline (Navbatda)
              </span>
            ) : (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saqlangan
              </span>
            )}
          </div>
          <h2 className="text-sm md:text-base font-bold text-white truncate">
            {testTitle}
          </h2>
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {timeLeftSeconds !== null && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm md:text-base border transition-all ${
                timeLeftSeconds < 120
                  ? 'bg-rose-950/60 border-rose-500/80 text-rose-300 animate-pulse'
                  : 'bg-slate-900/80 border-slate-700 text-cyan-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeLeftSeconds)}</span>
            </div>
          )}

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all whitespace-nowrap"
          >
            Yakunlash
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-900/80 h-1.5 rounded-full mb-4 overflow-hidden border border-slate-800">
        <div
          className="bg-cyan-400 h-full transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Question Card (HIGH Z-INDEX & HIGH CONTRAST) */}
      <div className="glass-panel rounded-2xl p-5 md:p-8 border border-slate-700/80 mb-5 text-slate-100 shadow-xl relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
            {currentQ.question_type === 'true_false' ? 'To‘g‘ri / Noto‘g‘ri' : 'Bitta to‘g‘ri variant'}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {currentQ.points} ball
          </span>
        </div>

        {/* Question Text */}
        <h3 className="text-base md:text-xl font-semibold text-white leading-relaxed mb-6 select-none">
          {currentQ.question_text}
        </h3>

        {/* Options List */}
        <div className="space-y-3">
          {currentQ.options.map((option) => {
            const isSelected = currentAnswers[currentQ.id] === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectOption(currentQ.id, option.id)}
                className={`w-full text-left p-3.5 md:p-4 rounded-xl border transition-all flex items-start gap-3 select-none ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-400 text-white ring-1 ring-cyan-400 shadow-lg shadow-cyan-950/40'
                    : 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {option.option_label}
                </div>
                <div className="flex-1 text-sm md:text-base leading-snug pt-0.5">
                  {option.option_text}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prev / Next Navigation Buttons */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Oldingi
        </button>

        <span className="text-xs text-slate-400 font-medium">
          {answeredCount} / {questions.length} javob berildi
        </span>

        <button
          onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
          disabled={currentIndex === questions.length - 1}
          className="flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Keyingi
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Question Grid Navigator */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800">
        <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Savollar Navigatsiyasi</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Javob berilgan
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800 inline-block" /> Berilmagan
            </span>
          </div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-2">
          {questions.map((q, idx) => {
            const isAnswered = !!currentAnswers[q.id];
            const isCurrent = idx === currentIndex;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-9 rounded-lg text-xs font-mono font-bold transition-all ${
                  isCurrent
                    ? 'ring-2 ring-cyan-400 bg-cyan-950/70 text-cyan-300 scale-105'
                    : isAnswered
                    ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/40'
                    : 'bg-slate-900/70 border border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-2xl border border-slate-700/80 p-6 text-center text-slate-100 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Testni Yakunlaysizmi?</h3>
            <p className="text-xs text-slate-300 mb-4">
              Jami <span className="font-semibold text-white">{questions.length}</span> ta savoldan{' '}
              <span className="font-semibold text-cyan-400">{answeredCount}</span> tasiga javob berildi.
              {answeredCount < questions.length && (
                <span className="block text-amber-400 mt-1 font-medium">
                  {questions.length - answeredCount} ta savol javobsiz qoldi!
                </span>
              )}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl transition-colors"
              >
                Davom etish
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="flex-1 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-lg shadow-emerald-400/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Topshirilmoqda...' : 'Ha, Yakunlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
