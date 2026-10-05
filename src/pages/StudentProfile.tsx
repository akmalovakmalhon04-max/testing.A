import React, { useEffect, useState } from 'react';
import { User, Phone, Users, Award, TrendingUp, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Profile, Group } from '../types.ts';

interface HistoryItem {
  id: string;
  test_title: string;
  subject: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  time_spent_seconds: number;
  tab_switch_count: number;
  date: string;
}

export const StudentProfile: React.FC = () => {
  const [profileData, setProfileData] = useState<{
    student: Profile;
    groups: Group[];
    history: HistoryItem[];
    total_tests_taken: number;
    average_percentage: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('cosmo_student_token');
        const res = await fetch('/api/student/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setProfileData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileData || !profileData.student) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 glass-panel rounded-2xl text-center">
        <p className="text-sm text-slate-300">Profil ma’lumotlari topilmadi</p>
      </div>
    );
  }

  const { student, groups, history, total_tests_taken, average_percentage } = profileData;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      {/* Profile Card */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 mb-8 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-cyan-500/20">
              {student.first_name[0]}{student.last_name[0]}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                {student.first_name} {student.last_name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1 font-mono text-cyan-300">
                  <Phone className="w-3.5 h-3.5" />
                  {student.phone}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {groups.length > 0 ? groups.map(g => g.name).join(', ') : 'Guruhsiz'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-900/80 px-4 py-3 rounded-2xl border border-slate-800 text-center flex-1 sm:flex-initial min-w-[110px]">
              <span className="text-[11px] text-slate-400 block">Topshirilgan</span>
              <span className="text-xl font-bold font-mono text-white">{total_tests_taken} ta</span>
            </div>
            <div className="bg-slate-900/80 px-4 py-3 rounded-2xl border border-slate-800 text-center flex-1 sm:flex-initial min-w-[110px]">
              <span className="text-[11px] text-slate-400 block">O‘rtacha Ball</span>
              <span className="text-xl font-bold font-mono text-cyan-400">{average_percentage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Score Trend Chart (Responsive SVG) */}
      {history.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 md:p-8 mb-8 border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Natijalarning Vaqt Bo‘yicha Dinamikasi
            </h2>
            <span className="text-xs text-slate-400">Foiz hisobida (0 - 100%)</span>
          </div>

          <div className="h-48 w-full flex items-end gap-2 pt-6 pb-2 border-b border-slate-800">
            {history.map((item, idx) => {
              const heightPercent = Math.max(10, item.percentage);
              return (
                <div key={item.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-1.5 rounded border border-slate-700 pointer-events-none whitespace-nowrap z-20 shadow-xl">
                    <p className="font-bold">{item.test_title}</p>
                    <p className="text-cyan-300 font-mono">{item.percentage}% ({item.score}/{item.max_score})</p>
                  </div>

                  <div
                    className={`w-full max-w-[42px] rounded-t-lg transition-all ${
                      item.passed
                        ? 'bg-gradient-to-t from-emerald-600/40 to-cyan-400 group-hover:brightness-125'
                        : 'bg-gradient-to-t from-rose-900/40 to-rose-500 group-hover:brightness-125'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[48px]">
                    #{idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results History Table */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800">
        <h2 className="text-base md:text-lg font-bold text-white mb-4">
          Barcha Topshirilgan Testlar Tarixi
        </h2>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            Hali birorta ham test topshirilmagan.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Test</th>
                  <th className="py-3 px-3">Fan</th>
                  <th className="py-3 px-3">Sana</th>
                  <th className="py-3 px-3">Ball</th>
                  <th className="py-3 px-3">Foiz</th>
                  <th className="py-3 px-3">Holat</th>
                  <th className="py-3 px-3">Sarflangan Vaqt</th>
                  <th className="py-3 px-3">Oynadan Chiqishlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">{row.test_title}</td>
                    <td className="py-3 px-3 text-cyan-400">{row.subject}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {new Date(row.date).toLocaleDateString('uz-UZ')}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      {row.score} / {row.max_score}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      {row.percentage}%
                    </td>
                    <td className="py-3 px-3">
                      {row.passed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> O‘TDI
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          <XCircle className="w-3 h-3" /> O‘TMADI
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {Math.floor(row.time_spent_seconds / 60)} daq {row.time_spent_seconds % 60} son
                    </td>
                    <td className="py-3 px-3 font-mono text-center">
                      <span className={row.tab_switch_count > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                        {row.tab_switch_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
