import React, { useState } from 'react';
import { CODE_GS_SCRIPT, SPREADSHEET_ID, SHEET_NAME } from '../data/codeGsScript';
import { Copy, Check, ExternalLink, Download, Settings, FileCode, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';

interface CodeGsModalProps {
  isOpen: boolean;
  onClose: () => void;
  webAppUrl: string;
  onSaveWebAppUrl: (url: string) => void;
}

export const CodeGsModal: React.FC<CodeGsModalProps> = ({
  isOpen,
  onClose,
  webAppUrl,
  onSaveWebAppUrl
}) => {
  const [activeTab, setActiveTab] = useState<'script' | 'guide' | 'settings'>('script');
  const [copied, setCopied] = useState(false);
  const [inputUrl, setInputUrl] = useState(webAppUrl);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CODE_GS_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadScript = () => {
    const element = document.createElement('a');
    const file = new Blob([CODE_GS_SCRIPT], { type: 'text/javascript' });
    element.href = URL.createObjectURL(file);
    element.download = 'code.gs';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleTestConnection = async () => {
    if (!inputUrl.trim()) {
      setTestStatus('error');
      setTestMsg('Harap masukkan URL Web App Google Apps Script.');
      return;
    }

    setTestStatus('testing');
    setTestMsg('Menghubungi Google Apps Script Web App...');

    try {
      const res = await fetch(inputUrl.trim());
      if (res.ok) {
        const json = await res.json();
        if (json && json.status === 'success') {
          setTestStatus('success');
          setTestMsg(`Koneksi berhasil! Terhubung ke Google Sheets (${json.total || 0} data siswa ditemukan).`);
          onSaveWebAppUrl(inputUrl.trim());
        } else {
          setTestStatus('error');
          setTestMsg(`Respon tidak valid: ${json.message || 'Format JSON tidak sesuai'}`);
        }
      } else {
        setTestStatus('error');
        setTestMsg(`Gagal terhubung. HTTP Status Code: ${res.status}`);
      }
    } catch (err) {
      setTestStatus('error');
      setTestMsg('Gagal terhubung. Pastikan Web App diset ke "Siapa saja (Anyone)" dan URL sudah benar.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Panel Script code.gs & Google Sheets</h2>
              <p className="text-xs text-slate-400">
                Spreadsheet ID: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300 font-mono">{SPREADSHEET_ID}</code> (Sheet: <span className="text-emerald-400">{SHEET_NAME}</span>)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'script'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-t-lg'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Kode Script (code.gs)
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'guide'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-t-lg'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Panduan Pemasangan
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-t-lg'
            }`}
          >
            <Settings className="w-4 h-4" />
            Koneksi Web App URL
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {activeTab === 'script' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <div className="text-sm text-indigo-900">
                  <p className="font-semibold">Kode Google Apps Script Siap Pakai</p>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Script ini sudah dikonfigurasi khusus untuk Spreadsheet ID: <span className="font-mono">{SPREADSHEET_ID}</span> dan sheet <span className="font-semibold">{SHEET_NAME}</span>.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyCode}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Tersalin!' : 'Salin Semua Kode'}
                  </button>
                  <button
                    onClick={handleDownloadScript}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 transition-all shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    Unduh code.gs
                  </button>
                </div>
              </div>

              {/* Code display window */}
              <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
                <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">code.gs</span>
                  <span>Google Apps Script Engine</span>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[380px] leading-relaxed">
                  <code>{CODE_GS_SCRIPT}</code>
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-5 text-slate-700 text-sm">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-indigo-600" />
                  Buka Spreadsheet Utama:
                </h3>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold underline break-all"
                >
                  https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
                </a>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-base">Langkah-Langkah Memasang Google Apps Script:</h3>
                
                <ol className="space-y-3 text-sm list-decimal list-inside text-slate-700">
                  <li className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                    <strong>Buka Spreadsheet:</strong> Klik link di atas untuk membuka Google Spreadsheet target Anda.
                  </li>
                  <li className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                    <strong>Buka Apps Script Editor:</strong> Di menu Google Sheets, klik <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-semibold">Ekstensi &gt; Apps Script</code>.
                  </li>
                  <li className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                    <strong>Tempel Kode code.gs:</strong> Hapus seluruh isi fungsi bawaan, lalu salin dan tempelkan kode yang ada pada tab <span className="font-semibold text-indigo-600">Kode Script (code.gs)</span>.
                  </li>
                  <li className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                    <strong>Simpan:</strong> Klik tombol <span className="font-semibold">Simpan (Ctrl+S)</span>.
                  </li>
                  <li className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                    <strong>Deploy sebagai Aplikasi Web (Web App):</strong>
                    <ul className="mt-2 ml-6 space-y-1 text-xs text-slate-600 list-disc">
                      <li>Klik tombol <strong className="text-slate-800">Terapkan (Deploy)</strong> di pojok kanan atas &gt; <strong className="text-slate-800">Penerapan Baru (New deployment)</strong>.</li>
                      <li>Pilih jenis penerapan: <strong className="text-slate-800">Aplikasi Web (Web app)</strong>.</li>
                      <li>Deskripsi: <span className="font-mono">Data Siswa API v1</span></li>
                      <li>Jalankan sebagai (Execute as): <strong className="text-indigo-600">Saya (Me)</strong></li>
                      <li>Siapa yang memiliki akses (Who has access): <strong className="text-emerald-600">Siapa saja (Anyone)</strong> (Penting agar web app ini dapat mengakses data secara publik!).</li>
                    </ul>
                  </li>
                  <li className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                    <strong>Otorisasi Izin:</strong> Klik <strong className="text-indigo-600">Terapkan (Deploy)</strong>, lalu klik <i>Authorize Access</i> dan izinkan Google Account Anda.
                  </li>
                  <li className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
                    <strong>Salin URL Web App:</strong> Salin URL Web App yang dihasilkan (berawalan <code className="bg-slate-100 px-1 text-slate-800 font-mono text-xs">https://script.google.com/macros/s/.../exec</code>) dan tempelkan pada tab <span className="font-semibold text-indigo-600">Koneksi Web App URL</span> di aplikasi ini.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-sm font-bold text-slate-800">
                  URL Web App Google Apps Script
                </label>
                <p className="text-xs text-slate-500">
                  Masukkan URL Web App hasil deploy dari Google Apps Script untuk menghubungkan aplikasi ini langsung dengan sheet <span className="font-semibold text-slate-700">data</span> pada spreadsheet <span className="font-mono text-slate-700">{SPREADSHEET_ID}</span>.
                </p>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm font-mono text-slate-800 bg-white"
                />
              </div>

              {testStatus !== 'idle' && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
                    testStatus === 'testing'
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : testStatus === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {testStatus === 'testing' && <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full shrink-0 mt-0.5" />}
                  {testStatus === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                  {testStatus === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-semibold">{testMsg}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shadow-xs"
                >
                  {testStatus === 'testing' ? 'Menguji...' : 'Uji Koneksi & Simpan'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Target Sheet Name: <strong className="text-slate-800 font-mono">{SHEET_NAME}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
