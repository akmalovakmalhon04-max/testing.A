import React, { useEffect, useState } from 'react';
import { Clock, HelpCircle, Award, CheckCircle, AlertTriangle, ArrowRight, Play, RefreshCw, Calendar } from 'lucide-react';
import { TestSummary, Profile, Group } from '../types.ts';

interface StudentDashboardProps {
  currentUser: Profile;
  userGroups: Group[];
  onStartTest: (testId: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  userGroups,
  onStartTest
}) => {
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('cosmo_student_token');
      const res = await fetch('/api/student/tests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Testlarni yuklashda xatolik');
      setTests(data.tests || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const getStatusBadge = (test: TestSummary) => {
    switch (test.status) {
      case 'in_progress':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5" /> Davom etmoqda
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5" /> Tugallangan ({test.latest_result?.percentage}%)
          </span>
        );
      case 'no_attempts_left':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
            Urinish qolmagan
          </span>
        );
      case 'closed':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
            Yopilgan
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
            Boshlanmagan
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      {/* Student Welcome Header */}
      <div className="glass-panel rounded-2xl p-6 mb-8 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Xush kelibsiz, {currentUser.first_name}! 🚀
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Guruhlaringiz:{' '}
              {userGroups.length > 0 ? (
                <span className="text-cyan-400 font-medium">
                  {userGroups.map(g => g.name).join(', ')}
                </span>
              ) : (
                <span className="text-slate-500 italic">Hali guruhga biriktirilmagan</span>
              )}
            </p>
          </div>
          <button
            onClick={fetchTests}
            className="self-start md:self-auto flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
        </div>
      </div>

      {/* Tests Grid */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span>Menga Biriktirilgan Testlar</span>
          <span className="text-xs font-mono font-normal text-slate-400">
            ({tests.length} ta)
          </span>
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="glass-card rounded-2xl p-6 h-48 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-6 text-center text-rose-400 border border-rose-500/20">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center border border-slate-800 text-slate-400">
          <Clock className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-200">Hozirda faol testlar yo‘q</h3>
          <p className="text-xs text-slate-400 mt-1">
            O‘qituvchi sizning guruhingiz uchun yangi test e’lon qilganda bu yerda ko‘rinadi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tests.map(test => {
            const canStart = test.status === 'not_started' || test.status === 'in_progress' || (test.remaining_attempts > 0 && test.status !== 'closed');

            return (
              <div
                key={test.id}
                className="glass-card rounded-2xl p-6 border border-slate-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-medium text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                      {test.subject}
                    </span>
                    {getStatusBadge(test)}
                  </div>

                  <h3 className="text-base md:text-lg font-bold text-white tracking-tight mb-1.5">
                    {test.title}
                  </h3>
                  {test.description && (
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                      {test.description}
                    </p>
                  )}

                  {/* Test Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 border-y border-slate-800/60 my-3 text-xs text-slate-300">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Savollar</span>
                      <span className="font-semibold text-slate-200">{test.questions_count} ta</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Vaqt</span>
                      <span className="font-semibold text-slate-200">{test.duration_minutes} daqiqa</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">O‘tish foizi</span>
                      <span className="font-semibold text-slate-200">{test.passing_percentage}%</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Qolgan urinish</span>
                      <span className="font-semibold text-slate-200">
                        {test.remaining_attempts} / {test.max_attempts}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Muddati: {test.ends_at ? new Date(test.ends_at).toLocaleDateString('uz-UZ') : 'Cheklovsiz'}</span>
                  </div>

                  <button
                    disabled={!canStart}
                    onClick={() => onStartTest(test.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      test.status === 'in_progress'
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-400/20'
                        : canStart
                        ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md shadow-cyan-400/20'
                        : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {test.status === 'in_progress' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Davom ettirish
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Boshlash
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
