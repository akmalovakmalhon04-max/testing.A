/**
 * Telegram Bot integratsiyasi
 * - Bir martalik tasdiqlash kodlarini yuborish
 * - Test topshirilganda admin chatiga bildirishnoma yuborish
 */

export interface TestResultNotification {
  studentName: string;
  testTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  tabSwitchCount: number;
}

export async function sendTelegramMessage(chatId: string | number, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.includes('your_') || !chatId) {
    console.log(`[Telegram Simulyatsiya] Chat ${chatId} ga xabar: \n${text}`);
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });
    const data = await response.json();
    return !!data.ok;
  } catch (err) {
    console.error('Telegram xabar yuborishda xatolik:', err);
    return false;
  }
}

export async function notifyAdminOnTestComplete(result: TestResultNotification): Promise<void> {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!adminChatId) {
    console.log('[Telegram Admin] Admin Chat ID sozlanmagan (.env.example ga qarang)');
    return;
  }

  const minutes = Math.floor(result.timeSpentSeconds / 60);
  const seconds = result.timeSpentSeconds % 60;
  const timeFormatted = `${minutes} daqiqa ${seconds} soniya`;
  const statusFormatted = result.passed ? 'O‘TDI ✅' : 'O‘TMADI ❌';

  const message = `<b>Yangi test natijasi:</b>\n\n` +
    `👤 <b>O‘quvchi:</b> ${result.studentName}\n` +
    `📝 <b>Test:</b> ${result.testTitle}\n` +
    `🎯 <b>Ball:</b> ${result.score}/${result.maxScore}\n` +
    `📊 <b>Foiz:</b> ${result.percentage}%\n` +
    `🏁 <b>Natija:</b> ${statusFormatted}\n` +
    `⏱ <b>Vaqt:</b> ${timeFormatted}\n` +
    `⚠️ <b>Oynadan chiqishlar:</b> ${result.tabSwitchCount} marta`;

  await sendTelegramMessage(adminChatId, message);
}
