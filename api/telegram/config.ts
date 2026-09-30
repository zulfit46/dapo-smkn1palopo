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

  const parseChatId = (val: string): string => {
    const match = val.match(/t\.me\/c\/(\d+)/i);
    if (match && match[1]) {
      return `-100${match[1]}`;
    }
    const matchWeb = val.match(/#(-?\d+)/i);
    if (matchWeb && matchWeb[1]) {
      const raw = matchWeb[1];
      return raw.startsWith('-') ? raw : `-100${raw}`;
    }
    return val;
  };

  const parseThreadId = (val: string): string => {
    if (!val) return '';
    const matchC = val.match(/t\.me\/c\/\d+\/(\d+)/i);
    if (matchC && matchC[1]) return matchC[1];
    const matchWeb = val.match(/#(-?\d+)_(\d+)/i);
    if (matchWeb && matchWeb[2]) return matchWeb[2];
    const matchUser = val.match(/t\.me\/[^/]+\/(\d+)/i);
    if (matchUser && matchUser[1]) return matchUser[1];
    return val;
  };

  const defaultBotToken = cleanVal(process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN);
  const rawDefaultChatId = cleanVal(process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID);
  const defaultChatId = parseChatId(rawDefaultChatId);
  const hasEnvToken = Boolean(defaultBotToken && defaultChatId);

  // Baca Thread IDs dari Vercel Environment Variables
  const envThreadMutasiKeluar = parseThreadId(cleanVal(
    process.env.TELEGRAM_THREAD_ID_MUTASI_KELUAR || 
    process.env.TELEGRAM_THREAD_ID_KELUAR || 
    process.env.VITE_TELEGRAM_THREAD_ID_MUTASI_KELUAR
  ));
  const envThreadMutasiMasuk = parseThreadId(cleanVal(
    process.env.TELEGRAM_THREAD_ID_MUTASI_MASUK || 
    process.env.TELEGRAM_THREAD_ID_MASUK || 
    process.env.VITE_TELEGRAM_THREAD_ID_MUTASI_MASUK
  ));
  const envThreadPangkat = parseThreadId(cleanVal(
    process.env.TELEGRAM_THREAD_ID_PANGKAT || 
    process.env.VITE_TELEGRAM_THREAD_ID_PANGKAT
  ));
  const envThreadKGB = parseThreadId(cleanVal(
    process.env.TELEGRAM_THREAD_ID_KGB || 
    process.env.VITE_TELEGRAM_THREAD_ID_KGB
  ));
  const envThreadVervalPD = parseThreadId(cleanVal(
    process.env.TELEGRAM_THREAD_ID_VERVALPD || 
    process.env.VITE_TELEGRAM_THREAD_ID_VERVALPD
  ));

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
      threadIdMutasiMasuk: envThreadMutasiMasuk,
      threadIdMutasiKeluar: envThreadMutasiKeluar,
      threadIdPangkat: envThreadPangkat,
      threadIdKGB: envThreadKGB,
      threadIdVervalPD: envThreadVervalPD,
      chatIdMutasiMasuk: parseChatId(cleanVal(process.env.TELEGRAM_CHAT_ID_MUTASI_MASUK)),
      chatIdMutasiKeluar: parseChatId(cleanVal(process.env.TELEGRAM_CHAT_ID_MUTASI_KELUAR)),
      chatIdPangkat: parseChatId(cleanVal(process.env.TELEGRAM_CHAT_ID_PANGKAT)),
      chatIdKGB: parseChatId(cleanVal(process.env.TELEGRAM_CHAT_ID_KGB)),
      chatIdVervalPD: parseChatId(cleanVal(process.env.TELEGRAM_CHAT_ID_VERVALPD)),
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
    const resolvedChatId = parseChatId(cleanVal(body.chatId)) || defaultChatId;
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
        threadIdMutasiMasuk: parseThreadId(cleanVal(body.threadIdMutasiMasuk)) || envThreadMutasiMasuk,
        threadIdMutasiKeluar: parseThreadId(cleanVal(body.threadIdMutasiKeluar)) || envThreadMutasiKeluar,
        threadIdPangkat: parseThreadId(cleanVal(body.threadIdPangkat)) || envThreadPangkat,
        threadIdKGB: parseThreadId(cleanVal(body.threadIdKGB)) || envThreadKGB,
        threadIdVervalPD: parseThreadId(cleanVal(body.threadIdVervalPD)) || envThreadVervalPD,
        chatIdMutasiMasuk: parseChatId(cleanVal(body.chatIdMutasiMasuk)),
        chatIdMutasiKeluar: parseChatId(cleanVal(body.chatIdMutasiKeluar)),
        chatIdPangkat: parseChatId(cleanVal(body.chatIdPangkat)),
        chatIdKGB: parseChatId(cleanVal(body.chatIdKGB)),
        chatIdVervalPD: parseChatId(cleanVal(body.chatIdVervalPD)),
      },
    });
  }

  return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
}
