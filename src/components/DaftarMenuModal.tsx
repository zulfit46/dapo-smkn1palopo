import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  KeyRound, 
  ShieldCheck, 
  BookOpen, 
  Sparkles, 
  Search, 
  Layers, 
  SlidersHorizontal 
} from 'lucide-react';
import { DAFTAR_AKSES_MENU, parseAksesMenuString, MenuItemDefinition } from '../data/menuList';

interface DaftarMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DaftarMenuModal: React.FC<DaftarMenuModalProps> = ({ isOpen, onClose }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // Interactive tester state
  const [testInput, setTestInput] = useState('peserta_didik-biodata peserta_didik-absenPD');

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const categories = ['Semua', 'Dashboard', 'GTK', 'Peserta Didik', 'Rekapitulasi'];

  const filteredMenus = DAFTAR_AKSES_MENU.filter(m => {
    const matchCat = selectedCategory === 'Semua' || m.kategori === selectedCategory;
    const matchQuery = 
      m.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.kode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.deskripsi.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  const parsedActiveTabs = parseAksesMenuString(testInput);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>Daftar Kode Kolom &apos;akses_menu&apos;</span>
                <span className="text-[11px] font-medium bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Sheet GTK
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Gunakan kode di bawah ini untuk mengatur hak akses menu setiap GTK
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Petunjuk Penggunaan */}
          <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 text-slate-700 space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs sm:text-sm">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Cara Kerja & Format Penulisan di Google Sheets</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Di sheet <span className="font-semibold text-slate-900">gtk</span> pada kolom{' '}
              <code className="px-1.5 py-0.5 bg-indigo-100/80 text-indigo-900 font-mono rounded font-semibold text-[11px]">
                akses_menu
              </code>{' '}
              (atau <code className="px-1.5 py-0.5 bg-slate-100 text-slate-800 font-mono rounded text-[11px]">status_menu</code>), masukkan satu atau beberapa kode menu di bawah ini.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                <span className="font-semibold text-slate-800 block mb-1">Contoh 1 (Sesuai Permintaan Anda):</span>
                <code className="text-indigo-700 bg-slate-50 px-2 py-1 rounded block font-mono text-[11px] font-semibold break-all">
                  peserta_didik-biodata peserta_didik-absenPD
                </code>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  GTK hanya dapat mengakses Biodata Peserta Didik dan Absen PD.
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                <span className="font-semibold text-slate-800 block mb-1">Pemisah yang Didukung:</span>
                <span className="text-[11px] text-slate-600 block">
                  Bisa dipisahkan oleh <strong>spasi</strong>, <strong>koma (,)</strong>, atau baris baru (Alt+Enter) di cell sheet.
                </span>
                <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                  Kosong / tidak diisi = Akses standar sesuai role.
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Tester / Simulator */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 shadow-md">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <span>Simulasi / Cek Kode Yang Akan Diinputkan:</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Ketik teks untuk melihat menu mana saja yang akan aktif
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Misal: peserta_didik-biodata peserta_didik-absenPD"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-emerald-300 placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Hasil Menu yang Dapat Diakses GTK:</span>
                {parsedActiveTabs ? (
                  <span className="text-emerald-400 font-bold">{parsedActiveTabs.size} Menu Terbuka</span>
                ) : (
                  <span className="text-amber-400">Semua Menu Default Terbuka (Akses Penuh)</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DAFTAR_AKSES_MENU.map((item) => {
                  const isAllowed = parsedActiveTabs ? parsedActiveTabs.has(item.tab) : true;
                  return (
                    <span
                      key={item.id}
                      className={`text-[10px] font-medium px-2 py-1 rounded-md border transition-all flex items-center gap-1 ${
                        isAllowed
                          ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-500 line-through opacity-60'
                      }`}
                    >
                      {isAllowed && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                      <span>{item.nama}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Search & Filter Kategori */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama menu atau kode..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tabel Daftar Menu */}
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3.5">Kategori</th>
                  <th className="py-3 px-3.5">Nama Menu</th>
                  <th className="py-3 px-3.5">Kode Input (di sheet gtk)</th>
                  <th className="py-3 px-3.5 hidden md:table-cell">Deskripsi Fitur</th>
                  <th className="py-3 px-3 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMenus.map((item) => {
                  const isCopied = copiedCode === item.kode;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-medium text-slate-800">
                        {item.kategori}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-800">
                        {item.nama}
                      </td>
                      <td className="py-2.5 px-3.5 font-medium text-slate-800">
                        {item.kode}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 text-[11px] hidden md:table-cell leading-relaxed">
                        {item.deskripsi}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.kode)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600'
                          }`}
                          title="Salin kode ini"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Wildcard / Kode Praktis Kategori */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Kode Singkat / Wildcard (Opsional)</span>
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Jika ingin memberikan akses ke seluruh sub-menu dalam satu kelompok sekaligus, cukup ketik nama kelompoknya:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <code className="font-bold text-indigo-600">peserta_didik</code>
                  <p className="text-[10px] text-slate-500">Semua 5 menu Peserta Didik</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('peserta_didik')}
                  className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <code className="font-bold text-emerald-600">gtk</code>
                  <p className="text-[10px] text-slate-500">Semua 3 menu GTK</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('gtk')}
                  className="p-1 rounded text-slate-400 hover:text-emerald-600 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <code className="font-bold text-amber-600">rekapitulasi</code>
                  <p className="text-[10px] text-slate-500">Semua 2 menu Rekapitulasi</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('rekapitulasi')}
                  className="p-1 rounded text-slate-400 hover:text-amber-600 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Total <strong>{DAFTAR_AKSES_MENU.length}</strong> menu terdaftar di sistem.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
