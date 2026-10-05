-- ============================================================================
-- COSMOTEST PRO - SUPABASE POSTGRESQL MA'LUMOTLAR BAZASI STRUKTURASI VA RLS QOIDALARI
-- Ushbu faylni Supabase boshqaruv panelidagi SQL Editorda to'liq ishga tushiring.
-- ============================================================================

-- Kengaytmalarni faollashtirish
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES (Foydalanuvchilar: O'quvchilar, O'qituvchilar, Adminlar)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(32) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. GROUPS (Guruhlar: masalan "9-A", "Matematika 1-guruh")
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. GROUP_MEMBERS (O'quvchilar va guruhlar bog'lanishi)
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, student_id)
);

-- 4. TESTS (Testlar)
CREATE TABLE IF NOT EXISTS public.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(150) NOT NULL DEFAULT 'Umumiy',
    duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
    max_attempts INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts >= 1),
    passing_percentage NUMERIC(5,2) NOT NULL DEFAULT 60.0 CHECK (passing_percentage >= 0 AND passing_percentage <= 100),
    shuffle_questions BOOLEAN NOT NULL DEFAULT true,
    shuffle_options BOOLEAN NOT NULL DEFAULT true,
    show_correct_answers BOOLEAN NOT NULL DEFAULT false,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TEST_GROUPS (Test qaysi guruhlarga ochilgani)
CREATE TABLE IF NOT EXISTS public.test_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(test_id, group_id)
);

-- 6. QUESTIONS (Test savollari)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false')),
    points NUMERIC(6,2) NOT NULL DEFAULT 1.0 CHECK (points >= 0),
    explanation TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. QUESTION_OPTIONS (Savol variantlari: A, B, C, D)
CREATE TABLE IF NOT EXISTS public.question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_label VARCHAR(10) NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0
);

-- 8. TEST_ATTEMPTS (O'quvchining test topshirish sessiyasi / urinishi)
CREATE TABLE IF NOT EXISTS public.test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'timed_out', 'cancelled')),
    current_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    score NUMERIC(8,2) DEFAULT 0,
    max_score NUMERIC(8,2) DEFAULT 0,
    percentage NUMERIC(5,2) DEFAULT 0,
    passed BOOLEAN DEFAULT false,
    tab_switch_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ATTEMPT_ANSWERS (Har bir savolga berilgan javoblar detali)
CREATE TABLE IF NOT EXISTS public.attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES public.question_options(id) ON DELETE SET NULL,
    selected_option_label VARCHAR(10),
    is_correct BOOLEAN DEFAULT false,
    points_earned NUMERIC(6,2) DEFAULT 0,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (attempt_id, question_id)
);

-- 10. TEST_RESULTS (Yakuniy hisoblangan natijalar)
CREATE TABLE IF NOT EXISTS public.test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL UNIQUE REFERENCES public.test_attempts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    score NUMERIC(8,2) NOT NULL,
    max_score NUMERIC(8,2) NOT NULL,
    percentage NUMERIC(5,2) NOT NULL,
    passed BOOLEAN NOT NULL,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    tab_switch_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. TAB_SWITCH_EVENTS (Test vaqtida oynadan chiqishlar monitoringi)
CREATE TABLE IF NOT EXISTS public.tab_switch_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('blur', 'focus', 'visibility_hidden', 'visibility_visible')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. TELEGRAM_VERIFICATIONS (Telegram bir martalik tasdiqlash kodlari)
CREATE TABLE IF NOT EXISTS public.telegram_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(32) NOT NULL,
    code VARCHAR(10) NOT NULL,
    attempts_count INTEGER NOT NULL DEFAULT 0,
    is_used BOOLEAN NOT NULL DEFAULT false,
    telegram_chat_id BIGINT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. AUDIT_LOGS (Tizim xavfsizlik va harakatlar jurnali)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES (Tezkor qidiruv va 500 ta foydalanuvchi yuqori yuklamasi uchun)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_student ON public.group_members(student_id);
CREATE INDEX IF NOT EXISTS idx_test_groups_test ON public.test_groups(test_id);
CREATE INDEX IF NOT EXISTS idx_test_groups_group ON public.test_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_questions_test ON public.questions(test_id);
CREATE INDEX IF NOT EXISTS idx_question_options_q ON public.question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_student_test ON public.test_attempts(student_id, test_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_status ON public.test_attempts(status);
CREATE INDEX IF NOT EXISTS idx_test_attempts_expires ON public.test_attempts(expires_at);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON public.attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test ON public.test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_student ON public.test_results(student_id);
CREATE INDEX IF NOT EXISTS idx_tab_switch_attempt ON public.tab_switch_events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_tg_verifications_phone_code ON public.telegram_verifications(phone, code);
CREATE INDEX IF NOT EXISTS idx_audit_action_time ON public.audit_logs(action, created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) QOIDALARI
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_switch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Service Role (Backend API) barcha ma'lumotlarga to'liq ruxsatga ega
CREATE POLICY "Service role full access on profiles" ON public.profiles FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on groups" ON public.groups FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on group_members" ON public.group_members FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on tests" ON public.tests FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on test_groups" ON public.test_groups FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on questions" ON public.questions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on question_options" ON public.question_options FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on test_attempts" ON public.test_attempts FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on attempt_answers" ON public.attempt_answers FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on test_results" ON public.test_results FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on tab_switch_events" ON public.tab_switch_events FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on telegram_verifications" ON public.telegram_verifications FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on audit_logs" ON public.audit_logs FOR ALL TO service_role USING (true);

-- Anon / Authenticated ruxsatlar (Backend Express proxy orqali xavfsiz boshqariladi)
-- O'quvchilar anonim tarzda faqat o'zlarining sessiyasi doirasida ishlaydi (Server-side API orqali himoyalanadi)
CREATE POLICY "Public read for active tests info" ON public.tests FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Students read own attempts" ON public.test_attempts FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Students log tab switch" ON public.tab_switch_events FOR INSERT TO anon, authenticated WITH CHECK (true);
