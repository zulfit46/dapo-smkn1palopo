import React, { useState } from 'react';
import { 
  X, 
  Check, 
  ShieldCheck, 
  FileSpreadsheet, 
  SlidersHorizontal, 
  RotateCcw, 
  CheckSquare, 
  Square,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  ALL_DOWNLOAD_COLUMNS, 
  DEFAULT_GTK_ALLOWED_DOWNLOAD_HEADERS,
  DownloadColumnDefinition,
  saveGTKAllowedDownloadHeaders,
  syncGTKAllowedDownloadHeadersToServer 
} from '../data/gtkDownloadColumns';

interface GTKDownloadHeadersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAllowedKeys: string[];
  onSaveSuccess: (updatedKeys: string[]) => void;
  webAppUrl?: string;
}

export const GTKDownloadHeadersModal: React.FC<GTKDownloadHeadersModalProps> = ({
  isOpen,
  onClose,
  currentAllowedKeys,
  onSaveSuccess,
  webAppUrl,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => {
    return currentAllowedKeys.length > 0 
      ? [...currentAllowedKeys] 
      : [...DEFAULT_GTK_ALLOWED_DOWNLOAD_HEADERS];
  });
  const [saveToast, setSaveToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedKeys(
        currentAllowedKeys.length > 0 
          ? [...currentAllowedKeys] 
          : [...DEFAULT_GTK_ALLOWED_DOWNLOAD_HEADERS]
      );
      setSaveToast(false);
      setIsSaving(false);
    }
  }, [isOpen, currentAllowedKeys]);

  if (!isOpen) return null;

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        // Prevent deselecting all columns, keep at least one
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedKeys(ALL_DOWNLOAD_COLUMNS.map((c) => c.key));
  };

  const handleSelectDefault = () => {
    setSelectedKeys([...DEFAULT_GTK_ALLOWED_DOWNLOAD_HEADERS]);
  };

  const handleSelectAkademik = () => {
    setSelectedKeys(['nama', 'kelas', 'nipd', 'nisn', 'jk', 'tempatLahir', 'tanggalLahir', 'agama']);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await syncGTKAllowedDownloadHeadersToServer(selectedKeys, webAppUrl);
    onSaveSuccess(selectedKeys);
    setIsSaving(false);
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 1000);
  };

  // Group columns by category
  const categories: Array<DownloadColumnDefinition['category']> = [
    'Identitas Utama',
    'Kelahiran & Agama',
    'Alamat & Kontak',
    'Data Orang Tua',
    'Akademik & Lainnya',
  ];

  const activeColumnsInOrder = ALL_DOWNLOAD_COLUMNS.filter((c) => selectedKeys.includes(c.key));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                Atur Header Download Siswa untuk GTK (User)
                <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  Admin Control
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih kolom data peserta didik yang diizinkan untuk diunduh (Ekspor Excel) oleh akun GTK.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="px-5 py-2.5 bg-indigo-50/50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-indigo-950 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Preset Cepat:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSelectDefault}
              className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="5 Kolom dasar: Nama, Kelas, NIPD, NISN, JK"
            >
              Default Aman (5 Kolom)
            </button>
            <button
              type="button"
              onClick={handleSelectAkademik}
              className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="8 Kolom dasar + Tempat/Tgl Lahir & Agama"
            >
              Akademik (+TTL & Agama)
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="Buka semua kolom yang tersedia"
            >
              Pilih Semua ({ALL_DOWNLOAD_COLUMNS.length} Kolom)
            </button>
          </div>
        </div>

        {/* Scrollable Columns Selector */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Live Preview Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Pratinjau Urutan Header di File Excel GTK:
              </span>
              <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[11px] border border-indigo-100">
                {selectedKeys.length + 1} Kolom (Termasuk 'No')
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
              <span className="px-2 py-1 bg-slate-200 text-slate-700 font-bold rounded text-[11px] shrink-0">
                1. No
              </span>
              {activeColumnsInOrder.map((col, idx) => (
                <span
                  key={col.key}
                  className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold rounded text-[11px] shrink-0"
                >
                  {idx + 2}. {col.headerName}
                </span>
              ))}
            </div>
          </div>

          {/* Grouped Category Checkboxes */}
          <div className="space-y-4">
            {categories.map((category) => {
              const categoryCols = ALL_DOWNLOAD_COLUMNS.filter((c) => c.category === category);
              const categorySelectedCount = categoryCols.filter((c) => selectedKeys.includes(c.key)).length;
              const isAllCatSelected = categorySelectedCount === categoryCols.length;

              const toggleCategory = () => {
                if (isAllCatSelected) {
                  // Deselect all in category (keep at least one globally)
                  const catKeys = new Set(categoryCols.map((c) => c.key));
                  setSelectedKeys((prev) => {
                    const remain = prev.filter((k) => !catKeys.has(k));
                    return remain.length > 0 ? remain : prev;
                  });
                } else {
                  // Select all in category
                  const catKeys = categoryCols.map((c) => c.key);
                  setSelectedKeys((prev) => Array.from(new Set([...prev, ...catKeys])));
                }
              };

              return (
                <div key={category} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-100/80 px-4 py-2 flex items-center justify-between border-b border-slate-200">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      {category}
                      <span className="text-[11px] font-normal text-slate-500">
                        ({categorySelectedCount}/{categoryCols.length} aktif)
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={toggleCategory}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      {isAllCatSelected ? 'Batal Semua' : 'Pilih Semua'}
                    </button>
                  </div>

                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {categoryCols.map((col) => {
                      const isChecked = selectedKeys.includes(col.key);
                      return (
                        <label
                          key={col.key}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleKey(col.key);
                          }}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50 opacity-75'
                          }`}
                        >
                          <div className="pt-0.5 shrink-0">
                            {isChecked ? (
                              <div className="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded border border-slate-300 bg-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`font-semibold text-xs truncate ${isChecked ? 'text-indigo-950' : 'text-slate-700'}`}>
                                {col.label}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200 shrink-0">
                                {col.headerName}
                              </span>
                            </div>
                            {col.description && (
                              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                {col.description}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Privacy Note */}
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Privasi Data Siswa:</strong> GTK yang login dengan role User hanya dapat mengunduh kolom-kolom yang Anda centang di atas. Data sensitif seperti NIK, data orang tua, dan alamat dapat dirahasiakan jika tidak dibutuhkan untuk proses belajar mengajar.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSelectDefault}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Kembalikan ke Default
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/60 border border-slate-300 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-2xs transition-all cursor-pointer disabled:opacity-60 ${
                saveToast ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan ke Server...</span>
                </>
              ) : saveToast ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Tersimpan di Server!</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Simpan ke Server</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
