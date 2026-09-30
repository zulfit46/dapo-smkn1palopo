import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  X, 
  Sparkles, 
  Clock, 
  Calendar,
  Award,
  DollarSign,
  UserCheck
} from 'lucide-react';

export interface SavedDetailItem {
  label: string;
  value: string | number;
  highlight?: boolean;
  badge?: string;
  iconType?: 'user' | 'award' | 'calendar' | 'money' | 'default';
}

interface SyncSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  sheetName?: string;
  targetSheet?: string;
  spreadsheetId?: string;
  actionType?: 'create' | 'update' | 'syncAll';
  dataDetails: SavedDetailItem[];
  timestamp?: string;
}

export const SyncSuccessModal: React.FC<SyncSuccessModalProps> = ({
  isOpen,
  onClose,
  title = 'Data Berhasil Disimpan!',
  subtitle = 'Data telah diverifikasi dan berhasil disimpan ke sistem.',
  dataDetails,
  timestamp = new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="sync-success-modal-backdrop" 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          id="sync-success-modal-container"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6"
        >
          {/* Header Accent Bar */}
          <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

          {/* Close button */}
          <button
            id="btn-close-sync-modal"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 md:p-8">
            {/* Top Icon & Title */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center text-white text-[10px] shadow">
                  <Sparkles className="w-3 h-3" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 leading-tight">
                  {title}
                </h3>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              {subtitle}
            </p>

            {/* Data Details Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 space-y-2.5 text-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-200">
                <span>Rincian Data Tersimpan</span>
              </div>

              <div className="space-y-2">
                {dataDetails.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between py-1 px-2 rounded-lg transition-colors ${
                      item.highlight ? 'bg-emerald-50/80 border border-emerald-100' : 'hover:bg-slate-100/60'
                    }`}
                  >
                    <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                      {item.iconType === 'user' && <UserCheck className="w-3.5 h-3.5 text-slate-400" />}
                      {item.iconType === 'award' && <Award className="w-3.5 h-3.5 text-indigo-500" />}
                      {item.iconType === 'calendar' && <Calendar className="w-3.5 h-3.5 text-teal-500" />}
                      {item.iconType === 'money' && <DollarSign className="w-3.5 h-3.5 text-emerald-500" />}
                      {item.label}
                    </span>
                    <span className={`text-xs font-semibold text-right max-w-[240px] truncate ${
                      item.highlight ? 'text-emerald-800 font-bold' : 'text-slate-800'
                    }`}>
                      {item.value || '-'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Timestamp */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Waktu Penyimpanan:
                </span>
                <span className="font-mono text-slate-600">{timestamp}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end pt-1">
              <button
                id="btn-confirm-close-sync-modal"
                onClick={onClose}
                className="w-full py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all cursor-pointer text-center"
              >
                Tutup & Lanjutkan
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
