/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CosmicBackground } from './components/CosmicBackground.tsx';
import { Navbar } from './components/Navbar.tsx';
import { AuthModal } from './pages/AuthModal.tsx';
import { StudentDashboard } from './pages/StudentDashboard.tsx';
import { StudentTestRoom } from './pages/StudentTestRoom.tsx';
import { TestResultView } from './pages/TestResultView.tsx';
import { StudentProfile } from './pages/StudentProfile.tsx';
import { TeacherDashboard } from './pages/TeacherDashboard.tsx';
import { Profile, Group, TestResultData, ResultBreakdownItem } from './types.ts';
import { Wifi, WifiOff } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [isTeacherAuth, setIsTeacherAuth] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<'tests' | 'profile' | 'teacher'>('tests');

  // Active Flow: taking a test or viewing results
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<{
    result: TestResultData;
    showCorrect: boolean;
    breakdown?: ResultBreakdownItem[];
  } | null>(null);

  // Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Internet connection monitoring (Section 29)
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionToast, setConnectionToast] = useState<{ msg: string; type: 'online' | 'offline' } | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionToast({ msg: 'Internet aloqasi tiklandi. Javoblaringiz sinxronlandi.', type: 'online' });
      setTimeout(() => setConnectionToast(null), 4000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionToast({ msg: 'Internet aloqasi uzildi. Javoblaringiz xavfsiz saqlanmoqda.', type: 'offline' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check 30-day session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('cosmo_student_token');
    const teacherToken = localStorage.getItem('cosmo_teacher_token');

    if (teacherToken) {
      setIsTeacherAuth(true);
    }

    if (savedToken) {
      fetch('/api/student/me', {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.student) {
            setCurrentUser(data.student);
            setUserGroups(data.groups || []);
          } else {
            localStorage.removeItem('cosmo_student_token');
          }
        })
        .catch(() => {
          // If offline, check cached user
          const cachedUser = localStorage.getItem('cosmo_student_user');
          if (cachedUser) {
            try {
              setCurrentUser(JSON.parse(cachedUser));
            } catch (e) {
              console.error(e);
            }
          }
        });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('cosmo_student_token');
    localStorage.removeItem('cosmo_student_user');
    localStorage.removeItem('cosmo_teacher_token');
    setCurrentUser(null);
    setUserGroups([]);
    setIsTeacherAuth(false);
    setActiveTestId(null);
    setActiveResult(null);
    setCurrentTab('tests');
  };

  const handleStartTest = (testId: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setActiveResult(null);
    setActiveTestId(testId);
  };

  const handleFinishTest = (
    result: TestResultData,
    showCorrect: boolean,
    breakdown?: ResultBreakdownItem[]
  ) => {
    setActiveTestId(null);
    setActiveResult({ result, showCorrect, breakdown });
  };

  return (
    <div className="min-h-screen text-slate-100 relative flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* 1. Live Cosmic Background (Canvas, GPU accelerated, stars, planets, comets, nebulae) */}
      <CosmicBackground />

      {/* 2. Top Bar Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab === 'teacher' && !isTeacherAuth) {
            setIsAuthModalOpen(true);
            return;
          }
          if (tab === 'profile' && !currentUser) {
            setIsAuthModalOpen(true);
            return;
          }
          setActiveTestId(null);
          setActiveResult(null);
          setCurrentTab(tab);
        }}
        currentUser={currentUser}
        isTeacherAuthenticated={isTeacherAuth}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Connection Toast Banner */}
      {connectionToast && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-2xl text-xs md:text-sm font-semibold transition-all ${
            connectionToast.type === 'online'
              ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
              : 'bg-rose-600 text-white border border-rose-400'
          }`}
        >
          {connectionToast.type === 'online' ? <Wifi className="w-4 h-4 shrink-0" /> : <WifiOff className="w-4 h-4 shrink-0" />}
          <span>{connectionToast.msg}</span>
        </div>
      )}

      {/* 3. Main Body Content Area (Higher z-index than cosmic background) */}
      <main className="flex-1 relative z-10">
        {activeTestId ? (
          /* Active Test Room */
          <StudentTestRoom
            testId={activeTestId}
            onFinish={handleFinishTest}
            onCancel={() => setActiveTestId(null)}
          />
        ) : activeResult ? (
          /* Test Result View */
          <TestResultView
            result={activeResult.result}
            showCorrectAnswers={activeResult.showCorrect}
            breakdown={activeResult.breakdown}
            onBackToDashboard={() => setActiveResult(null)}
            onGoToProfile={() => {
              setActiveResult(null);
              setCurrentTab('profile');
            }}
          />
        ) : currentTab === 'teacher' && isTeacherAuth ? (
          /* Teacher Dashboard */
          <TeacherDashboard />
        ) : currentTab === 'profile' && currentUser ? (
          /* Student Profile */
          <StudentProfile />
        ) : (
          /* Student Dashboard / Tests List */
          <StudentDashboard
            currentUser={
              currentUser || {
                id: 'guest',
                phone: '+998 ** *** ** **',
                first_name: 'Mehmon',
                last_name: 'Foydalanuvchi',
                role: 'student'
              }
            }
            userGroups={userGroups}
            onStartTest={handleStartTest}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onStudentSuccess={(student, token) => {
          setCurrentUser(student);
          // Fetch groups
          fetch('/api/student/me', { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => setUserGroups(data.groups || []));
        }}
        onTeacherSuccess={(token) => {
          setIsTeacherAuth(true);
          setCurrentTab('teacher');
        }}
      />
    </div>
  );
}
