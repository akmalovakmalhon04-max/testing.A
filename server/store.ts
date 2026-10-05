import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'teacher' | 'admin';
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  created_by?: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  student_id: string;
  joined_at: string;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_label: string; // 'A', 'B', 'C', 'D'
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

export interface Question {
  id: string;
  test_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  points: number;
  explanation: string;
  order_index: number;
  created_at: string;
  options?: QuestionOption[];
}

export interface Test {
  id: string;
  title: string;
  description: string;
  subject: string;
  duration_minutes: number;
  max_attempts: number;
  passing_percentage: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_correct_answers: boolean;
  starts_at?: string;
  ends_at?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  assigned_group_ids?: string[];
  questions_count?: number;
}

export interface TestAttempt {
  id: string;
  test_id: string;
  student_id: string;
  attempt_number: number;
  started_at: string;
  expires_at: string;
  completed_at?: string;
  status: 'in_progress' | 'submitted' | 'timed_out' | 'cancelled';
  current_answers: Record<string, string>; // questionId -> optionId
  score?: number;
  max_score?: number;
  percentage?: number;
  passed?: boolean;
  tab_switch_count: number;
  created_at: string;
}

export interface TestResult {
  id: string;
  attempt_id: string;
  student_id: string;
  test_id: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  time_spent_seconds: number;
  tab_switch_count: number;
  created_at: string;
}

export interface TabSwitchEvent {
  id: string;
  attempt_id: string;
  student_id: string;
  event_type: 'blur' | 'focus' | 'visibility_hidden' | 'visibility_visible';
  timestamp: string;
}

export interface TelegramVerification {
  id: string;
  phone: string;
  code: string;
  attempts_count: number;
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  details: any;
  ip_address?: string;
  created_at: string;
}

export interface CosmoDatabase {
  profiles: Profile[];
  groups: Group[];
  group_members: GroupMember[];
  tests: Test[];
  test_groups: { id: string; test_id: string; group_id: string }[];
  questions: Question[];
  question_options: QuestionOption[];
  test_attempts: TestAttempt[];
  test_results: TestResult[];
  tab_switch_events: TabSwitchEvent[];
  telegram_verifications: TelegramVerification[];
  audit_logs: AuditLog[];
}

const DB_FILE = path.resolve(process.cwd(), 'cosmo-db.json');

class CosmoStore {
  private data: CosmoDatabase;
  private supabase: SupabaseClient | null = null;
  public isSupabaseConnected = false;

  constructor() {
    this.data = this.loadOrSeedData();
    this.initSupabase();
  }

  private initSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key && !url.includes('your-project') && !key.includes('your_')) {
      try {
        this.supabase = createClient(url, key);
        this.isSupabaseConnected = true;
        console.log('[Supabase] Muvaffaqiyatli ulandi:', url);
      } catch (e) {
        console.warn('[Supabase] Ulanishda xato, lokal rejim ishlaydi:', e);
      }
    } else {
      console.log('[Ma\'lumotlar bazasi] Lokal rejimda ishlamoqda (cosmo-db.json)');
    }
  }

  private loadOrSeedData(): CosmoDatabase {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Baza faylini o‘qishda xato, qayta tiklanmoqda', err);
      }
    }
    const seeded = this.createInitialSeed();
    this.saveData(seeded);
    return seeded;
  }

  private saveData(data: CosmoDatabase = this.data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Bazani yozishda xato:', err);
    }
  }

  private createInitialSeed(): CosmoDatabase {
    const teacherId = 'teacher-default-001';
    const student1Id = 'student-ali-001';
    const student2Id = 'student-vali-002';
    const student3Id = 'student-malika-003';

    const group9A = 'group-9a-id';
    const group9B = 'group-9b-id';
    const groupMath = 'group-math1-id';
    const groupEng = 'group-eng2-id';

    const testAlgebraId = 'test-algebra-001';
    const testFizikaId = 'test-fizika-002';

    return {
      profiles: [
        {
          id: teacherId,
          phone: '+998901234567',
          first_name: 'Rustam',
          last_name: 'Karimov',
          role: 'teacher',
          created_at: new Date().toISOString()
        },
        {
          id: student1Id,
          phone: '+998991112233',
          first_name: 'Ali',
          last_name: 'Valiyev',
          role: 'student',
          created_at: new Date().toISOString()
        },
        {
          id: student2Id,
          phone: '+998934445566',
          first_name: 'Vali',
          last_name: 'Aliyev',
          role: 'student',
          created_at: new Date().toISOString()
        },
        {
          id: student3Id,
          phone: '+998977778899',
          first_name: 'Malika',
          last_name: 'Sobirova',
          role: 'student',
          created_at: new Date().toISOString()
        }
      ],
      groups: [
        { id: group9A, name: '9-A Sinf', description: 'Matematika va fizika chuqurlashtirilgan sinf', created_by: teacherId, created_at: new Date().toISOString() },
        { id: group9B, name: '9-B Sinf', description: 'Umumta’lim 9-B guruhi', created_by: teacherId, created_at: new Date().toISOString() },
        { id: groupMath, name: 'Matematika 1-guruh', description: 'Olimpiada va oliy toifa matematika to‘garagi', created_by: teacherId, created_at: new Date().toISOString() },
        { id: groupEng, name: 'Ingliz tili 2-guruh', description: 'Grammar and Reading kursi', created_by: teacherId, created_at: new Date().toISOString() }
      ],
      group_members: [
        { id: 'gm-1', group_id: group9A, student_id: student1Id, joined_at: new Date().toISOString() },
        { id: 'gm-2', group_id: groupMath, student_id: student1Id, joined_at: new Date().toISOString() },
        { id: 'gm-3', group_id: group9A, student_id: student2Id, joined_at: new Date().toISOString() },
        { id: 'gm-4', group_id: group9B, student_id: student3Id, joined_at: new Date().toISOString() },
        { id: 'gm-5', group_id: groupEng, student_id: student3Id, joined_at: new Date().toISOString() }
      ],
      tests: [
        {
          id: testAlgebraId,
          title: 'Algebra: Kvadrat tenglamalar va diskriminant',
          description: 'Kvadrat tenglamaning ildizlarini topish, Viyet teoremasi va grafik tahlil.',
          subject: 'Matematika',
          duration_minutes: 20,
          max_attempts: 2,
          passing_percentage: 60.0,
          shuffle_questions: true,
          shuffle_options: true,
          show_correct_answers: true,
          starts_at: new Date(Date.now() - 3600000).toISOString(),
          ends_at: new Date(Date.now() + 86400000 * 7).toISOString(),
          is_active: true,
          created_by: teacherId,
          created_at: new Date().toISOString()
        },
        {
          id: testFizikaId,
          title: 'Fizika: Nyuton qonunlari va Dinamika',
          description: 'Kuchlar muvozanati, tezlanish va jism massasi munosabatlari.',
          subject: 'Fizika',
          duration_minutes: 15,
          max_attempts: 1,
          passing_percentage: 70.0,
          shuffle_questions: false,
          shuffle_options: true,
          show_correct_answers: false,
          starts_at: new Date(Date.now() - 3600000).toISOString(),
          ends_at: new Date(Date.now() + 86400000 * 14).toISOString(),
          is_active: true,
          created_by: teacherId,
          created_at: new Date().toISOString()
        }
      ],
      test_groups: [
        { id: 'tg-1', test_id: testAlgebraId, group_id: group9A },
        { id: 'tg-2', test_id: testAlgebraId, group_id: groupMath },
        { id: 'tg-3', test_id: testFizikaId, group_id: group9A },
        { id: 'tg-4', test_id: testFizikaId, group_id: group9B }
      ],
      questions: [
        // Algebra questions
        {
          id: 'q-alg-1',
          test_id: testAlgebraId,
          question_text: 'x² - 5x + 6 = 0 kvadrat tenglamasining ildizlari yig‘indisini toping.',
          question_type: 'multiple_choice',
          points: 1,
          explanation: 'Viyet teoremasiga binoan x1 + x2 = -b/a = -(-5)/1 = 5.',
          order_index: 0,
          created_at: new Date().toISOString()
        },
        {
          id: 'q-alg-2',
          test_id: testAlgebraId,
          question_text: 'Diskriminant D = b² - 4ac agar 0 dan kichik (D < 0) bo‘lsa, haqiqiy sonlar to‘plamida nechta ildizga ega?',
          question_type: 'multiple_choice',
          points: 1,
          explanation: 'Agar kvadrat tenglamaning diskriminanti manfiy bo‘lsa (D < 0), u haqiqiy ildizlarga ega emas (ildizlar soni 0 ta).',
          order_index: 1,
          created_at: new Date().toISOString()
        },
        {
          id: 'q-alg-3',
          test_id: testAlgebraId,
          question_text: 'x² - 4 = 0 tenglamaning ildizlarini ko‘rsating.',
          question_type: 'multiple_choice',
          points: 1,
          explanation: 'x² = 4 => x = +2 yoki x = -2.',
          order_index: 2,
          created_at: new Date().toISOString()
        },
        {
          id: 'q-alg-4',
          test_id: testAlgebraId,
          question_text: 'Har qanday kvadrat tenglama parabolaning grafigini ifodalaydi.',
          question_type: 'true_false',
          points: 1,
          explanation: 'y = ax² + bx + c kvadratik funksiyasining grafigi parabola bo‘ladi.',
          order_index: 3,
          created_at: new Date().toISOString()
        },
        // Fizika questions
        {
          id: 'q-fiz-1',
          test_id: testFizikaId,
          question_text: 'Nyutonning ikkinchi qonuni formulasini aniqlang.',
          question_type: 'multiple_choice',
          points: 2,
          explanation: 'Nyutonning ikkinchi qonuni: F = m * a (Kuch = massa * tezlanish).',
          order_index: 0,
          created_at: new Date().toISOString()
        },
        {
          id: 'q-fiz-2',
          test_id: testFizikaId,
          question_text: 'Kuch birligi SI tizimida qaysi birlik bilan o‘lchanadi?',
          question_type: 'multiple_choice',
          points: 1,
          explanation: 'SI tizimida kuch Nyuton (N) birligida o‘lchanadi.',
          order_index: 1,
          created_at: new Date().toISOString()
        }
      ],
      question_options: [
        // q-alg-1
        { id: 'opt-a1', question_id: 'q-alg-1', option_label: 'A', option_text: '6', is_correct: false, order_index: 0 },
        { id: 'opt-a2', question_id: 'q-alg-1', option_label: 'B', option_text: '5', is_correct: true, order_index: 1 },
        { id: 'opt-a3', question_id: 'q-alg-1', option_label: 'C', option_text: '-5', is_correct: false, order_index: 2 },
        { id: 'opt-a4', question_id: 'q-alg-1', option_label: 'D', option_text: '-6', is_correct: false, order_index: 3 },
        // q-alg-2
        { id: 'opt-b1', question_id: 'q-alg-2', option_label: 'A', option_text: '2 ta ildiz', is_correct: false, order_index: 0 },
        { id: 'opt-b2', question_id: 'q-alg-2', option_label: 'B', option_text: '1 ta ildiz', is_correct: false, order_index: 1 },
        { id: 'opt-b3', question_id: 'q-alg-2', option_label: 'C', option_text: 'Haqiqiy ildizga ega emas (0 ta)', is_correct: true, order_index: 2 },
        { id: 'opt-b4', question_id: 'q-alg-2', option_label: 'D', option_text: 'Cheksiz ko‘p ildiz', is_correct: false, order_index: 3 },
        // q-alg-3
        { id: 'opt-c1', question_id: 'q-alg-3', option_label: 'A', option_text: 'x = 2', is_correct: false, order_index: 0 },
        { id: 'opt-c2', question_id: 'q-alg-3', option_label: 'B', option_text: 'x = -2', is_correct: false, order_index: 1 },
        { id: 'opt-c3', question_id: 'q-alg-3', option_label: 'C', option_text: 'x₁ = 2, x₂ = -2', is_correct: true, order_index: 2 },
        { id: 'opt-c4', question_id: 'q-alg-3', option_label: 'D', option_text: 'x = 4', is_correct: false, order_index: 3 },
        // q-alg-4 (true/false)
        { id: 'opt-d1', question_id: 'q-alg-4', option_label: 'A', option_text: 'To‘g‘ri', is_correct: true, order_index: 0 },
        { id: 'opt-d2', question_id: 'q-alg-4', option_label: 'B', option_text: 'Noto‘g‘ri', is_correct: false, order_index: 1 },
        // q-fiz-1
        { id: 'opt-f1', question_id: 'q-fiz-1', option_label: 'A', option_text: 'F = m * a', is_correct: true, order_index: 0 },
        { id: 'opt-f2', question_id: 'q-fiz-1', option_label: 'B', option_text: 'E = m * c²', is_correct: false, order_index: 1 },
        { id: 'opt-f3', question_id: 'q-fiz-1', option_label: 'C', option_text: 'P = m * g', is_correct: false, order_index: 2 },
        { id: 'opt-f4', question_id: 'q-fiz-1', option_label: 'D', option_text: 'v = s / t', is_correct: false, order_index: 3 },
        // q-fiz-2
        { id: 'opt-g1', question_id: 'q-fiz-2', option_label: 'A', option_text: 'Joul', is_correct: false, order_index: 0 },
        { id: 'opt-g2', question_id: 'q-fiz-2', option_label: 'B', option_text: 'Nyuton (N)', is_correct: true, order_index: 1 },
        { id: 'opt-g3', question_id: 'q-fiz-2', option_label: 'C', option_text: 'Vatt', is_correct: false, order_index: 2 },
        { id: 'opt-g4', question_id: 'q-fiz-2', option_label: 'D', option_text: 'Paskal', is_correct: false, order_index: 3 }
      ],
      test_attempts: [],
      test_results: [],
      tab_switch_events: [],
      telegram_verifications: [],
      audit_logs: [
        {
          id: 'log-init',
          action: 'system_initialized',
          details: { message: 'CosmoTest Pro tizimi ishga tushirildi' },
          created_at: new Date().toISOString()
        }
      ]
    };
  }

  // Telegram Verification Handlers
  public createVerificationCode(phone: string): { code: string; verificationId: string; expiresAt: string } {
    // Clean expired or old codes for this phone
    this.data.telegram_verifications = this.data.telegram_verifications.filter(
      v => !(v.phone === phone && (!v.is_used || new Date(v.expires_at) < new Date()))
    );

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    const verification: TelegramVerification = {
      id: verificationId,
      phone,
      code,
      attempts_count: 0,
      is_used: false,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };

    this.data.telegram_verifications.push(verification);
    this.saveData();

    this.logAudit(undefined, 'telegram_verification_created', { phone, verificationId });
    return { code, verificationId, expiresAt };
  }

  public verifyCode(phone: string, inputCode: string): { valid: boolean; message: string } {
    const record = this.data.telegram_verifications
      .filter(v => v.phone === phone && !v.is_used)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!record) {
      return { valid: false, message: 'Tasdiqlash kodi topilmadi yoki muddati o‘tgan. Qaytadan kod so‘rang.' };
    }

    if (new Date(record.expires_at) < new Date()) {
      return { valid: false, message: 'Kodning amal qilish vaqti (5 daqiqa) tugagan. Yangi kod oling.' };
    }

    if (record.attempts_count >= 5) {
      return { valid: false, message: 'Urinishlar soni oshib ketdi. Xavfsizlik uchun yangi kod so‘rang.' };
    }

    record.attempts_count += 1;

    if (record.code !== inputCode.trim()) {
      this.saveData();
      return { valid: false, message: `Kiritilgan kod noto‘g‘ri. Qolgan urinishlar: ${5 - record.attempts_count}` };
    }

    // Mark as used
    record.is_used = true;
    this.saveData();
    this.logAudit(undefined, 'telegram_verification_success', { phone });
    return { valid: true, message: 'Kod muvaffaqiyatli tasdiqlandi' };
  }

  // Profile management
  public getOrCreateStudentProfile(phone: string, firstName: string, lastName: string): Profile {
    let student = this.data.profiles.find(p => p.phone === phone);
    if (!student) {
      student = {
        id: crypto.randomUUID(),
        phone,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: 'student',
        created_at: new Date().toISOString()
      };
      this.data.profiles.push(student);

      // Auto-assign to default group if exists (e.g. 9-A)
      const defaultGroup = this.data.groups[0];
      if (defaultGroup) {
        this.data.group_members.push({
          id: crypto.randomUUID(),
          group_id: defaultGroup.id,
          student_id: student.id,
          joined_at: new Date().toISOString()
        });
      }
      this.saveData();
      this.logAudit(student.id, 'student_registered', { phone, name: `${firstName} ${lastName}` });
    } else {
      // Update names if provided
      if (firstName) student.first_name = firstName.trim();
      if (lastName) student.last_name = lastName.trim();
      this.saveData();
    }
    return student;
  }

  public getProfileById(id: string): Profile | undefined {
    return this.data.profiles.find(p => p.id === id);
  }

  public getStudentGroups(studentId: string): Group[] {
    const groupIds = this.data.group_members
      .filter(gm => gm.student_id === studentId)
      .map(gm => gm.group_id);
    return this.data.groups.filter(g => groupIds.includes(g.id));
  }

  // Groups
  public getGroups(): (Group & { student_count: number })[] {
    return this.data.groups.map(group => {
      const count = this.data.group_members.filter(gm => gm.group_id === group.id).length;
      return { ...group, student_count: count };
    });
  }

  public createGroup(name: string, description: string, createdBy?: string): Group {
    const group: Group = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      created_by: createdBy,
      created_at: new Date().toISOString()
    };
    this.data.groups.push(group);
    this.saveData();
    this.logAudit(createdBy, 'group_created', { name, groupId: group.id });
    return group;
  }

  public updateGroup(groupId: string, name: string, description: string): Group | null {
    const group = this.data.groups.find(g => g.id === groupId);
    if (!group) return null;
    group.name = name.trim();
    group.description = description.trim();
    this.saveData();
    this.logAudit(undefined, 'group_updated', { groupId, name });
    return group;
  }

  public deleteGroup(groupId: string): boolean {
    const idx = this.data.groups.findIndex(g => g.id === groupId);
    if (idx === -1) return false;
    this.data.groups.splice(idx, 1);
    this.data.group_members = this.data.group_members.filter(gm => gm.group_id !== groupId);
    this.data.test_groups = this.data.test_groups.filter(tg => tg.group_id !== groupId);
    this.saveData();
    this.logAudit(undefined, 'group_deleted', { groupId });
    return true;
  }

  public getGroupStudents(groupId: string): Profile[] {
    const studentIds = this.data.group_members
      .filter(gm => gm.group_id === groupId)
      .map(gm => gm.student_id);
    return this.data.profiles.filter(p => studentIds.includes(p.id));
  }

  public addStudentToGroup(groupId: string, studentId: string): boolean {
    const exists = this.data.group_members.some(gm => gm.group_id === groupId && gm.student_id === studentId);
    if (exists) return true;
    this.data.group_members.push({
      id: crypto.randomUUID(),
      group_id: groupId,
      student_id: studentId,
      joined_at: new Date().toISOString()
    });
    this.saveData();
    this.logAudit(undefined, 'student_added_to_group', { groupId, studentId });
    return true;
  }

  public removeStudentFromGroup(groupId: string, studentId: string): boolean {
    const initialLen = this.data.group_members.length;
    this.data.group_members = this.data.group_members.filter(
      gm => !(gm.group_id === groupId && gm.student_id === studentId)
    );
    this.saveData();
    this.logAudit(undefined, 'student_removed_from_group', { groupId, studentId });
    return this.data.group_members.length < initialLen;
  }

  public getAllStudents(): (Profile & { groups: string[] })[] {
    return this.data.profiles
      .filter(p => p.role === 'student')
      .map(p => {
        const studentGroupIds = this.data.group_members
          .filter(gm => gm.student_id === p.id)
          .map(gm => gm.group_id);
        const groupNames = this.data.groups
          .filter(g => studentGroupIds.includes(g.id))
          .map(g => g.name);
        return {
          ...p,
          groups: groupNames
        };
      });
  }

  // Tests
  public getTestsForStudent(studentId: string): any[] {
    const studentGroups = this.data.group_members
      .filter(gm => gm.student_id === studentId)
      .map(gm => gm.group_id);

    // Tests assigned to any of student's groups
    const assignedTestIds = Array.from(new Set(
      this.data.test_groups
        .filter(tg => studentGroups.includes(tg.group_id))
        .map(tg => tg.test_id)
    ));

    const now = new Date();

    return this.data.tests
      .filter(t => t.is_active && assignedTestIds.includes(t.id))
      .map(test => {
        const questionsCount = this.data.questions.filter(q => q.test_id === test.id).length;
        const attempts = this.data.test_attempts
          .filter(a => a.test_id === test.id && a.student_id === studentId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const activeAttempt = attempts.find(a => a.status === 'in_progress' && new Date(a.expires_at) > now);
        const completedAttemptsCount = attempts.filter(a => a.status === 'submitted' || a.status === 'timed_out').length;
        const remainingAttempts = Math.max(0, test.max_attempts - completedAttemptsCount);

        let status: 'not_started' | 'in_progress' | 'completed' | 'closed' | 'no_attempts_left' = 'not_started';

        if (test.ends_at && new Date(test.ends_at) < now) {
          status = 'closed';
        } else if (activeAttempt) {
          status = 'in_progress';
        } else if (remainingAttempts === 0) {
          status = 'no_attempts_left';
        } else if (completedAttemptsCount > 0) {
          status = 'completed';
        }

        const latestResult = this.data.test_results
          .filter(r => r.test_id === test.id && r.student_id === studentId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        return {
          id: test.id,
          title: test.title,
          description: test.description,
          subject: test.subject,
          duration_minutes: test.duration_minutes,
          max_attempts: test.max_attempts,
          passing_percentage: test.passing_percentage,
          questions_count: questionsCount,
          completed_attempts: completedAttemptsCount,
          remaining_attempts: remainingAttempts,
          status,
          active_attempt_id: activeAttempt?.id,
          latest_result: latestResult ? {
            score: latestResult.score,
            max_score: latestResult.max_score,
            percentage: latestResult.percentage,
            passed: latestResult.passed,
            date: latestResult.created_at
          } : null,
          starts_at: test.starts_at,
          ends_at: test.ends_at
        };
      });
  }

  public getAllTestsForTeacher(): any[] {
    return this.data.tests.map(test => {
      const questionsCount = this.data.questions.filter(q => q.test_id === test.id).length;
      const assignedGroupIds = this.data.test_groups
        .filter(tg => tg.test_id === test.id)
        .map(tg => tg.group_id);
      const assignedGroups = this.data.groups
        .filter(g => assignedGroupIds.includes(g.id))
        .map(g => ({ id: g.id, name: g.name }));
      const attemptsCount = this.data.test_attempts.filter(a => a.test_id === test.id).length;

      return {
        ...test,
        questions_count: questionsCount,
        assigned_groups: assignedGroups,
        attempts_count: attemptsCount
      };
    });
  }

  public getTestById(testId: string): Test | undefined {
    return this.data.tests.find(t => t.id === testId);
  }

  public createTestWithQuestions(
    testData: Omit<Test, 'id' | 'created_at'>,
    assignedGroupIds: string[],
    questions: Array<{
      question_text: string;
      question_type?: 'multiple_choice' | 'true_false';
      points?: number;
      explanation?: string;
      options: Array<{ option_label: string; option_text: string; is_correct: boolean }>;
    }>
  ): Test {
    const testId = crypto.randomUUID();
    const newTest: Test = {
      ...testData,
      id: testId,
      created_at: new Date().toISOString()
    };
    this.data.tests.push(newTest);

    // Assign groups
    for (const groupId of assignedGroupIds) {
      this.data.test_groups.push({
        id: crypto.randomUUID(),
        test_id: testId,
        group_id: groupId
      });
    }

    // Add questions and options
    questions.forEach((q, qIndex) => {
      const qId = crypto.randomUUID();
      this.data.questions.push({
        id: qId,
        test_id: testId,
        question_text: q.question_text,
        question_type: q.question_type || 'multiple_choice',
        points: q.points || 1,
        explanation: q.explanation || '',
        order_index: qIndex,
        created_at: new Date().toISOString()
      });

      q.options.forEach((opt, oIndex) => {
        this.data.question_options.push({
          id: crypto.randomUUID(),
          question_id: qId,
          option_label: opt.option_label,
          option_text: opt.option_text,
          is_correct: !!opt.is_correct,
          order_index: oIndex
        });
      });
    });

    this.saveData();
    this.logAudit(testData.created_by, 'test_created', { testId, title: testData.title, questionsCount: questions.length });
    return newTest;
  }

  public deleteTest(testId: string): boolean {
    const idx = this.data.tests.findIndex(t => t.id === testId);
    if (idx === -1) return false;
    this.data.tests.splice(idx, 1);
    this.data.test_groups = this.data.test_groups.filter(tg => tg.test_id !== testId);
    const qIds = this.data.questions.filter(q => q.test_id === testId).map(q => q.id);
    this.data.questions = this.data.questions.filter(q => q.test_id !== testId);
    this.data.question_options = this.data.question_options.filter(qo => !qIds.includes(qo.question_id));
    this.saveData();
    this.logAudit(undefined, 'test_deleted', { testId });
    return true;
  }

  public getFullTestQuestions(testId: string): Question[] {
    const questions = this.data.questions
      .filter(q => q.test_id === testId)
      .sort((a, b) => a.order_index - b.order_index);

    return questions.map(q => {
      const options = this.data.question_options
        .filter(opt => opt.question_id === q.id)
        .sort((a, b) => a.order_index - b.order_index);
      return {
        ...q,
        options
      };
    });
  }

  // Test Attempt & Server-Authoritative Logic
  public startOrResumeAttempt(studentId: string, testId: string): {
    attemptId: string;
    test: Partial<Test>;
    questions: any[];
    currentAnswers: Record<string, string>;
    serverTime: string;
    expiresAt: string;
    tabSwitchCount: number;
  } {
    const test = this.data.tests.find(t => t.id === testId);
    if (!test) throw new Error('Test topilmadi');

    const now = new Date();
    // Check if test is active and within dates
    if (!test.is_active) throw new Error('Ushbu test faol emas');
    if (test.starts_at && new Date(test.starts_at) > now) throw new Error('Ushbu test hali ochilmagan');
    if (test.ends_at && new Date(test.ends_at) < now) throw new Error('Ushbu test yopilgan');

    // Check existing attempts
    const previousAttempts = this.data.test_attempts.filter(
      a => a.test_id === testId && a.student_id === studentId
    );

    const activeAttempt = previousAttempts.find(
      a => a.status === 'in_progress' && new Date(a.expires_at) > now
    );

    let attempt: TestAttempt;

    if (activeAttempt) {
      attempt = activeAttempt;
    } else {
      const completedCount = previousAttempts.filter(
        a => a.status === 'submitted' || a.status === 'timed_out'
      ).length;

      if (completedCount >= test.max_attempts) {
        throw new Error('Sizda ushbu test uchun boshqa urinish qolmagan');
      }

      const expiresAt = new Date(now.getTime() + test.duration_minutes * 60 * 1000).toISOString();
      attempt = {
        id: crypto.randomUUID(),
        test_id: testId,
        student_id: studentId,
        attempt_number: completedCount + 1,
        started_at: now.toISOString(),
        expires_at: expiresAt,
        status: 'in_progress',
        current_answers: {},
        tab_switch_count: 0,
        created_at: now.toISOString()
      };
      this.data.test_attempts.push(attempt);
      this.saveData();
      this.logAudit(studentId, 'test_attempt_started', { testId, attemptId: attempt.id });
    }

    // Prepare questions for student: CRITICAL -> DO NOT SEND is_correct or explanations
    let rawQuestions = this.getFullTestQuestions(testId);
    if (test.shuffle_questions) {
      rawQuestions = [...rawQuestions].sort(() => 0.5 - Math.random());
    }

    const sanitizedQuestions = rawQuestions.map(q => {
      let options = (q.options || []).map(opt => ({
        id: opt.id,
        option_label: opt.option_label,
        option_text: opt.option_text
        // is_correct IS NOT SENT TO CLIENT
      }));

      if (test.shuffle_options) {
        options = [...options].sort(() => 0.5 - Math.random());
      }

      return {
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points,
        options
        // explanation IS NOT SENT TO CLIENT DURING TEST
      };
    });

    return {
      attemptId: attempt.id,
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        subject: test.subject,
        duration_minutes: test.duration_minutes,
        passing_percentage: test.passing_percentage
      },
      questions: sanitizedQuestions,
      currentAnswers: attempt.current_answers || {},
      serverTime: new Date().toISOString(),
      expiresAt: attempt.expires_at,
      tabSwitchCount: attempt.tab_switch_count
    };
  }

  public autosaveAttempt(attemptId: string, studentId: string, answers: Record<string, string>): { saved: boolean; expiresAt: string; isExpired: boolean } {
    const attempt = this.data.test_attempts.find(a => a.id === attemptId && a.student_id === studentId);
    if (!attempt) throw new Error('Urinish topilmadi');

    const now = new Date();
    const isExpired = new Date(attempt.expires_at) < now;

    if (attempt.status !== 'in_progress' || isExpired) {
      return { saved: false, expiresAt: attempt.expires_at, isExpired: true };
    }

    attempt.current_answers = { ...attempt.current_answers, ...answers };
    this.saveData();
    return { saved: true, expiresAt: attempt.expires_at, isExpired: false };
  }

  public logTabSwitch(attemptId: string, studentId: string, eventType: TabSwitchEvent['event_type']): number {
    const attempt = this.data.test_attempts.find(a => a.id === attemptId);
    if (attempt && attempt.status === 'in_progress') {
      attempt.tab_switch_count = (attempt.tab_switch_count || 0) + 1;
      this.data.tab_switch_events.push({
        id: crypto.randomUUID(),
        attempt_id: attemptId,
        student_id: studentId,
        event_type: eventType,
        timestamp: new Date().toISOString()
      });
      this.saveData();
      return attempt.tab_switch_count;
    }
    return 0;
  }

  // SERVER-SIDE GRADING ENGINE (CLIENT SCORE IS NEVER TRUSTED)
  public submitAndGradeAttempt(
    attemptId: string,
    studentId: string,
    finalAnswers?: Record<string, string>
  ): {
    result: TestResult;
    test: Test;
    student: Profile;
    breakdown?: any[];
  } {
    const attempt = this.data.test_attempts.find(a => a.id === attemptId && a.student_id === studentId);
    if (!attempt) throw new Error('Urinish topilmadi');

    const test = this.data.tests.find(t => t.id === attempt.test_id);
    if (!test) throw new Error('Test topilmadi');

    const student = this.data.profiles.find(p => p.id === studentId);
    if (!student) throw new Error('O‘quvchi profili topilmadi');

    // If final answers provided, merge
    if (finalAnswers) {
      attempt.current_answers = { ...attempt.current_answers, ...finalAnswers };
    }

    const answers = attempt.current_answers || {};
    const fullQuestions = this.getFullTestQuestions(test.id);

    let earnedPoints = 0;
    let totalPoints = 0;
    const answerBreakdown: any[] = [];

    fullQuestions.forEach(q => {
      const qPoints = Number(q.points) || 1;
      totalPoints += qPoints;

      const selectedOptionId = answers[q.id];
      const correctOption = (q.options || []).find(opt => opt.is_correct);
      const isCorrect = !!(correctOption && selectedOptionId && selectedOptionId === correctOption.id);

      if (isCorrect) {
        earnedPoints += qPoints;
      }

      answerBreakdown.push({
        question_id: q.id,
        question_text: q.question_text,
        points: qPoints,
        earned_points: isCorrect ? qPoints : 0,
        is_correct: isCorrect,
        selected_option_id: selectedOptionId,
        correct_option_id: test.show_correct_answers ? correctOption?.id : undefined,
        correct_option_label: test.show_correct_answers ? correctOption?.option_label : undefined,
        correct_option_text: test.show_correct_answers ? correctOption?.option_text : undefined,
        explanation: test.show_correct_answers ? q.explanation : undefined,
        options: test.show_correct_answers ? q.options : undefined
      });
    });

    const percentage = totalPoints > 0 ? Number(((earnedPoints / totalPoints) * 100).toFixed(1)) : 0;
    const passed = percentage >= Number(test.passing_percentage);

    const now = new Date();
    const startTime = new Date(attempt.started_at);
    const timeSpentSeconds = Math.max(1, Math.round((now.getTime() - startTime.getTime()) / 1000));

    // Update attempt
    attempt.status = 'submitted';
    attempt.completed_at = now.toISOString();
    attempt.score = earnedPoints;
    attempt.max_score = totalPoints;
    attempt.percentage = percentage;
    attempt.passed = passed;

    // Create or update result
    const resultId = crypto.randomUUID();
    const testResult: TestResult = {
      id: resultId,
      attempt_id: attempt.id,
      student_id: student.id,
      test_id: test.id,
      score: earnedPoints,
      max_score: totalPoints,
      percentage,
      passed,
      time_spent_seconds: timeSpentSeconds,
      tab_switch_count: attempt.tab_switch_count || 0,
      created_at: now.toISOString()
    };

    // Remove any previous result for this attempt if exists
    this.data.test_results = this.data.test_results.filter(r => r.attempt_id !== attempt.id);
    this.data.test_results.push(testResult);
    this.saveData();

    this.logAudit(studentId, 'test_submitted_and_graded', {
      testId: test.id,
      attemptId: attempt.id,
      score: earnedPoints,
      totalPoints,
      percentage,
      passed
    });

    return {
      result: testResult,
      test,
      student,
      breakdown: test.show_correct_answers ? answerBreakdown : undefined
    };
  }

  // Teacher Dashboard & Analytics
  public getTeacherDashboardStats() {
    const totalStudents = this.data.profiles.filter(p => p.role === 'student').length;
    const totalGroups = this.data.groups.length;
    const totalTests = this.data.tests.length;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayResults = this.data.test_results.filter(
      r => new Date(r.created_at) >= startOfToday
    );
    const todayTestsCount = todayResults.length;

    const allResults = this.data.test_results;
    const avgScore = allResults.length > 0
      ? Number((allResults.reduce((acc, curr) => acc + curr.percentage, 0) / allResults.length).toFixed(1))
      : 0;

    const recentResults = [...this.data.test_results]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(r => {
        const student = this.data.profiles.find(p => p.id === r.student_id);
        const test = this.data.tests.find(t => t.id === r.test_id);
        return {
          id: r.id,
          studentName: student ? `${student.first_name} ${student.last_name}` : 'Noma’lum',
          testTitle: test ? test.title : 'Noma’lum',
          score: r.score,
          maxScore: r.max_score,
          percentage: r.percentage,
          passed: r.passed,
          date: r.created_at
        };
      });

    return {
      totalStudents,
      totalGroups,
      totalTests,
      todayTestsCount,
      avgScore,
      recentResults
    };
  }

  public getResultsTable(filter?: { groupId?: string; testId?: string; studentId?: string; date?: string }): any[] {
    let results = [...this.data.test_results];

    if (filter?.testId) {
      results = results.filter(r => r.test_id === filter.testId);
    }
    if (filter?.studentId) {
      results = results.filter(r => r.student_id === filter.studentId);
    }
    if (filter?.date) {
      results = results.filter(r => r.created_at.startsWith(filter.date!));
    }

    return results
      .map(r => {
        const student = this.data.profiles.find(p => p.id === r.student_id);
        const test = this.data.tests.find(t => t.id === r.test_id);
        const studentGroups = this.getStudentGroups(r.student_id).map(g => g.name).join(', ');

        return {
          id: r.id,
          attempt_id: r.attempt_id,
          student_id: r.student_id,
          student_name: student ? `${student.first_name} ${student.last_name}` : 'Noma’lum',
          student_phone: student?.phone || '',
          group_name: studentGroups || 'Guruhsiz',
          test_id: r.test_id,
          test_title: test?.title || 'Noma’lum',
          subject: test?.subject || '',
          score: r.score,
          max_score: r.max_score,
          percentage: r.percentage,
          passed: r.passed,
          time_spent_seconds: r.time_spent_seconds,
          tab_switch_count: r.tab_switch_count,
          created_at: r.created_at
        };
      })
      .filter(item => {
        if (filter?.groupId) {
          const studentGroups = this.getStudentGroups(item.student_id).map(g => g.id);
          return studentGroups.includes(filter.groupId);
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getUnattemptedStudentsForTest(testId: string): {
    testTitle: string;
    attemptedCount: number;
    unattemptedCount: number;
    unattemptedStudents: Profile[];
  } {
    const test = this.data.tests.find(t => t.id === testId);
    if (!test) throw new Error('Test topilmadi');

    // Get groups assigned to this test
    const assignedGroupIds = this.data.test_groups
      .filter(tg => tg.test_id === testId)
      .map(tg => tg.group_id);

    // Get all students belonging to these groups
    const eligibleStudentIds = Array.from(new Set(
      this.data.group_members
        .filter(gm => assignedGroupIds.includes(gm.group_id))
        .map(gm => gm.student_id)
    ));

    // Check which ones have an attempt
    const attemptedStudentIds = Array.from(new Set(
      this.data.test_attempts
        .filter(a => a.test_id === testId)
        .map(a => a.student_id)
    ));

    const unattemptedIds = eligibleStudentIds.filter(id => !attemptedStudentIds.includes(id));
    const unattemptedStudents = this.data.profiles.filter(p => unattemptedIds.includes(p.id));

    return {
      testTitle: test.title,
      attemptedCount: attemptedStudentIds.length,
      unattemptedCount: unattemptedStudents.length,
      unattemptedStudents
    };
  }

  public getQuestionAnalyticsForTest(testId: string): any[] {
    const questions = this.getFullTestQuestions(testId);
    const attempts = this.data.test_attempts.filter(a => a.test_id === testId && a.status === 'submitted');

    return questions.map((q, index) => {
      let totalAnswers = 0;
      let correctAnswers = 0;

      const correctOption = (q.options || []).find(opt => opt.is_correct);

      attempts.forEach(att => {
        const selected = (att.current_answers || {})[q.id];
        if (selected) {
          totalAnswers += 1;
          if (correctOption && selected === correctOption.id) {
            correctAnswers += 1;
          }
        }
      });

      const incorrectAnswers = totalAnswers - correctAnswers;
      const successRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      return {
        question_index: index + 1,
        question_id: q.id,
        question_text: q.question_text,
        total_answers: totalAnswers,
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        success_rate: successRate
      };
    });
  }

  public resetAttempt(attemptId: string): boolean {
    const attempt = this.data.test_attempts.find(a => a.id === attemptId);
    if (!attempt) return false;

    // We keep audit history but mark the attempt status as cancelled so student can retry
    attempt.status = 'cancelled';
    this.saveData();

    this.logAudit(undefined, 'attempt_reset_by_teacher', { attemptId, studentId: attempt.student_id, testId: attempt.test_id });
    return true;
  }

  public getStudentProfile(studentId: string): any {
    const student = this.data.profiles.find(p => p.id === studentId);
    if (!student) return null;

    const groups = this.getStudentGroups(studentId);
    const results = this.data.test_results
      .filter(r => r.student_id === studentId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const tests = this.data.tests;

    const history = results.map(r => {
      const test = tests.find(t => t.id === r.test_id);
      return {
        id: r.id,
        test_title: test?.title || 'Noma’lum test',
        subject: test?.subject || 'Umumiy',
        score: r.score,
        max_score: r.max_score,
        percentage: r.percentage,
        passed: r.passed,
        time_spent_seconds: r.time_spent_seconds,
        tab_switch_count: r.tab_switch_count,
        date: r.created_at
      };
    });

    return {
      student,
      groups,
      history,
      total_tests_taken: results.length,
      average_percentage: results.length > 0
        ? Math.round(results.reduce((acc, cur) => acc + cur.percentage, 0) / results.length)
        : 0
    };
  }

  public logAudit(userId: string | undefined, action: string, details: any, ipAddress?: string) {
    this.data.audit_logs.push({
      id: crypto.randomUUID(),
      user_id: userId,
      action,
      details,
      ip_address: ipAddress,
      created_at: new Date().toISOString()
    });
    // Keep max 500 logs in memory
    if (this.data.audit_logs.length > 500) {
      this.data.audit_logs = this.data.audit_logs.slice(-500);
    }
    this.saveData();
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.data.audit_logs].reverse().slice(0, 100);
  }
}

export const store = new CosmoStore();
