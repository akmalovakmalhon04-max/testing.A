/**
 * CosmoTest Pro - 500 Ta Bir Vaqtning O'zidagi Foydalanuvchi (Concurrent Users) uchun k6 Load Test Script
 *
 * Ishga tushirish uchun:
 * 1. k6 ni o'rnating: https://k6.io/docs/get-started/installation/
 *    - Linux/Ubuntu: sudo gpg -k && sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 && echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt-get update && sudo apt-get install k6
 *    - MacOS: brew install k6
 *    - Windows: choco install k6 yoki winget install k6
 *
 * 2. Testni ishga tushirish:
 *    k6 run load-test.js
 *
 * Yoki muhit URL manzilini ko'rsatib:
 *    k6 run -e BASE_URL=http://localhost:3000 load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Maxsus metrikalar
const failureRate = new Rate('failed_requests');
const testSubmissionLatency = new Trend('test_submit_duration');
const autosaveLatency = new Trend('autosave_duration');
const totalAnsweredQuestions = new Counter('total_answered_questions');

export const options = {
  // Bosqichma-bosqich 500 foydalanuvchiga chiqish va ushlab turish
  stages: [
    { duration: '30s', target: 100 },  // 30 soniyada 100 foydalanuvchiga chiqish
    { duration: '1m', target: 500 },   // 1 daqiqada 500 ta VUs ga yetish
    { duration: '2m', target: 500 },   // 2 daqiqa davomida 500 ta o'quvchi bir vaqtda test topshiradi
    { duration: '30s', target: 0 }     // 30 soniyada yuklamani pasaytirish
  ],
  thresholds: {
    'http_req_duration': ['p(95)<400', 'p(99)<800'], // 95% so'rovlar 400ms dan tez bo'lishi shart
    'failed_requests': ['rate<0.01'],                 // Xatoliklar 1% dan kam bo'lishi shart
    'test_submit_duration': ['p(95)<500']             // Server baholash 500ms dan tez bo'lishi kerak
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const vuId = __VU;
  const iteration = __ITER;

  // Har bir virtual foydalanuvchi uchun unikal telefon raqami (+99890xxxxxxx)
  const phone = `+99890${String(1000000 + (vuId % 900000)).padStart(7, '0')}`;
  const firstName = `Talaba_${vuId}`;
  const lastName = `Sinovchi_${iteration}`;

  let token = null;
  let attemptId = null;
  let testId = 'test-algebra-001';
  let questionIds = [];

  // 1-BOSQICH: Telegram orqali ro'yxatdan o'tish / kod so'rash
  group('01_Telegram_Auth', function () {
    const codeReqPayload = JSON.stringify({
      phone: phone,
      firstName: firstName,
      lastName: lastName
    });

    const codeRes = http.post(`${BASE_URL}/api/auth/request-code`, codeReqPayload, {
      headers: { 'Content-Type': 'application/json' }
    });

    const codeSuccess = check(codeRes, {
      'request-code 200': (r) => r.status === 200,
      'kod mavjud': (r) => JSON.parse(r.body).previewCode !== undefined
    });

    failureRate.add(!codeSuccess);

    if (!codeSuccess) return;

    const verificationCode = JSON.parse(codeRes.body).previewCode;

    // Kodni tasdiqlash
    const verifyPayload = JSON.stringify({
      phone: phone,
      code: verificationCode,
      firstName: firstName,
      lastName: lastName
    });

    const verifyRes = http.post(`${BASE_URL}/api/auth/verify-code`, verifyPayload, {
      headers: { 'Content-Type': 'application/json' }
    });

    const verifySuccess = check(verifyRes, {
      'verify-code 200': (r) => r.status === 200,
      'token olindi': (r) => JSON.parse(r.body).token !== undefined
    });

    failureRate.add(!verifySuccess);

    if (verifySuccess) {
      token = JSON.parse(verifyRes.body).token;
    }
  });

  if (!token) {
    sleep(1);
    return;
  }

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  sleep(Math.random() * 2 + 1);

  // 2-BOSQICH: Testlar ro'yxatini yuklash va testni boshlash
  group('02_Start_Test_Attempt', function () {
    const testsRes = http.get(`${BASE_URL}/api/student/tests`, { headers: authHeaders });
    check(testsRes, { 'tests list 200': (r) => r.status === 200 });

    const startRes = http.post(`${BASE_URL}/api/student/tests/${testId}/start`, '{}', {
      headers: authHeaders
    });

    const startSuccess = check(startRes, {
      'test start 200': (r) => r.status === 200,
      'attemptId olindi': (r) => JSON.parse(r.body).attemptId !== undefined,
      'savollar keldi': (r) => JSON.parse(r.body).questions.length > 0
    });

    failureRate.add(!startSuccess);

    if (startSuccess) {
      const data = JSON.parse(startRes.body);
      attemptId = data.attemptId;
      questionIds = data.questions.map(q => ({
        id: q.id,
        optionIds: q.options.map(o => o.id)
      }));
    }
  });

  if (!attemptId || questionIds.length === 0) {
    sleep(1);
    return;
  }

  // 3-BOSQICH: Savollarga javob berish va Autosave simulyatsiyasi
  group('03_Answer_And_Autosave', function () {
    const answers = {};

    for (let i = 0; i < questionIds.length; i++) {
      const q = questionIds[i];
      // Tasodifiy variant tanlash
      const selectedOption = q.optionIds[Math.floor(Math.random() * q.optionIds.length)];
      answers[q.id] = selectedOption;
      totalAnsweredQuestions.add(1);

      // O'quvchi savolni o'qish vaqtini simulyatsiya qilish (1-3 soniya)
      sleep(Math.random() * 2 + 1);

      // Har 2 ta javobda yoki oxirida autosave qilish
      if (i % 2 === 1 || i === questionIds.length - 1) {
        const startAutosave = Date.now();
        const autoRes = http.post(
          `${BASE_URL}/api/student/attempts/${attemptId}/autosave`,
          JSON.stringify({ answers: answers }),
          { headers: authHeaders }
        );
        autosaveLatency.add(Date.now() - startAutosave);

        check(autoRes, {
          'autosave 200': (r) => r.status === 200,
          'saqlandi': (r) => JSON.parse(r.body).saved === true
        });
      }

      // 4-BOSQICH: 10% ehtimollik bilan test vaqtida oynadan chiqish (Tab switch)
      if (Math.random() < 0.1) {
        http.post(
          `${BASE_URL}/api/student/attempts/${attemptId}/tab-switch`,
          JSON.stringify({ eventType: 'visibility_hidden' }),
          { headers: authHeaders }
        );
      }
    }

    // 5-BOSQICH: Testni yakunlash va Server-Side Grading
    const startSubmit = Date.now();
    const submitRes = http.post(
      `${BASE_URL}/api/student/attempts/${attemptId}/submit`,
      JSON.stringify({ answers: answers }),
      { headers: authHeaders }
    );
    testSubmissionLatency.add(Date.now() - startSubmit);

    const submitSuccess = check(submitRes, {
      'submit 200': (r) => r.status === 200,
      'natija hisoblandi': (r) => JSON.parse(r.body).result.percentage !== undefined
    });

    failureRate.add(!submitSuccess);
  });

  sleep(Math.random() * 3 + 2);
}
