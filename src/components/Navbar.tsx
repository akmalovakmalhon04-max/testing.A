import React from 'react';
import { LogOut, User, ShieldCheck } from 'lucide-react';
import { Profile } from '../types.ts';

interface NavbarProps {
  currentTab: 'tests' | 'profile' | 'teacher';
  onTabChange: (tab: 'tests' | 'profile' | 'teacher') => void;
  currentUser: Profile | null;
  isTeacherAuthenticated: boolean;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  isTeacherAuthenticated,
  onOpenLogin,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between transition-all">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onTabChange('tests');
        }}
        className="text-lg md:text-xl font-extrabold tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap"
      >
        CosmoTest <span className="text-cyan-400 font-mono font-bold">PRO</span>
      </a>

      {/* Zone 2: 3-5 clean single-line nav links */}
      <nav className="flex items-center gap-2 sm:gap-6 text-sm font-medium">
        <button
          onClick={() => onTabChange('tests')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
            currentTab === 'tests'
              ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Testlar
        </button>

        {currentUser && (
          <button
            onClick={() => onTabChange('profile')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'profile'
                ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Profilim
          </button>
        )}

        <button
          onClick={() => onTabChange('teacher')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            currentTab === 'teacher'
              ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          O‘qituvchi
        </button>
      </nav>

      {/* Zone 3: Primary action */}
      <div className="flex items-center gap-3">
        {currentUser ? (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-xs font-medium text-slate-300">
              {currentUser.first_name} {currentUser.last_name}
            </span>
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Chiqish"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : isTeacherAuthenticated ? (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            O‘qituvchidan Chiqish
          </button>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-md shadow-cyan-400/20 transition-all whitespace-nowrap"
          >
            <User className="w-3.5 h-3.5" />
            Kirish
          </button>
        )}
      </div>
    </header>
  );
};
