import React, { useState, useMemo } from 'react';
import { Student, WaliKelas, GTKData, ActiveTab, AppConfig } from '../types';
import { isUserRole, getWaliKelasForUser } from '../utils/authUtils';
import { notifyVervalPD, VervalPDItemNotification } from '../services/telegramService';
import { 
  UserCheck, 
  Save, 
  Search, 
  CheckCircle, 
  RefreshCw, 
  AlertCircle, 
  Lock, 
  KeyRound, 
  LogOut, 
  ShieldCheck, 
  ShieldAlert,
  School,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AbsenViewProps {
  students: Student[];
  waliKelasList?: WaliKelas[];
  authenticatedWali?: WaliKelas | null;
  currentUser?: GTKData | null;
  appConfig?: AppConfig;
  onAuthenticateWali?: (wali: WaliKelas | null) => void;
  onSaveVerval?: (updatedData: { 
    id: string; 
    studentId?: string; 
    nisn?: string; 
    nipd?: string; 
    status: string; 
    ket: string; 
    nama?: string;
    timestamp?: string;
    vervalOleh?: string;
    verval_oleh?: string;
  }[]) => Promise<any> | any;
  onNavigateTab?: (tab: ActiveTab) => void;
}

// Helper to normalize class string
const cleanClass = (str?: string) => (str || '').trim().toUpperCase().replace(/\s+/g, ' ');

export const AbsenView: React.FC<AbsenViewProps> = ({
  students,
  waliKelasList = [],
  authenticatedWali = null,
  currentUser = null,
  appConfig,
  onAuthenticateWali,
  onSaveVerval,
  onNavigateTab
}) => {
  const isUser = isUserRole(currentUser);
  const userWali = useMemo(() => getWaliKelasForUser(currentUser, waliKelasList), [currentUser, waliKelasList]);

  // If user role is 'user', they are bound to their assigned class.
  // If admin, they use the selected/authenticated wali.
  const effectiveWali = isUser ? userWali : authenticatedWali;

  // Authentication Form State (for Admin or manual verification)
  const [nipInput, setNipInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Table Filters & Search (Default 'Semua' agar seluruh data status tampil di awal)
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [searchTerm, setSearchTerm] = useState('');

  // Available classes across waliKelasList and students
  const availableClasses = useMemo(() => {
    const map = new Map<string, string>();
    waliKelasList.forEach(w => {
      if (w.kelas && w.kelas.trim()) {
        const clean = cleanClass(w.kelas);
        if (!map.has(clean)) map.set(clean, w.kelas.trim());
      }
    });
    students.forEach(s => {
      if (s.kelas && s.kelas.trim()) {
        const clean = cleanClass(s.kelas);
        if (!map.has(clean)) map.set(clean, s.kelas.trim());
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [waliKelasList, students]);

  // Selected rombel state (supports 'Semua Rombel' for Admin)
  const [selectedRombel, setSelectedRombel] = useState<string>(() => {
    if (isUser) return userWali?.kelas || '';
    return effectiveWali?.kelas || 'Semua Rombel';
  });

  React.useEffect(() => {
    if (isUser) {
      setSelectedRombel(userWali?.kelas || '');
    } else if (effectiveWali?.kelas && !selectedRombel) {
      setSelectedRombel(effectiveWali.kelas);
    }
  }, [isUser, userWali, effectiveWali, selectedRombel]);

  // Handler to switch rombel filter dynamically
  const handleRombelChange = (newKelas: string) => {
    setSelectedRombel(newKelas);
    setCurrentPage(1);

    if (!isUser && onAuthenticateWali) {
      if (newKelas === 'Semua Rombel' || newKelas === 'ALL') {
        onAuthenticateWali({
          nip: 'ADMIN',
          nama: 'Administrator',
          kelas: 'Semua Rombel'
        });
      } else {
        const found = waliKelasList.find(w => cleanClass(w.kelas) === cleanClass(newKelas));
        if (found) {
          onAuthenticateWali(found);
        } else {
          onAuthenticateWali({
            nip: 'ADMIN',
            nama: 'Administrator',
            kelas: newKelas
          });
        }
      }
    }
  };

  // Pagination state (15 data per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Local edit states for status and ket
  const [statusState, setStatusState] = useState<{ [studentId: string]: string }>({});
  const [ketState, setKetState] = useState<{ [studentId: string]: string }>({});
  
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);
  const [noChangesNotice, setNoChangesNotice] = useState(false);

  // Handle NIP Access Verification (for Admin mode)
  const handleVerifyNip = async (nipToVerify?: string) => {
    const rawNip = nipToVerify !== undefined ? nipToVerify : nipInput;
    const cleanNip = String(rawNip).trim().replace(/[^a-zA-Z0-9]/g, '');

    if (!cleanNip) {
      setAuthError('Silakan masukkan Kode Akses (NIP) Wali Kelas.');
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    // 1. Try local list match first for instant response
    const localFound = waliKelasList.find(w => {
      const wClean = String(w.nip || '').trim().replace(/[^a-zA-Z0-9]/g, '');
      return wClean && wClean === cleanNip;
    });

    if (localFound) {
      handleRombelChange(localFound.kelas);
      setIsVerifying(false);
      return;
    }

    // 2. Try server endpoint fallback
    try {
      const res = await fetch('/api/walikelas/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nip: cleanNip })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.wali) {
          handleRombelChange(json.wali.kelas);
          setIsVerifying(false);
          return;
        }
      }

      setAuthError(`NIP "${rawNip}" tidak ditemukan di sheet walikelas. Pastikan NIP yang dimasukkan sudah benar.`);
    } catch {
      setAuthError('Gagal memverifikasi NIP. Silakan periksa koneksi internet atau gunakan NIP dari daftar yang tersedia.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogoutWali = () => {
    if (onAuthenticateWali) {
      onAuthenticateWali(null);
    }
    setSelectedRombel('');
    setNipInput('');
    setAuthError(null);
    setStatusState({});
    setKetState({});
  };

  // --- Rombel Filtering & Helpers (Must run before any early return to prevent hook order mismatch) ---
  const isAllRombel = !isUser && (selectedRombel === 'Semua Rombel' || selectedRombel === 'ALL');
  const targetKelas = isAllRombel ? 'Semua Rombel' : (selectedRombel || effectiveWali?.kelas || '');

  const currentWaliForSelectedClass = useMemo(() => {
    if (isUser) return userWali;
    if (isAllRombel || !selectedRombel) return null;
    return waliKelasList.find(w => cleanClass(w.kelas) === cleanClass(selectedRombel)) || null;
  }, [isUser, userWali, isAllRombel, selectedRombel, waliKelasList]);

  const getStudentStatus = (student: Student) => {
    return statusState[student.id] !== undefined 
      ? statusState[student.id] 
      : (student.status || '');
  };

  const getStudentKet = (student: Student) => {
    return ketState[student.id] !== undefined 
      ? ketState[student.id] 
      : (student.ket || '');
  };

  const handleStatusChange = (studentId: string, newStatus: string) => {
    setStatusState(prev => ({ ...prev, [studentId]: newStatus }));
    if (newStatus === 'Aktif') {
      setKetState(prev => ({ ...prev, [studentId]: '' }));
    } else if (newStatus === 'Tidak Aktif' && (!ketState[studentId] || ketState[studentId] === '')) {
      setKetState(prev => ({ ...prev, [studentId]: 'Mutasi' }));
    }
  };

  const handleKetChange = (studentId: string, newKet: string) => {
    setKetState(prev => ({ ...prev, [studentId]: newKet }));
  };

  // If Admin chose Semua Rombel, consider all students; otherwise filter to target class
  const classStudents = useMemo(() => {
    if (isAllRombel) {
      return students;
    }
    const targetClean = cleanClass(selectedRombel);
    return students.filter((s) => cleanClass(s.kelas) === targetClean);
  }, [students, isAllRombel, selectedRombel]);

  const hasChanges = classStudents.some((student) => {
    const newStatus = getStudentStatus(student);
    const newKet = getStudentKet(student);
    const oldStatus = student.status || '';
    const oldKet = student.ket || '';

    const isStatusEdited = statusState[student.id] !== undefined;
    const isKetEdited = ketState[student.id] !== undefined;

    return isStatusEdited || isKetEdited || newStatus !== oldStatus || newKet !== oldKet;
  });

  const filteredStudents = classStudents.filter((s) => {
    const currentStatus = getStudentStatus(s);
    const matchesStatus =
      selectedStatus === 'Semua' ||
      (selectedStatus === 'Belum Diisi' ? !currentStatus : currentStatus === selectedStatus);
    const matchesSearch =
      !searchTerm ||
      (s.nama && s.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.nipd && s.nipd.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.nisn && s.nisn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.kelas && s.kelas.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSave = async () => {
    setSavedSuccessMessage(null);
    setNoChangesNotice(false);

    // Only pick students of this class whose status or keterangan actually changed
    const modifiedStudents = classStudents.filter((student) => {
      const newStatus = getStudentStatus(student);
      const newKet = getStudentKet(student);
      const oldStatus = student.status || '';
      const oldKet = student.ket || '';

      const isStatusEdited = statusState[student.id] !== undefined;
      const isKetEdited = ketState[student.id] !== undefined;

      return isStatusEdited || isKetEdited || newStatus !== oldStatus || newKet !== oldKet;
    });

    if (modifiedStudents.length === 0) {
      setNoChangesNotice(true);
      setTimeout(() => setNoChangesNotice(false), 4000);
      return;
    }

    setIsSaving(true);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestampStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const actorName = (effectiveWali?.nama || (effectiveWali as any)?.guru || currentUser?.nama || (isUser ? 'Wali Kelas' : 'Administrator')).trim();

    const updates = modifiedStudents.map((student) => {
      const status = getStudentStatus(student);
      let ket = '';
      if (status === 'Aktif') {
        ket = '';
      } else if (status === 'Tidak Aktif') {
        ket = getStudentKet(student) || 'Mutasi';
      } else {
        ket = '';
      }
      return {
        id: student.nama ? student.nama.trim() : (student.id || student.nisn || student.nipd),
        studentId: student.id,
        nisn: student.nisn || '',
        nipd: student.nipd || '',
        nama: student.nama || '',
        status,
        ket,
        timestamp: timestampStr,
        vervalOleh: actorName,
        verval_oleh: actorName
      };
    });

    let syncFeedback = '';
    if (onSaveVerval) {
      try {
        const result = await onSaveVerval(updates);
        if (result && typeof result.gasUpdated === 'number') {
          syncFeedback = ` (${result.gasUpdated} data berhasil diperbarui di Spreadsheet)`;
        }
      } catch (err) {
        console.warn('Error saving verval updates:', err);
      }
    }

    // Kirim notifikasi Telegram untuk perubahan status Verval PD (Topik: VervalPD)
    const notifItems: VervalPDItemNotification[] = modifiedStudents.map((student) => {
      const status = getStudentStatus(student);
      const ket = status === 'Aktif' ? '' : (getStudentKet(student) || 'Mutasi');
      const oldStatus = student.status || 'Aktif';
      const oldKet = student.ket || '';
      return {
        nama: student.nama || '-',
        nisn: student.nisn || '-',
        nipd: student.nipd || '-',
        rombel: student.rombel || student.kelas || (selectedRombel !== 'Semua Rombel' ? selectedRombel : (effectiveWali?.kelas || '-')),
        status,
        oldStatus,
        ket,
        oldKet,
        timestamp: timestampStr,
        vervalOleh: actorName,
      };
    });

    notifyVervalPD(
      notifItems,
      {
        actorName,
        kelasName: selectedRombel !== 'Semua Rombel' ? selectedRombel : (effectiveWali?.kelas || 'Semua Rombel'),
      },
      undefined,
      appConfig?.webAppUrl
    ).then((tgRes) => {
      if (tgRes?.success) {
        console.log('[Telegram VervalPD] Notifikasi terkirim:', tgRes.message);
      } else {
        console.warn('[Telegram VervalPD] Notifikasi tidak terkirim:', tgRes.message);
      }
    }).catch((tgErr) => {
      console.warn('[Telegram VervalPD] Error kirim notifikasi:', tgErr);
    });

    // Reset local edit states since changes are saved
    setStatusState({});
    setKetState({});

    setIsSaving(false);
    setSavedSuccessMessage(`Berhasil simpan data${syncFeedback}`);
    setTimeout(() => setSavedSuccessMessage(null), 4000);
  };

  // CASE 1: Logged in as User, but NOT a Wali Kelas -> ACCESS DENIED
  if (isUser && !userWali) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-fadeIn">
        <div className="bg-white border border-rose-200 rounded-3xl shadow-xl overflow-hidden text-center p-8 space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
              <Lock className="w-3.5 h-3.5" /> Akses Khusus Wali Kelas
            </div>
            <h2 className="text-xl font-bold text-slate-900">Menu Verval PD Tidak Dapat Diakses</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Menu <strong className="text-slate-800">Verval Peserta Didik (Verval PD)</strong> hanya dapat diakses oleh Guru / GTK yang terdaftar sebagai <strong className="text-indigo-600">Wali Kelas</strong>.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2 text-slate-700">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-400 font-medium">Nama GTK:</span>
              <span className="font-bold text-slate-800">{currentUser?.nama || '-'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-400 font-medium">NIP:</span>
              <span className="font-mono font-bold text-slate-700">{currentUser?.nip || '-'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-400 font-medium">Tugas Tambahan:</span>
              <span className="text-slate-700 font-medium">{currentUser?.tugasTambahan || 'Tidak ada penugasan wali kelas'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400 font-medium">Status Hak Akses:</span>
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[11px]">
                Bukan Wali Kelas
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            Apabila Anda saat ini aktif bertugas sebagai Wali Kelas pada semester berjalan, silakan hubungi Administrator sekolah untuk memperbarui data penugasan rombel pada Dapodik / Google Sheets.
          </p>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('gtk-biodata')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <span>Kembali ke Biodata GTK</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // CASE 2: Mode Admin tapi belum memilih kelas -> Tampilkan Pemilihan Kelas & Verifikasi
  if (!effectiveWali) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 animate-fadeIn">
        {/* Main Access Box */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white text-center relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3">
              <Lock className="w-3.5 h-3.5" />
              <span>Akses Verval PD — Mode Administrator</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Pilih Rombel / Verifikasi NIP Wali Kelas</h2>
            <p className="text-xs text-slate-300 mt-1.5 max-w-md mx-auto leading-relaxed">
              Sebagai Administrator, Anda dapat memilih rombel kelas secara langsung dari daftar atau memasukkan NIP Wali Kelas untuk membuka dan memvalidasi data siswa kelas tersebut.
            </p>
          </div>

          {/* Form Content */}
          <div className="p-6 md:p-8 space-y-5">
            {/* Direct Button: Tampilkan Semua Rombel untuk Admin */}
            <div className="pb-4 border-b border-slate-200">
              <button
                type="button"
                onClick={() => handleRombelChange('Semua Rombel')}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer group"
              >
                <School className="w-5 h-5 text-emerald-100 group-hover:scale-110 transition-transform" />
                <span>Tampilkan Semua Rombel ({students.length} Peserta Didik)</span>
                <ArrowRight className="w-4 h-4 text-emerald-100 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Quick Select Rombel Dropdown */}
            {waliKelasList.length > 0 && (
              <div className="pb-4 border-b border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Atau Pilih Rombel / Kelas Tertentu:
                </label>
                <select
                  onChange={(e) => {
                    const selKelas = e.target.value;
                    if (!selKelas) return;
                    handleRombelChange(selKelas);
                  }}
                  defaultValue=""
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-800 text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="" disabled>-- Pilih Rombel / Kelas ({waliKelasList.length} rombel tersedia) --</option>
                  <option value="Semua Rombel">🌐 Semua Rombel (Tampilkan Seluruh {students.length} Siswa)</option>
                  {waliKelasList.map((w, idx) => (
                    <option key={idx} value={w.kelas}>
                      {w.kelas} — {w.nama} (NIP: {w.nip || '-'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyNip();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Atau Masukkan Kode Akses (NIP Wali Kelas):
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4 text-indigo-500" />
                  </div>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Masukkan NIP Wali Kelas"
                    value={nipInput}
                    onChange={(e) => {
                      setNipInput(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Data NIP disinkronkan secara otomatis dari sheet <code className="text-indigo-600 font-bold">walikelas</code>.
                </p>
              </div>

              {/* Error Message */}
              {authError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isVerifying || !nipInput.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi NIP...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Buka Akses Verval PD</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- CASE 3: Authenticated State: Filter to Selected Class or All Rombel ---
  return (
    <div className="space-y-6">
      {/* Top Wali Kelas Profile & Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 lg:p-5 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">
              {isAllRombel
                ? 'Semua Rombel (Mode Administrator)'
                : isUser
                ? (effectiveWali?.nama || 'Wali Kelas')
                : `Kelas ${selectedRombel} (Mode Administrator)`}
            </h2>
            <p className="text-xs text-indigo-200/90 mt-0.5 font-medium">
              {isAllRombel
                ? `Menampilkan seluruh rombel (${students.length} peserta didik)`
                : isUser
                ? `Wali Kelas ${selectedRombel}`
                : currentWaliForSelectedClass
                ? `Wali Kelas: ${currentWaliForSelectedClass.nama} (NIP: ${currentWaliForSelectedClass.nip || '-'})`
                : `Wali Kelas ${selectedRombel}`}
            </p>
          </div>
        </div>

        {!isUser && (
          <button
            onClick={handleLogoutWali}
            className="self-start md:self-center flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
            title="Keluar untuk memilih ulang atau memasukkan NIP wali kelas lain"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Pilih Ulang / Ganti Rombel</span>
          </button>
        )}
      </div>

      {/* Action & Filter Bar - Sticky on scroll */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-md space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>
                Tabel Verval PD — {isAllRombel ? 'Semua Rombel' : `Kelas ${selectedRombel}`}
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                ({filteredStudents.length} dari {classStudents.length} siswa)
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAllRombel
                ? 'Mode Administrator: Menampilkan seluruh rombel. Pilih status keaktifan tiap siswa dan simpan perubahan.'
                : 'Pilih status keaktifan tiap siswa dan keterangan bila status Tidak Aktif.'}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/* Search Input */}
            <div className="relative min-w-[180px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Pencarian:</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari Nama / NISN / Rombel..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Filter Kelas / Rombel (Dropdown untuk Admin, Terkunci untuk Wali Kelas) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Filter Kelas:</label>
              {isUser ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 text-xs font-bold text-indigo-900">
                  <Lock className="w-3 h-3 text-indigo-600" />
                  <span>{selectedRombel}</span>
                </div>
              ) : (
                <select
                  value={isAllRombel ? 'Semua Rombel' : selectedRombel}
                  onChange={(e) => handleRombelChange(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-indigo-300 bg-indigo-50/90 text-xs font-bold text-indigo-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="Semua Rombel">🌐 Semua Rombel ({students.length} Siswa)</option>
                  {availableClasses.map((cls) => {
                    const count = students.filter(s => cleanClass(s.kelas) === cleanClass(cls)).length;
                    return (
                      <option key={cls} value={cls}>
                        Kelas {cls} ({count} Siswa)
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Filter Status:</label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Semua">Semua Status</option>
                <option value="Belum Diisi">Belum Diisi</option>
                <option value="Aktif">Aktif</option>
                <option value="Tidak Aktif">Tidak Aktif</option>
              </select>
            </div>

            {/* Save Button */}
            <div>
              <label className="block text-[10px] font-bold text-transparent select-none mb-0.5">Aksi:</label>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                title={
                  hasChanges
                    ? 'Klik untuk menyimpan perubahan Verval PD kelas ini'
                    : 'Ubah status atau keterangan siswa untuk mengaktifkan tombol simpan'
                }
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  hasChanges && !isSaving
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                }`}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Simpan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {savedSuccessMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedSuccessMessage}</span>
          </div>
        )}

        {noChangesNotice && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Tidak ada perubahan status atau keterangan siswa yang perlu disimpan. Silakan ubah status/keterangan siswa terlebih dahulu.</span>
          </div>
        )}
      </div>

      {/* Verval PD Table - Clean Grid Style */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                <th className="py-2.5 px-3 text-center border-r border-slate-300 w-12">No</th>
                <th className="py-2.5 px-3 border-r border-slate-300">NISN</th>
                <th className="py-2.5 px-3 border-r border-slate-300">NIPD</th>
                <th className="py-2.5 px-4 border-r border-slate-300 font-bold">Nama Siswa</th>
                <th className="py-2.5 px-3 border-r border-slate-300">Kelas</th>
                <th className="py-2.5 px-4 border-r border-slate-300 text-center min-w-[190px]">Status Keaktifan</th>
                <th className="py-2.5 px-4 min-w-[180px]">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                    {classStudents.length === 0
                      ? (isAllRombel
                          ? 'Belum ada data siswa yang terdaftar di sistem.'
                          : `Belum ada data siswa yang terdaftar untuk kelas ${selectedRombel}.`)
                      : 'Tidak ada data peserta didik yang cocok dengan filter pencarian.'}
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  const currentStatus = getStudentStatus(student);
                  const currentKet = getStudentKet(student);
                  const isAktif = currentStatus === 'Aktif';
                  const isTidakAktif = currentStatus === 'Tidak Aktif';
                  const isClean = !currentStatus;

                  const rowBgClass = isAktif
                    ? 'bg-emerald-50/40 hover:bg-emerald-50/80'
                    : isTidakAktif
                    ? 'bg-rose-50/40 hover:bg-rose-50/80'
                    : 'bg-white hover:bg-slate-50';

                  return (
                    <tr key={student.id ? `${student.id}-${idx}` : `stu-${idx}`} className={`${rowBgClass} transition-colors border-b border-slate-200`}>
                      <td className="py-2.5 px-3 text-center text-slate-500 border-r border-slate-200">{itemIndex}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">{student.nisn || '-'}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">{student.nipd || '-'}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200">
                        <div>{student.nama}</div>
                        {(student.timestamp || student.vervalOleh) && (
                          <div className="text-[10px] text-slate-400 font-normal font-mono flex items-center gap-1 mt-0.5" title="Riwayat Terakhir Verval PD">
                            <span>🕒 {student.timestamp}</span>
                            {student.vervalOleh && <span>• {student.vervalOleh}</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">{student.kelas || '-'}</td>

                      {/* Status Column - Clean Radio Options */}
                      <td className="py-2.5 px-4 border-r border-slate-200">
                        <div className="flex items-center justify-center gap-4">
                          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 cursor-pointer select-none">
                            <input
                              type="radio"
                              name={`status-${student.id || idx}`}
                              value="Aktif"
                              checked={isAktif}
                              onChange={() => handleStatusChange(student.id, 'Aktif')}
                              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                            />
                            <span>Aktif</span>
                          </label>

                          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 cursor-pointer select-none">
                            <input
                              type="radio"
                              name={`status-${student.id || idx}`}
                              value="Tidak Aktif"
                              checked={isTidakAktif}
                              onChange={() => handleStatusChange(student.id, 'Tidak Aktif')}
                              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                            />
                            <span>Tidak Aktif</span>
                          </label>
                        </div>
                      </td>

                      {/* Keterangan Column */}
                      <td className="py-2.5 px-4">
                        {isClean ? (
                          <span className="text-slate-400 italic text-xs">- (Belum diisi)</span>
                        ) : isAktif ? (
                          <span className="text-emerald-700 font-medium text-xs">- (Siswa Aktif)</span>
                        ) : (
                          <select
                            value={currentKet || 'Mutasi'}
                            onChange={(e) => handleKetChange(student.id, e.target.value)}
                            className="w-full px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-800 font-medium text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                          >
                            <option value="Mutasi">Mutasi</option>
                            <option value="Dikeluarkan">Dikeluarkan</option>
                            <option value="Mengundurkan Diri">Mengundurkan Diri</option>
                            <option value="Putus Sekolah">Putus Sekolah</option>
                            <option value="Wafat">Wafat</option>
                            <option value="Hilang">Hilang</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Summary Footer Bar */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan{' '}
              <strong className="text-slate-900">
                {filteredStudents.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
              </strong>
              -
              <strong className="text-slate-900">
                {Math.min(currentPage * itemsPerPage, filteredStudents.length)}
              </strong>{' '}
              dari <strong className="text-slate-900">{filteredStudents.length}</strong> siswa ({isAllRombel ? 'Semua Rombel' : `Kelas ${selectedRombel}`})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Halaman <strong className="text-slate-900">{currentPage}</strong> dari{' '}
              <strong className="text-slate-900">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors shadow-2xs cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || filteredStudents.length === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors shadow-2xs cursor-pointer"
                title="Halaman Berikutnya"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
