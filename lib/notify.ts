export async function notifyTelegram(text: string) {
  // Працює лише на проді
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔔 [DEV] notifyTelegram skipped:', text);
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat  = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text }),
    });
  } catch (err) {
    console.error('❌ Telegram notify failed', err);
  }
}
