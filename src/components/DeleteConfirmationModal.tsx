import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

export interface DeleteDetailItem {
  label: string;
  value: string;
}

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  itemName?: string;
  itemDetails?: DeleteDetailItem[];
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemDetails = [],
  isDeleting = false
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="delete-confirmation-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        onClick={isDeleting ? undefined : onClose}
      >
        <motion.div
          id="delete-confirmation-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-full overflow-hidden text-slate-800"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-rose-50 border-b border-rose-200/80 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-rose-200/80 text-rose-800">
                  Konfirmasi Hapus
                </span>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
              </div>
            </div>
            {!isDeleting && (
              <button
                id="btn-close-delete-modal"
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data {itemName ? <strong>"{itemName}"</strong> : 'ini'}? Tindakan ini akan menghapus data dari daftar riwayat lokal dan Spreadsheet.
            </p>

            {itemDetails.length > 0 && (
              <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 space-y-2 text-xs">
                {itemDetails.map((detail, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px] font-medium">{detail.label}</span>
                    <span className="font-semibold text-slate-800 text-right">{detail.value || '-'}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-amber-800">
                Data yang sudah dihapus tidak dapat dipulihkan secara otomatis. Pastikan Anda telah memeriksa data sebelum melanjutkan.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end gap-2.5">
            <button
              id="btn-cancel-delete"
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              id="btn-confirm-delete"
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus Data</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
