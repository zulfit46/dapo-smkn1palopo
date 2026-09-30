import React, { useState, useEffect } from 'react';
import { TelegramConfig } from '../types';
import { 
  getTelegramConfig, 
  saveTelegramConfig, 
  testTelegramConnection 
} from '../services/telegramService';
import { 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  EyeOff, 
  Loader2, 
  Bell, 
  Bot, 
  MessageSquare, 
  ShieldCheck, 
  ExternalLink,
  Info,
  Layers,
  FolderTree,
  Tag,
  SlidersHorizontal 
} from 'lucide-react';

interface TelegramConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: TelegramConfig) => void;
}

// Helper untuk otomatis mengekstrak Chat ID atau Thread ID jika user menempel link t.me
// Contoh link Telegram: https://t.me/c/4324462750/6/9
export function parseTelegramChatId(input: string): string {
  const trimmed = input.trim();
  // Format https://t.me/c/4324462750/... -> Bot API chat_id = -1004324462750
  const match = trimmed.match(/t\.me\/c\/(\d+)/i);
  if (match && match[1]) {
    return `-100${match[1]}`;
  }
  return trimmed;
}

export function parseTelegramThreadId(input: string): string {
  const trimmed = input.trim();
  // Format https://t.me/c/4324462750/6/9 atau https://t.me/c/4324462750/6 -> Thread ID = 6
  const match = trimmed.match(/t\.me\/c\/\d+\/(\d+)/i);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export const TelegramConfigModal: React.FC<TelegramConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [config, setConfig] = useState<TelegramConfig>({
    botToken: '',
    chatId: '',
    enabled: false,
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

  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showGroupingSection, setShowGroupingSection] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getTelegramConfig().then((cfg) => {
        setConfig(cfg);
      });
      setTestResult(null);
      setSaveMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!config.botToken.trim() || !config.chatId.trim()) {
      setTestResult({
        success: false,
        message: 'Mohon isi Bot Token dan Chat ID terlebih dahulu sebelum melakukan tes.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testTelegramConnection(config.botToken, config.chatId);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Gagal mengirim pesan tes. Periksa koneksi internet dan kredensial bot.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await saveTelegramConfig(config);
      setSaveMessage(res.message || 'Pengaturan berhasil disimpan');
      if (onConfigSaved) {
        onConfigSaved(config);
      }
      setTimeout(() => {
        setSaveMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setSaveMessage('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
              <Send className="w-5 h-5 -translate-x-0.5 translate-y-0.5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide">Pengaturan Notifikasi Telegram</h2>
              <p className="text-xs text-sky-100">Kirim otomatis info mutasi, kenaikan pangkat, & KGB ke grup/chat Telegram</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status Toggle Switch */}
          <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.enabled ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 text-sm">Status Notifikasi Telegram</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${config.enabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-600'}`}>
                    {config.enabled ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {config.enabled ? 'Notifikasi otomatis aktif untuk data mutasi, kenaikan pangkat, dan KGB baru' : 'Notifikasi Telegram dinonaktifkan sementara'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Vercel Deployment Tip */}
          <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Tips untuk Deploy di Vercel:</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Di Vercel, token yang Anda simpan di sini akan tersimpan di browser Anda (localStorage). Agar bot otomatis aktif bagi semua pengguna, Anda juga dapat menambahkan <strong>Environment Variables</strong> di dashboard Vercel (Project Settings &rarr; Environment Variables):
                <code className="mx-1 px-1.5 py-0.5 bg-amber-100 rounded text-amber-950 font-mono text-[10px]">TELEGRAM_BOT_TOKEN</code> dan 
                <code className="mx-1 px-1.5 py-0.5 bg-amber-100 rounded text-amber-950 font-mono text-[10px]">TELEGRAM_CHAT_ID</code>.
              </p>
            </div>
          </div>

          {/* Bot Token Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-sky-600" />
                Telegram Bot Token <span className="text-rose-500">*</span>
              </span>
              <span className="text-[11px] text-slate-600 font-normal lowercase">didapat dari @BotFather</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={config.botToken}
                onChange={(e) => setConfig({ ...config, botToken: e.target.value.trim() })}
                placeholder="Contoh: 7123456789:AAHq_m7e..."
                className="w-full pl-3 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600 p-1"
                title={showToken ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Chat ID Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-sky-600" />
                Telegram Chat ID / ID Grup <span className="text-rose-500">*</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">wajib diawali minus (-100...) untuk grup</span>
            </label>
            <input
              type="text"
              value={config.chatId}
              onChange={(e) => setConfig({ ...config, chatId: parseTelegramChatId(e.target.value) })}
              placeholder="Contoh: -1004324462750 (bisa paste link t.me langsung)"
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-mono"
            />
            <p className="text-[11px] text-slate-500">
              💡 Jika menyalin link topik seperti <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-mono text-[10px]">https://t.me/c/4324462750/6/9</code>, ID Grupnya adalah <code className="bg-sky-50 text-sky-800 font-bold px-1.5 py-0.5 rounded font-mono">-1004324462750</code>.
            </p>
          </div>

          {/* Pilihan Jenis Notifikasi */}
          <div className="space-y-2 pt-1 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Kirim Notifikasi Untuk:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                <input
                  type="checkbox"
                  checked={config.notifyMutasiMasuk}
                  onChange={(e) => setConfig({ ...config, notifyMutasiMasuk: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-800">📥 Mutasi Masuk</div>
                  <div className="text-slate-600 text-[11px]">Siswa baru masuk/pindahan</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                <input
                  type="checkbox"
                  checked={config.notifyMutasiKeluar}
                  onChange={(e) => setConfig({ ...config, notifyMutasiKeluar: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-800">📤 Mutasi Keluar</div>
                  <div className="text-slate-600 text-[11px]">Siswa pindah / keluar</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                <input
                  type="checkbox"
                  checked={config.notifyPangkatBaru}
                  onChange={(e) => setConfig({ ...config, notifyPangkatBaru: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-800">🎖️ Kenaikan Pangkat</div>
                  <div className="text-slate-600 text-[11px]">Data riwayat kepangkatan baru</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                <input
                  type="checkbox"
                  checked={config.notifyKGBBaru}
                  onChange={(e) => setConfig({ ...config, notifyKGBBaru: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-800">💰 Kenaikan Gaji Berkala</div>
                  <div className="text-slate-600 text-[11px]">Data riwayat KGB baru</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white sm:col-span-2">
                <input
                  type="checkbox"
                  checked={config.notifyVervalPD !== false}
                  onChange={(e) => setConfig({ ...config, notifyVervalPD: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>📋</span> Verval PD (Status Siswa)
                  </div>
                  <div className="text-slate-600 text-[11px]">Perubahan data aktif / tidak aktif oleh wali kelas</div>
                </div>
              </label>
            </div>
          </div>

          {/* PENGELOMPOKAN NOTIFIKASI (Forum Topics / Thread ID / Chat ID Terpisah) */}
          <div className="border border-sky-200/90 rounded-xl overflow-hidden bg-gradient-to-br from-sky-50/60 to-indigo-50/40">
            <button
              type="button"
              onClick={() => setShowGroupingSection(!showGroupingSection)}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-sky-100/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Pengelompokan Notifikasi (Topik Forum / Thread ID)
                    </span>
                    <span className="text-[10px] bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded-full border border-sky-200">
                      Rekomendasi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Pisahkan notifikasi ke sub-topik (Forum Supergroup) atau ke grup berbeda agar rapi
                  </p>
                </div>
              </div>
              {showGroupingSection ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showGroupingSection && (
              <div className="px-4 pb-4 pt-2 space-y-4 border-t border-sky-200/80 bg-white animate-in fade-in duration-150">
                <div className="bg-sky-50/80 border border-sky-200 rounded-lg p-3 text-[11px] text-slate-700 leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div>
                      <strong>Cara Kerja Pengelompokan:</strong> Jika grup Telegram Anda mengaktifkan mode <strong>Topics (Forum)</strong>, masukkan nomor <strong>Thread ID</strong> untuk tiap sub-topik di bawah. Notifikasi akan langsung masuk rapi ke sub-topik tersebut!
                    </div>
                    <div className="bg-white/80 border border-sky-200/60 rounded p-2 text-[10px] space-y-0.5">
                      <span className="font-semibold text-sky-900 block">💡 Contoh jika link topik Anda: <code className="bg-sky-100 text-sky-900 px-1 py-0.5 rounded font-mono">https://t.me/c/4324462750/6/9</code></span>
                      <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                        <li><strong>Chat ID Utama:</strong> <code className="font-mono text-sky-700 font-bold">-1004324462750</code> (angka 4324462750 ditambah -100 di depan)</li>
                        <li><strong>Thread ID Topik:</strong> <code className="font-mono text-emerald-700 font-bold">6</code> (angka di tengah / nomor topik)</li>
                        <li><em>Angka 9 adalah ID pesan spesifik, tidak perlu dimasukkan.</em></li>
                      </ul>
                      <span className="text-[10px] text-slate-500 block pt-1">
                        *Anda juga bisa langsung paste link lengkap ke kolom di bawah, angka topik akan otomatis diekstrak!
                      </span>
                      <div className="pt-1 mt-1 border-t border-sky-100 text-[10px] text-amber-800">
                        🛡️ <strong>Anti Gagal:</strong> Jika topik belum dibuat atau ID topik tidak ditemukan di Telegram, sistem akan secara otomatis mengalihkan notifikasi ke ruang chat utama grup agar data mutasi Anda tetap terkirim aman dan tidak hilang.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* 1. Mutasi Masuk */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <span>📥</span> Mutasi Masuk
                      </span>
                      <span className="text-[10px] text-slate-500">Siswa Baru</span>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1 font-medium">
                        Thread / Topik ID:
                      </label>
                      <input
                        type="text"
                        value={config.threadIdMutasiMasuk || ''}
                        onChange={(e) => setConfig({ ...config, threadIdMutasiMasuk: parseTelegramThreadId(e.target.value) })}
                        placeholder="Contoh: 6 (atau paste link t.me)"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1 font-medium">
                        Chat ID Khusus (Opsional):
                      </label>
                      <input
                        type="text"
                        value={config.chatIdMutasiMasuk || ''}
                        onChange={(e) => setConfig({ ...config, chatIdMutasiMasuk: parseTelegramChatId(e.target.value) })}
                        placeholder="Kosongkan jika pakai Chat ID utama"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  {/* 2. Mutasi Keluar */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <span>📤</span> Mutasi Keluar
                      </span>
                      <span className="text-[10px] text-slate-500">Siswa Pindah</span>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1 font-medium">
                        Thread / Topik ID:
                      </label>
                      <input
                        type="text"
                        value={config.threadIdMutasiKeluar || ''}
                        onChange={(e) => setConfig({ ...config, threadIdMutasiKeluar: parseTelegramThreadId(e.target.value) })}
                        placeholder="Contoh: 6 (atau paste link t.me)"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1 font-medium">
                        Chat ID Khusus (Opsional):
                      </label>
                      <input
                        type="text"
                        value={config.chatIdMutasiKeluar || ''}
                        onChange={(e) => setConfig({ ...config, chatIdMutasiKeluar: parseTelegramChatId(e.target.value) })}
                        placeholder="Kosongkan jika pakai Chat ID utama"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  {/* 3. Kenaikan Pangkat */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <span>🎖️</span> Kenaikan Pangkat
                      </span>
                      <span className="text-[10px] text-slate-500">SK GTK</span>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1 font-medium">
                        Thread / Topik ID:
                      </label>
                      <input
                        type="text"
                        value={config.threadIdPangkat || ''}
                        onChange={(e) => setConfig({ ...config, threadIdPangkat: parseTelegramThreadId(e.target.value) })}
                        placeholder="Contoh: 10 (atau paste link t.me)"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1 font-medium">
                        Chat ID Khusus (Opsional):
                      </label>
                      <input
                        type="text"
                        value={config.chatIdPangkat || ''}
                        onChange={(e) => setConfig({ ...config, chatIdPangkat: parseTelegramChatId(e.target.value) })}
                        placeholder="Kosongkan jika pakai Chat ID utama"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  {/* 4. KGB */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <span>💰</span> Gaji Berkala (KGB)
                      </span>
                      <span className="text-[10px] text-slate-500">SK Berkala GTK</span>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1 font-medium">
                        Thread / Topik ID:
                      </label>
                      <input
                        type="text"
                        value={config.threadIdKGB || ''}
                        onChange={(e) => setConfig({ ...config, threadIdKGB: parseTelegramThreadId(e.target.value) })}
                        placeholder="Contoh: 14 (atau paste link t.me)"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1 font-medium">
                        Chat ID Khusus (Opsional):
                      </label>
                      <input
                        type="text"
                        value={config.chatIdKGB || ''}
                        onChange={(e) => setConfig({ ...config, chatIdKGB: parseTelegramChatId(e.target.value) })}
                        placeholder="Kosongkan jika pakai Chat ID utama"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  {/* 5. Verval PD */}
                  <div className="p-3 bg-sky-50/70 rounded-xl border border-sky-200 space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <span>📋</span> Verval PD (Status Siswa)
                      </span>
                      <span className="text-[10px] text-sky-800 bg-sky-100 font-bold px-2 py-0.5 rounded-full border border-sky-200">
                        Topik: VervalPD
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1 font-medium">
                          Thread / Topik ID:
                        </label>
                        <input
                          type="text"
                          value={config.threadIdVervalPD || ''}
                          onChange={(e) => setConfig({ ...config, threadIdVervalPD: parseTelegramThreadId(e.target.value) })}
                          placeholder="Contoh: 15 (atau paste link topik t.me/c/...)"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1 font-medium">
                          Chat ID Khusus (Opsional):
                        </label>
                        <input
                          type="text"
                          value={config.chatIdVervalPD || ''}
                          onChange={(e) => setConfig({ ...config, chatIdVervalPD: parseTelegramChatId(e.target.value) })}
                          placeholder="Kosongkan jika pakai Chat ID utama"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panduan Akordion */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/70">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <HelpCircle className="w-4 h-4 text-sky-600" />
                <span>Panduan Lengkap (Bot, Chat ID, & Cara Cari Thread ID)</span>
              </div>
              {showGuide ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
            </button>

            {showGuide && (
              <div className="px-4 pb-4 pt-1 text-xs text-slate-600 space-y-3 border-t border-slate-200 bg-white">
                <div className="space-y-1">
                  <strong className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] font-bold">1</span>
                    Buat Bot Telegram:
                  </strong>
                  <p className="pl-5 leading-relaxed">
                    Buka Telegram, cari <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sky-700 font-mono">@BotFather</code>, lalu ketik perintah <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sky-700 font-mono">/newbot</code>. Ikuti instruksinya hingga Anda mendapatkan <b>Bot Token</b>.
                  </p>
                </div>

                <div className="space-y-1">
                  <strong className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] font-bold">2</span>
                    Jika ingin dikirim ke Grup Telegram:
                  </strong>
                  <p className="pl-5 leading-relaxed">
                    Buat atau buka grup Telegram sekolah, lalu <b>tambahkan bot tersebut ke dalam grup</b> dan jadikan sebagai <b>Admin Grup</b> (agar bot memiliki izin mengirim pesan).
                  </p>
                </div>

                <div className="space-y-1">
                  <strong className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] font-bold">3</span>
                    Mendapatkan Chat ID:
                  </strong>
                  <ul className="pl-9 list-disc space-y-1">
                    <li>
                      <b>Untuk Grup:</b> Tambahkan bot pembantu seperti <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">@userinfobot</code> atau <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">@getmyid_bot</code> ke grup untuk melihat ID grup (biasanya diawali dengan <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">-100...</code>).
                    </li>
                    <li>
                      <b>Atau lewat Browser:</b> Kirim 1 pesan apa saja di grup tersebut, lalu buka URL berikut di browser:
                      <br />
                      <span className="text-[10px] font-mono text-slate-500 break-all select-all block mt-0.5 p-1 bg-slate-100 rounded">
                        https://api.telegram.org/bot&lt;TOKEN_ANDA&gt;/getUpdates
                      </span>
                      Cari nilai <code className="text-sky-700 font-mono font-bold">"id"</code> di dalam bagian <code className="text-slate-700 font-mono">"chat"</code>.
                    </li>
                  </ul>
                </div>

                <div className="space-y-1">
                  <strong className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">4</span>
                    Cara Mendapatkan Thread ID (Topik Forum):
                  </strong>
                  <ul className="pl-9 list-disc space-y-1">
                    <li>
                      Di grup Telegram Anda, buka pengaturan grup &rarr; aktifkan pilihan <b>Topics</b> (Forum mode).
                    </li>
                    <li>
                      Buat topik baru (misal: "VervalPD", "Mutasi Masuk", "Mutasi Keluar", "Kenaikan Pangkat", "KGB").
                    </li>
                    <li>
                      Buka sub-topik tersebut &rarr; klik ikon titik tiga di pojok kanan atas &rarr; pilih <b>Copy Link</b> (atau klik kanan pesan &rarr; Copy Message Link).
                    </li>
                    <li>
                      Link akan berbentuk <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono text-[10px]">https://t.me/c/4324462750/6/9</code> atau <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono text-[10px]">https://t.me/c/4324462750/6</code>:
                      <div className="mt-1 pl-2 border-l-2 border-indigo-300 space-y-0.5 text-[11px]">
                        <div>• <b>Chat ID Grup:</b> <code className="text-sky-700 font-bold font-mono">-1004324462750</code></div>
                        <div>• <b>Thread ID (Topik):</b> <code className="text-emerald-700 font-bold font-mono">6</code> (angka di tengah adalah nomor topiknya)</div>
                        <div>• <em>Angka 9 paling ujung adalah nomor pesan (abaikan).</em></div>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="space-y-1 p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg">
                  <strong className="text-amber-900 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-bold">5</span>
                    Integrasi Hosting Vercel (Wajib untuk Seluruh User/Siswa):
                  </strong>
                  <p className="pl-5 text-[11px] text-amber-800 leading-relaxed">
                    Agar notifikasi mutasi otomatis terkirim saat <b>user/siswa lain</b> mengisi data di perangkat mereka, tambahkan 2 variabel di dashboard Vercel:
                  </p>
                  <div className="pl-5 space-y-1 font-mono text-[10px] text-amber-900">
                    <div>• Key: <code className="bg-white px-1 py-0.5 rounded border border-amber-300 font-bold">TELEGRAM_BOT_TOKEN</code></div>
                    <div>• Key: <code className="bg-white px-1 py-0.5 rounded border border-amber-300 font-bold">TELEGRAM_CHAT_ID</code></div>
                  </div>
                  <p className="pl-5 text-[11px] text-amber-800 leading-relaxed font-semibold">
                    ⚠️ Setelah menambah variabel di Vercel, pastikan klik <u>Redeploy</u> pada tab Deployments agar konfigurasi baru aktif!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Alert Hasil Uji Coba */}
          {testResult && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${testResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'}`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold">{testResult.success ? 'Uji Coba Berhasil!' : 'Uji Coba Gagal'}</div>
                <div className="text-[11px] mt-0.5 leading-relaxed">{testResult.message}</div>
              </div>
            </div>
          )}

          {/* Alert Simpan Berhasil */}
          {saveMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveMessage}</span>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || !config.botToken.trim() || !config.chatId.trim()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-sky-700 bg-sky-100 hover:bg-sky-200 rounded-xl border border-sky-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{isTesting ? 'Mengirim Pesan...' : 'Uji Coba Kirim Pesan'}</span>
          </button>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
