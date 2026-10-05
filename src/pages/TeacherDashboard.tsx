import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, GraduationCap, FileCheck2, BarChart3,
  UserX, Download, History, Plus, Trash2, Edit2, CheckCircle2,
  AlertCircle, RefreshCw, Eye, RotateCcw, X, Search, Filter
} from 'lucide-react';
import { Group, Profile } from '../types.ts';
import { QuestionImporter, ParsedQuestion } from '../components/QuestionImporter.tsx';

export const TeacherDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'groups' | 'students' | 'tests' | 'results' | 'unattempted' | 'question_stats' | 'audit'
  >('overview');

  // Stats
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Groups
  const [groups, setGroups] = useState<(Group & { student_count: number })[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedGroupForStudents, setSelectedGroupForStudents] = useState<Group | null>(null);
  const [groupStudents, setGroupStudents] = useState<Profile[]>([]);

  // Students
  const [allStudents, setAllStudents] = useState<(Profile & { groups: string[] })[]>([]);

  // Tests
  const [tests, setTests] = useState<any[]>([]);
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestSubject, setNewTestSubject] = useState('Matematika');
  const [newTestDesc, setNewTestDesc] = useState('');
  const [newTestDuration, setNewTestDuration] = useState(20);
  const [newTestMaxAttempts, setNewTestMaxAttempts] = useState(1);
  const [newTestPassPercent, setNewTestPassPercent] = useState(60);
  const [newTestShuffleQ, setNewTestShuffleQ] = useState(true);
  const [newTestShuffleOpt, setNewTestShuffleOpt] = useState(true);
  const [newTestShowAnswers, setNewTestShowAnswers] = useState(true);
  const [newTestSelectedGroups, setNewTestSelectedGroups] = useState<string[]>([]);
  const [newTestQuestions, setNewTestQuestions] = useState<ParsedQuestion[]>([]);
  const [showImporter, setShowImporter] = useState(false);

  // Results
  const [results, setResults] = useState<any[]>([]);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterTest, setFilterTest] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Unattempted
  const [selectedTestForUnattempted, setSelectedTestForUnattempted] = useState<string>('');
  const [unattemptedData, setUnattemptedData] = useState<any>(null);

  // Question Analytics
  const [selectedTestForAnalytics, setSelectedTestForAnalytics] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);

  // Audit
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const token = localStorage.getItem('cosmo_teacher_token') || 'teacher_admin_authorized';

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'x-admin-pin': '7788',
    'Content-Type': 'application/json'
  };

  // Fetch Dashboard Stats
  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/teacher/dashboard', { headers: authHeaders });
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Groups
  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/teacher/groups', { headers: authHeaders });
      const data = await res.json();
      setGroups(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Students
  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/teacher/students', { headers: authHeaders });
      const data = await res.json();
      setAllStudents(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Tests
  const fetchTests = async () => {
    try {
      const res = await fetch('/api/teacher/tests', { headers: authHeaders });
      const data = await res.json();
      setTests(data || []);
      if (data && data.length > 0) {
        if (!selectedTestForUnattempted) setSelectedTestForUnattempted(data[0].id);
        if (!selectedTestForAnalytics) setSelectedTestForAnalytics(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Results
  const fetchResults = async () => {
    try {
      const params = new URLSearchParams();
      if (filterGroup) params.append('groupId', filterGroup);
      if (filterTest) params.append('testId', filterTest);
      if (filterDate) params.append('date', filterDate);

      const res = await fetch(`/api/teacher/results?${params.toString()}`, { headers: authHeaders });
      const data = await res.json();
      setResults(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Unattempted
  const fetchUnattempted = async (tId: string) => {
    if (!tId) return;
    try {
      const res = await fetch(`/api/teacher/tests/${tId}/unattempted`, { headers: authHeaders });
      const data = await res.json();
      setUnattemptedData(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Analytics
  const fetchAnalytics = async (tId: string) => {
    if (!tId) return;
    try {
      const res = await fetch(`/api/teacher/tests/${tId}/analytics`, { headers: authHeaders });
      const data = await res.json();
      setAnalyticsData(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/teacher/audit-logs', { headers: authHeaders });
      const data = await res.json();
      setAuditLogs(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Initial Load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardStats(),
        fetchGroups(),
        fetchStudents(),
        fetchTests(),
        fetchResults()
      ]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (activeTab === 'results') fetchResults();
    if (activeTab === 'unattempted' && selectedTestForUnattempted) fetchUnattempted(selectedTestForUnattempted);
    if (activeTab === 'question_stats' && selectedTestForAnalytics) fetchAnalytics(selectedTestForAnalytics);
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, filterGroup, filterTest, filterDate]);

  // Group Handlers
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch('/api/teacher/groups', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: newGroupName.trim(), description: newGroupDesc.trim() })
      });
      if (res.ok) {
        setNewGroupName('');
        setNewGroupDesc('');
        fetchGroups();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Guruhni o‘chirishni tasdiqlaysizmi?')) return;
    await fetch(`/api/teacher/groups/${id}`, { method: 'DELETE', headers: authHeaders });
    fetchGroups();
  };

  const handleOpenGroupStudents = async (group: Group) => {
    setSelectedGroupForStudents(group);
    try {
      const res = await fetch(`/api/teacher/groups/${group.id}/students`, { headers: authHeaders });
      const data = await res.json();
      setGroupStudents(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveStudentFromGroup = async (studentId: string) => {
    if (!selectedGroupForStudents) return;
    await fetch(`/api/teacher/groups/${selectedGroupForStudents.id}/students/${studentId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    handleOpenGroupStudents(selectedGroupForStudents);
    fetchGroups();
    fetchStudents();
  };

  const handleAddStudentToGroup = async (studentId: string) => {
    if (!selectedGroupForStudents) return;
    await fetch(`/api/teacher/groups/${selectedGroupForStudents.id}/students`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ studentId })
    });
    handleOpenGroupStudents(selectedGroupForStudents);
    fetchGroups();
    fetchStudents();
  };

  // Test Handlers
  const handleCreateTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestTitle.trim()) {
      alert('Test nomini kiriting');
      return;
    }
    if (newTestQuestions.length === 0) {
      alert('Kamida 1 ta savol qo‘shilishi kerak');
      return;
    }
    if (newTestSelectedGroups.length === 0) {
      alert('Kamida bitta guruhni tanlang');
      return;
    }

    try {
      const payload = {
        title: newTestTitle.trim(),
        subject: newTestSubject.trim(),
        description: newTestDesc.trim(),
        duration_minutes: newTestDuration,
        max_attempts: newTestMaxAttempts,
        passing_percentage: newTestPassPercent,
        shuffle_questions: newTestShuffleQ,
        shuffle_options: newTestShuffleOpt,
        show_correct_answers: newTestShowAnswers,
        assigned_group_ids: newTestSelectedGroups,
        questions: newTestQuestions.map(q => ({
          question_text: q.question_text,
          question_type: q.question_type,
          points: q.points,
          explanation: q.explanation,
          options: q.options
        }))
      };

      const res = await fetch('/api/teacher/tests', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Test yaratishda xato');

      setShowCreateTestModal(false);
      setNewTestTitle('');
      setNewTestQuestions([]);
      fetchTests();
      fetchDashboardStats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm('Ushbu testni o‘chirishni tasdiqlaysizmi?')) return;
    await fetch(`/api/teacher/tests/${id}`, { method: 'DELETE', headers: authHeaders });
    fetchTests();
    fetchDashboardStats();
  };

  // Reset Student Attempt
  const handleResetAttempt = async (attemptId: string, studentName: string) => {
    if (!confirm(`${studentName}ning natijasini qayta topshirish uchun bekor qilasizmi?`)) return;
    try {
      const res = await fetch(`/api/teacher/attempts/${attemptId}/reset`, {
        method: 'POST',
        headers: authHeaders
      });
      if (res.ok) {
        alert('Urinish muvaffaqiyatli bekor qilindi. O‘quvchi endi testni qayta topshira oladi.');
        fetchResults();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    const params = new URLSearchParams();
    if (filterGroup) params.append('groupId', filterGroup);
    if (filterTest) params.append('testId', filterTest);
    window.open(`/api/teacher/export-excel?${params.toString()}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      {/* Top Header */}
      <div className="glass-panel rounded-2xl p-5 mb-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>O‘qituvchi Boshqaruv Markazi</span>
            <span className="text-xs bg-cyan-950/60 text-cyan-300 font-mono px-2 py-0.5 rounded border border-cyan-800/50">
              Admin
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Guruhlar, testlar, real-vaqt natijalari va savollar statistikasi.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateTestModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Yangi Test Yaratish
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            Excelga Yuklash (.xlsx)
          </button>
        </div>
      </div>

      {/* Tabs Navigation (Responsive horizontal scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 scrollbar-none text-xs font-semibold">
        {[
          { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'groups', label: 'Guruhlar', icon: Users },
          { id: 'students', label: 'O‘quvchilar', icon: GraduationCap },
          { id: 'tests', label: 'Testlar', icon: FileCheck2 },
          { id: 'results', label: 'Natijalar', icon: BarChart3 },
          { id: 'unattempted', label: 'Hali Ishlamaganlar', icon: UserX },
          { id: 'question_stats', label: 'Savol Statistikasi', icon: BarChart3 },
          { id: 'audit', label: 'Audit Jurnali', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/70 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Jami O‘quvchilar', value: stats?.totalStudents || 0, color: 'text-cyan-400' },
              { label: 'Jami Guruhlar', value: stats?.totalGroups || 0, color: 'text-indigo-400' },
              { label: 'Jami Testlar', value: stats?.totalTests || 0, color: 'text-purple-400' },
              { label: 'Bugungi Testlar', value: stats?.todayTestsCount || 0, color: 'text-amber-400' },
              { label: 'O‘rtacha Natija', value: `${stats?.avgScore || 0}%`, color: 'text-emerald-400' }
            ].map((m, i) => (
              <div key={i} className="glass-card rounded-2xl p-4 border border-slate-800 text-slate-300">
                <span className="text-[11px] text-slate-400 block mb-1">{m.label}</span>
                <span className={`text-2xl font-bold font-mono ${m.color}`}>{m.value}</span>
              </div>
            ))}
          </div>

          {/* Recent results table */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-3">Oxirgi Topshirilgan Natijalar</h3>
            {stats?.recentResults?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Hali test topshirilmagan</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">O‘quvchi</th>
                      <th className="py-2.5 px-3">Test</th>
                      <th className="py-2.5 px-3">Ball</th>
                      <th className="py-2.5 px-3">Foiz</th>
                      <th className="py-2.5 px-3">Natija</th>
                      <th className="py-2.5 px-3">Sana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {stats?.recentResults?.map((r: any) => (
                      <tr key={r.id}>
                        <td className="py-2.5 px-3 font-medium text-white">{r.studentName}</td>
                        <td className="py-2.5 px-3 text-cyan-300">{r.testTitle}</td>
                        <td className="py-2.5 px-3 font-mono">{r.score}/{r.maxScore}</td>
                        <td className="py-2.5 px-3 font-mono font-bold">{r.percentage}%</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                            {r.passed ? 'O‘TDI' : 'O‘TMADI'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {new Date(r.date).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GROUPS MANAGEMENT */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          {/* Create Group Form */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-3">Yangi Guruh Qo‘shish</h3>
            <form onSubmit={handleCreateGroup} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                placeholder="Guruh nomi (masalan: 9-A, Matematika 1-guruh)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <input
                type="text"
                placeholder="Tavsif (ixtiyoriy)"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Guruh Yaratish
              </button>
            </form>
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {groups.map((g) => (
              <div key={g.id} className="glass-card rounded-2xl p-5 border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-bold text-white">{g.name}</h4>
                    <span className="text-xs text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded">
                      {g.student_count} o‘quvchi
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">{g.description || 'Tavsif kiritilmagan'}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => handleOpenGroupStudents(g)}
                    className="text-xs text-cyan-400 hover:underline font-semibold"
                  >
                    O‘quvchilarni boshqarish →
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(g.id)}
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group Students Modal */}
      {selectedGroupForStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-xl glass-panel rounded-2xl border border-slate-700 p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">{selectedGroupForStudents.name} — O‘quvchilari</h3>
                <span className="text-xs text-slate-400">Jami: {groupStudents.length} ta o‘quvchi</span>
              </div>
              <button
                onClick={() => setSelectedGroupForStudents(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add student dropdown */}
            <div className="mb-4">
              <label className="text-xs text-slate-300 block mb-1">Mavjud o‘quvchini ushbu guruhga qo‘shish:</label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddStudentToGroup(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="">O‘quvchini tanlang...</option>
                {allStudents
                  .filter(s => !groupStudents.some(gs => gs.id === s.id))
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.phone})
                    </option>
                  ))}
              </select>
            </div>

            {/* List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {groupStudents.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Bu guruhda hali o‘quvchi yo‘q</p>
              ) : (
                groupStudents.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 bg-slate-900/70 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="font-semibold text-white block">{s.first_name} {s.last_name}</span>
                      <span className="font-mono text-slate-400">{s.phone}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveStudentFromGroup(s.id)}
                      className="px-2 py-1 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 rounded-lg border border-rose-500/30 text-[11px]"
                    >
                      Guruhdan chiqarish
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ALL STUDENTS */}
      {activeTab === 'students' && (
        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Ro‘yxatdan O‘tgan O‘quvchilar ({allStudents.length} ta)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Ism Familiya</th>
                  <th className="py-2.5 px-3">Telefon</th>
                  <th className="py-2.5 px-3">Biriktirilgan Guruhlar</th>
                  <th className="py-2.5 px-3">Ro‘yxat sanasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {allStudents.map(s => (
                  <tr key={s.id}>
                    <td className="py-2.5 px-3 font-semibold text-white">{s.first_name} {s.last_name}</td>
                    <td className="py-2.5 px-3 font-mono text-cyan-300">{s.phone}</td>
                    <td className="py-2.5 px-3">
                      {s.groups.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {s.groups.map((g, idx) => (
                            <span key={idx} className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300">
                              {g}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Guruhsiz</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {new Date(s.created_at || Date.now()).toLocaleDateString('uz-UZ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TESTS MANAGEMENT */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tests.map(t => (
              <div key={t.id} className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                      {t.subject}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {t.attempts_count || 0} marta topshirilgan
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{t.title}</h3>
                  <p className="text-xs text-slate-400 mb-3">{t.description}</p>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-xs text-slate-300 mb-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Savollar</span>
                      <span className="font-semibold">{t.questions_count} ta</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Vaqt</span>
                      <span className="font-semibold">{t.duration_minutes} daq</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">O‘tish foizi</span>
                      <span className="font-semibold">{t.passing_percentage}%</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 mb-2">
                    <span className="text-slate-500">Ochilgan guruhlar: </span>
                    <span className="text-cyan-300 font-medium">
                      {t.assigned_groups?.map((g: any) => g.name).join(', ') || 'Guruh biriktirilmagan'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
                  <button
                    onClick={() => {
                      setSelectedTestForAnalytics(t.id);
                      setActiveTab('question_stats');
                    }}
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    Statistika →
                  </button>
                  <button
                    onClick={() => handleDeleteTest(t.id)}
                    className="p-1 text-slate-400 hover:text-rose-400"
                    title="Testni o‘chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE TEST MODAL */}
      {showCreateTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl glass-panel rounded-2xl border border-slate-700 p-6 text-slate-100 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-lg font-bold text-white">Yangi Test Yaratish</h2>
              <button
                onClick={() => setShowCreateTestModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTestSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Test Nomi</label>
                  <input
                    type="text"
                    required
                    value={newTestTitle}
                    onChange={(e) => setNewTestTitle(e.target.value)}
                    placeholder="Masalan: 1-Bob: Funksiyalar va Hosilalar"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Fan / Mavzu</label>
                  <input
                    type="text"
                    required
                    value={newTestSubject}
                    onChange={(e) => setNewTestSubject(e.target.value)}
                    placeholder="Masalan: Matematika, Fizika, Ona tili"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Tavsif (ixtiyoriy)</label>
                <textarea
                  rows={2}
                  value={newTestDesc}
                  onChange={(e) => setNewTestDesc(e.target.value)}
                  placeholder="Test haqida qisqacha ma'lumot..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              {/* Settings Row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Vaqt (daqiqa)</label>
                  <input
                    type="number"
                    min={1}
                    value={newTestDuration}
                    onChange={(e) => setNewTestDuration(Number(e.target.value) || 20)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Maksimal urinish</label>
                  <input
                    type="number"
                    min={1}
                    value={newTestMaxAttempts}
                    onChange={(e) => setNewTestMaxAttempts(Number(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">O‘tish foizi (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newTestPassPercent}
                    onChange={(e) => setNewTestPassPercent(Number(e.target.value) || 60)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTestShuffleQ}
                    onChange={(e) => setNewTestShuffleQ(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500"
                  />
                  <span>Savollarni aralashtirish</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTestShuffleOpt}
                    onChange={(e) => setNewTestShuffleOpt(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500"
                  />
                  <span>Variantlarni aralashtirish</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTestShowAnswers}
                    onChange={(e) => setNewTestShowAnswers(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500"
                  />
                  <span>To‘g‘ri javoblarni ko‘rsatish</span>
                </label>
              </div>

              {/* Group Assignment */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Test ochiladigan guruhlar:
                </label>
                <div className="flex flex-wrap gap-2">
                  {groups.map(g => {
                    const isChecked = newTestSelectedGroups.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setNewTestSelectedGroups(newTestSelectedGroups.filter(id => id !== g.id));
                          } else {
                            setNewTestSelectedGroups([...newTestSelectedGroups, g.id]);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          isChecked
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Questions Section with DOCX / Text Import */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">
                    Savollar: ({newTestQuestions.length} ta kiritilgan)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowImporter(true)}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    + Word (.docx) yoki Matndan Import Qilish
                  </button>
                </div>

                {newTestQuestions.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30 text-xs text-slate-400">
                    Hozircha savollar qo‘shilmagan. Yuqoridagi tugma orqali Word fayl yoki matndan birdaniga qo‘shing.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {newTestQuestions.map((q, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                        <div className="truncate pr-2">
                          <span className="font-mono text-cyan-400 font-bold mr-1.5">#{idx + 1}</span>
                          <span className="text-white">{q.question_text}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewTestQuestions(newTestQuestions.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateTestModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={newTestQuestions.length === 0}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md disabled:opacity-40"
                >
                  Testni Saqlash va Ochish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUESTION IMPORTER MODAL */}
      {showImporter && (
        <QuestionImporter
          onQuestionsConfirmed={(imported) => {
            setNewTestQuestions([...newTestQuestions, ...imported]);
            setShowImporter(false);
          }}
          onCancel={() => setShowImporter(false)}
        />
      )}

      {/* TAB 5: RESULTS TABLE WITH FILTERS AND ATTEMPT RESET */}
      {activeTab === 'results' && (
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">Topshirilgan Testlar Natijalari ({results.length} ta)</h3>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value="">Barcha Guruhlar</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>

              <select
                value={filterTest}
                onChange={(e) => setFilterTest(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value="">Barcha Testlar</option>
                {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>

              <button
                onClick={handleExportExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Excel (.xlsx)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">O‘quvchi</th>
                  <th className="py-2.5 px-3">Guruh</th>
                  <th className="py-2.5 px-3">Test</th>
                  <th className="py-2.5 px-3">Ball</th>
                  <th className="py-2.5 px-3">Foiz</th>
                  <th className="py-2.5 px-3">Holat</th>
                  <th className="py-2.5 px-3">Sarflangan Vaqt</th>
                  <th className="py-2.5 px-3">Oynadan Chiqish</th>
                  <th className="py-2.5 px-3">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400">Natijalar topilmadi</td>
                  </tr>
                ) : (
                  results.map(r => (
                    <tr key={r.id}>
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {r.student_name}
                        <span className="block text-[10px] text-slate-400 font-mono">{r.student_phone}</span>
                      </td>
                      <td className="py-2.5 px-3 text-cyan-300">{r.group_name}</td>
                      <td className="py-2.5 px-3 text-white max-w-[180px] truncate">{r.test_title}</td>
                      <td className="py-2.5 px-3 font-mono">{r.score}/{r.max_score}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">{r.percentage}%</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {r.passed ? 'O‘TDI' : 'O‘TMADI'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {(r.time_spent_seconds / 60).toFixed(1)} daq
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <span className={r.tab_switch_count > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                          {r.tab_switch_count} marta
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handleResetAttempt(r.attempt_id, r.student_name)}
                          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 px-2 py-1 rounded border border-cyan-800/40"
                          title="Urinishni reset qilish (qayta topshirishga ruxsat)"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: UNATTEMPTED STUDENTS (HALI ISHLAMAGANLAR) */}
      {activeTab === 'unattempted' && (
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">Hali Testni Ishlamagan O‘quvchilar Nazorati</h3>
            <select
              value={selectedTestForUnattempted}
              onChange={(e) => {
                setSelectedTestForUnattempted(e.target.value);
                fetchUnattempted(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          {unattemptedData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl">
                  <span className="text-[11px] text-emerald-300 block">Topshirganlar</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">{unattemptedData.attemptedCount} ta</span>
                </div>
                <div className="bg-rose-950/20 border border-rose-500/30 p-3 rounded-xl">
                  <span className="text-[11px] text-rose-300 block">Hali Ishlamaganlar</span>
                  <span className="text-xl font-bold font-mono text-rose-400">{unattemptedData.unattemptedCount} ta</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-300 mb-2">Ishlamagan o‘quvchilar ro‘yxati:</h4>
                {unattemptedData.unattemptedStudents.length === 0 ? (
                  <p className="text-xs text-emerald-400 py-3">Barcha o‘quvchilar ushbu testni topshirgan!</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {unattemptedData.unattemptedStudents.map((s: Profile) => (
                      <div key={s.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
                        <span className="font-bold text-white block">{s.first_name} {s.last_name}</span>
                        <span className="font-mono text-cyan-400">{s.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: QUESTION ANALYTICS */}
      {activeTab === 'question_stats' && (
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">Savollar Bo‘yicha Natijadorlik Tahlili</h3>
            <select
              value={selectedTestForAnalytics}
              onChange={(e) => {
                setSelectedTestForAnalytics(e.target.value);
                fetchAnalytics(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            {analyticsData.map((a) => (
              <div key={a.question_id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <span className="font-mono font-bold text-cyan-400 mr-2">#{a.question_index}</span>
                    <span className="font-semibold text-white">{a.question_text}</span>
                  </div>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded ${a.success_rate >= 70 ? 'bg-emerald-500/20 text-emerald-300' : a.success_rate >= 50 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {a.success_rate}% to‘g‘ri
                  </span>
                </div>

                {/* Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full ${a.success_rate >= 70 ? 'bg-emerald-500' : a.success_rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${a.success_rate}%` }}
                  />
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-400">
                  <span>Jami javoblar: <strong className="text-white">{a.total_answers}</strong></span>
                  <span>To‘g‘ri: <strong className="text-emerald-400">{a.correct_answers}</strong></span>
                  <span>Noto‘g‘ri: <strong className="text-rose-400">{a.incorrect_answers}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-3">Tizim Harakatlari Jurnali (Audit Log)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Vaqt</th>
                  <th className="py-2 px-3">Harakat</th>
                  <th className="py-2 px-3">Tafsilotlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono">
                {auditLogs.map(l => (
                  <tr key={l.id}>
                    <td className="py-2 px-3 text-slate-400 text-[11px]">
                      {new Date(l.created_at).toLocaleString('uz-UZ')}
                    </td>
                    <td className="py-2 px-3 text-cyan-300 font-semibold">{l.action}</td>
                    <td className="py-2 px-3 text-slate-300 text-[11px] font-sans">
                      {JSON.stringify(l.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
