export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const cleanVal = (val: any): string => {
    if (val === undefined || val === null) return '';
    return String(val).trim().replace(/^["']|["']$/g, '').trim();
  };

  const defaultBotToken = cleanVal(process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN);
  const defaultChatId = cleanVal(process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID);
  const hasEnvToken = Boolean(defaultBotToken && defaultChatId);

  if (req.method === 'GET') {
    return res.status(200).json({
      botToken: defaultBotToken,
      chatId: defaultChatId,
      hasEnvConfig: hasEnvToken,
      enabled: hasEnvToken,
      notifyMutasiMasuk: true,
      notifyMutasiKeluar: true,
      notifyPangkatBaru: true,
      notifyKGBBaru: true,
      notifyVervalPD: true,
      threadIdMutasiMasuk: '',
      threadIdMutasiKeluar: '',
      threadIdPangkat: '',
      threadIdKGB: '',
      threadIdVervalPD: '',
      chatIdMutasiMasuk: '',
      chatIdMutasiKeluar: '',
      chatIdPangkat: '',
      chatIdKGB: '',
      chatIdVervalPD: '',
    });
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf-8'));
      } catch {
        body = {};
      }
    } else if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const resolvedToken = cleanVal(body.botToken) || defaultBotToken;
    const resolvedChatId = cleanVal(body.chatId) || defaultChatId;
    const isNowConfigured = Boolean(resolvedToken && resolvedChatId);

    return res.status(200).json({
      status: 'success',
      message: 'Pengaturan Telegram berhasil diproses',
      config: {
        botToken: resolvedToken,
        chatId: resolvedChatId,
        enabled: body.enabled ?? isNowConfigured,
        notifyMutasiMasuk: body.notifyMutasiMasuk ?? true,
        notifyMutasiKeluar: body.notifyMutasiKeluar ?? true,
        notifyPangkatBaru: body.notifyPangkatBaru ?? true,
        notifyKGBBaru: body.notifyKGBBaru ?? true,
        notifyVervalPD: body.notifyVervalPD ?? true,
        threadIdMutasiMasuk: cleanVal(body.threadIdMutasiMasuk),
        threadIdMutasiKeluar: cleanVal(body.threadIdMutasiKeluar),
        threadIdPangkat: cleanVal(body.threadIdPangkat),
        threadIdKGB: cleanVal(body.threadIdKGB),
        threadIdVervalPD: cleanVal(body.threadIdVervalPD),
        chatIdMutasiMasuk: cleanVal(body.chatIdMutasiMasuk),
        chatIdMutasiKeluar: cleanVal(body.chatIdMutasiKeluar),
        chatIdPangkat: cleanVal(body.chatIdPangkat),
        chatIdKGB: cleanVal(body.chatIdKGB),
        chatIdVervalPD: cleanVal(body.chatIdVervalPD),
      },
    });
  }

  return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
}
