export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  // Helper untuk membersihkan nilai token/ID (hapus tanda kutip ganda/tunggal & spasi berlebih)
  const cleanVal = (val: any): string => {
    if (val === undefined || val === null) return '';
    return String(val).trim().replace(/^["']|["']$/g, '').trim();
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

  try {
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
    } else if (!body && typeof req.on === 'function') {
      body = await new Promise((resolve) => {
        let raw = '';
        req.on('data', (chunk: any) => { raw += chunk; });
        req.on('end', () => {
          try { resolve(JSON.parse(raw)); } catch { resolve({}); }
        });
        req.on('error', () => resolve({}));
      });
    }
    body = body || {};

    const reqToken = cleanVal(body.botToken);
    const envToken = cleanVal(process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN);
    const botToken = reqToken || envToken;

    const reqChatId = cleanVal(body.chatId);
    const envChatId = cleanVal(process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID);
    const rawChatId = reqChatId || envChatId;

    // Otomatis ekstrak Chat ID grup (-100...) dan Thread ID jika user menempel link t.me/c/...
    let chatId = rawChatId;
    let extractedThreadId = '';
    const matchTme = rawChatId.match(/t\.me\/c\/(\d+)(?:\/(\d+))?/i);
    if (matchTme && matchTme[1]) {
      chatId = `-100${matchTme[1]}`;
      if (matchTme[2]) {
        extractedThreadId = matchTme[2];
      }
    }
    const matchWeb = rawChatId.match(/#(-?\d+)(?:_(\d+))?/i);
    if (matchWeb && matchWeb[1]) {
      const raw = matchWeb[1];
      chatId = raw.startsWith('-') ? raw : `-100${raw}`;
      if (matchWeb[2]) {
        extractedThreadId = matchWeb[2];
      }
    }

    const message = body.message;

    if (!message) {
      return res.status(400).json({ status: 'error', message: 'Pesan tidak boleh kosong' });
    }

    if (!botToken || !chatId) {
      return res.status(400).json({
        status: 'error',
        message: 'Bot Token atau Chat ID belum ditentukan di Environment Variables Vercel (TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID).',
      });
    }

    // Resolusi Thread ID: dari request body atau dari Environment Variables berdasarkan kategori / teks pesan
    const category = cleanVal(body.category).toLowerCase();
    let threadId = parseThreadId(cleanVal(body.threadId || body.message_thread_id)) || extractedThreadId;

    if (!threadId) {
      if (category === 'mutasi_keluar' || message.includes('[MUTASI KELUAR]')) {
        threadId = parseThreadId(cleanVal(
          process.env.TELEGRAM_THREAD_ID_MUTASI_KELUAR || 
          process.env.TELEGRAM_THREAD_ID_KELUAR || 
          process.env.VITE_TELEGRAM_THREAD_ID_MUTASI_KELUAR
        ));
      } else if (category === 'mutasi_masuk' || message.includes('[MUTASI MASUK]')) {
        threadId = parseThreadId(cleanVal(
          process.env.TELEGRAM_THREAD_ID_MUTASI_MASUK || 
          process.env.TELEGRAM_THREAD_ID_MASUK || 
          process.env.VITE_TELEGRAM_THREAD_ID_MUTASI_MASUK
        ));
      } else if (category === 'pangkat' || message.includes('PANGKAT')) {
        threadId = parseThreadId(cleanVal(process.env.TELEGRAM_THREAD_ID_PANGKAT || process.env.VITE_TELEGRAM_THREAD_ID_PANGKAT));
      } else if (category === 'kgb' || message.includes('GAJI BERKALA')) {
        threadId = parseThreadId(cleanVal(process.env.TELEGRAM_THREAD_ID_KGB || process.env.VITE_TELEGRAM_THREAD_ID_KGB));
      } else if (category === 'verval_pd' || message.includes('VERVAL PD')) {
        threadId = parseThreadId(cleanVal(process.env.TELEGRAM_THREAD_ID_VERVALPD || process.env.VITE_TELEGRAM_THREAD_ID_VERVALPD));
      }
    }

    const payload: Record<string, any> = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    };
    if (threadId) {
      const numThread = Number(threadId);
      payload.message_thread_id = !isNaN(numThread) ? numThread : threadId;
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    let tgRes = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    let data: any = null;
    try {
      data = await tgRes.json();
    } catch {
      data = { ok: false, description: `HTTP ${tgRes.status}` };
    }

    let fallbackToMainChat = false;

    // Jika threadId tidak ditemukan di grup, otomatis coba kirim ke chat utama (tanpa message_thread_id)
    if ((!tgRes.ok || !data?.ok) && payload.message_thread_id && String(data?.description || '').toLowerCase().includes('thread not found')) {
      console.warn(`[Vercel Serverless] Thread ID ${payload.message_thread_id} not found in chat ${chatId}. Retrying into main chat...`);
      delete payload.message_thread_id;
      tgRes = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      try {
        data = await tgRes.json();
      } catch {
        data = { ok: false, description: `HTTP ${tgRes.status}` };
      }
      fallbackToMainChat = true;
    }

    if (!tgRes.ok || !data?.ok) {
      return res.status(tgRes.status || 400).json({
        status: 'error',
        message: data?.description || 'Gagal mengirim pesan ke Telegram API',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: fallbackToMainChat
        ? 'Peringatan: Topik/Thread ID tidak ditemukan di grup Telegram, pesan dialihkan ke ruang chat utama (General)'
        : (payload.message_thread_id 
            ? `Pesan berhasil dikirim ke Topik (Thread ID: ${payload.message_thread_id})` 
            : 'Pesan berhasil dikirim ke ruang chat grup'),
      fallbackToMainChat,
      threadId: payload.message_thread_id || null,
      result: data,
    });
  } catch (err: any) {
    console.error('[Vercel Serverless Telegram Send Error]:', err);
    return res.status(500).json({
      status: 'error',
      message: err?.message || 'Internal Server Error saat memproses Telegram',
    });
  }
}
