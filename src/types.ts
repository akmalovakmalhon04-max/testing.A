export interface Profile {
  id: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'teacher' | 'admin';
  created_at?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  student_count?: number;
  created_at?: string;
}

export interface QuestionOption {
  id: string;
  question_id?: string;
  option_label: string;
  option_text: string;
  is_correct?: boolean;
}

export interface Question {
  id: string;
  test_id?: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  points: number;
  explanation?: string;
  options: QuestionOption[];
}

export interface TestSummary {
  id: string;
  title: string;
  description: string;
  subject: string;
  duration_minutes: number;
  max_attempts: number;
  passing_percentage: number;
  questions_count: number;
  completed_attempts: number;
  remaining_attempts: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'closed' | 'no_attempts_left';
  active_attempt_id?: string;
  latest_result?: {
    score: number;
    max_score: number;
    percentage: number;
    passed: boolean;
    date: string;
  } | null;
  starts_at?: string;
  ends_at?: string;
}

export interface TestResultData {
  id: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  time_spent_seconds: number;
  tab_switch_count: number;
  created_at: string;
}

export interface ResultBreakdownItem {
  question_id: string;
  question_text: string;
  points: number;
  earned_points: number;
  is_correct: boolean;
  selected_option_id?: string;
  correct_option_id?: string;
  correct_option_label?: string;
  correct_option_text?: string;
  explanation?: string;
  options?: QuestionOption[];
}
