import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Search, ShieldAlert, FileText, Calendar, UserCheck } from 'lucide-react';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewInTable?: () => void;
  category: 'kgb' | 'pangkat';
  nip: string;
  nama: string;
  noSk: string;
  tmt: string;
  extraInfo?: string;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  isOpen,
  onClose,
  onViewInTable,
  category,
  nip,
  nama,
  noSk,
  tmt,
  extraInfo
}) => {
  if (!isOpen) return null;

  const categoryLabel = category === 'kgb' ? 'Riwayat KGB (Kenaikan Gaji Berkala)' : 'Riwayat Kepangkatan';

  return (
    <AnimatePresence>
      <div 
        id="duplicate-warning-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          id="duplicate-warning-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white rounded-2xl shadow-2xl border border-amber-200 max-w-lg w-full overflow-hidden text-slate-800"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-amber-500/10 border-b border-amber-200/80 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                  Duplikasi Terdeteksi
                </span>
                <h3 className="text-base font-bold text-slate-900">Data Riwayat Sudah Ada!</h3>
              </div>
            </div>
            <button
              id="btn-close-duplicate-warning"
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Sistem mendeteksi bahwa data pada <strong>{categoryLabel}</strong> dengan kombinasi unik di bawah ini sudah pernah terdaftar di database/Spreadsheet:
            </p>

            {/* Matched Attributes Box */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" /> Nama & NIP
                </span>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">{nama || '-'}</p>
                  <p className="text-[11px] font-mono text-slate-600">{nip || '-'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" /> Nomor SK
                </span>
                <span className="text-xs font-bold font-mono text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300/60">
                  {noSk || '-'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" /> TMT (Terhitung Mulai Tanggal)
                </span>
                <span className="text-xs font-bold font-mono text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300/60">
                  {tmt || '-'}
                </span>
              </div>

              {extraInfo && (
                <div className="pt-2 border-t border-amber-200/60 text-[11px] text-slate-600">
                  {extraInfo}
                </div>
              )}
            </div>

            {/* Rule Explanation */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
              <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-800">Ketentuan Riwayat GTK:</p>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  GTK yang sama dapat memiliki lebih dari satu data riwayat asalkan <strong>Nomor SK</strong> atau periode <strong>TMT</strong> berbeda. Silakan periksa kembali nomor SK atau tanggal TMT yang Anda masukkan agar tidak terjadi pencatatan ganda.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end gap-2.5">
            {onViewInTable && (
              <button
                id="btn-view-duplicate-table"
                type="button"
                onClick={() => {
                  onClose();
                  onViewInTable();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-slate-500" />
                Lihat di Tabel Riwayat
              </button>
            )}
            <button
              id="btn-dismiss-duplicate-modal"
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl transition cursor-pointer shadow-xs"
            >
              Tutup & Periksa Kembali
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
