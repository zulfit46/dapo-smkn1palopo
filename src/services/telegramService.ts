import { MutasiMasukItem, MutasiKeluarItem, TelegramConfig, RiwayatPangkat, RiwayatKGB } from '../types';
import { safeGetItem, safeSetItem } from '../utils/storage';

const STORAGE_KEY = 'dapodik_telegram_config';

const cleanVal = (val: any): string => {
  if (val === undefined || val === null) return '';
  return String(val).trim().replace(/^["']|["']$/g, '').trim();
};

// Deteksi otomatis token & chat ID dari Environment Variables (Vercel / Vite build)
const ENV_BOT_TOKEN = cleanVal(
  ((import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN as string) ||
  (typeof process !== 'undefined' ? (process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN) : '')
);

const ENV_CHAT_ID = cleanVal(
  ((import.meta as any).env?.VITE_TELEGRAM_CHAT_ID as string) ||
  (typeof process !== 'undefined' ? (process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID) : '')
);

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: ENV_BOT_TOKEN,
  chatId: ENV_CHAT_ID,
  enabled: Boolean(ENV_BOT_TOKEN && ENV_CHAT_ID),
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
};

/**
 * Escape HTML special characters for Telegram HTML parse_mode
 */
export function escapeTelegramHtml(text?: string | number | null): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Get current Telegram configuration from localStorage or server/env
 */
export async function getTelegramConfig(): Promise<TelegramConfig> {
  const localConfig: TelegramConfig = safeGetItem<TelegramConfig>(STORAGE_KEY, DEFAULT_TELEGRAM_CONFIG);

  // Try fetching from server (Express atau Vercel Serverless /api/telegram/config)
  try {
    const res = await fetch('/api/telegram/config', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const serverConfig = await res.json();
      const resolvedToken = (localConfig.botToken || serverConfig.botToken || ENV_BOT_TOKEN || '').trim();
      const resolvedChatId = (localConfig.chatId || serverConfig.chatId || ENV_CHAT_ID || '').trim();
      const hasAnyToken = Boolean(resolvedToken && resolvedChatId);

      // Jika ada bot token dan chat ID dari Vercel Environment Variables atau server, otomatis aktifkan
      const isEnabled = localConfig.botToken
        ? (localConfig.enabled ?? hasAnyToken)
        : (serverConfig.hasEnvConfig || serverConfig.enabled || hasAnyToken);

      const merged: TelegramConfig = {
        botToken: resolvedToken,
        chatId: resolvedChatId,
        enabled: isEnabled,
        notifyMutasiMasuk: localConfig.notifyMutasiMasuk ?? serverConfig.notifyMutasiMasuk ?? true,
        notifyMutasiKeluar: localConfig.notifyMutasiKeluar ?? serverConfig.notifyMutasiKeluar ?? true,
        notifyPangkatBaru: localConfig.notifyPangkatBaru ?? serverConfig.notifyPangkatBaru ?? true,
        notifyKGBBaru: localConfig.notifyKGBBaru ?? serverConfig.notifyKGBBaru ?? true,
        notifyVervalPD: localConfig.notifyVervalPD ?? serverConfig.notifyVervalPD ?? true,
        threadIdMutasiMasuk: localConfig.threadIdMutasiMasuk || serverConfig.threadIdMutasiMasuk || '',
        threadIdMutasiKeluar: localConfig.threadIdMutasiKeluar || serverConfig.threadIdMutasiKeluar || '',
        threadIdPangkat: localConfig.threadIdPangkat || serverConfig.threadIdPangkat || '',
        threadIdKGB: localConfig.threadIdKGB || serverConfig.threadIdKGB || '',
        threadIdVervalPD: localConfig.threadIdVervalPD || serverConfig.threadIdVervalPD || '',
        chatIdMutasiMasuk: localConfig.chatIdMutasiMasuk || serverConfig.chatIdMutasiMasuk || '',
        chatIdMutasiKeluar: localConfig.chatIdMutasiKeluar || serverConfig.chatIdMutasiKeluar || '',
        chatIdPangkat: localConfig.chatIdPangkat || serverConfig.chatIdPangkat || '',
        chatIdKGB: localConfig.chatIdKGB || serverConfig.chatIdKGB || '',
        chatIdVervalPD: localConfig.chatIdVervalPD || serverConfig.chatIdVervalPD || '',
      };
      safeSetItem(STORAGE_KEY, merged);
      return merged;
    }
  } catch {
    // Ignore server error and return local config
  }

  const token = (localConfig.botToken || ENV_BOT_TOKEN || '').trim();
  const chat = (localConfig.chatId || ENV_CHAT_ID || '').trim();

  return {
    ...DEFAULT_TELEGRAM_CONFIG,
    ...localConfig,
    botToken: token,
    chatId: chat,
    enabled: localConfig.enabled ?? Boolean(token && chat),
    notifyMutasiMasuk: localConfig.notifyMutasiMasuk ?? true,
    notifyMutasiKeluar: localConfig.notifyMutasiKeluar ?? true,
    notifyPangkatBaru: localConfig.notifyPangkatBaru ?? true,
    notifyKGBBaru: localConfig.notifyKGBBaru ?? true,
    notifyVervalPD: localConfig.notifyVervalPD ?? true,
  };
}

/**
 * Save Telegram configuration to localStorage and server
 */
export async function saveTelegramConfig(config: TelegramConfig): Promise<{ success: boolean; message?: string }> {
  safeSetItem(STORAGE_KEY, config);

  try {
    const res = await fetch('/api/telegram/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(5000),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return { success: true, message: 'Pengaturan Telegram berhasil disimpan di server & browser' };
    }
  } catch (err) {
    console.warn('Simpan konfigurasi ke server gagal, tersimpan lokal:', err);
  }

  return { success: true, message: 'Pengaturan Telegram tersimpan di browser (localStorage)' };
}

/**
 * Direct Telegram Bot API send function (CORS-safe simple request via form-urlencoded)
 * Catatan penting: Telegram API mengembalikan HTTP 501 jika browser mengirim OPTIONS preflight dengan Content-Type: application/json.
 * Dengan application/x-www-form-urlencoded, browser mengirim Simple CORS Request tanpa OPTIONS preflight!
 */
async function sendDirectToTelegram(
  botToken: string,
  chatId: string,
  htmlMessage: string,
  threadId?: string
): Promise<{ ok: boolean; description?: string; fallbackToMainChat?: boolean }> {
  const cleanToken = cleanVal(botToken);
  const cleanChatId = cleanVal(chatId);
  if (!cleanToken || !cleanChatId) {
    throw new Error('Bot Token dan Chat ID wajib diisi');
  }

  const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
  const params = new URLSearchParams();
  params.append('chat_id', cleanChatId);
  params.append('text', htmlMessage);
  params.append('parse_mode', 'HTML');
  params.append('disable_web_page_preview', 'false');

  if (threadId && String(threadId).trim()) {
    params.append('message_thread_id', String(threadId).trim());
  }

  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(12000),
  });

  let data = await res.json();
  let fallbackToMainChat = false;

  // Jika thread/topik tidak ditemukan, coba kirim ke ruang obrolan utama grup
  if ((!res.ok || !data.ok) && params.has('message_thread_id') && String(data.description || '').toLowerCase().includes('thread not found')) {
    console.warn(`[Telegram Direct] Thread ID ${threadId} tidak ditemukan di chat ${cleanChatId}. Mengalihkan ke ruang utama...`);
    params.delete('message_thread_id');
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(12000),
    });
    data = await res.json();
    fallbackToMainChat = true;
  }

  if (!res.ok || !data.ok) {
    throw new Error(data.description || `HTTP ${res.status}: Gagal mengirim pesan ke Telegram API`);
  }

  return { ...data, fallbackToMainChat };
}

/**
 * Optional fallback: Kirim lewat Google Apps Script Web App jika server proxy & direct API terblokir ISP
 */
async function sendViaGoogleAppsScript(
  webAppUrl: string,
  botToken: string,
  chatId: string,
  htmlMessage: string,
  threadId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sendTelegram',
        botToken: botToken.trim(),
        chatId: chatId.trim(),
        message: htmlMessage,
        threadId: threadId || undefined,
        message_thread_id: threadId || undefined,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.status === 'success' || data.ok)) {
        return { success: true, message: 'Pesan berhasil terkirim via Google Apps Script relay' };
      }
    }
  } catch (gasErr) {
    console.warn('[Telegram] Google Apps Script relay failed:', gasErr);
  }
  throw new Error('Gagal mengirim via Google Apps Script relay');
}

/**
 * Unified sender:
 * 1. Coba server proxy (/api/telegram/send - Express atau Vercel Serverless Function)
 * 2. Fallback direct Telegram API dengan CORS-safe form-urlencoded
 * 3. Fallback Google Apps Script jika tersedia
 */
export async function sendTelegramMessage(
  message: string,
  customConfig?: Partial<TelegramConfig>,
  webAppUrl?: string,
  options?: { threadId?: string; targetChatId?: string }
): Promise<{ success: boolean; message: string }> {
  const currentConfig = customConfig?.botToken ? { ...DEFAULT_TELEGRAM_CONFIG, ...customConfig } : await getTelegramConfig();
  const botToken = cleanVal(customConfig?.botToken || currentConfig.botToken || ENV_BOT_TOKEN);
  const chatId = cleanVal(options?.targetChatId || customConfig?.chatId || currentConfig.chatId || ENV_CHAT_ID);
  const threadId = cleanVal(options?.threadId) || undefined;

  // 1. Coba Server Proxy endpoint (/api/telegram/send - Vercel Serverless Function & Express)
  // Endpoint ini otomatis membaca TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID dari Environment Variables Vercel!
  try {
    const res = await fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken,
        chatId,
        message,
        threadId,
        message_thread_id: threadId,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.status === 'success') {
        return {
          success: true,
          message: data.fallbackToMainChat
            ? 'Pesan terkirim ke ruang utama grup (Topik/Thread ID tidak ditemukan)'
            : 'Pesan berhasil terkirim ke Telegram'
        };
      }
      console.warn('[Telegram] Server proxy response:', data.message);
    }
  } catch (serverErr: any) {
    console.warn('[Telegram] Proxy server unavailable or failed, trying direct Telegram API:', serverErr);
  }

  // Jika proxy server gagal dan di client tidak ada token/chatId, baru berikan pesan peringatan
  if (!botToken || !chatId) {
    return {
      success: false,
      message: 'Bot Token atau Chat ID belum ditentukan di Environment Variables Vercel (TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID) atau menu Pengaturan Telegram.',
    };
  }

  // 2. Direct Telegram API fallback (CORS simple request)
  try {
    const directRes = await sendDirectToTelegram(botToken, chatId, message, threadId);
    return {
      success: true,
      message: directRes.fallbackToMainChat
        ? 'Pesan terkirim langsung ke ruang utama grup (Topik/Thread ID tidak ditemukan di grup)'
        : 'Pesan berhasil terkirim langsung ke Telegram'
    };
  } catch (directErr: any) {
    console.warn('[Telegram] Direct send failed:', directErr);

    // 3. Fallback ke Google Apps Script Web App jika direct API diblokir ISP lokal
    if (webAppUrl) {
      try {
        return await sendViaGoogleAppsScript(webAppUrl, botToken, chatId, message, threadId);
      } catch (gasErr: any) {
        console.warn('[Telegram] Fallback to Google Apps Script also failed:', gasErr);
      }
    }

    return {
      success: false,
      message: directErr?.message || 'Gagal terhubung ke Telegram API. Periksa Bot Token, Chat ID, atau koneksi internet Anda.',
    };
  }
}

/**
 * Format & Send Test Message
 */
export async function testTelegramConnection(
  botToken: string,
  chatId: string,
  threadId?: string
): Promise<{ success: boolean; message: string }> {
  const now = new Date();
  const waktuStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) + ` pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA/WIB`;

  const threadInfo = threadId ? `\n📌 <b>Topik/Thread ID:</b> <code>${escapeTelegramHtml(threadId)}</code>` : '';

  const testMessage = `🤖 <b>UJI COBA NOTIFIKASI TELEGRAM</b>
━━━━━━━━━━━━━━━━━━━━
✅ <b>Status:</b> Koneksi Berhasil Terhubung!
🏫 <b>Aplikasi:</b> Sistem Informasi Dapodik
⏰ <b>Waktu:</b> ${escapeTelegramHtml(waktuStr)}${threadInfo}
━━━━━━━━━━━━━━━━━━━━
<i>Bot Telegram Anda siap menerima notifikasi mutasi, kenaikan pangkat, dan KGB secara terkelompok.</i>

#UJI_COBA #SISTEM_DAPODIK`;

  return sendTelegramMessage(
    testMessage,
    { botToken, chatId, enabled: true },
    undefined,
    { threadId, targetChatId: chatId }
  );
}

/**
 * Format & Send Notification for Mutasi Masuk
 */
export async function notifyMutasiMasuk(
  item: Partial<MutasiMasukItem>,
  config?: TelegramConfig,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  const conf = await getTelegramConfig();
  if (config?.botToken) {
    Object.assign(conf, config);
  }
  if (conf.notifyMutasiMasuk === false) {
    return { success: false, message: 'Notifikasi Mutasi Masuk dinonaktifkan di pengaturan' };
  }

  const wilayah = [item.kecamatanNama, item.kabKotaNama, item.provinsiNama]
    .filter(Boolean)
    .join(', ') || '-';

  const tgl = item.tglMasuk || item.tanggalPengajuan || new Date().toLocaleDateString('id-ID');
  const now = new Date();
  const waktuStr = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  const message = `📥 <b>[MUTASI MASUK] NOTIFIKASI MUTASI MASUK SISWA</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Nama Siswa:</b> <b>${escapeTelegramHtml(item.nama || '-')}</b>
🆔 <b>NISN:</b> <code>${escapeTelegramHtml(item.nisn || '-')}</code>
🏫 <b>Sekolah Asal:</b> ${escapeTelegramHtml(item.sekolahAsal || '-')}
📍 <b>Wilayah Asal:</b> ${escapeTelegramHtml(wilayah)}
🎯 <b>Rombel Tujuan:</b> <b>${escapeTelegramHtml(item.rombelTujuan || '-')}</b>
📅 <b>Tanggal Masuk:</b> ${escapeTelegramHtml(tgl)}
📌 <b>Status:</b> <b>${escapeTelegramHtml(item.status || 'Pending')}</b>
📝 <b>Keterangan:</b> ${escapeTelegramHtml(item.keterangan || '-')}
━━━━━━━━━━━━━━━━━━━━
⏰ <i>Waktu Input: ${escapeTelegramHtml(waktuStr)}</i>
🏛️ <i>Sistem Informasi Data Siswa Dapodik</i>

#MUTASI_MASUK #SISWA_BARU`;

  const targetChatId = conf.chatIdMutasiMasuk || conf.chatId;
  const threadId = conf.threadIdMutasiMasuk;

  return sendTelegramMessage(message, conf, webAppUrl, { threadId, targetChatId });
}

/**
 * Format & Send Notification for Riwayat Kenaikan Pangkat Baru
 */
export async function notifyPangkatBaru(
  item: Partial<RiwayatPangkat>,
  config?: TelegramConfig,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  const conf = await getTelegramConfig();
  if (config?.botToken) {
    Object.assign(conf, config);
  }
  if (conf.notifyPangkatBaru === false) {
    return { success: false, message: 'Notifikasi Kenaikan Pangkat dinonaktifkan di pengaturan' };
  }

  const now = new Date();
  const waktuStr = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  const message = `🎖️ <b>[KENAIKAN PANGKAT] NOTIFIKASI RIWAYAT PANGKAT BARU</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Nama GTK:</b> <b>${escapeTelegramHtml(item.nama || '-')}</b>
🆔 <b>NIP:</b> <code>${escapeTelegramHtml(item.nip || '-')}</code>
📊 <b>Golongan/Pangkat:</b> <b>${escapeTelegramHtml(item.gol || '-')}</b>
📄 <b>No. SK Pangkat:</b> ${escapeTelegramHtml(item.noSk || '-')}
📅 <b>Tanggal SK:</b> ${escapeTelegramHtml(item.tglSk || '-')}
🗓️ <b>TMT Pangkat:</b> <b>${escapeTelegramHtml(item.tmt || '-')}</b>
⏳ <b>Masa Kerja:</b> ${escapeTelegramHtml(item.masaKerjaThn ?? 0)} Tahun ${escapeTelegramHtml(item.masaKerjaBln ?? 0)} Bulan
📌 <b>Status:</b> <b>${escapeTelegramHtml(item.status || 'Proses')}</b>
━━━━━━━━━━━━━━━━━━━━
⏰ <i>Waktu Input: ${escapeTelegramHtml(waktuStr)}</i>
🏛️ <i>Sistem Informasi Data Siswa Dapodik</i>

#KENAIKAN_PANGKAT #GTK #KEPEGAWAIAN`;

  const targetChatId = conf.chatIdPangkat || conf.chatId;
  const threadId = conf.threadIdPangkat;

  return sendTelegramMessage(message, conf, webAppUrl, { threadId, targetChatId });
}

/**
 * Format & Send Notification for Riwayat KGB Baru
 */
export async function notifyKGBBaru(
  item: Partial<RiwayatKGB>,
  config?: TelegramConfig,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  const conf = config || await getTelegramConfig();
  if (!conf.enabled || !conf.notifyKGBBaru) {
    return { success: false, message: 'Notifikasi KGB tidak diaktifkan' };
  }

  const now = new Date();
  const waktuStr = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  const gajiFormatted = item.gajiPokok
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(item.gajiPokok)
    : '-';

  const message = `💰 <b>[GAJI BERKALA] NOTIFIKASI RIWAYAT KGB BARU</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Nama GTK:</b> <b>${escapeTelegramHtml(item.nama || '-')}</b>
🆔 <b>NIP:</b> <code>${escapeTelegramHtml(item.nip || '-')}</code>
📊 <b>Golongan:</b> <b>${escapeTelegramHtml(item.gol || '-')}</b>
📄 <b>No. SK KGB:</b> ${escapeTelegramHtml(item.noSk || '-')}
📅 <b>Tanggal SK:</b> ${escapeTelegramHtml(item.tglSk || '-')}
🗓️ <b>TMT KGB:</b> <b>${escapeTelegramHtml(item.tmt || '-')}</b>
⏳ <b>Masa Kerja:</b> ${escapeTelegramHtml(item.masaKerjaThn ?? 0)} Tahun ${escapeTelegramHtml(item.masaKerjaBln ?? 0)} Bulan
💵 <b>Gaji Pokok Baru:</b> <b>${escapeTelegramHtml(gajiFormatted)}</b>
📌 <b>Status:</b> <b>${escapeTelegramHtml(item.status || 'Proses')}</b>
━━━━━━━━━━━━━━━━━━━━
⏰ <i>Waktu Input: ${escapeTelegramHtml(waktuStr)}</i>
🏛️ <i>Sistem Informasi Data Siswa Dapodik</i>

#KGB #GAJI_BERKALA #GTK`;

  const targetChatId = conf.chatIdKGB || conf.chatId;
  const threadId = conf.threadIdKGB;

  return sendTelegramMessage(message, conf, webAppUrl, { threadId, targetChatId });
}

/**
 * Format & Send Notification for Mutasi Keluar
 */
export async function notifyMutasiKeluar(
  item: Partial<MutasiKeluarItem>,
  config?: TelegramConfig,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  const conf = await getTelegramConfig();
  if (config?.botToken) {
    Object.assign(conf, config);
  }
  if (conf.notifyMutasiKeluar === false) {
    return { success: false, message: 'Notifikasi Mutasi Keluar dinonaktifkan di pengaturan' };
  }

  const tgl = item.tglMutasi || new Date().toLocaleDateString('id-ID');
  const now = new Date();
  const waktuStr = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  let berkasSection = '';
  if (item.uploadBerkas && item.uploadBerkas.startsWith('http')) {
    berkasSection = `\n📁 <b>Berkas:</b> <a href="${escapeTelegramHtml(item.uploadBerkas)}">Lihat Berkas Google Drive</a>`;
  } else if (item.uploadBerkas) {
    berkasSection = `\n📁 <b>Berkas:</b> ${escapeTelegramHtml(item.uploadBerkas)}`;
  }

  const message = `📤 <b>[MUTASI KELUAR] NOTIFIKASI MUTASI KELUAR SISWA</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Nama Siswa:</b> <b>${escapeTelegramHtml(item.nama || '-')}</b>
🆔 <b>NISN:</b> <code>${escapeTelegramHtml(item.nisn || '-')}</code> | <b>NIPD:</b> <code>${escapeTelegramHtml(item.nipd || '-')}</code>
🏛️ <b>Rombel Asal:</b> <b>${escapeTelegramHtml(item.rombel || '-')}</b>
📌 <b>Jenis Mutasi:</b> <b>${escapeTelegramHtml(item.ketMutasi || 'Mutasi')}</b>
🏫 <b>Pindah Ke:</b> ${escapeTelegramHtml(item.pindahKe || '-')}
📅 <b>Tanggal Mutasi:</b> ${escapeTelegramHtml(tgl)}
💬 <b>Alasan:</b> ${escapeTelegramHtml(item.alasanMutasi || '-')}
📋 <b>Status:</b> ${escapeTelegramHtml(item.status || 'Selesai')}${berkasSection}
━━━━━━━━━━━━━━━━━━━━
⏰ <i>Waktu Input: ${escapeTelegramHtml(waktuStr)}</i>
🏛️ <i>Sistem Informasi Data Siswa Dapodik</i>

#MUTASI_KELUAR #SISWA`;

  const targetChatId = conf.chatIdMutasiKeluar || conf.chatId;
  const threadId = conf.threadIdMutasiKeluar;

  return sendTelegramMessage(message, conf, webAppUrl, { threadId, targetChatId });
}

export interface VervalPDItemNotification {
  nama?: string;
  nisn?: string;
  nipd?: string;
  rombel?: string;
  status: string;
  oldStatus?: string;
  ket?: string;
  oldKet?: string;
  timestamp?: string;
  vervalOleh?: string;
}

/**
 * Format & Send Notification for Verval PD (Perubahan Status Siswa Aktif / Tidak Aktif)
 */
export async function notifyVervalPD(
  items: VervalPDItemNotification[],
  meta?: {
    actorName?: string;
    kelasName?: string;
  },
  config?: TelegramConfig,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  const conf = config || await getTelegramConfig();
  if (!conf.enabled || conf.notifyVervalPD === false) {
    return { success: false, message: 'Notifikasi Verval PD tidak diaktifkan' };
  }

  if (!items || items.length === 0) {
    return { success: false, message: 'Tidak ada data perubahan untuk dikirim' };
  }

  const now = new Date();
  const waktuStr = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  const actor = meta?.actorName || items[0]?.vervalOleh || 'Wali Kelas / Operator';
  const kelas = meta?.kelasName || items[0]?.rombel || '-';

  // Format list of changed students
  const maxDisplay = 15;
  const displayItems = items.slice(0, maxDisplay);
  const remainingCount = items.length - maxDisplay;

  const daftarSiswaStr = displayItems.map((item, idx) => {
    const isAktif = (item.status || '').toLowerCase() === 'aktif';
    const statusBadge = isAktif ? '🟢 <b>Aktif</b>' : '🔴 <b>Tidak Aktif</b>';
    const statusPrev = item.oldStatus && item.oldStatus !== item.status 
      ? ` <i>(Sebelumnya: ${escapeTelegramHtml(item.oldStatus)})</i>` 
      : '';
    const ketText = !isAktif && item.ket 
      ? `\n   💬 <i>Alasan/Ket: ${escapeTelegramHtml(item.ket)}</i>` 
      : '';

    return `${idx + 1}. 👤 <b>${escapeTelegramHtml(item.nama || '-')}</b>
   🆔 NISN: <code>${escapeTelegramHtml(item.nisn || '-')}</code> | NIPD: <code>${escapeTelegramHtml(item.nipd || '-')}</code>
   📌 Status: ${statusBadge}${statusPrev}${ketText}`;
  }).join('\n\n');

  const moreText = remainingCount > 0 
    ? `\n\n<i>...dan ${remainingCount} siswa lainnya diperbarui.</i>` 
    : '';

  const aktifCount = items.filter(i => (i.status || '').toLowerCase() === 'aktif').length;
  const tidakAktifCount = items.filter(i => (i.status || '').toLowerCase() !== 'aktif').length;
  const ringkasan = `📊 <b>Ringkasan:</b> 🟢 Aktif: <b>${aktifCount}</b> | 🔴 Tidak Aktif: <b>${tidakAktifCount}</b> (Total: <b>${items.length}</b> siswa)`;

  const message = `📋 <b>[VERVAL PD] NOTIFIKASI PERUBAHAN STATUS SISWA</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Wali Kelas / Verifikator:</b> <b>${escapeTelegramHtml(actor)}</b>
🏛️ <b>Rombel / Kelas:</b> <b>${escapeTelegramHtml(kelas)}</b>
${ringkasan}
⏰ <b>Waktu Perubahan:</b> ${escapeTelegramHtml(waktuStr)}
━━━━━━━━━━━━━━━━━━━━
<b>Rincian Siswa yang Diperbarui:</b>

${daftarSiswaStr}${moreText}
━━━━━━━━━━━━━━━━━━━━
🏛️ <i>Sistem Informasi Data Siswa SMKN 1 Palopo</i>

#VERVAL_PD #STATUS_SISWA #DAPODIK`;

  const targetChatId = conf.chatIdVervalPD || conf.chatId;
  const threadId = conf.threadIdVervalPD;

  return sendTelegramMessage(message, conf, webAppUrl, { threadId, targetChatId });
}
