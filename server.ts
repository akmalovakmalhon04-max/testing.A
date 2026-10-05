import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import { store } from './server/store.ts';
import { notifyAdminOnTestComplete } from './server/telegram.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiter helper in memory
const requestCounts = new Map<string, { count: number; firstReq: number }>();
function rateLimit(limit: number = 60, windowMs: number = 60000) {
  return (req: Request, res: Response, next: () => void) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = requestCounts.get(ip) || { count: 0, firstReq: now };

    if (now - entry.firstReq > windowMs) {
      entry.count = 1;
      entry.firstReq = now;
    } else {
      entry.count += 1;
    }

    requestCounts.set(ip, entry);

    if (entry.count > limit) {
      return res.status(429).json({ error: 'Juda ko‘p so‘rov yuborildi. Iltimos, biroz kuting.' });
    }
    next();
  };
}

// Auth Helper
function getStudentFromToken(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  // Token is studentId:timestamp:checksum
  const parts = token.split('::');
  const studentId = parts[0];
  const student = store.getProfileById(studentId);
  return student || null;
}

function verifyTeacher(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  const pin = req.headers['x-admin-pin'] || (authHeader?.startsWith('Bearer teacher_') ? authHeader.replace('Bearer teacher_', '') : null);
  const correctPin = process.env.ADMIN_SECRET_PIN || '7788';

  if (pin === correctPin || pin === 'admin_authorized') {
    return next();
  }
  return res.status(401).json({ error: 'O‘qituvchi autentifikatsiyasi talab qilinadi (PIN noto‘g‘ri)' });
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    platform: 'CosmoTest Pro',
    supabaseConnected: store.isSupabaseConnected,
    telegramConfigured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID)
  });
});

// AUTH: Request Telegram Code
app.post('/api/auth/request-code', rateLimit(10, 60000), (req, res) => {
  const { phone, firstName, lastName } = req.body;
  if (!phone || !firstName || !lastName) {
    return res.status(400).json({ error: 'Ism, familiya va telefon raqami majburiy' });
  }

  // Uzbek phone validation
  const phoneClean = phone.replace(/[\s-]/g, '');
  if (!/^\+998\d{9}$/.test(phoneClean)) {
    return res.status(400).json({ error: 'Telefon formati noto‘g‘ri. Masalan: +998 90 123 45 67' });
  }

  const { code, verificationId, expiresAt } = store.createVerificationCode(phoneClean);

  // Return response
  res.json({
    success: true,
    message: 'Telegram tasdiqlash kodi tayyorlandi',
    verificationId,
    expiresAt,
    // Always provide simulated/fast code for convenient testing in preview
    previewCode: code,
    telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || 'CosmoTestBot'
  });
});

// AUTH: Verify Telegram Code
app.post('/api/auth/verify-code', rateLimit(20, 60000), (req, res) => {
  const { phone, code, firstName, lastName } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: 'Telefon va tasdiqlash kodi kiritilishi shart' });
  }

  const phoneClean = phone.replace(/[\s-]/g, '');
  const verification = store.verifyCode(phoneClean, code);

  if (!verification.valid) {
    return res.status(400).json({ error: verification.message });
  }

  const student = store.getOrCreateStudentProfile(phoneClean, firstName || '', lastName || '');
  // 30 days token
  const token = `${student.id}::${Date.now()}::${Date.now() + 30 * 86400000}`;

  res.json({
    success: true,
    message: 'Muvaffaqiyatli tizimga kirildi',
    token,
    student: {
      id: student.id,
      phone: student.phone,
      first_name: student.first_name,
      last_name: student.last_name,
      role: student.role
    }
  });
});

// AUTH: Teacher Login with PIN
app.post('/api/auth/teacher-login', (req, res) => {
  const { pin } = req.body;
  const correctPin = process.env.ADMIN_SECRET_PIN || '7788';

  if (!pin || pin.trim() !== correctPin) {
    return res.status(401).json({ error: 'Kiritilgan PIN kod noto‘g‘ri. Standart PIN: 7788' });
  }

  res.json({
    success: true,
    message: 'O‘qituvchi sifatida tizimga kirildi',
    token: 'teacher_admin_authorized',
    teacher: {
      id: 'teacher-default-001',
      name: 'Bosh O‘qituvchi',
      role: 'teacher'
    }
  });
});

// STUDENT: Current user info
app.get('/api/student/me', (req, res) => {
  const student = getStudentFromToken(req);
  if (!student) {
    return res.status(401).json({ error: 'Avtorizatsiyadan o‘tilmagan' });
  }
  const groups = store.getStudentGroups(student.id);
  res.json({
    student,
    groups
  });
});

// STUDENT: Available tests for student's groups
app.get('/api/student/tests', (req, res) => {
  const student = getStudentFromToken(req);
  if (!student) {
    return res.status(401).json({ error: 'Avtorizatsiyadan o‘tilmagan' });
  }

  const tests = store.getTestsForStudent(student.id);
  res.json({ tests });
});

// STUDENT: Start or resume test
app.post('/api/student/tests/:testId/start', (req, res) => {
  const student = getStudentFromToken(req);
  if (!student) {
    return res.status(401).json({ error: 'Avtorizatsiyadan o‘tilmagan' });
  }

  try {
    const attemptData = store.startOrResumeAttempt(student.id, req.params.testId);
    res.json(attemptData);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Testni boshlashda xatolik yuz berdi' });
  }
});

// STUDENT: Autosave answers
app.post('/api/student/attempts/:attemptId/autosave', (req, res) => {
  const student = getStudentFromToken(req);
  if (!student) {
    return res.status(401).json({ error: 'Avtorizatsiyadan o‘tilmagan' });
  }

  const { answers } = req.body;
  try {
    const result = store.autosaveAttempt(req.params.attemptId, student.id, answers || {});
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Saqlashda xatolik' });
  }
});

// STUDENT: Log Tab Switch
app.post('/api/student/attempts/:attemptId/tab-switch', (req, res) => {
  const student = getStudentFromToken(req);
  if (!student) {
    return res.status(401).json({ error: 'Avtorizatsiyadan o‘tilmagan' });
  }

  const { eventType } = req.body;
  const count = store.logTabSwitch(req.params.attemptId, student.id, eventType || 'blur');
  res.json({ success: true, tabSwitchCount: count });
});

// STUDENT: Submit and Grade Test (SERVER-SIDE AUTHORITATIVE)
app.post('/api/student/attempts/:attemptId/submit', async (req, res) => {
  const student = getStudentFromToken(req);
  if (!student) {
    return res.status(401).json({ error: 'Avtorizatsiyadan o‘tilmagan' });
  }

  try {
    const { answers } = req.body;
    const grading = store.submitAndGradeAttempt(req.params.attemptId, student.id, answers);

    // Send Telegram Notification to Admin
    notifyAdminOnTestComplete({
      studentName: `${grading.student.first_name} ${grading.student.last_name}`,
      testTitle: grading.test.title,
      score: grading.result.score,
      maxScore: grading.result.max_score,
      percentage: grading.result.percentage,
      passed: grading.result.passed,
      timeSpentSeconds: grading.result.time_spent_seconds,
      tabSwitchCount: grading.result.tab_switch_count
    }).catch(e => console.error('Telegram bildirishnoma xatosi:', e));

    res.json({
      success: true,
      result: grading.result,
      show_correct_answers: grading.test.show_correct_answers,
      breakdown: grading.breakdown
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Natijani hisoblashda xatolik yuz berdi' });
  }
});

// STUDENT: Profile & Performance Chart Data
app.get('/api/student/profile', (req, res) => {
  const student = getStudentFromToken(req);
  if (!student) {
    return res.status(401).json({ error: 'Avtorizatsiyadan o‘tilmagan' });
  }

  const profileData = store.getStudentProfile(student.id);
  res.json(profileData);
});

// -------------------------------------------------------------
// TEACHER MANAGEMENT API (Protected)
// -------------------------------------------------------------

// Dashboard Stats
app.get('/api/teacher/dashboard', verifyTeacher, (req, res) => {
  const stats = store.getTeacherDashboardStats();
  res.json(stats);
});

// Groups CRUD
app.get('/api/teacher/groups', verifyTeacher, (req, res) => {
  res.json(store.getGroups());
});

app.post('/api/teacher/groups', verifyTeacher, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Guruh nomi majburiy' });
  const group = store.createGroup(name, description || '');
  res.json(group);
});

app.put('/api/teacher/groups/:id', verifyTeacher, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Guruh nomi majburiy' });
  const group = store.updateGroup(req.params.id, name, description || '');
  if (!group) return res.status(404).json({ error: 'Guruh topilmadi' });
  res.json(group);
});

app.delete('/api/teacher/groups/:id', verifyTeacher, (req, res) => {
  const deleted = store.deleteGroup(req.params.id);
  res.json({ success: deleted });
});

// Group Students
app.get('/api/teacher/groups/:id/students', verifyTeacher, (req, res) => {
  res.json(store.getGroupStudents(req.params.id));
});

app.post('/api/teacher/groups/:id/students', verifyTeacher, (req, res) => {
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ error: 'O‘quvchi tanlanmadi' });
  store.addStudentToGroup(req.params.id, studentId);
  res.json({ success: true });
});

app.delete('/api/teacher/groups/:id/students/:studentId', verifyTeacher, (req, res) => {
  store.removeStudentFromGroup(req.params.id, req.params.studentId);
  res.json({ success: true });
});

// All Students
app.get('/api/teacher/students', verifyTeacher, (req, res) => {
  res.json(store.getAllStudents());
});

// Tests
app.get('/api/teacher/tests', verifyTeacher, (req, res) => {
  res.json(store.getAllTestsForTeacher());
});

app.post('/api/teacher/tests', verifyTeacher, (req, res) => {
  const {
    title,
    description,
    subject,
    duration_minutes,
    max_attempts,
    passing_percentage,
    shuffle_questions,
    shuffle_options,
    show_correct_answers,
    starts_at,
    ends_at,
    assigned_group_ids,
    questions
  } = req.body;

  if (!title) return res.status(400).json({ error: 'Test nomi majburiy' });
  if (!questions || !questions.length) return res.status(400).json({ error: 'Kamida 1 ta savol kiritilishi kerak' });

  const test = store.createTestWithQuestions(
    {
      title,
      description: description || '',
      subject: subject || 'Umumiy',
      duration_minutes: Number(duration_minutes) || 30,
      max_attempts: Number(max_attempts) || 1,
      passing_percentage: Number(passing_percentage) || 60,
      shuffle_questions: shuffle_questions ?? true,
      shuffle_options: shuffle_options ?? true,
      show_correct_answers: show_correct_answers ?? false,
      starts_at: starts_at || undefined,
      ends_at: ends_at || undefined,
      is_active: true
    },
    assigned_group_ids || [],
    questions
  );

  res.json(test);
});

app.delete('/api/teacher/tests/:id', verifyTeacher, (req, res) => {
  const deleted = store.deleteTest(req.params.id);
  res.json({ success: deleted });
});

app.get('/api/teacher/tests/:id/questions', verifyTeacher, (req, res) => {
  res.json(store.getFullTestQuestions(req.params.id));
});

// Test Analytics & Unattempted Students
app.get('/api/teacher/tests/:id/unattempted', verifyTeacher, (req, res) => {
  try {
    const data = store.getUnattemptedStudentsForTest(req.params.id);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/teacher/tests/:id/analytics', verifyTeacher, (req, res) => {
  res.json(store.getQuestionAnalyticsForTest(req.params.id));
});

// Results Table
app.get('/api/teacher/results', verifyTeacher, (req, res) => {
  const { groupId, testId, studentId, date } = req.query;
  const results = store.getResultsTable({
    groupId: groupId ? String(groupId) : undefined,
    testId: testId ? String(testId) : undefined,
    studentId: studentId ? String(studentId) : undefined,
    date: date ? String(date) : undefined
  });
  res.json(results);
});

// Reset Student Attempt
app.post('/api/teacher/attempts/:attemptId/reset', verifyTeacher, (req, res) => {
  const reset = store.resetAttempt(req.params.attemptId);
  res.json({ success: reset });
});

// Audit Logs
app.get('/api/teacher/audit-logs', verifyTeacher, (req, res) => {
  res.json(store.getAuditLogs());
});

// Excel Export (.xlsx)
app.get('/api/teacher/export-excel', verifyTeacher, (req, res) => {
  const { groupId, testId } = req.query;
  const results = store.getResultsTable({
    groupId: groupId ? String(groupId) : undefined,
    testId: testId ? String(testId) : undefined
  });

  // Prepare Excel worksheet rows
  const rows = results.map(r => ({
    'O‘quvchi': r.student_name,
    'Telefon': r.student_phone,
    'Guruh': r.group_name,
    'Test Nomi': r.test_title,
    'Fan': r.subject,
    'Sana': new Date(r.created_at).toLocaleString('uz-UZ'),
    'Ball': r.score,
    'Maksimal Ball': r.max_score,
    'Foiz (%)': r.percentage,
    'Natija': r.passed ? 'O‘TDI' : 'O‘TMADI',
    'Sarflangan Vaqt (daqiqa)': (r.time_spent_seconds / 60).toFixed(1),
    'Oynadan Chiqishlar (marta)': r.tab_switch_count
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Column width auto-fit
  worksheet['!cols'] = [
    { wch: 22 }, // O'quvchi
    { wch: 16 }, // Telefon
    { wch: 18 }, // Guruh
    { wch: 30 }, // Test
    { wch: 16 }, // Fan
    { wch: 20 }, // Sana
    { wch: 8 },  // Ball
    { wch: 14 }, // Max ball
    { wch: 10 }, // Foiz
    { wch: 10 }, // Natija
    { wch: 24 }, // Sarflangan vaqt
    { wch: 26 }  // Oynadan chiqishlar
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Natijalar');

  // If a specific test is selected, also add Question Analytics sheet
  if (testId) {
    const analytics = store.getQuestionAnalyticsForTest(String(testId));
    const qRows = analytics.map(a => ({
      'Savol №': a.question_index,
      'Savol Matni': a.question_text,
      'Jami Javoblar': a.total_answers,
      'To‘g‘ri Javoblar': a.correct_answers,
      'Noto‘g‘ri Javoblar': a.incorrect_answers,
      'Muvaffaqiyat Foizi (%)': a.success_rate
    }));
    const qWorksheet = XLSX.utils.json_to_sheet(qRows);
    qWorksheet['!cols'] = [
      { wch: 10 },
      { wch: 45 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 22 }
    ];
    XLSX.utils.book_append_sheet(workbook, qWorksheet, 'Savol_Statistikasi');
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="CosmoTest_Natijalar.xlsx"');
  res.send(buffer);
});

// -------------------------------------------------------------
// VITE DEV SERVER / PRODUCTION STATIC SERVING
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Dynamic import of Vite in development
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CosmoTest Pro serveri ishga tushdi: http://localhost:${PORT}`);
  });
}

startServer();
