import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, WaliKelas, MutasiMasukItem, MutasiKeluarItem, AppTheme, GTKData, AppConfig, WilayahItem } from '../types';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { isUserRole } from '../utils/authUtils';
import { formatToDDMMYYYY, parseToYYYYMMDD, parseDateToTimestamp } from '../utils/dateUtils';
import { 
  fetchMutasiMasukDirectly, 
  saveMutasiMasukDirectly, 
  deleteMutasiMasukDirectly,
  fetchMutasiKeluarDirectly,
  saveMutasiKeluarDirectly,
  deleteMutasiKeluarDirectly,
  deleteMultipleMutasiKeluarDirectly,
  uploadMutasiBerkasToDrive,
  generateMutasiBerkasFileName,
  DRIVE_FOLDER_ID_MUTASI_KELUAR
} from '../services/sheetsSync';
import * as XLSX from 'xlsx';
import { CodeGsModal } from './CodeGsModal';
import { TelegramConfigModal } from './TelegramConfigModal';
import { 
  notifyMutasiMasuk, 
  notifyMutasiKeluar, 
  getTelegramConfig, 
  DEFAULT_TELEGRAM_CONFIG 
} from '../services/telegramService';
import { TelegramConfig } from '../types';
import { 
  UserPlus, 
  UserMinus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit,
  Trash2, 
  CheckCircle, 
  Clock, 
  School, 
  MapPin, 
  Building2, 
  AlertCircle,
  X,
  RefreshCw,
  Check,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  ExternalLink,
  FileSpreadsheet,
  UserCheck,
  Lock,
  Upload,
  FileText,
  CheckCircle2,
  Folder,
  Link2,
  Paperclip,
  RotateCcw,
  Code,
  FileCode,
  Send
} from 'lucide-react';

interface MutasiViewProps {
  students: Student[];
  waliKelasList?: WaliKelas[];
  theme?: AppTheme;
  currentUser?: GTKData | null;
  appConfig?: AppConfig;
  onAddStudentToActive?: (student: Student) => void;
  onUpdateStudentStatus?: (nisn: string, nipd: string, nama: string, status: string, ket: string, verval_oleh?: string) => Promise<any> | void;
}

const API_WILAYAH = "https://www.emsifa.com/api-wilayah-indonesia/api";

const FALLBACK_PROVINCES: WilayahItem[] = [
  { id: '73', name: 'SULAWESI SELATAN' },
  { id: '76', name: 'SULAWESI BARAT' },
  { id: '72', name: 'SULAWESI TENGAH' },
  { id: '74', name: 'SULAWESI TENGGARA' },
  { id: '71', name: 'SULAWESI UTARA' },
  { id: '75', name: 'GORONTALO' },
  { id: '31', name: 'DKI JAKARTA' },
  { id: '32', name: 'JAWA BARAT' },
  { id: '33', name: 'JAWA TENGAH' },
  { id: '35', name: 'JAWA TIMUR' },
];

const INITIAL_MUTASI_MASUK: MutasiMasukItem[] = [
  {
    id: 'MUT-IN-001',
    no: 1,
    nisn: '0071829301',
    nama: 'Muhammad Rizky Ramadhan',
    provinsiId: '73',
    provinsiNama: 'SULAWESI SELATAN',
    kabKotaId: '7317',
    kabKotaNama: 'KABUPATEN LUWU',
    kecamatanId: '7317010',
    kecamatanNama: 'BASSESANGETEMPE',
    sekolahAsal: 'SMP Negeri 1 Belopa',
    rombelTujuan: '10 TJKT 1',
    tanggalPengajuan: '15/08/2026',
    tglMasuk: '15/08/2026',
    timestamp: '15/08/2026 08:30:00',
    status: 'Diterima',
    verval_oleh: 'Admin',
    vervalOleh: 'Admin',
    keterangan: 'Pindah domisili orang tua ke Kota Palopo',
    createdAt: '2026-08-15T08:30:00Z'
  },
  {
    id: 'MUT-IN-002',
    no: 2,
    nisn: '0079482710',
    nama: 'Nurul Fadhilah Syahrir',
    provinsiId: '73',
    provinsiNama: 'SULAWESI SELATAN',
    kabKotaId: '7322',
    kabKotaNama: 'KABUPATEN LUWU UTARA',
    kecamatanId: '7322010',
    kecamatanNama: 'MASAMBA',
    sekolahAsal: 'SMK Negeri 1 Luwu Utara',
    rombelTujuan: '10 AKL 1',
    tanggalPengajuan: '20/08/2026',
    tglMasuk: '20/08/2026',
    timestamp: '20/08/2026 10:15:00',
    status: 'Diterima',
    verval_oleh: 'Admin',
    vervalOleh: 'Admin',
    keterangan: 'Mutasi jurusan Akuntansi',
    createdAt: '2026-08-20T10:15:00Z'
  },
  {
    id: 'MUT-IN-003',
    no: 3,
    nisn: '0082739182',
    nama: 'Fajar Eka Saputra',
    provinsiId: '76',
    provinsiNama: 'SULAWESI BARAT',
    kabKotaId: '7602',
    kabKotaNama: 'KABUPATEN MAMUJU',
    kecamatanId: '7602010',
    kecamatanNama: 'MAMUJU',
    sekolahAsal: 'SMP Negeri 2 Mamuju',
    rombelTujuan: '10 MPLB 1',
    tanggalPengajuan: '02/09/2026',
    tglMasuk: '02/09/2026',
    timestamp: '02/09/2026 09:00:00',
    status: 'Diterima',
    verval_oleh: 'Admin',
    vervalOleh: 'Admin',
    keterangan: 'Pindah tugas dinas orang tua',
    createdAt: '2026-09-02T09:00:00Z'
  }
];

const INITIAL_MUTASI_KELUAR: MutasiKeluarItem[] = [
  {
    id: 'MUT-OUT-001',
    no: 1,
    nipd: '20240112',
    nisn: '0071829301',
    nama: 'Ahmad Fauzan Pratama',
    tempatLahir: 'Palopo',
    tglLahir: '15/04/2007',
    rombel: '11 TJKT 1',
    ketMutasi: 'Mutasi',
    pindahKe: 'SMK Negeri 2 Makassar',
    tglMutasi: '10/08/2026',
    alasanMutasi: 'Mengikuti kepindahan tugas kedinasan orang tua ke Makassar',
    uploadBerkas: '',
    status: 'Selesai',
    verval_oleh: 'Admin',
    vervalOleh: 'Admin',
    timestamp: '10/08/2026 09:30:00'
  }
];

export const MutasiView: React.FC<MutasiViewProps> = ({
  students = [],
  waliKelasList = [],
  currentUser,
  appConfig,
  onAddStudentToActive,
  onUpdateStudentStatus
}) => {
  // Role detection:
  const isUser = isUserRole(currentUser);
  const isAdmin = !isUser;
  const currentUserName = currentUser?.nama || (currentUser as any)?.nama_lengkap || currentUser?.id || 'Admin';

  // Active Tab: 'masuk' | 'keluar'
  const [activeTab, setActiveTab] = useState<'masuk' | 'keluar'>('masuk');

  // Mutasi Masuk Data State
  const [mutasiMasukList, setMutasiMasukList] = useState<MutasiMasukItem[]>(() => {
    return safeGetItem<MutasiMasukItem[]>('dapodik_cached_mutasi_masuk', INITIAL_MUTASI_MASUK);
  });

  // Mutasi Keluar Data State
  const [mutasiKeluarList, setMutasiKeluarList] = useState<MutasiKeluarItem[]>(() => {
    return safeGetItem<MutasiKeluarItem[]>('dapodik_cached_mutasi_keluar', INITIAL_MUTASI_KELUAR);
  });

  // Form State Mutasi Masuk
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MutasiMasukItem | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<MutasiMasukItem | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string; title?: string } | null>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  // Telegram Notification Config State
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState<boolean>(false);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(DEFAULT_TELEGRAM_CONFIG);

  useEffect(() => {
    getTelegramConfig().then(setTelegramConfig);
  }, []);

  // Form State Mutasi Keluar
  const [isFormKeluarOpen, setIsFormKeluarOpen] = useState<boolean>(false);
  const [editingKeluarItem, setEditingKeluarItem] = useState<MutasiKeluarItem | null>(null);
  const [selectedKeluarDetail, setSelectedKeluarDetail] = useState<MutasiKeluarItem | null>(null);
  const [isSavingKeluar, setIsSavingKeluar] = useState(false);
  const [isSyncingKeluar, setIsSyncingKeluar] = useState(false);
  const [deleteKeluarTarget, setDeleteKeluarTarget] = useState<MutasiKeluarItem | null>(null);
  const [isDeletingTarget, setIsDeletingTarget] = useState(false);
  const [oldBerkasUrlToReplace, setOldBerkasUrlToReplace] = useState<string>('');
  const [formKeluarError, setFormKeluarError] = useState<string | null>(null);
  const [selectedStudentForKeluar, setSelectedStudentForKeluar] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState<boolean>(false);

  const [formKeluarData, setFormKeluarData] = useState({
    nipd: '',
    nisn: '',
    nama: '',
    tempatLahir: '',
    tglLahir: '',
    rombel: '',
    ketMutasi: 'Mutasi',
    pindahKe: '',
    tglMutasi: new Date().toISOString().split('T')[0],
    alasanMutasi: '',
    uploadBerkas: '',
    status: isAdmin ? 'Selesai' : 'Diproses'
  });

  // Berkas Upload State for Mutasi Keluar (Drive Folder: 1sGqbpA6uctgvOmYUwyxNP8pC5ORZUy56, Format: nisn_nama)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedBerkasFile, setSelectedBerkasFile] = useState<File | null>(null);
  const [isUploadingBerkas, setIsUploadingBerkas] = useState<boolean>(false);
  const [berkasUploadError, setBerkasUploadError] = useState<string | null>(null);
  const [isManualLinkMode, setIsManualLinkMode] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);

  // Form Input Values Mutasi Masuk
  const [formData, setFormData] = useState({
    nisn: '',
    nama: '',
    provinsiId: '',
    provinsiNama: '',
    kabKotaId: '',
    kabKotaNama: '',
    kecamatanId: '',
    kecamatanNama: '',
    sekolahAsal: '',
    rombelTujuan: '',
    tglMasuk: new Date().toISOString().split('T')[0],
    status: 'Pending' as 'Pending' | 'Diterima',
    keterangan: ''
  });

  // Wilayah API State
  const [provinces, setProvinces] = useState<WilayahItem[]>(FALLBACK_PROVINCES);
  const [regencies, setRegencies] = useState<WilayahItem[]>([]);
  const [districts, setDistricts] = useState<WilayahItem[]>([]);
  const [isLoadingWilayah, setIsLoadingWilayah] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync / Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filters & Search Mutasi Masuk
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRombel, setFilterRombel] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Pagination State for Mutasi Masuk
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filters & Pagination State for Mutasi Keluar
  const [keluarSearchQuery, setKeluarSearchQuery] = useState('');
  const [filterKeluarRombel, setFilterKeluarRombel] = useState('ALL');
  const [filterKeluarStatus, setFilterKeluarStatus] = useState('ALL');
  const [filterKeluarKet, setFilterKeluarKet] = useState('ALL');
  const [keluarCurrentPage, setKeluarCurrentPage] = useState(1);

  const formRef = useRef<HTMLDivElement | null>(null);
  const formKeluarRef = useRef<HTMLDivElement | null>(null);
  const studentSearchContainerRef = useRef<HTMLDivElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch remote data on mount from Google Sheets (sheet "mutasi_masuk" and "mutasi_keluar")
  useEffect(() => {
    let isMounted = true;
    const loadFromSheets = async () => {
      if (!appConfig?.webAppUrl && !appConfig?.spreadsheetId) return;
      setIsLoading(true);
      try {
        // Fetch mutasi_masuk
        const remoteData = await fetchMutasiMasukDirectly(appConfig);
        if (isMounted && Array.isArray(remoteData) && remoteData.length > 0) {
          setMutasiMasukList(remoteData);
          safeSetItem('dapodik_cached_mutasi_masuk', remoteData);
        }

        // Fetch mutasi_keluar
        const remoteKeluar = await fetchMutasiKeluarDirectly(appConfig);
        if (isMounted && Array.isArray(remoteKeluar) && remoteKeluar.length > 0) {
          setMutasiKeluarList(remoteKeluar);
          safeSetItem('dapodik_cached_mutasi_keluar', remoteKeluar);
        }
      } catch (err) {
        console.warn('Gagal memuat mutasi dari spreadsheet:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadFromSheets();
    return () => { isMounted = false; };
  }, [appConfig?.webAppUrl, appConfig?.spreadsheetId]);

  // 2. Fetch Provinces from Wilayah API
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const res = await fetch(`${API_WILAYAH}/provinces.json`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setProvinces(data);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat provinsi dari emsifa, memakai data fallback:', err);
      }
    };
    fetchProvinces();
  }, []);

  // Fetch Regencies when province changes
  useEffect(() => {
    if (!formData.provinsiId) {
      setRegencies([]);
      setDistricts([]);
      return;
    }
    const fetchRegencies = async () => {
      setIsLoadingWilayah(true);
      try {
        const res = await fetch(`${API_WILAYAH}/regencies/${formData.provinsiId}.json`);
        if (res.ok) {
          const data = await res.json();
          setRegencies(data);
        }
      } catch (err) {
        console.warn('Gagal memuat kabupaten/kota:', err);
      } finally {
        setIsLoadingWilayah(false);
      }
    };
    fetchRegencies();
  }, [formData.provinsiId]);

  // Fetch Districts when regency changes
  useEffect(() => {
    if (!formData.kabKotaId) {
      setDistricts([]);
      return;
    }
    const fetchDistricts = async () => {
      setIsLoadingWilayah(true);
      try {
        const res = await fetch(`${API_WILAYAH}/districts/${formData.kabKotaId}.json`);
        if (res.ok) {
          const data = await res.json();
          setDistricts(data);
        }
      } catch (err) {
        console.warn('Gagal memuat kecamatan:', err);
      } finally {
        setIsLoadingWilayah(false);
      }
    };
    fetchDistricts();
  }, [formData.kabKotaId]);

  // Compute available rombel list from students and waliKelasList
  const availableRombelList = useMemo(() => {
    const setRombel = new Set<string>();
    waliKelasList.forEach(w => {
      if (w.kelas) setRombel.add(w.kelas.trim());
    });
    students.forEach(s => {
      if (s.kelas) setRombel.add(s.kelas.trim());
    });
    if (setRombel.size === 0) {
      ['10 AKL 1', '10 AKL 2', '10 Kuliner 1', '10 MPLB 1', '10 PMS 1', '10 TJKT 1', '10 ULP', '11 AKL 1', '11 MPLB 1', '11 TJKT 1'].forEach(r => setRombel.add(r));
    }
    return Array.from(setRombel).sort();
  }, [waliKelasList, students]);

  // Reset form to clean state
  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      nisn: '',
      nama: '',
      provinsiId: '',
      provinsiNama: '',
      kabKotaId: '',
      kabKotaNama: '',
      kecamatanId: '',
      kecamatanNama: '',
      sekolahAsal: '',
      rombelTujuan: '',
      tglMasuk: new Date().toISOString().split('T')[0],
      status: 'Pending',
      keterangan: ''
    });
    setFormError(null);
    setIsFormOpen(false);
  };

  // Open Form for Adding New Mutasi Masuk
  const handleOpenAddForm = () => {
    setEditingItem(null);
    setFormData({
      nisn: '',
      nama: '',
      provinsiId: '',
      provinsiNama: '',
      kabKotaId: '',
      kabKotaNama: '',
      kecamatanId: '',
      kecamatanNama: '',
      sekolahAsal: '',
      rombelTujuan: '',
      tglMasuk: new Date().toISOString().split('T')[0],
      status: 'Pending',
      keterangan: ''
    });
    setFormError(null);
    setIsFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Open Form for Editing an Existing Record
  const handleStartEdit = (item: MutasiMasukItem) => {
    setEditingItem(item);
    const rawDate = item.tglMasuk || item.tanggalPengajuan || item.timestamp || '';
    setFormData({
      nisn: item.nisn || '',
      nama: item.nama || '',
      provinsiId: item.provinsiId || '',
      provinsiNama: item.provinsiNama || '',
      kabKotaId: item.kabKotaId || '',
      kabKotaNama: item.kabKotaNama || '',
      kecamatanId: item.kecamatanId || '',
      kecamatanNama: item.kecamatanNama || '',
      sekolahAsal: item.sekolahAsal || '',
      rombelTujuan: item.rombelTujuan || '',
      tglMasuk: rawDate ? parseToYYYYMMDD(rawDate) : new Date().toISOString().split('T')[0],
      status: item.status === 'Diterima' ? 'Diterima' : 'Pending',
      keterangan: item.keterangan || ''
    });
    setFormError(null);
    setIsFormOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Handle Save Mutasi Masuk
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nisn.trim()) {
      setFormError('NISN wajib diisi');
      return;
    }
    if (formData.nisn.trim().length !== 10) {
      setFormError('NISN harus tepat 10 digit angka');
      return;
    }
    if (!formData.nama.trim()) {
      setFormError('Nama Lengkap Siswa wajib diisi');
      return;
    }
    if (!formData.sekolahAsal.trim()) {
      setFormError('Nama Sekolah Asal wajib diisi');
      return;
    }
    if (!formData.rombelTujuan.trim()) {
      setFormError('Silakan pilih Rombel Tujuan penempatan');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    // Format Tanggal Masuk strictly as DD/MM/YYYY text
    const textDate = formatToDDMMYYYY(formData.tglMasuk || new Date());
    const nowTimestamp = `${textDate} ${new Date().toTimeString().split(' ')[0]}`;

    // Admin can choose status; regular user preserves existing status when editing, or 'Pending' if new
    const finalStatus: 'Pending' | 'Diterima' = isAdmin 
      ? formData.status 
      : (editingItem ? (editingItem.status as 'Pending' | 'Diterima') : 'Pending');

    let targetItem: MutasiMasukItem;
    let updatedList: MutasiMasukItem[];

    if (editingItem) {
      targetItem = {
        ...editingItem,
        nisn: formData.nisn.trim(),
        nama: formData.nama.trim(),
        provinsiId: formData.provinsiId,
        provinsiNama: formData.provinsiNama,
        kabKotaId: formData.kabKotaId,
        kabKotaNama: formData.kabKotaNama,
        kecamatanId: formData.kecamatanId,
        kecamatanNama: formData.kecamatanNama,
        sekolahAsal: formData.sekolahAsal.trim(),
        rombelTujuan: formData.rombelTujuan.trim(),
        tglMasuk: textDate,
        tanggalPengajuan: textDate,
        timestamp: editingItem.timestamp || nowTimestamp,
        status: finalStatus,
        verval_oleh: currentUserName,
        vervalOleh: currentUserName,
        keterangan: formData.keterangan.trim() || (finalStatus === 'Diterima' ? 'Mutasi Masuk Disetujui' : 'Pengajuan Mutasi Masuk')
      };
      updatedList = mutasiMasukList.map(m => m.id === editingItem.id ? targetItem : m);
    } else {
      targetItem = {
        id: `MUT-IN-${Date.now().toString().slice(-4)}`,
        no: mutasiMasukList.length + 1,
        nisn: formData.nisn.trim(),
        nama: formData.nama.trim(),
        provinsiId: formData.provinsiId,
        provinsiNama: formData.provinsiNama,
        kabKotaId: formData.kabKotaId,
        kabKotaNama: formData.kabKotaNama,
        kecamatanId: formData.kecamatanId,
        kecamatanNama: formData.kecamatanNama,
        sekolahAsal: formData.sekolahAsal.trim(),
        rombelTujuan: formData.rombelTujuan.trim(),
        tglMasuk: textDate,
        tanggalPengajuan: textDate,
        timestamp: nowTimestamp,
        status: finalStatus,
        verval_oleh: currentUserName,
        vervalOleh: currentUserName,
        keterangan: formData.keterangan.trim() || (finalStatus === 'Diterima' ? 'Mutasi Masuk Disetujui' : 'Pengajuan Mutasi Masuk'),
        createdAt: new Date().toISOString()
      };
      updatedList = [targetItem, ...mutasiMasukList];
    }

    setMutasiMasukList(updatedList);
    safeSetItem('dapodik_cached_mutasi_masuk', updatedList);
    setHighlightedRowId(targetItem.id);

    // Otomatis masukkan ke daftar siswa aktif jika Diterima
    if (targetItem.status === 'Diterima' && onAddStudentToActive) {
      const alreadyInStudents = students.some(s => s.nisn === targetItem.nisn);
      if (!alreadyInStudents) {
        const newStudent: Student = {
          id: `STU-MUT-${Date.now().toString().slice(-4)}`,
          nama: targetItem.nama,
          kelas: targetItem.rombelTujuan,
          nipd: `${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`,
          nisn: targetItem.nisn,
          jk: 'L',
          tempatLahir: targetItem.kabKotaNama ? targetItem.kabKotaNama.replace(/KABUPATEN |KOTA /g, '') : 'Palopo',
          tanggalLahir: '2008-01-01',
          agama: 'Islam',
          alamat: `Kec. ${targetItem.kecamatanNama}, ${targetItem.kabKotaNama}, Prov. ${targetItem.provinsiNama}`,
          ayah: '-',
          ibu: '-',
          statusRegistrasi: 'Pindahan',
          status: 'Aktif',
          verval_oleh: currentUserName,
          vervalOleh: currentUserName,
          sekolahAsal: targetItem.sekolahAsal,
          tanggalMasuk: targetItem.tanggalPengajuan || new Date().toISOString().split('T')[0]
        };
        onAddStudentToActive(newStudent);
      }
    }

    // Kirim sinkronisasi ke Google Apps Script (sheet "mutasi_masuk")
    if (appConfig?.webAppUrl) {
      saveMutasiMasukDirectly(appConfig.webAppUrl, targetItem, Boolean(editingItem))
        .catch(err => console.warn('Latar belakang simpan ke spreadsheet:', err));
    }

    // Kirim notifikasi Telegram otomatis untuk data mutasi masuk baru
    if (!editingItem) {
      notifyMutasiMasuk(targetItem, telegramConfig, appConfig?.webAppUrl)
        .then(tRes => {
          if (tRes.success) {
            console.log('[Telegram] Notifikasi mutasi masuk terkirim:', tRes.message);
          }
        })
        .catch(tErr => console.warn('[Telegram] Gagal mengirim notifikasi mutasi masuk:', tErr));
    }

    setNotification({
      type: 'success',
      title: 'Berhasil Simpan Data',
      message: editingItem
        ? `Data mutasi masuk atas nama "${targetItem.nama}" berhasil diperbarui (Status: ${targetItem.status}).`
        : `Data mutasi masuk atas nama "${targetItem.nama}" berhasil disimpan (Status: ${targetItem.status}).`
    });

    setIsSaving(false);
    resetForm();

    setTimeout(() => {
      setHighlightedRowId(null);
    }, 4000);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Delete Mutasi Masuk (Admin Only)
  const handleDeleteMutasi = (id: string, nama: string) => {
    if (!isAdmin) {
      alert('Hanya akun Admin yang memiliki hak akses untuk menghapus data mutasi.');
      return;
    }

    const itemToDelete = mutasiMasukList.find(item => item.id === id);
    if (!window.confirm(`Yakin ingin menghapus data mutasi masuk atas nama "${nama}"?`)) return;

    const updated = mutasiMasukList.filter(item => item.id !== id);
    setMutasiMasukList(updated);
    safeSetItem('dapodik_cached_mutasi_masuk', updated);

    if (appConfig?.webAppUrl && itemToDelete?.nisn) {
      deleteMutasiMasukDirectly(appConfig.webAppUrl, { nisn: itemToDelete.nisn })
        .catch(err => console.warn('Latar belakang hapus dari spreadsheet:', err));
    }

    setNotification({
      type: 'info',
      message: `Data mutasi siswa "${nama}" telah dihapus.`
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Quick Toggle Status (Admin Only)
  const handleQuickToggleStatus = (item: MutasiMasukItem) => {
    if (!isAdmin) return;
    const newStatus: 'Pending' | 'Diterima' = item.status === 'Diterima' ? 'Pending' : 'Diterima';
    const updatedItem: MutasiMasukItem = {
      ...item,
      status: newStatus,
      verval_oleh: currentUserName,
      vervalOleh: currentUserName,
      keterangan: newStatus === 'Diterima' ? 'Mutasi Masuk Disetujui' : 'Pengajuan Mutasi Masuk (Pending Verifikasi)'
    };

    const updatedList = mutasiMasukList.map(m => m.id === item.id ? updatedItem : m);
    setMutasiMasukList(updatedList);
    safeSetItem('dapodik_cached_mutasi_masuk', updatedList);

    if (newStatus === 'Diterima' && onAddStudentToActive) {
      const alreadyActive = students.some(s => s.nisn === updatedItem.nisn);
      if (!alreadyActive) {
        const newStudent: Student = {
          id: `STU-MUT-${Date.now().toString().slice(-4)}`,
          nama: updatedItem.nama,
          kelas: updatedItem.rombelTujuan,
          nipd: `${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`,
          nisn: updatedItem.nisn,
          jk: 'L',
          tempatLahir: updatedItem.kabKotaNama ? updatedItem.kabKotaNama.replace(/KABUPATEN |KOTA /g, '') : 'Palopo',
          tanggalLahir: '2008-01-01',
          agama: 'Islam',
          alamat: `Kec. ${updatedItem.kecamatanNama}, ${updatedItem.kabKotaNama}, Prov. ${updatedItem.provinsiNama}`,
          ayah: '-',
          ibu: '-',
          statusRegistrasi: 'Pindahan',
          status: 'Aktif',
          verval_oleh: currentUserName,
          vervalOleh: currentUserName,
          sekolahAsal: updatedItem.sekolahAsal,
          tanggalMasuk: updatedItem.tanggalPengajuan || new Date().toISOString().split('T')[0]
        };
        onAddStudentToActive(newStudent);
      }
    }

    if (appConfig?.webAppUrl) {
      saveMutasiMasukDirectly(appConfig.webAppUrl, updatedItem, true)
        .catch(err => console.warn('Latar belakang perbarui status di spreadsheet:', err));
    }

    setNotification({
      type: 'success',
      message: `Status mutasi siswa "${item.nama}" telah diubah menjadi "${newStatus}".`
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Quick Toggle Status Mutasi Keluar (Admin Only: Selesai <-> Diproses)
  const handleQuickToggleKeluarStatus = (item: MutasiKeluarItem) => {
    if (!isAdmin) return;
    const newStatus: 'Selesai' | 'Diproses' = item.status === 'Selesai' ? 'Diproses' : 'Selesai';
    const updatedItem: MutasiKeluarItem = {
      ...item,
      status: newStatus,
      verval_oleh: currentUserName,
      vervalOleh: currentUserName
    };

    const updatedList = mutasiKeluarList.map(m => m.id === item.id ? updatedItem : m);
    setMutasiKeluarList(updatedList);
    safeSetItem('dapodik_cached_mutasi_keluar', updatedList);

    if (appConfig?.webAppUrl) {
      saveMutasiKeluarDirectly(appConfig.webAppUrl, updatedItem, true)
        .catch(err => console.warn('Gagal sinkron status mutasi keluar ke spreadsheet:', err));
    }

    setNotification({
      type: 'success',
      message: `Status mutasi keluar untuk "${item.nama}" telah diubah menjadi "${newStatus}".`
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Manual Refresh from Spreadsheet
  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      if (appConfig) {
        const remoteData = await fetchMutasiMasukDirectly(appConfig);
        if (Array.isArray(remoteData)) {
          setMutasiMasukList(remoteData);
          safeSetItem('dapodik_cached_mutasi_masuk', remoteData);
          setNotification({
            type: 'success',
            message: `Berhasil menyinkronkan ${remoteData.length} data mutasi dari spreadsheet.`
          });
        }
      }
    } catch (err) {
      setNotification({
        type: 'info',
        message: 'Gagal menyinkronkan data dari Google Sheets. Menggunakan data tersimpan.'
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setNotification(null), 3500);
    }
  };

  // Filtered List Mutasi Masuk (Disortir tanggal terbaru berada pada awal / Z-A)
  const filteredMutasiMasuk = useMemo(() => {
    return mutasiMasukList
      .filter(item => {
        const matchSearch = 
          item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.nisn.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sekolahAsal.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.rombelTujuan.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.provinsiNama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.kabKotaNama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.kecamatanNama || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchRombel = filterRombel === 'ALL' || item.rombelTujuan === filterRombel;
        const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;

        return matchSearch && matchRombel && matchStatus;
      })
      .sort((a, b) => {
        const timeA = parseDateToTimestamp(a.tglMasuk || a.tanggalPengajuan, a.timestamp, a.createdAt);
        const timeB = parseDateToTimestamp(b.tglMasuk || b.tanggalPengajuan, b.timestamp, b.createdAt);
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      });
  }, [mutasiMasukList, searchQuery, filterRombel, filterStatus]);

  // Paginated List Mutasi Masuk
  const totalPagesMasuk = Math.ceil(filteredMutasiMasuk.length / itemsPerPage) || 1;
  const paginatedMutasiMasuk = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMutasiMasuk.slice(start, start + itemsPerPage);
  }, [filteredMutasiMasuk, currentPage, itemsPerPage]);

  // Manual Refresh Mutasi Keluar from Spreadsheet
  const handleRefreshKeluar = async () => {
    setIsSyncingKeluar(true);
    try {
      if (appConfig) {
        const remoteData = await fetchMutasiKeluarDirectly(appConfig);
        if (Array.isArray(remoteData)) {
          setMutasiKeluarList(remoteData);
          safeSetItem('dapodik_cached_mutasi_keluar', remoteData);
          setNotification({
            type: 'success',
            message: `Berhasil menyinkronkan ${remoteData.length} data mutasi keluar dari spreadsheet.`
          });
        }
      }
    } catch (err) {
      setNotification({
        type: 'info',
        message: 'Gagal menyinkronkan data mutasi keluar dari Google Sheets. Menggunakan data lokal.'
      });
    } finally {
      setIsSyncingKeluar(false);
      setTimeout(() => setNotification(null), 3500);
    }
  };

  // Reset Form Mutasi Keluar
  const resetKeluarForm = () => {
    setEditingKeluarItem(null);
    setSelectedStudentForKeluar('');
    setStudentSearchQuery('');
    setIsStudentDropdownOpen(false);
    setFormKeluarData({
      nipd: '',
      nisn: '',
      nama: '',
      tempatLahir: '',
      tglLahir: '',
      rombel: '',
      ketMutasi: 'Mutasi',
      pindahKe: '',
      tglMutasi: new Date().toISOString().split('T')[0],
      alasanMutasi: '',
      uploadBerkas: '',
      status: isAdmin ? 'Selesai' : 'Diproses'
    });
    setSelectedBerkasFile(null);
    setIsUploadingBerkas(false);
    setBerkasUploadError(null);
    setIsManualLinkMode(false);
    setUploadedFileName('');
    setIsDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormKeluarError(null);
    setIsFormKeluarOpen(false);
  };

  // Open Form for Adding New Mutasi Keluar
  const handleOpenAddKeluarForm = () => {
    setEditingKeluarItem(null);
    setSelectedStudentForKeluar('');
    setStudentSearchQuery('');
    setIsStudentDropdownOpen(false);
    setOldBerkasUrlToReplace('');
    setFormKeluarData({
      nipd: '',
      nisn: '',
      nama: '',
      tempatLahir: '',
      tglLahir: '',
      rombel: '',
      ketMutasi: 'Mutasi',
      pindahKe: '',
      tglMutasi: new Date().toISOString().split('T')[0],
      alasanMutasi: '',
      uploadBerkas: '',
      status: isAdmin ? 'Selesai' : 'Diproses'
    });
    setSelectedBerkasFile(null);
    setIsUploadingBerkas(false);
    setBerkasUploadError(null);
    setIsManualLinkMode(false);
    setUploadedFileName('');
    setIsDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormKeluarError(null);
    setIsFormKeluarOpen(true);
    setTimeout(() => {
      formKeluarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Open Form for Editing Mutasi Keluar
  const handleStartEditKeluar = (item: MutasiKeluarItem) => {
    setEditingKeluarItem(item);
    setSelectedStudentForKeluar('');
    setStudentSearchQuery(item.nama || '');
    setIsStudentDropdownOpen(false);
    setOldBerkasUrlToReplace(item.uploadBerkas || '');
    setFormKeluarData({
      nipd: item.nipd || '',
      nisn: item.nisn || '',
      nama: item.nama || '',
      tempatLahir: item.tempatLahir || '',
      tglLahir: item.tglLahir ? parseToYYYYMMDD(item.tglLahir) : '',
      rombel: item.rombel || '',
      ketMutasi: item.ketMutasi || 'Mutasi',
      pindahKe: item.pindahKe || '',
      tglMutasi: item.tglMutasi ? parseToYYYYMMDD(item.tglMutasi) : new Date().toISOString().split('T')[0],
      alasanMutasi: item.alasanMutasi || '',
      uploadBerkas: item.uploadBerkas || '',
      status: isAdmin ? (item.status === 'Diproses' ? 'Diproses' : 'Selesai') : 'Diproses'
    });
    setSelectedBerkasFile(null);
    setIsUploadingBerkas(false);
    setBerkasUploadError(null);
    setIsManualLinkMode(Boolean(item.uploadBerkas && !item.uploadBerkas.includes('drive.google.com')));
    setUploadedFileName(item.uploadBerkas ? generateMutasiBerkasFileName(item.nisn, item.nama) : '');
    setIsDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormKeluarError(null);
    setIsFormKeluarOpen(true);
    setTimeout(() => {
      formKeluarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Nama file yang diformat otomatis: nisn_nama.ext (contoh: 0106762079_ABDUL_RIFAI.pdf)
  const previewDriveFileName = useMemo(() => {
    if (!selectedBerkasFile) return '';
    return generateMutasiBerkasFileName(formKeluarData.nisn, formKeluarData.nama, selectedBerkasFile.name);
  }, [selectedBerkasFile, formKeluarData.nisn, formKeluarData.nama]);

  const handleBerkasFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBerkasUploadError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        setBerkasUploadError('Ukuran berkas melebihi batas maksimal (25MB).');
        return;
      }
      setSelectedBerkasFile(file);
    }
  };

  const handleClearUploadedBerkas = () => {
    if (formKeluarData.uploadBerkas) {
      setOldBerkasUrlToReplace(formKeluarData.uploadBerkas);
    }
    setFormKeluarData(prev => ({ ...prev, uploadBerkas: '' }));
    setSelectedBerkasFile(null);
    setUploadedFileName('');
    setBerkasUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Searchable Active Students for Mutasi Keluar Auto-fill (hanya siswa aktif)
  const matchingStudents = useMemo(() => {
    const activeStudents = students.filter(
      s => !s.status || s.status.toLowerCase().trim() !== 'tidak aktif'
    );
    const q = studentSearchQuery.trim().toLowerCase();
    if (!q) {
      return activeStudents.slice(0, 15);
    }
    return activeStudents.filter(s => {
      const matchNama = (s.nama || '').toLowerCase().includes(q);
      const matchNisn = (s.nisn || '').includes(q);
      const matchNipd = (s.nipd || '').toLowerCase().includes(q);
      const matchKelas = (s.kelas || '').toLowerCase().includes(q);
      return matchNama || matchNisn || matchNipd || matchKelas;
    }).slice(0, 20);
  }, [students, studentSearchQuery]);

  // Handle outside click to close student dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (studentSearchContainerRef.current && !studentSearchContainerRef.current.contains(e.target as Node)) {
        setIsStudentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick Select Student to populate Mutasi Keluar form
  const handleSelectStudentForKeluar = (stu: Student) => {
    setSelectedStudentForKeluar(stu.id);
    setStudentSearchQuery(stu.nama);
    setIsStudentDropdownOpen(false);
    setFormKeluarData(prev => ({
      ...prev,
      nipd: stu.nipd || prev.nipd,
      nisn: stu.nisn || prev.nisn,
      nama: stu.nama || prev.nama,
      tempatLahir: stu.tempatLahir || prev.tempatLahir,
      tglLahir: stu.tanggalLahir ? parseToYYYYMMDD(stu.tanggalLahir) : prev.tglLahir,
      rombel: stu.kelas || prev.rombel
    }));
  };

  // Clear selected student from quick selector
  const handleClearSelectedStudent = () => {
    setSelectedStudentForKeluar('');
    setStudentSearchQuery('');
    setIsStudentDropdownOpen(false);
  };

  // Submit Mutasi Keluar Form
  const handleSubmitKeluarForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKeluarData.nama.trim()) {
      setFormKeluarError('Silakan pilih siswa dari data aktif di atas terlebih dahulu');
      return;
    }
    if (!formKeluarData.rombel.trim()) {
      setFormKeluarError('Data rombel siswa belum terisi otomatis. Silakan pilih siswa aktif di atas.');
      return;
    }

    // Validasi Wajib Alasan Mutasi
    if (!formKeluarData.alasanMutasi.trim()) {
      setFormKeluarError('Alasan mutasi / keterangan keluar wajib diisi.');
      return;
    }

    // Validasi Wajib Upload Berkas untuk Mutasi Keluar
    const hasBerkas = !!selectedBerkasFile || !!formKeluarData.uploadBerkas.trim();
    if (!hasBerkas) {
      setFormKeluarError('Berkas mutasi keluar wajib diunggah (silakan upload file surat permohonan / rekomendasi mutasi atau masukkan tautan berkas).');
      return;
    }

    setIsSavingKeluar(true);
    setFormKeluarError(null);

    let finalUploadBerkas = formKeluarData.uploadBerkas.trim();

    // Jika ada file berkas baru yang dipilih, lakukan unggah otomatis dan gantikan berkas lama di Drive jika ada
    if (selectedBerkasFile && formKeluarData.nisn && formKeluarData.nama) {
      try {
        setIsUploadingBerkas(true);
        const oldUrlToReplace = oldBerkasUrlToReplace || (editingKeluarItem?.uploadBerkas && editingKeluarItem.uploadBerkas !== finalUploadBerkas ? editingKeluarItem.uploadBerkas : '');
        const upRes = await uploadMutasiBerkasToDrive(
          selectedBerkasFile,
          formKeluarData.nisn,
          formKeluarData.nama,
          appConfig?.webAppUrl,
          oldUrlToReplace
        );
        if (upRes.success && upRes.fileUrl) {
          finalUploadBerkas = upRes.fileUrl;
          setOldBerkasUrlToReplace('');
        } else {
          setIsSavingKeluar(false);
          setIsUploadingBerkas(false);
          setBerkasUploadError(upRes.message || 'Gagal mengunggah berkas ke Google Drive. Pastikan izin Drive telah aktif.');
          return;
        }
      } catch (upErr: any) {
        setIsSavingKeluar(false);
        setIsUploadingBerkas(false);
        setBerkasUploadError(upErr?.message || 'Gagal mengunggah berkas saat menyimpan');
        return;
      } finally {
        setIsUploadingBerkas(false);
      }
    }

    const textTglMutasi = formKeluarData.tglMutasi ? formatToDDMMYYYY(formKeluarData.tglMutasi) : formatToDDMMYYYY(new Date());
    const textTglLahir = formKeluarData.tglLahir ? formatToDDMMYYYY(formKeluarData.tglLahir) : '';
    const nowTimestamp = `${formatToDDMMYYYY(new Date())} ${new Date().toTimeString().split(' ')[0]}`;

    // Status Mutasi Keluar hanya 2: 'Selesai' dan 'Diproses'.
    // Jika user yang input data, maka otomatis status tersimpan 'Diproses'.
    const finalKeluarStatus = isAdmin
      ? (formKeluarData.status.trim() === 'Diproses' ? 'Diproses' : 'Selesai')
      : 'Diproses';

    const finalPindahKe = formKeluarData.ketMutasi === 'Mutasi'
      ? formKeluarData.pindahKe.trim()
      : '-';

    let targetItem: MutasiKeluarItem;
    let updatedList: MutasiKeluarItem[];

    if (editingKeluarItem) {
      targetItem = {
        ...editingKeluarItem,
        nipd: formKeluarData.nipd.trim(),
        nisn: formKeluarData.nisn.trim(),
        nama: formKeluarData.nama.trim(),
        tempatLahir: formKeluarData.tempatLahir.trim(),
        tglLahir: textTglLahir,
        rombel: formKeluarData.rombel.trim(),
        ketMutasi: formKeluarData.ketMutasi.trim(),
        pindahKe: finalPindahKe,
        tglMutasi: textTglMutasi,
        alasanMutasi: formKeluarData.alasanMutasi.trim(),
        uploadBerkas: finalUploadBerkas,
        status: finalKeluarStatus,
        verval_oleh: currentUserName,
        vervalOleh: currentUserName,
        timestamp: editingKeluarItem.timestamp || nowTimestamp
      };
      updatedList = mutasiKeluarList.map(m => m.id === editingKeluarItem.id ? targetItem : m);
    } else {
      const nextNo = (mutasiKeluarList.length > 0 ? Math.max(...mutasiKeluarList.map(m => Number(m.no) || 0)) : 0) + 1;
      targetItem = {
        id: `MUT-OUT-${Date.now()}`,
        no: nextNo,
        nipd: formKeluarData.nipd.trim(),
        nisn: formKeluarData.nisn.trim(),
        nama: formKeluarData.nama.trim(),
        tempatLahir: formKeluarData.tempatLahir.trim(),
        tglLahir: textTglLahir,
        rombel: formKeluarData.rombel.trim(),
        ketMutasi: formKeluarData.ketMutasi.trim(),
        pindahKe: finalPindahKe,
        tglMutasi: textTglMutasi,
        alasanMutasi: formKeluarData.alasanMutasi.trim(),
        uploadBerkas: finalUploadBerkas,
        status: finalKeluarStatus,
        verval_oleh: currentUserName,
        vervalOleh: currentUserName,
        timestamp: nowTimestamp
      };
      updatedList = [targetItem, ...mutasiKeluarList];
    }

    setMutasiKeluarList(updatedList);
    safeSetItem('dapodik_cached_mutasi_keluar', updatedList);

    // Otomatis ubah status siswa menjadi 'Tidak Aktif' dan header ket di sheet data
    // terisi sesuai yang diinput di form mutasi keluar (Mutasi, Mengundurkan Diri, dsb.)
    if (onUpdateStudentStatus && (targetItem.nisn || targetItem.nipd || targetItem.nama)) {
      try {
        await onUpdateStudentStatus(
          targetItem.nisn || '',
          targetItem.nipd || '',
          targetItem.nama || '',
          'Tidak Aktif',
          targetItem.ketMutasi || 'Mutasi',
          currentUserName
        );
      } catch (stuErr) {
        console.warn('Gagal otomatis memperbarui status siswa menjadi Tidak Aktif:', stuErr);
      }
    }

    // Sync directly to Google Sheets sheet "mutasi_keluar"
    try {
      const saveRes = await saveMutasiKeluarDirectly(appConfig?.webAppUrl || '', targetItem, !!editingKeluarItem);
      if (saveRes.success) {
        console.log('Tersimpan di sheet mutasi_keluar:', saveRes.message);
      }
    } catch (err) {
      console.warn('Simpan ke spreadsheet gagal:', err);
    }

    // Kirim notifikasi Telegram otomatis untuk data mutasi keluar baru
    if (!editingKeluarItem) {
      notifyMutasiKeluar(targetItem, telegramConfig, appConfig?.webAppUrl)
        .then(tRes => {
          if (tRes.success) {
            console.log('[Telegram] Notifikasi mutasi keluar terkirim:', tRes.message);
          }
        })
        .catch(tErr => console.warn('[Telegram] Gagal mengirim notifikasi mutasi keluar:', tErr));
    }

    resetKeluarForm();
    setIsSavingKeluar(false);
    setHighlightedRowId(targetItem.id);
    setTimeout(() => {
      setHighlightedRowId(null);
    }, 4000);

    setNotification({
      type: 'success',
      title: 'Berhasil Simpan Mutasi Keluar',
      message: editingKeluarItem
        ? `Data mutasi keluar siswa "${targetItem.nama}" berhasil diperbarui. Status siswa diatur Tidak Aktif (${targetItem.ketMutasi || 'Mutasi'}).`
        : `Data mutasi keluar siswa "${targetItem.nama}" berhasil disimpan. Siswa otomatis dinonaktifkan di sheet data (status: Tidak Aktif, ket: ${targetItem.ketMutasi || 'Mutasi'}) dan tidak lagi ditampilkan di daftar absen.`
    });
    setTimeout(() => setNotification(null), 4500);
  };

  // Open Delete Confirmation Modal for Mutasi Keluar
  const handleRequestDeleteKeluar = (item: MutasiKeluarItem) => {
    setDeleteKeluarTarget(item);
  };

  // Confirm Delete Mutasi Keluar & associated Google Drive file
  const handleConfirmDeleteKeluar = async () => {
    if (!deleteKeluarTarget) return;
    const itemToDelete = deleteKeluarTarget;
    const hasDriveFile = Boolean(
      itemToDelete.uploadBerkas &&
      (itemToDelete.uploadBerkas.includes('drive.google.com') || itemToDelete.uploadBerkas.includes('id='))
    );

    setIsDeletingTarget(true);

    const updatedList = mutasiKeluarList.filter(m => m.id !== itemToDelete.id);
    setMutasiKeluarList(updatedList);
    safeSetItem('dapodik_cached_mutasi_keluar', updatedList);

    // Otomatis kembalikan status siswa menjadi 'Aktif' dan keterangan dikosongkan
    if (onUpdateStudentStatus && (itemToDelete.nisn || itemToDelete.nipd || itemToDelete.nama)) {
      try {
        await onUpdateStudentStatus(
          itemToDelete.nisn || '',
          itemToDelete.nipd || '',
          itemToDelete.nama || '',
          'Aktif',
          ''
        );
      } catch (stuErr) {
        console.warn('Gagal mengembalikan status siswa menjadi Aktif:', stuErr);
      }
    }

    try {
      await deleteMutasiKeluarDirectly(appConfig?.webAppUrl || '', {
        nisn: itemToDelete.nisn,
        nipd: itemToDelete.nipd,
        uploadBerkas: itemToDelete.uploadBerkas,
        nama: itemToDelete.nama
      });

      setNotification({
        type: 'info',
        title: 'Data & Berkas Dihapus',
        message: hasDriveFile
          ? `Data mutasi keluar "${itemToDelete.nama}" beserta berkas di Google Drive berhasil dihapus.`
          : `Data mutasi keluar "${itemToDelete.nama}" berhasil dihapus.`
      });
    } catch (err) {
      console.warn('Latar belakang hapus mutasi_keluar & berkas:', err);
      setNotification({
        type: 'info',
        title: 'Penghapusan Berhasil',
        message: `Data mutasi keluar "${itemToDelete.nama}" telah dihapus.`
      });
    } finally {
      setIsDeletingTarget(false);
      setDeleteKeluarTarget(null);
      setTimeout(() => setNotification(null), 3500);
    }
  };

  // Export Excel (.xlsx) for Mutasi Keluar with all 15 official headers
  const handleExportKeluarExcel = () => {
    const headers = [
      'No',
      'NIPD',
      'NISN',
      'Nama',
      'Tempat_Lahir',
      'tgl_Lahir',
      'Rombel',
      'Ket_Mutasi',
      'Pindah_Ke',
      'tgl_mutasi',
      'alasan_mutasi',
      'upload_berkas',
      'Status',
      'verval_oleh',
      'Timestamp'
    ];

    const rows = filteredMutasiKeluar.map((item, idx) => [
      idx + 1,
      item.nipd || '',
      item.nisn || '',
      item.nama || '',
      item.tempatLahir || '',
      item.tglLahir || '',
      item.rombel || '',
      item.ketMutasi || '',
      item.pindahKe || '',
      item.tglMutasi || '',
      item.alasanMutasi || '',
      item.uploadBerkas || '',
      item.status || 'Selesai',
      item.verval_oleh || item.vervalOleh || '',
      item.timestamp || ''
    ]);

    const worksheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'mutasi_keluar');
    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Mutasi_Keluar_SMKN1_Palopo_${todayStr}.xlsx`);
  };

  // Filtered Mutasi Keluar from mutasiKeluarList (Disortir tanggal terbaru berada pada awal / Z-A)
  const filteredMutasiKeluar = useMemo(() => {
    return mutasiKeluarList
      .filter(item => {
        const q = keluarSearchQuery.toLowerCase();
        const matchSearch = 
          (item.nama || '').toLowerCase().includes(q) ||
          (item.nisn || '').toLowerCase().includes(q) ||
          (item.nipd || '').toLowerCase().includes(q) ||
          (item.rombel || '').toLowerCase().includes(q) ||
          (item.pindahKe || '').toLowerCase().includes(q) ||
          (item.alasanMutasi || '').toLowerCase().includes(q) ||
          (item.ketMutasi || '').toLowerCase().includes(q);

        const matchRombel = filterKeluarRombel === 'ALL' || item.rombel === filterKeluarRombel;
        const matchStatus = filterKeluarStatus === 'ALL' || item.status === filterKeluarStatus;
        const matchKet = filterKeluarKet === 'ALL' || item.ketMutasi === filterKeluarKet;

        return matchSearch && matchRombel && matchStatus && matchKet;
      })
      .sort((a, b) => {
        const timeA = parseDateToTimestamp(a.tglMutasi, a.timestamp, a.createdAt);
        const timeB = parseDateToTimestamp(b.tglMutasi, b.timestamp, b.createdAt);
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      });
  }, [mutasiKeluarList, keluarSearchQuery, filterKeluarRombel, filterKeluarStatus, filterKeluarKet]);

  const totalPagesKeluar = Math.ceil(filteredMutasiKeluar.length / itemsPerPage) || 1;
  const paginatedMutasiKeluar = useMemo(() => {
    const start = (keluarCurrentPage - 1) * itemsPerPage;
    return filteredMutasiKeluar.slice(start, start + itemsPerPage);
  }, [filteredMutasiKeluar, keluarCurrentPage, itemsPerPage]);

  // Export CSV
  const handleExportData = () => {
    const headers = ['No', 'NISN', 'Nama Siswa', 'Provinsi Asal', 'Kab/Kota Asal', 'Kecamatan Asal', 'Sekolah Asal', 'Rombel Tujuan', 'Tgl Masuk', 'Status', 'verval_oleh'];
    const rows = filteredMutasiMasuk.map((item, idx) => [
      idx + 1,
      `'${item.nisn}`,
      item.nama,
      item.provinsiNama || '',
      item.kabKotaNama || '',
      item.kecamatanNama || '',
      item.sekolahAsal || '',
      item.rombelTujuan || '',
      formatToDDMMYYYY(item.tglMasuk || item.timestamp || item.tanggalPengajuan || ''),
      item.status,
      item.verval_oleh || item.vervalOleh || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Mutasi_Masuk_SMKN1_Palopo_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP TAB NAVIGATION (MUTASI MASUK & MUTASI KELUAR) */}
      <div className="bg-white border border-slate-300 rounded-xl p-2 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Tab Mutasi Masuk */}
          <button
            type="button"
            id="tab-mutasi-masuk"
            onClick={() => {
              setActiveTab('masuk');
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'masuk'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Mutasi Masuk</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'masuk' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {mutasiMasukList.length}
            </span>
          </button>

          {/* Tab Mutasi Keluar */}
          <button
            type="button"
            id="tab-mutasi-keluar"
            onClick={() => {
              setActiveTab('keluar');
              setKeluarCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'keluar'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <UserMinus className="w-4 h-4" />
            <span>Mutasi Keluar</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'keluar' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {mutasiKeluarList.length}
            </span>
          </button>
        </div>

        {/* Right Action & Quick Info */}
        <div className="flex items-center gap-2.5">
          {/* Tombol Pengaturan Notifikasi Telegram (Hanya Tampil untuk Admin) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsTelegramModalOpen(true)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                telegramConfig.enabled
                  ? 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100 hover:border-sky-400'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:text-slate-800'
              }`}
              title="Pengaturan Notifikasi Bot Telegram (Admin)"
            >
              <Send className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden sm:inline">Notifikasi Telegram</span>
              <span className="sm:hidden">Telegram</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  telegramConfig.enabled
                    ? 'bg-emerald-500 ring-2 ring-emerald-200 animate-pulse'
                    : 'bg-slate-300'
                }`}
                title={telegramConfig.enabled ? 'Telegram: Aktif' : 'Telegram: Nonaktif'}
              />
            </button>
          )}

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 pr-1">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Pengelolaan Mutasi Peserta Didik SMKN 1 Palopo</span>
          </div>
        </div>
      </div>

      {/* Floating Toast Notification (Always visible anywhere on the page) */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 max-w-md w-[calc(100vw-2.5rem)] sm:w-auto animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-auto">
          <div className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 border ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20'
              : 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-900/20'
          }`}>
            <div className="p-1.5 rounded-full bg-white/20 shrink-0 mt-0.5">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 pr-2">
              <p className="font-bold text-sm tracking-tight">
                {notification.title || (notification.type === 'success' ? 'Berhasil Simpan Data' : 'Informasi')}
              </p>
              <p className="text-xs text-emerald-50 mt-0.5 leading-relaxed">
                {notification.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Notification Inline Banner */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm shadow-2xs transition-all border ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-blue-50 border-blue-300 text-blue-900'
        }`}>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                <span>{notification.title || (notification.type === 'success' ? 'Berhasil Simpan Data' : 'Informasi')}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                  Sukses
                </span>
              </div>
              <span className="font-medium text-emerald-800 text-xs sm:text-sm mt-0.5 block">{notification.message}</span>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: MUTASI MASUK VIEW */}
      {activeTab === 'masuk' && (
        <div className="space-y-6">
          {/* FORM INPUT BANNER & COLLAPSIBLE FORM (Matching GTKPangkatView.tsx) */}
          <div ref={formRef} className="bg-white border border-slate-300 rounded-xl shadow-2xs overflow-hidden">
            {/* Gradient Header Bar */}
            <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold tracking-tight">
                      {editingItem ? 'Edit Data Mutasi Masuk Peserta Didik' : 'Form Input Mutasi Masuk Peserta Didik'}
                    </h2>
                    {isAdmin ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white border border-white/30">
                        Admin
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/25 text-amber-200 border border-amber-400/40">
                        Pending (User)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-indigo-200">
                    {editingItem ? 'Perbarui data siswa mutasi masuk yang dipilih' : 'Tambahkan data siswa mutasi masuk baru ke sistem Dapodik'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isFormOpen && (
                  <button
                    type="button"
                    id="btn-buka-form-mutasi"
                    onClick={handleOpenAddForm}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white text-indigo-800 hover:bg-indigo-50 font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buka Form Input</span>
                  </button>
                )}
                {isFormOpen && (
                  <button
                    type="button"
                    id="btn-tutup-form-mutasi"
                    onClick={resetForm}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Tutup Form</span>
                  </button>
                )}
              </div>
            </div>

            {/* FORM BODY: Only rendered when isFormOpen === true */}
            {isFormOpen && (
              <form onSubmit={handleSubmitForm} className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 space-y-5 animate-in slide-from-top-2 duration-200">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Grid Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  {/* 1. NISN */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      NISN <span className="text-rose-500">*</span>
                      <span className="text-[10px] text-slate-400 ml-1 font-normal">(10 digit)</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={formData.nisn}
                      onChange={(e) => setFormData({ ...formData, nisn: e.target.value.replace(/\D/g, '') })}
                      placeholder="Contoh: 0071829301"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* 2. Nama Lengkap Siswa */}
                  <div className="lg:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Nama Lengkap Siswa <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nama}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      placeholder="Nama lengkap peserta didik sesuai ijazah/akta"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* 3. Rombel Tujuan */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Rombel Tujuan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.rombelTujuan}
                      onChange={(e) => setFormData({ ...formData, rombelTujuan: e.target.value })}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Pilih Rombel Tujuan --</option>
                      {availableRombelList.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Provinsi Asal */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Provinsi Sekolah Asal <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.provinsiId}
                      onChange={(e) => {
                        const prov = provinces.find(p => p.id === e.target.value);
                        setFormData({
                          ...formData,
                          provinsiId: e.target.value,
                          provinsiNama: prov?.name || '',
                          kabKotaId: '',
                          kabKotaNama: '',
                          kecamatanId: '',
                          kecamatanNama: ''
                        });
                      }}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Pilih Provinsi Sekolah Asal --</option>
                      {provinces.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 5. Kab/Kota Asal */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Kabupaten / Kota Asal
                    </label>
                    <select
                      disabled={!formData.provinsiId}
                      value={formData.kabKotaId}
                      onChange={(e) => {
                        const kab = regencies.find(k => k.id === e.target.value);
                        setFormData({
                          ...formData,
                          kabKotaId: e.target.value,
                          kabKotaNama: kab?.name || '',
                          kecamatanId: '',
                          kecamatanNama: ''
                        });
                      }}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Pilih Kab/Kota --</option>
                      {regencies.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 6. Kecamatan Asal */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Kecamatan Asal
                    </label>
                    <select
                      disabled={!formData.kabKotaId}
                      value={formData.kecamatanId}
                      onChange={(e) => {
                        const kec = districts.find(d => d.id === e.target.value);
                        setFormData({
                          ...formData,
                          kecamatanId: e.target.value,
                          kecamatanNama: kec?.name || ''
                        });
                      }}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Pilih Kecamatan --</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 7. Nama Sekolah Asal */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Nama Sekolah Asal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.sekolahAsal}
                      onChange={(e) => setFormData({ ...formData, sekolahAsal: e.target.value })}
                      placeholder="Contoh: SMA Negeri 1 Palopo"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* 8. Tanggal Masuk (Tgl Masuk) */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Tgl Masuk <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.tglMasuk}
                      onChange={(e) => setFormData({ ...formData, tglMasuk: e.target.value })}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Disimpan sebagai teks tanggal (DD/MM/YYYY)
                    </span>
                  </div>

                  {/* 9. Status Mutasi: Khusus Akun Admin */}
                  <div className="lg:col-span-3">
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Status Mutasi</span>
                      {!isAdmin && (
                        <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Hanya Admin yang dapat mengubah Status
                        </span>
                      )}
                    </label>
                    {isAdmin ? (
                      <div className="flex items-center gap-3">
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Pending' | 'Diterima' })}
                          className="px-3 py-2 bg-white rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer text-xs"
                        >
                          <option value="Pending">Pending (Menunggu Verifikasi)</option>
                          <option value="Diterima">Diterima (Disetujui Masuk Rombel)</option>
                        </select>
                        <span className="text-[11px] text-slate-500">
                          {formData.status === 'Diterima'
                            ? 'Siswa otomatis dimasukkan ke rombel tujuan dan berstatus aktif.'
                            : 'Proses Input ke Aplikasi Dapodik.'}
                        </span>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] text-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>
                            Status saat ini: <strong className={editingItem?.status === 'Diterima' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>{editingItem ? editingItem.status : 'Pending'}</strong> (Terkunci &bull; Hanya Admin yang dapat mengubah status)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300">
                          Terkunci
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Actions (Batal & Simpan) */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    id="btn-batal-form"
                    onClick={resetForm}
                    disabled={isSaving}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer text-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Batal</span>
                  </button>

                  <button
                    type="submit"
                    id="btn-submit-form"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer text-xs disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Menyimpan ke Spreadsheet...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{editingItem ? 'Simpan Perubahan' : 'Simpan Data Mutasi Masuk'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* TABEL DATA MUTASI MASUK - Clean Grid Style (Matching GTKPangkatView / Verval PD) */}
          <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden w-full">
            {/* Controls Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4 bg-slate-50/50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cari berdasarkan NISN, Nama, Sekolah Asal, Rombel..."
                    className="w-full pl-10 pr-9 py-2.5 bg-white rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter & Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filterRombel}
                    onChange={(e) => {
                      setFilterRombel(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs font-medium"
                  >
                    <option value="ALL">Semua Rombel</option>
                    {availableRombelList.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs font-medium"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="Diterima">Diterima</option>
                    <option value="Pending">Pending</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleOpenAddForm}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Mutasi Masuk</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isSyncing || isLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-2xs transition-colors shrink-0 cursor-pointer disabled:opacity-60"
                    title="Muat ulang data dari Google Sheets sheet 'mutasi_masuk'"
                  >
                    <RefreshCw className={`w-4 h-4 text-indigo-600 ${isSyncing || isLoading ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Memuat...' : 'Muat Ulang'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportData}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-xl border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                    title="Ekspor CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Ekspor CSV</span>
                  </button>
                </div>
              </div>

              {/* Counter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-xs">
                <span className="text-slate-500">
                  Menampilkan <strong>{filteredMutasiMasuk.length}</strong> dari <strong>{mutasiMasukList.length}</strong> mutasi masuk
                </span>
                <span className="text-slate-400 text-[11px]">
                  Tgl Masuk diambil dari timestamp sistem (Format Teks: DD/MM/YYYY)
                </span>
              </div>
            </div>

            {/* Table Content */}
            <div ref={tableContainerRef} className="overflow-auto max-h-[calc(100vh-260px)] min-h-[360px] relative w-full border-t border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-20 shadow-xs">
                  <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 w-12 text-center border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">No</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[130px] border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">NISN</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-4 min-w-[200px] border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Nama Siswa</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[180px] border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Sekolah Asal</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[110px] text-center border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Rombel Tujuan</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[125px] text-center border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">
                      <span>Tgl Masuk</span>
                      <span className="block text-[10px] text-indigo-600 font-normal"></span>
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[100px] text-center border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Status</th>
                    {isAdmin && (
                      <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[120px] text-center border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Verval Oleh</th>
                    )}
                    <th className="sticky top-0 right-0 z-30 bg-slate-100 py-2.5 px-3 text-center shadow-xs w-24 border-l border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {paginatedMutasiMasuk.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-slate-500 italic">
                        <UserPlus className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                        <p className="font-semibold text-slate-600">Belum ada data mutasi masuk.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Klik tombol "Tambah Mutasi Masuk" untuk membuka form input data baru.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedMutasiMasuk.map((item, idx) => {
                      const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                      const isHighlighted = highlightedRowId === item.id;
                      // Ambil hanya tanggalnya saja dari header timestamp / tglMasuk (type data teks)
                      const tglMasukDateOnly = formatToDDMMYYYY(item.tglMasuk || item.timestamp || item.tanggalPengajuan || '');

                      return (
                        <tr 
                          key={`row-mutasi-${item.id || idx}`}
                          className={`transition-colors border-b border-slate-200 ${
                            isHighlighted 
                              ? 'bg-emerald-50/90 ring-2 ring-emerald-500 font-medium' 
                              : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-500 border-r border-slate-200 font-medium">
                            <div className="flex items-center justify-center gap-1">
                              <span>{itemIndex}</span>
                              {isHighlighted && (
                                <span className="px-1.5 py-0.5 bg-emerald-600 text-white font-bold text-[9px] rounded-md tracking-wider animate-pulse flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  BARU
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                            {item.nisn || '-'}
                          </td>

                          <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200">
                            {item.nama}
                          </td>

                          <td className="py-2.5 px-3 text-slate-800 border-r border-slate-200">
                            <div className="font-medium text-slate-900">{item.sekolahAsal || '-'}</div>
                            {(item.kabKotaNama || item.kecamatanNama) && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {item.kecamatanNama ? `Kec. ${item.kecamatanNama}, ` : ''}{item.kabKotaNama || ''}
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center font-medium text-slate-800 border-r border-slate-200">
                            {item.rombelTujuan || '-'}
                          </td>

                          {/* Header Tgl Masuk: isikan datanya dari header timestamp, ambil tanggalnya saja jadi data yang disimpan type datanya adalah teks */}
                          <td className="py-2.5 px-3 text-center font-medium text-slate-800 border-r border-slate-200 text-xs">
                            {tglMasukDateOnly || '-'}
                          </td>

                          <td className="py-2.5 px-3 text-center border-r border-slate-200">
                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleQuickToggleStatus(item)}
                                className="font-medium text-slate-800 hover:underline cursor-pointer"
                                title="Klik untuk ubah status mutasi"
                              >
                                {item.status}
                              </button>
                            ) : (
                              <span className="font-medium text-slate-800">
                                {item.status}
                              </span>
                            )}
                          </td>

                          {isAdmin && (
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 text-xs font-medium text-slate-700">
                              {item.verval_oleh || item.vervalOleh || '-'}
                            </td>
                          )}

                          <td className="py-2.5 px-3 text-center sticky right-0 bg-white shadow-xs border-l border-slate-200">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedDetail(item)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Lihat Detail Mutasi"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Data Mutasi"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMutasi(item.id, item.nama)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Data Mutasi"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {totalPagesMasuk > 1 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                <span>
                  Halaman <strong>{currentPage}</strong> dari <strong>{totalPagesMasuk}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Sebelumnya</span>
                  </button>

                  {Array.from({ length: Math.min(5, totalPagesMasuk) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={`page-${pageNum}`}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={currentPage === totalPagesMasuk}
                    onClick={() => setCurrentPage(p => Math.min(totalPagesMasuk, p + 1))}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                  >
                    <span>Selanjutnya</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MUTASI KELUAR VIEW */}
      {activeTab === 'keluar' && (
        <div className="space-y-6">
          {/* FORM INPUT BANNER & COLLAPSIBLE FORM FOR MUTASI KELUAR */}
          <div ref={formKeluarRef} className="bg-white border border-slate-300 rounded-xl shadow-2xs overflow-hidden">
            {/* Gradient Header Bar (Identik dengan Mutasi Masuk) */}
            <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                  <UserMinus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold tracking-tight">
                      {editingKeluarItem ? 'Edit Data Mutasi Keluar Peserta Didik' : 'Form Input Mutasi Keluar Peserta Didik'}
                    </h2>
                    {isAdmin ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white border border-white/30">
                        Admin
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/25 text-amber-200 border border-amber-400/40">
                        Pending (User)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-indigo-200">
                    {editingKeluarItem ? 'Perbarui data siswa mutasi keluar yang dipilih' : 'Tambahkan data siswa mutasi keluar baru ke sistem Dapodik'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isFormKeluarOpen && (
                  <button
                    type="button"
                    id="btn-buka-form-mutasi-keluar"
                    onClick={handleOpenAddKeluarForm}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white text-indigo-800 hover:bg-indigo-50 font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buka Form Input</span>
                  </button>
                )}
                {isFormKeluarOpen && (
                  <button
                    type="button"
                    id="btn-tutup-form-mutasi-keluar"
                    onClick={resetKeluarForm}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Tutup Form</span>
                  </button>
                )}
              </div>
            </div>

            {/* FORM BODY: Rendered when isFormKeluarOpen === true */}
            {isFormKeluarOpen && (
              <form onSubmit={handleSubmitKeluarForm} className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 space-y-5 animate-in slide-from-top-2 duration-200">
                {formKeluarError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{formKeluarError}</span>
                  </div>
                )}

                {/* Searchable Quick Student Selector from Active Students */}
                <div ref={studentSearchContainerRef} className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-xs space-y-2 relative">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      <span>Pilih Siswa dari Data Aktif (Ketik Nama / NISN / NIPD):</span>
                    </label>
                    <span className="text-[10px] text-indigo-600 font-medium">
                      Ketik nama atau NISN, lalu klik siswa untuk mengisi form otomatis
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      id="input-cari-siswa-keluar"
                      value={studentSearchQuery}
                      onChange={(e) => {
                        setStudentSearchQuery(e.target.value);
                        setIsStudentDropdownOpen(true);
                      }}
                      onFocus={() => setIsStudentDropdownOpen(true)}
                      placeholder="Ketik nama siswa, NISN, atau NIPD... (contoh: 007..., Rahmat, atau nama rombel)"
                      className="w-full pl-9 pr-9 py-2 bg-white rounded-lg border border-slate-300 font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs shadow-2xs"
                    />
                    {studentSearchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSelectedStudent}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
                        title="Hapus pencarian siswa"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Autocomplete Dropdown List */}
                    {isStudentDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-300 rounded-xl shadow-xl z-40 max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                        {matchingStudents.length > 0 ? (
                          <div>
                            <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-semibold text-slate-500 flex justify-between items-center sticky top-0 border-b border-slate-100">
                              <span>
                                {studentSearchQuery.trim()
                                  ? `Hasil pencarian (${matchingStudents.length} siswa ditemukan)`
                                  : `Daftar Siswa Aktif (${matchingStudents.length} siswa)`}
                              </span>
                              <span className="text-[9px] text-slate-400">Klik siswa untuk mengisi</span>
                            </div>
                            {matchingStudents.map((stu) => {
                              const isSelected = selectedStudentForKeluar === stu.id;
                              return (
                                <button
                                  key={stu.id}
                                  type="button"
                                  onClick={() => handleSelectStudentForKeluar(stu)}
                                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-indigo-50/80 transition-colors cursor-pointer ${
                                    isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-slate-800 text-xs">
                                        {stu.nama}
                                      </span>
                                      {stu.kelas && (
                                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-100 text-indigo-700 shrink-0">
                                          {stu.kelas}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5 flex-wrap">
                                      <span className="font-mono">
                                        NISN: <strong className="text-slate-700">{stu.nisn || '-'}</strong>
                                      </span>
                                      {stu.nipd && (
                                        <span className="font-mono">
                                          NIPD: <strong className="text-slate-700">{stu.nipd}</strong>
                                        </span>
                                      )}
                                      {(stu.tempatLahir || stu.tanggalLahir) && (
                                        <span className="text-slate-400 font-sans hidden sm:inline text-[10px]">
                                          {stu.tempatLahir}{stu.tempatLahir && stu.tanggalLahir ? ', ' : ''}{stu.tanggalLahir || ''}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {isSelected ? (
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-semibold flex items-center gap-1 shrink-0">
                                      <Check className="w-3 h-3 text-indigo-600" />
                                      <span>Terpilih</span>
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-indigo-600 hover:underline font-medium shrink-0">
                                      Pilih &rarr;
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-500 space-y-1">
                            <p className="font-semibold text-slate-700">Tidak ada siswa yang cocok</p>
                            <p className="text-[11px] text-slate-400">
                              Tidak ditemukan siswa dengan kata kunci "{studentSearchQuery}". Anda dapat mengisi data formulir secara manual di bawah.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Active Selection Indicator */}
                  {selectedStudentForKeluar && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px]">
                      <div className="flex items-center gap-2 truncate">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          Data terisi otomatis: <strong>{formKeluarData.nama}</strong> ({formKeluarData.rombel} &bull; NISN: {formKeluarData.nisn || '-'})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelectedStudent}
                        className="text-emerald-700 hover:text-emerald-900 font-bold underline shrink-0 ml-2 cursor-pointer text-[10px]"
                      >
                        Ganti / Hapus
                      </button>
                    </div>
                  )}
                </div>

                {/* Grid Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  {/* 1. NIPD - Disabled */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>NIPD</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Terkunci / Otomatis)</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={formKeluarData.nipd}
                      placeholder="Terisi otomatis..."
                      className="w-full px-3 py-2 bg-slate-100 text-slate-600 rounded-lg border border-slate-300 font-mono cursor-not-allowed select-none focus:outline-hidden"
                    />
                  </div>

                  {/* 2. NISN - Disabled */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>NISN</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Terkunci / Otomatis)</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={formKeluarData.nisn}
                      placeholder="Terisi otomatis..."
                      className="w-full px-3 py-2 bg-slate-100 text-slate-600 rounded-lg border border-slate-300 font-mono cursor-not-allowed select-none focus:outline-hidden"
                    />
                  </div>

                  {/* 3. Nama Lengkap Peserta Didik - Disabled */}
                  <div className="lg:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Nama Lengkap Peserta Didik</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Terkunci / Otomatis)</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={formKeluarData.nama}
                      placeholder="Pilih siswa pada pencarian di atas untuk mengisi data..."
                      className="w-full px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-300 cursor-not-allowed select-none focus:outline-hidden"
                    />
                  </div>

                  {/* 4. Tempat Lahir - Disabled */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Tempat Lahir</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Terkunci)</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={formKeluarData.tempatLahir}
                      placeholder="Terisi otomatis..."
                      className="w-full px-3 py-2 bg-slate-100 text-slate-600 rounded-lg border border-slate-300 cursor-not-allowed select-none focus:outline-hidden"
                    />
                  </div>

                  {/* 5. Tanggal Lahir - Disabled */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Tanggal Lahir</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">(Terkunci)</span>
                    </label>
                    <input
                      type="date"
                      disabled
                      readOnly
                      value={formKeluarData.tglLahir}
                      className="w-full px-3 py-2 bg-slate-100 text-slate-600 rounded-lg border border-slate-300 font-mono cursor-not-allowed select-none focus:outline-hidden"
                    />
                  </div>

                  {/* 6. Rombel Asal / Terakhir - Disabled */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Rombel Asal</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Terkunci)</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={formKeluarData.rombel}
                      placeholder="Terisi otomatis..."
                      className="w-full px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-300 cursor-not-allowed select-none focus:outline-hidden"
                    />
                  </div>

                  {/* 7. Keterangan / Jenis Mutasi - Dropdown */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Keterangan Mutasi <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formKeluarData.ketMutasi}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormKeluarData(prev => ({
                          ...prev,
                          ketMutasi: val,
                          pindahKe: val === 'Mutasi' ? (prev.pindahKe === '-' ? '' : prev.pindahKe) : ''
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                    >
                      <option value="Mutasi">Mutasi</option>
                      <option value="Dikeluarkan">Dikeluarkan</option>
                      <option value="Mengundurkan Diri">Mengundurkan Diri</option>
                      <option value="Putus Sekolah">Putus Sekolah</option>
                      <option value="Wafat">Wafat</option>
                      <option value="Hilang">Hilang</option>
                    </select>
                  </div>

                  {/* 8. Pindah Ke (Tujuan) - Hanya bisa diisi jika Keterangan adalah "Mutasi" */}
                  <div className="lg:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>
                        Pindah Ke (Sekolah / Daerah Tujuan) {formKeluarData.ketMutasi === 'Mutasi' && <span className="text-rose-500">*</span>}
                      </span>
                      {formKeluarData.ketMutasi !== 'Mutasi' && (
                        <span className="text-[10px] text-slate-400 font-normal italic flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Hanya aktif jika keterangan "Mutasi"
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      required={formKeluarData.ketMutasi === 'Mutasi'}
                      disabled={formKeluarData.ketMutasi !== 'Mutasi'}
                      value={formKeluarData.ketMutasi === 'Mutasi' ? formKeluarData.pindahKe : ''}
                      onChange={(e) => setFormKeluarData(prev => ({ ...prev, pindahKe: e.target.value }))}
                      placeholder={formKeluarData.ketMutasi === 'Mutasi' ? "Contoh: SMKN 2 Makassar / Pindah Domisili ke Luar Kota" : "Tidak berlaku (Bukan Mutasi)"}
                      className={`w-full px-3 py-2 rounded-lg border transition-colors shadow-2xs ${
                        formKeluarData.ketMutasi !== 'Mutasi'
                          ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed select-none placeholder:text-slate-400'
                          : 'bg-white border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500'
                      }`}
                    />
                  </div>

                  {/* 9. Tanggal Mutasi */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Tanggal Mutasi <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formKeluarData.tglMutasi}
                      onChange={(e) => setFormKeluarData(prev => ({ ...prev, tglMutasi: e.target.value }))}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Disimpan format DD/MM/YYYY
                    </span>
                  </div>

                  {/* 10. Status Mutasi */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Status Mutasi</span>
                      {!isAdmin && (
                        <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Hanya Admin
                        </span>
                      )}
                    </label>
                    {isAdmin ? (
                      <select
                        value={formKeluarData.status}
                        onChange={(e) => setFormKeluarData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                      >
                        <option value="Selesai">Selesai (Sudah Keluar Dapodik)</option>
                        <option value="Diproses">Diproses (Sedang Diproses)</option>
                      </select>
                    ) : (
                      <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] text-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Status: <strong className="text-amber-700 font-semibold">Diproses</strong> (Otomatis)</span>
                        </div>
                        <span className="text-[10px] text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded font-medium border border-slate-300">Terkunci</span>
                      </div>
                    )}
                  </div>

                  {/* 11. Alasan Mutasi */}
                  <div className="lg:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Alasan Mutasi / Keterangan Keluar <span className="text-rose-500">*</span></span>
                      <span className="text-[11px] text-rose-500 font-medium">(Wajib Diisi)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formKeluarData.alasanMutasi}
                      onChange={(e) => setFormKeluarData(prev => ({ ...prev, alasanMutasi: e.target.value }))}
                      placeholder="Contoh: Mengikuti kepindahan tugas orang tua / Mengundurkan diri..."
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>

                  {/* 12. Upload Berkas Pendukung ke Google Drive */}
                  <div className="lg:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <label className="block font-semibold text-slate-700 text-xs">
                        Upload Berkas Pendukung (Surat Permohonan / Rekomendasi Mutasi) <span className="text-rose-600 font-bold">* (Wajib Diunggah)</span>
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        {isAdmin && (
                          <a
                            href={`https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID_MUTASI_KELUAR}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100/80 px-2 py-0.5 rounded-md transition-colors"
                            title="Buka Folder Penyimpanan di Google Drive"
                          >
                            <Folder className="w-3 h-3 text-indigo-500" />
                            <span>Folder Drive: <code className="font-mono text-[10px]">1sGqbpA6...</code></span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsManualLinkMode(!isManualLinkMode)}
                          className="text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors cursor-pointer"
                        >
                          {isManualLinkMode ? 'Mode Upload File' : 'Input Link Manual'}
                        </button>
                      </div>
                    </div>

                    {/* Hidden Native File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleBerkasFileChange}
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      className="hidden"
                    />

                    {/* A. If Already has uploaded berkas (URL Drive) */}
                    {formKeluarData.uploadBerkas ? (
                      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-emerald-900 truncate">
                                  {uploadedFileName || previewDriveFileName || 'Berkas Mutasi Tersimpan di Google Drive'}
                                </span>
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium">
                                  Folder: {DRIVE_FOLDER_ID_MUTASI_KELUAR.slice(0, 10)}...
                                </span>
                              </div>
                              <p className="text-[11px] text-emerald-700 truncate max-w-md mt-0.5 font-mono">
                                {formKeluarData.uploadBerkas}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {formKeluarData.uploadBerkas.startsWith('http') && (
                              <a
                                href={formKeluarData.uploadBerkas}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                              >
                                <span>Buka di Drive</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={handleClearUploadedBerkas}
                              className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                              title="Hapus atau ganti berkas"
                            >
                              Ganti / Hapus
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] text-emerald-600/90 pt-1 border-t border-emerald-100 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>Nama file tersimpan dengan format: <strong>nisn_nama</strong> ({formKeluarData.nisn || 'NISN'}_{formKeluarData.nama.trim().toUpperCase().replace(/[\s\W]+/g, '_') || 'NAMA'})</span>
                        </div>
                      </div>
                    ) : isManualLinkMode ? (
                      /* B. Manual Link Mode */
                      <div className="space-y-1.5">
                        <div className="relative">
                          <input
                            type="text"
                            value={formKeluarData.uploadBerkas}
                            onChange={(e) => setFormKeluarData(prev => ({ ...prev, uploadBerkas: e.target.value }))}
                            placeholder="Tempelkan link Google Drive (https://drive.google.com/file/d/...)"
                            className={`w-full pl-8 pr-3 py-2 bg-white rounded-lg border ${!formKeluarData.uploadBerkas.trim() ? 'border-amber-300' : 'border-slate-300'} text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs`}
                          />
                          <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-rose-600 font-medium">* Berkas wajib diisi atau beralih ke Mode Upload File</span>
                          {isAdmin && (
                            <span className="text-slate-500">
                              Drive Folder ID: <code className="font-mono text-slate-700">{DRIVE_FOLDER_ID_MUTASI_KELUAR}</code>
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* C. File Upload Zone (Drag & Drop + Click) */
                      <div className="space-y-2">
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                          onDragLeave={() => setIsDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              const f = e.dataTransfer.files[0];
                              if (f.size > 25 * 1024 * 1024) {
                                setBerkasUploadError('Ukuran file melebihi 25MB');
                                return;
                              }
                              setSelectedBerkasFile(f);
                              setBerkasUploadError(null);
                            }
                          }}
                          className={`relative border-2 border-dashed rounded-xl p-3.5 transition-all text-center cursor-pointer ${
                            isDragOver 
                              ? 'border-indigo-500 bg-indigo-50/60' 
                              : selectedBerkasFile 
                                ? 'border-indigo-300 bg-indigo-50/20' 
                                : 'border-rose-300 hover:border-indigo-400 bg-rose-50/20 hover:bg-slate-50/70'
                          }`}
                          onClick={() => {
                            if (!selectedBerkasFile && fileInputRef.current) {
                              fileInputRef.current.click();
                            }
                          }}
                        >
                          {!selectedBerkasFile ? (
                            <div className="flex flex-col items-center justify-center py-1">
                              <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-1.5">
                                <Upload className="w-4 h-4" />
                              </div>
                              <p className="text-xs font-semibold text-slate-800">
                                Klik untuk memilih berkas atau seret file ke sini <span className="text-rose-600 font-bold">* (Wajib)</span>
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Format didukung: PDF, PNG, JPG, JPEG, DOCX (Maks. 25MB)
                              </p>
                              <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded-full border border-rose-200">
                                <span>* Wajib Upload Berkas Mutasi Keluar</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 text-left" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 truncate">
                                      {selectedBerkasFile.name}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      {(selectedBerkasFile.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedBerkasFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                  }}
                                  className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer"
                                  title="Ganti file"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Preview File Name & Destination */}
                              <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-lg space-y-1">
                                <div className="flex items-center justify-between gap-1 text-[11px]">
                                  <span className="text-slate-600">Nama file di Google Drive:</span>
                                  <span className="font-mono font-semibold text-indigo-800 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                                    {previewDriveFileName}
                                  </span>
                                </div>
                                {isAdmin && (
                                  <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500">
                                    <span>Tujuan Folder:</span>
                                    <span className="font-mono text-slate-700">1sGqbpA6uctgvOmYUwyxNP8pC5ORZUy56</span>
                                  </div>
                                )}
                                {(!formKeluarData.nisn || !formKeluarData.nama) && (
                                  <p className="text-[11px] text-amber-700 font-medium pt-1">
                                    ⚠️ Harap isi NISN dan Nama siswa di atas terlebih dahulu agar nama file tersusun otomatis.
                                  </p>
                                )}
                                {(oldBerkasUrlToReplace || (editingKeluarItem?.uploadBerkas && editingKeluarItem.uploadBerkas !== formKeluarData.uploadBerkas)) && (
                                  <div className="flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                    <span>
                                      <strong>Penggantian Berkas:</strong> Berkas lama siswa di Google Drive akan otomatis dihapus dan digantikan oleh file baru ini, sehingga tidak ada nama file ganda di Google Drive.
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 font-medium pt-1">
                                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span>Berkas akan otomatis diunggah ke Google Drive saat Anda menekan tombol <strong>Simpan Data</strong> di bawah.</span>
                                </div>
                              </div>

                              {/* File Change Controls */}
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (fileInputRef.current) fileInputRef.current.click();
                                  }}
                                  disabled={isSavingKeluar}
                                  className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Ganti File
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedBerkasFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                  }}
                                  disabled={isSavingKeluar}
                                  className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Batalkan File
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {berkasUploadError && (
                          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-2">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div className="font-medium leading-relaxed">{berkasUploadError}</div>
                            </div>
                            {(berkasUploadError.toLowerCase().includes('izin') || berkasUploadError.toLowerCase().includes('permission') || berkasUploadError.toLowerCase().includes('drive')) && (
                              <div className="bg-white/90 p-2.5 rounded-lg border border-rose-200 text-[11px] text-slate-700 space-y-1.5 mt-1.5 shadow-xs">
                                <div className="font-bold text-rose-900 flex items-center gap-1">
                                  <span>Panduan Singkat Aktivasi Izin Drive di Google Apps Script:</span>
                                </div>
                                <ol className="list-decimal pl-4 space-y-1 leading-normal text-slate-700">
                                  <li>Buka editor Google Apps Script proyek Spreadsheet Anda.</li>
                                  <li>Di toolbar atas, pilih fungsi <strong>authorizeDrive</strong> lalu klik <strong>Jalankan (Run)</strong>.</li>
                                  <li>Klik <strong>Tinjau Izin</strong> &gt; Pilih Akun Google &gt; <strong>Lanjutan</strong> &gt; <strong>Buka (tidak aman)</strong> &gt; <strong>Izinkan</strong>.</li>
                                  <li>Klik tombol biru <strong>Terapkan (Deploy)</strong> &gt; <strong>Kelola Penerapan</strong> &gt; Edit &gt; Pilih <strong>Versi Baru</strong> &gt; Klik <strong>Terapkan</strong>.</li>
                                </ol>
                                <div className="pt-1 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setShowScriptModal(true)}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded border border-indigo-200 transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <Code className="w-3 h-3" />
                                    <span>Buka & Salin Script Apps Script Terbaru</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Actions (Batal & Simpan) */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    id="btn-batal-form-keluar"
                    onClick={resetKeluarForm}
                    disabled={isSavingKeluar}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer text-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Batal</span>
                  </button>

                  <button
                    type="submit"
                    id="btn-submit-form-keluar"
                    disabled={isSavingKeluar}
                    className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer text-xs disabled:opacity-50"
                  >
                    {isSavingKeluar ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>{isUploadingBerkas ? 'Mengunggah Berkas & Menyimpan...' : 'Menyimpan ke Spreadsheet...'}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>
                          {selectedBerkasFile
                            ? (editingKeluarItem ? 'Unggah Berkas & Simpan Perubahan' : 'Unggah Berkas & Simpan Data')
                            : (editingKeluarItem ? 'Simpan Perubahan' : 'Simpan Data Mutasi Keluar')}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Clean Grid Table Mutasi Keluar */}
          <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden w-full">
            {/* Controls Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4 bg-slate-50/50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={keluarSearchQuery}
                    onChange={(e) => {
                      setKeluarSearchQuery(e.target.value);
                      setKeluarCurrentPage(1);
                    }}
                    placeholder="Cari NIPD, NISN, Nama Siswa, Rombel, Pindah Ke, Alasan..."
                    className="w-full pl-10 pr-9 py-2.5 bg-white rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500 shadow-2xs placeholder:text-slate-400"
                  />
                  {keluarSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setKeluarSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Actions: Refresh, Ekspor Excel, Tambah Mutasi */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshKeluar}
                    disabled={isSyncingKeluar}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-2xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                    title="Sinkronkan data dari sheet mutasi_keluar"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isSyncingKeluar ? 'animate-spin' : ''}`} />
                    <span>{isSyncingKeluar ? 'Menyinkronkan...' : 'Refresh Sheet'}</span>
                  </button>

                  {/* <button
                    type="button"
                    onClick={handleExportKeluarExcel}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl border border-emerald-600 shadow-2xs transition-colors shrink-0 cursor-pointer"
                    title="Ekspor data mutasi keluar ke file Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Ekspor Excel</span>
                  </button> */}

                  <button
                    type="button"
                    onClick={handleOpenAddKeluarForm}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Mutasi Keluar</span>
                  </button>
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/80 text-xs">
                <span className="font-semibold text-slate-500 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </span>

                {/* Filter Rombel */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-medium">Rombel:</span>
                  <select
                    value={filterKeluarRombel}
                    onChange={(e) => {
                      setFilterKeluarRombel(e.target.value);
                      setKeluarCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="ALL">Semua Rombel</option>
                    {availableRombelList.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Jenis Mutasi */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-medium">Jenis:</span>
                  <select
                    value={filterKeluarKet}
                    onChange={(e) => {
                      setFilterKeluarKet(e.target.value);
                      setKeluarCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="ALL">Semua Jenis</option>
                    <option value="Mutasi">Mutasi</option>
                    <option value="Dikeluarkan">Dikeluarkan</option>
                    <option value="Mengundurkan Diri">Mengundurkan Diri</option>
                    <option value="Putus Sekolah">Putus Sekolah</option>
                    <option value="Wafat">Wafat</option>
                    <option value="Hilang">Hilang</option>
                  </select>
                </div>

                {/* Filter Status */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-medium">Status:</span>
                  <select
                    value={filterKeluarStatus}
                    onChange={(e) => {
                      setFilterKeluarStatus(e.target.value);
                      setKeluarCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Diproses">Diproses</option>
                  </select>
                </div>

                {(filterKeluarRombel !== 'ALL' || filterKeluarKet !== 'ALL' || filterKeluarStatus !== 'ALL' || keluarSearchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterKeluarRombel('ALL');
                      setFilterKeluarKet('ALL');
                      setFilterKeluarStatus('ALL');
                      setKeluarSearchQuery('');
                      setKeluarCurrentPage(1);
                    }}
                    className="text-rose-600 hover:text-rose-800 font-bold underline px-2 py-1 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}

                <div className="ml-auto text-slate-500">
                  Menampilkan <strong className="text-slate-900">{filteredMutasiKeluar.length}</strong> dari {mutasiKeluarList.length} data
                </div>
              </div>
            </div>

            {/* Table Content - Clean Biodata Style */}
            <div className="overflow-auto max-h-[calc(100vh-260px)] min-h-[360px] relative w-full border-t border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-20 shadow-xs">
                  <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 w-12 text-center border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">No</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[100px] border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">NIPD</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[110px] border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">NISN</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-4 min-w-[190px] border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Nama Peserta Didik</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[150px] border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Tempat, Tgl Lahir</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[95px] text-center border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Rombel</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[130px] border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Ket. Mutasi</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[160px] border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Pindah Ke (Tujuan)</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[115px] text-center border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">
                      <span>Tgl Mutasi</span>
                      <span className="block text-[10px] text-indigo-600 font-normal"></span>
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[160px] border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Alasan Mutasi</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[80px] text-center border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Berkas</th>
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[90px] text-center border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Status</th>
                    {isAdmin && (
                      <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 min-w-[120px] text-center border-r border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Verval Oleh</th>
                    )}
                    <th className="sticky top-0 z-10 bg-slate-100 py-2.5 px-3 text-center min-w-[95px] border-b border-slate-300 shadow-[inset_0_-1px_0_rgba(203,213,225,1)]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
                  {paginatedMutasiKeluar.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 14 : 13} className="py-12 text-center text-slate-500 italic">
                        <UserMinus className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                        <p className="font-semibold text-slate-700">Tidak ada catatan siswa mutasi keluar</p>
                        <p className="text-xs text-slate-400 mt-1">Gunakan tombol "Catat Mutasi Keluar" atau "Refresh Sheet" untuk menyinkronkan data.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedMutasiKeluar.map((item, idx) => {
                      const itemIndex = (keluarCurrentPage - 1) * itemsPerPage + idx + 1;
                      const hasLink = item.uploadBerkas && item.uploadBerkas.trim().startsWith('http');
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors border-b border-slate-200">
                          <td className="py-2.5 px-3 text-center text-slate-500 font-medium border-r border-slate-200">
                            {itemIndex}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">
                            {item.nipd || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium border-r border-slate-200">
                            {item.nisn || '-'}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900 border-r border-slate-200">
                            {item.nama}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200 text-xs">
                            {item.tempatLahir ? `${item.tempatLahir}, ` : ''}{item.tglLahir || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-800 border-r border-slate-200">
                            {item.rombel || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                            {item.ketMutasi || 'Mutasi'}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                            {item.pindahKe || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center text-xs text-slate-700 border-r border-slate-200">
                            {item.tglMutasi || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200 max-w-[180px]">
                            <span className="truncate block" title={item.alasanMutasi}>
                              {item.alasanMutasi || '-'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-200">
                            {hasLink ? (
                              <a
                                href={item.uploadBerkas}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-semibold hover:underline"
                                title="Buka berkas di tab baru"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Berkas</span>
                              </a>
                            ) : item.uploadBerkas ? (
                              <span className="text-slate-600 text-xs truncate max-w-[80px] block" title={item.uploadBerkas}>
                                {item.uploadBerkas}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-200">
                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleQuickToggleKeluarStatus(item)}
                                className="font-medium text-slate-800 hover:underline cursor-pointer"
                                title="Klik untuk ubah status mutasi (Selesai / Diproses)"
                              >
                                {item.status === 'Diproses' ? 'Diproses' : 'Selesai'}
                              </button>
                            ) : (
                              <span className="font-medium text-slate-800">
                                {item.status === 'Diproses' ? 'Diproses' : 'Selesai'}
                              </span>
                            )}
                          </td>

                          {isAdmin && (
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 text-xs font-medium text-slate-700">
                              {item.verval_oleh || item.vervalOleh || '-'}
                            </td>
                          )}

                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedKeluarDetail(item)}
                                className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Lihat Detail Lengkap"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditKeluar(item)}
                                className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Data Mutasi Keluar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRequestDeleteKeluar(item)}
                                className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Data & Berkas di Folder Drive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {totalPagesKeluar > 1 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                <span>
                  Halaman <strong>{keluarCurrentPage}</strong> dari <strong>{totalPagesKeluar}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={keluarCurrentPage === 1}
                    onClick={() => setKeluarCurrentPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Sebelumnya</span>
                  </button>

                  <button
                    type="button"
                    disabled={keluarCurrentPage === totalPagesKeluar}
                    onClick={() => setKeluarCurrentPage(p => Math.min(totalPagesKeluar, p + 1))}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                  >
                    <span>Selanjutnya</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL MUTASI KELUAR */}
      {selectedKeluarDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <UserMinus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Detail Mutasi Keluar Siswa</h3>
                  <p className="text-[11px] text-slate-500">Sheet: "mutasi_keluar" - Data Lengkap</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedKeluarDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="bg-rose-50/60 border border-rose-200/70 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Siswa:</span>
                  <span className="font-bold text-slate-900">{selectedKeluarDetail.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NIPD / NISN:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedKeluarDetail.nipd || '-'} / {selectedKeluarDetail.nisn || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rombel:</span>
                  <span className="font-semibold text-rose-700">{selectedKeluarDetail.rombel || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status Mutasi:</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedKeluarDetail.status === 'Selesai'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : selectedKeluarDetail.status === 'Diproses'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {selectedKeluarDetail.status === 'Selesai' ? (
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Clock className="w-3 h-3 text-blue-600" />
                    )}
                    <span>{selectedKeluarDetail.status || 'Selesai'}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Jenis Mutasi</span>
                  <span className="text-slate-800 font-medium">{selectedKeluarDetail.ketMutasi || 'Mutasi'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Sekolah / Daerah Tujuan</span>
                  <span className="text-slate-800 font-semibold">{selectedKeluarDetail.pindahKe || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Tempat & Tanggal Lahir</span>
                  <span className="text-slate-800 font-medium">
                    {selectedKeluarDetail.tempatLahir ? `${selectedKeluarDetail.tempatLahir}, ` : ''}{selectedKeluarDetail.tglLahir || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Tanggal Mutasi</span>
                  <span className="text-slate-800 font-mono font-medium">{selectedKeluarDetail.tglMutasi || '-'}</span>
                </div>
                {selectedKeluarDetail.alasanMutasi && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Alasan Mutasi</span>
                    <span className="text-slate-800 font-medium">{selectedKeluarDetail.alasanMutasi}</span>
                  </div>
                )}
                {selectedKeluarDetail.uploadBerkas && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Berkas Pendukung</span>
                    {selectedKeluarDetail.uploadBerkas.startsWith('http') ? (
                      <a
                        href={selectedKeluarDetail.uploadBerkas}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold hover:underline mt-0.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka Tautan Berkas</span>
                      </a>
                    ) : (
                      <span className="text-slate-800 font-medium">{selectedKeluarDetail.uploadBerkas}</span>
                    )}
                  </div>
                )}
                {selectedKeluarDetail.timestamp && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Timestamp Pencatatan</span>
                    <span className="text-slate-600 font-mono text-[11px]">{selectedKeluarDetail.timestamp}</span>
                  </div>
                )}
                {isAdmin && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Diverval Oleh</span>
                    <span className="text-slate-800 font-semibold">{selectedKeluarDetail.verval_oleh || selectedKeluarDetail.vervalOleh || '-'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    const item = selectedKeluarDetail;
                    setSelectedKeluarDetail(null);
                    handleStartEditKeluar(item);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Data</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKeluarDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS MUTASI KELUAR & BERKAS DRIVE */}
      {deleteKeluarTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-rose-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Hapus Data Mutasi Keluar</h3>
                  <p className="text-[11px] text-slate-500">Konfirmasi penghapusan data dan berkas</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  if (!isDeletingTarget) setDeleteKeluarTarget(null);
                }}
                disabled={isDeletingTarget}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <p className="text-xs text-slate-700">
                Apakah Anda yakin ingin menghapus data mutasi keluar untuk siswa berikut?
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Siswa:</span>
                  <span className="font-semibold text-slate-900">{deleteKeluarTarget.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NISN / NIPD:</span>
                  <span className="font-mono text-slate-700">{deleteKeluarTarget.nisn || '-'} / {deleteKeluarTarget.nipd || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pindah Ke:</span>
                  <span className="text-slate-700">{deleteKeluarTarget.pindahKe || '-'}</span>
                </div>
              </div>

              {deleteKeluarTarget.uploadBerkas && (deleteKeluarTarget.uploadBerkas.includes('drive.google.com') || deleteKeluarTarget.uploadBerkas.includes('id=')) ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Berkas di Google Drive Akan Ikut Terhapus</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Surat mutasi terkait yang tersimpan di Google Drive akan otomatis <strong>dihapus permanen</strong> dari folder agar kapasitas tetap bersih dan tidak ada file ganda.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Data ini tidak memiliki tautan berkas di Google Drive.
                </p>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingTarget) setDeleteKeluarTarget(null);
                }}
                disabled={isDeletingTarget}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteKeluar}
                disabled={isDeletingTarget}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeletingTarget ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus Data & Berkas...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Data & Berkas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Detail Mutasi Masuk Siswa</h3>
                  <p className="text-[11px] text-slate-500">Informasi lengkap data mutasi masuk</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="bg-indigo-50/60 border border-indigo-200/70 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Siswa:</span>
                  <span className="font-bold text-slate-900">{selectedDetail.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NISN:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedDetail.nisn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rombel Tujuan:</span>
                  <span className="font-semibold text-indigo-700">{selectedDetail.rombelTujuan}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status Mutasi:</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedDetail.status === 'Diterima'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {selectedDetail.status === 'Diterima' ? (
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Clock className="w-3 h-3 text-amber-600" />
                    )}
                    <span>{selectedDetail.status}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Sekolah Asal</span>
                  <span className="text-slate-800 font-medium">{selectedDetail.sekolahAsal || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Wilayah Asal</span>
                  <span className="text-slate-800 font-medium">
                    Kec. {selectedDetail.kecamatanNama || '-'}, {selectedDetail.kabKotaNama || '-'}, Prov. {selectedDetail.provinsiNama || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Tanggal Masuk (Tgl Masuk)</span>
                  <span className="text-slate-800 font-medium font-mono">
                    {formatToDDMMYYYY(selectedDetail.tglMasuk || selectedDetail.timestamp || selectedDetail.tanggalPengajuan || '') || '-'}
                  </span>
                </div>
                {selectedDetail.timestamp && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Timestamp Sistem</span>
                    <span className="text-slate-600 font-mono text-[11px]">{selectedDetail.timestamp}</span>
                  </div>
                )}
                {isAdmin && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Diverval Oleh</span>
                    <span className="text-slate-800 font-semibold">{selectedDetail.verval_oleh || selectedDetail.vervalOleh || '-'}</span>
                  </div>
                )}
                {selectedDetail.keterangan && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Keterangan Tambahan</span>
                    <span className="text-slate-800 font-medium">{selectedDetail.keterangan}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    const item = selectedDetail;
                    setSelectedDetail(null);
                    handleStartEdit(item);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Data</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Apps Script Modal for Drive Authorization & Sync */}
      <CodeGsModal
        isOpen={showScriptModal}
        onClose={() => setShowScriptModal(false)}
        webAppUrl={appConfig?.webAppUrl || ''}
        onSaveWebAppUrl={() => {}}
      />

      {/* Telegram Notification Settings Modal (Khusus Admin) */}
      {isAdmin && (
        <TelegramConfigModal
          isOpen={isTelegramModalOpen}
          onClose={() => setIsTelegramModalOpen(false)}
          onConfigSaved={(updatedCfg) => {
            setTelegramConfig(updatedCfg);
            setNotification({
              type: 'success',
              title: 'Pengaturan Telegram Disimpan',
              message: updatedCfg.enabled
                ? 'Notifikasi Telegram aktif! Bot siap mengirim informasi mutasi baru.'
                : 'Notifikasi Telegram dinonaktifkan.'
            });
            setTimeout(() => setNotification(null), 4000);
          }}
        />
      )}
    </div>
  );
};
