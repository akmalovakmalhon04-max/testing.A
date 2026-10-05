import React, { useState } from 'react';
import { Send, KeyRound, AlertCircle, CheckCircle2, User, Phone, X, Shield, ArrowRight } from 'lucide-react';
import { Profile } from '../types.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentSuccess: (student: Profile, token: string) => void;
  onTeacherSuccess: (token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onStudentSuccess,
  onTeacherSuccess
}) => {
  const [authMode, setAuthMode] = useState<'student' | 'teacher'>('student');
  const [step, setStep] = useState<'details' | 'verify'>('details');

  // Student inputs
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [verificationCode, setVerificationCode] = useState('');
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  // Teacher input
  const [teacherPin, setTeacherPin] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Format phone number automatically as +998 XX XXX XX XX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    if (!raw.startsWith('+998')) {
      raw = '+998 ' + raw.replace(/\D/g, '');
    }
    // Extract numbers after +998
    const digits = raw.substring(4).replace(/\D/g, '').slice(0, 9);
    let formatted = '+998 ';
    if (digits.length > 0) formatted += digits.substring(0, 2);
    if (digits.length >= 2) formatted += ' ' + digits.substring(2, 5);
    if (digits.length >= 5) formatted += ' ' + digits.substring(5, 7);
    if (digits.length >= 7) formatted += ' ' + digits.substring(7, 9);

    setPhone(formatted);
  };

  // Step 1: Request Telegram code
  const handleRequestTelegramCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Iltimos, ism va familiyangizni to‘liq kiriting');
      return;
    }

    const cleanPhone = phone.replace(/\s+/g, '');
    if (!/^\+998\d{9}$/.test(cleanPhone)) {
      setError('Telefon formati noto‘g‘ri. Masalan: +998 90 123 45 67');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          firstName: firstName.trim(),
          lastName: lastName.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kod so‘rashda xatolik');

      setPreviewCode(data.previewCode || null);
      setSuccessMsg('Telegram tasdiqlash kodi yuborildi!');
      setStep('verify');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Telegram code
  const handleVerifyTelegramCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!verificationCode.trim()) {
      setError('Iltimos, 6 xonali tasdiqlash kodini kiriting');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\s+/g, '');
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          code: verificationCode.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tasdiqlashda xatolik');

      // Save 30-day session
      localStorage.setItem('cosmo_student_token', data.token);
      localStorage.setItem('cosmo_student_user', JSON.stringify(data.student));

      onStudentSuccess(data.student, data.token);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Teacher PIN login
  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!teacherPin.trim()) {
      setError('Iltimos, o‘qituvchi PIN kodini kiriting');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/teacher-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: teacherPin.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PIN kod noto‘g‘ri');

      localStorage.setItem('cosmo_teacher_token', data.token);
      onTeacherSuccess(data.token);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-700/60 p-6 text-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl mb-6 border border-slate-800">
          <button
            onClick={() => {
              setAuthMode('student');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authMode === 'student'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            O‘quvchi (Telegram)
          </button>
          <button
            onClick={() => {
              setAuthMode('teacher');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              authMode === 'teacher'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            O‘qituvchi Kabineti
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {authMode === 'student' ? (
          step === 'details' ? (
            <form onSubmit={handleRequestTelegramCode} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Ismingiz</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Masalan: Ali"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Familiyangiz</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Masalan: Valiyev"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Telefon raqamingiz</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="+998 90 123 45 67"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">SMS yuborilmaydi. Kod Telegram bot orqali taqdim etiladi.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all text-sm disabled:opacity-50"
              >
                {loading ? 'Yuborilmoqda...' : 'Telegram orqali tasdiqlash'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* STEP 2: VERIFICATION CODE */
            <form onSubmit={handleVerifyTelegramCode} className="space-y-4">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-white">Telefon: <span className="font-mono text-cyan-400">{phone}</span></p>
                <p>Telegram botimiz: <span className="font-semibold text-cyan-300">@CosmoTestBot</span></p>
                <p className="text-slate-400">Botga kiring va 6 xonali tasdiqlash kodini oling.</p>
              </div>

              {previewCode && (
                <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cyan-300 font-medium">Tezkor sinov kodi:</span>
                    <button
                      type="button"
                      onClick={() => setVerificationCode(previewCode)}
                      className="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30"
                    >
                      Kodni kiritish
                    </button>
                  </div>
                  <div className="font-mono text-xl tracking-widest text-center text-cyan-200 mt-1 font-bold">
                    {previewCode}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Bir martalik kod (6 xona)</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center text-2xl tracking-[0.3em] font-mono py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-400"
                />
                <p className="text-[11px] text-slate-400 mt-1 text-center">Kod 5 daqiqa davomida amal qiladi.</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="flex-1 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl transition-colors"
                >
                  Ortga
                </button>
                <button
                  type="submit"
                  disabled={loading || verificationCode.length < 6}
                  className="flex-2 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all text-sm disabled:opacity-50"
                >
                  {loading ? 'Tekshirilmoqda...' : 'Tasdiqlash'}
                </button>
              </div>
            </form>
          )
        ) : (
          /* TEACHER PIN LOGIN */
          <form onSubmit={handleTeacherLogin} className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <Shield className="w-8 h-8 text-cyan-400 shrink-0" />
              <div className="text-xs text-slate-300">
                <p className="font-semibold text-white">O‘qituvchi Boshqaruv Paneli</p>
                <p className="text-slate-400">Guruhlar, testlar yaratish va natijalarni nazorat qilish.</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">O‘qituvchi maxfiy PIN kodi</label>
                <span className="text-[11px] text-cyan-400 font-mono">Standart: 7788</span>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={teacherPin}
                  onChange={(e) => setTeacherPin(e.target.value)}
                  placeholder="PIN kodni kiriting"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all text-sm disabled:opacity-50"
            >
              {loading ? 'Kirilmoqda...' : 'O‘qituvchi Paneliga Kirish'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
