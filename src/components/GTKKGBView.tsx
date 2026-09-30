import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Search, 
  FileSpreadsheet, 
  Printer, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  RotateCcw, 
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  CloudUpload,
  Lock,
  Info,
  Eye,
  Sparkles,
  Send
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GTKData, RiwayatKGB, AppConfig, TelegramConfig } from '../types';
import { INITIAL_GTK_LIST } from '../data/initialGTK';
import { INITIAL_RIWAYAT_KGB, DAFTAR_GOLONGAN_PNS, DAFTAR_GOLONGAN_PPPK, DAFTAR_GOLONGAN_PANGKAT } from '../data/initialPangkatKGB';
import { fetchKGBDirectly, saveKGBDirectly, syncAllKGBDirectly, deleteKGBDirectly, formatToDDMMYYYY } from '../services/sheetsSync';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { formatDisplayDate, parseToYYYYMMDD, formatRupiah } from '../utils/dateUtils';
import { SyncSuccessModal, SavedDetailItem } from './SyncSuccessModal';
import { DuplicateWarningModal } from './DuplicateWarningModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { TelegramConfigModal } from './TelegramConfigModal';
import { isUserRole, isOwnerOfRecord } from '../utils/authUtils';
import { notifyKGBBaru, getTelegramConfig } from '../services/telegramService';

const STORAGE_KEY = 'smkn1_riwayat_kgb_data';

interface GTKKGBViewProps {
  gtkList?: GTKData[];
  appConfig?: AppConfig;
  currentUser?: GTKData | null;
}

export const GTKKGBView: React.FC<GTKKGBViewProps> = ({ 
  gtkList = INITIAL_GTK_LIST,
  currentUser,
  appConfig = {
    spreadsheetId: '1t_i5_kMDb00AT2uL0Km49_37CHJB2RWUv3tZjVgLlAk',
    sheetName: 'data',
    webAppUrl: 'https://script.google.com/macros/s/AKfycbxwfqpqePmp5mtpzeJSTHpiz0PxyqSbOA3hWw1Zy8Iofvi1lMIWxYeMllDNlmP-8RI/exec',
    autoSync: false,
    lastSyncedAt: new Date().toISOString()
  }
}) => {
  // State for Riwayat KGB data with safe persistence and validation against student data leakage
  const [riwayatList, setRiwayatList] = useState<RiwayatKGB[]>(() => {
    const cached = safeGetItem<any[]>(STORAGE_KEY, []);
    if (Array.isArray(cached) && cached.length > 0) {
      // Validate that it contains real KGB records, not student records
      const isStudentData = cached.some(item => item && (item.nipd || item.rombel || item.nisn || item.nama_ayah));
      const hasKGBFields = cached.some(item => item && (item.gajiPokok !== undefined || item.tmt || item.gol || item.noSk));
      if (!isStudentData && hasKGBFields) {
        return cached as RiwayatKGB[];
      }
    }
    return INITIAL_RIWAYAT_KGB;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Success Modal State
  const [successModalData, setSuccessModalData] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    actionType: 'create' | 'update' | 'syncAll';
    dataDetails: SavedDetailItem[];
    timestamp: string;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    actionType: 'create',
    dataDetails: [],
    timestamp: ''
  });

  // Duplicate Warning Modal State (NIP + Nomor SK + TMT)
  const [duplicateModalData, setDuplicateModalData] = useState<{
    isOpen: boolean;
    nip: string;
    nama: string;
    noSk: string;
    tmt: string;
    extraInfo?: string;
  }>({
    isOpen: false,
    nip: '',
    nama: '',
    noSk: '',
    tmt: '',
    extraInfo: ''
  });

  // Delete Confirmation Modal State (Reliable modal for iframes)
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    item: RiwayatKGB | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    item: null,
    isDeleting: false
  });

  // Telegram Bot Notification State
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    botToken: '',
    chatId: '',
    enabled: false,
    notifyMutasiMasuk: true,
    notifyMutasiKeluar: true,
    notifyPangkatBaru: true,
    notifyKGBBaru: true,
  });

  useEffect(() => {
    getTelegramConfig().then(setTelegramConfig).catch(() => {});
  }, []);

  // Save to safe storage
  useEffect(() => {
    safeSetItem(STORAGE_KEY, riwayatList);
  }, [riwayatList]);

  // Normalization and deduplication helper
  // A GTK can have multiple historical entries (riwayat) across different dates/SKs.
  // We only merge identical duplicate rows (same NIP + same SK + same TMT) caused by previous double-save bugs.
  const normalizeAndDeduplicateKGB = useCallback((items: any[]): RiwayatKGB[] => {
    const uniqueMap = new Map<string, RiwayatKGB>();
    items.forEach((item, idx) => {
      const noSk = (item.noSk || item.no_sk || item.nosk || '').trim();
      const nip = (item.nip || '').trim();
      const tmt = (item.tmt || item.TMT_kgb || item.tmt_kgb || item.tmtkgb || '').trim();
      const isPlaceholderSk = !noSk || noSk === '-' || noSk === '0';
      const key = nip
        ? `${nip}_${isPlaceholderSk ? 'nosk' : noSk}_${tmt || (item.timestamp || item.id || `row-${idx}`)}`
        : (item.id || `row-${idx}`);

      const normalized: RiwayatKGB = {
        id: item.id || `KGB-${nip ? nip + '-' : ''}${idx + 1}`,
        no: item.no || idx + 1,
        nip: nip,
        nama: (item.nama || '').trim(),
        gol: item.gol || item.golongan || '',
        noSk: noSk,
        tglSk: item.tglSk || item.tgl_sk || item.tglsk || '',
        tmt: tmt,
        masaKerjaThn: Number(item.masaKerjaThn !== undefined ? item.masaKerjaThn : (item.masa_kerja_tahun || item.masakerjatahun || 0)),
        masaKerjaBln: Number(item.masaKerjaBln !== undefined ? item.masaKerjaBln : (item.masa_kerja_bln || item.masakerjabln || 0)),
        gajiPokok: Number(item.gajiPokok !== undefined ? item.gajiPokok : (item.gaji_pokok || item.gajipokok || 0)),
        status: item.status || 'Aktif',
        timestamp: item.timestamp || '',
        keterangan: item.keterangan || '',
        createdAt: item.createdAt || ''
      };

      if (uniqueMap.has(key)) {
        const existing = uniqueMap.get(key)!;
        const existingScore = (existing.tglSk ? 1 : 0) + (existing.tmt ? 1 : 0) + (existing.gajiPokok ? 1 : 0);
        const newScore = (normalized.tglSk ? 1 : 0) + (normalized.tmt ? 1 : 0) + (normalized.gajiPokok ? 1 : 0);
        if (newScore >= existingScore) {
          uniqueMap.set(key, normalized);
        }
      } else {
        uniqueMap.set(key, normalized);
      }
    });
    return Array.from(uniqueMap.values());
  }, []);

  // Fetch from Google Sheets or API on load
  const loadKGBData = useCallback(async (force = false) => {
    setIsLoading(true);
    try {
      // 1. Try Backend API
      const res = await fetch(`/api/kgb${force ? '?force=true' : ''}`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const json = await res.json();
        if (json && json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          setRiwayatList(normalizeAndDeduplicateKGB(json.data));
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend /api/kgb fetch error, trying client direct sync...', err);
    }

    // 2. Try Client Direct GViz/WebApp
    try {
      const directData = await fetchKGBDirectly(appConfig);
      if (directData && directData.length > 0) {
        setRiwayatList(normalizeAndDeduplicateKGB(directData));
      }
    } catch (err) {
      console.warn('Direct KGB fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [appConfig, normalizeAndDeduplicateKGB]);

  useEffect(() => {
    loadKGBData();
  }, [loadKGBData]);

  // UI state for form
  const isUser = isUserRole(currentUser);

  // If role is 'user', filter riwayat KGB strictly to records matching the user's NIP
  const effectiveRiwayatList = useMemo(() => {
    if (isUser && currentUser) {
      return riwayatList.filter((item) => isOwnerOfRecord(item.nip, item.nama, currentUser));
    }
    return riwayatList;
  }, [riwayatList, isUser, currentUser]);

  const effectiveGtkList = useMemo(() => {
    if (isUser && currentUser) {
      const filtered = gtkList.filter((g) => isOwnerOfRecord(g.nip, g.nama, currentUser));
      return filtered.length > 0 ? filtered : [currentUser];
    }
    return gtkList;
  }, [gtkList, isUser, currentUser]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // Form Fields matching header: No, nip, nama, gol, no_sk, tgl_sk, TMT_kgb, masa_kerja_tahun, masa_kerja_bln, gaji_pokok, timestamp, status
  const initialFormData = useMemo(() => {
    const isPppkUser = isUser && !!currentUser && (currentUser.statusKepegawaian || '').toUpperCase().includes('PPPK');
    let initialGol = isPppkUser ? 'IX' : 'III/a';
    if (isUser && currentUser?.pangkatGolongan) {
      const matchParen = currentUser.pangkatGolongan.match(/\(([^)]+)\)/);
      if (matchParen && matchParen[1]) {
        initialGol = matchParen[1].trim();
      } else if (currentUser.pangkatGolongan.includes(' - ')) {
        initialGol = currentUser.pangkatGolongan.split(' - ')[0].trim();
      }
    }
    if (isPppkUser && initialGol.includes('/')) {
      initialGol = 'IX';
    }
    return {
      no: '',
      nip: isUser && currentUser?.nip ? currentUser.nip : '',
      nama: isUser && currentUser?.nama ? currentUser.nama : '',
      gol: initialGol,
      noSk: '',
      tglSk: '',
      tmt: '',
      masaKerjaThn: 0,
      masaKerjaBln: 0,
      gajiPokok: 3000000,
      status: 'Proses',
      keterangan: ''
    };
  }, [isUser, currentUser]);

  const [formData, setFormData] = useState(initialFormData);

  // Automatically detect if the current GTK in form is PPPK
  const isPPPK = useMemo(() => {
    const matched = effectiveGtkList.find(g => 
      (formData.nip && g.nip && g.nip.trim() === formData.nip.trim()) ||
      (formData.nama && g.nama && g.nama.trim().toLowerCase() === formData.nama.trim().toLowerCase())
    );
    if (matched && matched.statusKepegawaian) {
      return matched.statusKepegawaian.toUpperCase().includes('PPPK');
    }
    if (isUser && currentUser?.statusKepegawaian) {
      return currentUser.statusKepegawaian.toUpperCase().includes('PPPK');
    }
    const cleanNip = (formData.nip || '').replace(/\s+/g, '');
    if (cleanNip.length === 18 && cleanNip.slice(12, 14) === '21') {
      return true;
    }
    if (formData.gol && DAFTAR_GOLONGAN_PPPK.includes(formData.gol.trim()) && !formData.gol.includes('/')) {
      return true;
    }
    return false;
  }, [formData.nip, formData.nama, formData.gol, effectiveGtkList, isUser, currentUser]);

  // Active Golongan choices: I s.d. XVII for PPPK, I/a s.d. IV/e for PNS
  const activeGolonganList = useMemo(() => {
    return isPPPK ? DAFTAR_GOLONGAN_PPPK : DAFTAR_GOLONGAN_PNS;
  }, [isPPPK]);

  // Sync initial form data when user mode changes
  useEffect(() => {
    if (!editingId) {
      setFormData(initialFormData);
    }
  }, [initialFormData, editingId]);

  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Format IDR Currency helper
  const formatRupiah = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val.replace(/[^\d]/g, '')) || 0 : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  // Quick select GTK handler
  const handleSelectGTK = (selectedVal: string) => {
    if (!selectedVal) {
      const isPppkUser = isUser && !!currentUser && (currentUser.statusKepegawaian || '').toUpperCase().includes('PPPK');
      setFormData(prev => ({ 
        ...prev, 
        nip: isUser && currentUser?.nip ? currentUser.nip : '', 
        nama: isUser && currentUser?.nama ? currentUser.nama : '',
        gol: isPppkUser ? 'IX' : 'III/a'
      }));
      return;
    }
    const gtk = effectiveGtkList.find(g => 
      (g.nip && g.nip.trim() === selectedVal.trim()) || 
      g.id === selectedVal || 
      g.nama === selectedVal
    );
    if (gtk) {
      const isPppk = (gtk.statusKepegawaian || '').toUpperCase().includes('PPPK') ||
        ((gtk.nip || '').replace(/\s+/g, '').length === 18 && (gtk.nip || '').replace(/\s+/g, '').slice(12, 14) === '21');

      let shortGol = gtk.pangkatGolongan || (isPppk ? 'IX' : 'III/a');
      const match = shortGol.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        shortGol = match[1].trim();
      }

      if (isPppk) {
        if (!DAFTAR_GOLONGAN_PPPK.includes(shortGol)) {
          shortGol = 'IX';
        }
      } else {
        if (!DAFTAR_GOLONGAN_PNS.includes(shortGol)) {
          shortGol = 'III/a';
        }
      }

      setFormData(prev => ({
        ...prev,
        nip: gtk.nip || '',
        nama: gtk.nama || '',
        gol: shortGol
      }));
    }
  };

  // Reset Form
  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setIsFormOpen(false);
  };

  // Start Edit
  const handleStartEdit = (item: RiwayatKGB) => {
    if (isUser && !isOwnerOfRecord(item.nip, item.nama, currentUser)) {
      setFeedbackMsg({
        type: 'error',
        text: 'Anda hanya dapat mengedit data riwayat KGB milik akun Anda sendiri.'
      });
      return;
    }

    setEditingId(item.id);
    const rawGol = (item.gol || (item as any).golongan || '').trim();
    const matchedGtk = effectiveGtkList.find(g => 
      (item.nip && g.nip && g.nip.trim() === item.nip.trim()) || 
      (item.nama && g.nama && g.nama.trim() === item.nama.trim())
    );
    const isPppk = (matchedGtk && (matchedGtk.statusKepegawaian || '').toUpperCase().includes('PPPK')) ||
      (DAFTAR_GOLONGAN_PPPK.includes(rawGol) && !rawGol.includes('/'));

    const rawTglSk = item.tglSk || (item as any).tgl_sk || (item as any).tglsk || '';
    const rawTmt = item.tmt || (item as any).TMT_kgb || (item as any).tmt_kgb || (item as any).tmtkgb || '';
    const rawGaji = item.gajiPokok !== undefined ? item.gajiPokok : ((item as any).gaji_pokok || (item as any).gajipokok || 0);
    const rawMasaThn = item.masaKerjaThn !== undefined ? item.masaKerjaThn : ((item as any).masa_kerja_tahun || (item as any).masakerjatahun || 0);
    const rawMasaBln = item.masaKerjaBln !== undefined ? item.masaKerjaBln : ((item as any).masa_kerja_bln || (item as any).masakerjabln || 0);

    setFormData({
      no: item.no ? String(item.no) : '',
      nip: item.nip || '',
      nama: item.nama || '',
      gol: rawGol || (isPppk ? 'IX' : 'III/a'),
      noSk: item.noSk || (item as any).no_sk || (item as any).nosk || '',
      tglSk: parseToYYYYMMDD(rawTglSk),
      tmt: parseToYYYYMMDD(rawTmt),
      masaKerjaThn: Number(rawMasaThn) || 0,
      masaKerjaBln: Number(rawMasaBln) || 0,
      gajiPokok: Number(rawGaji) || 0,
      status: item.status || 'Proses',
      keterangan: item.keterangan || ''
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Jump to and highlight an existing record in the table
  const handleJumpToRecord = (recordId: string) => {
    setSearchQuery('');
    setIsFormOpen(false);

    const targetIdx = effectiveRiwayatList.findIndex(r => r.id === recordId);
    if (targetIdx >= 0) {
      const targetPage = Math.floor(targetIdx / itemsPerPage) + 1;
      setCurrentPage(targetPage);
      setHighlightedRowId(recordId);
      setTimeout(() => setHighlightedRowId(null), 6000);

      setTimeout(() => {
        const el = document.getElementById(`row-kgb-${recordId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (tableContainerRef.current) {
          tableContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  };

  // Delete Item - Trigger Reliable Modal Dialog
  const handleDelete = (item: RiwayatKGB) => {
    if (isUser && !isOwnerOfRecord(item.nip, item.nama, currentUser)) {
      setFeedbackMsg({
        type: 'error',
        text: 'Anda hanya dapat menghapus data riwayat KGB milik akun Anda sendiri.'
      });
      return;
    }

    setDeleteModalState({
      isOpen: true,
      item,
      isDeleting: false
    });
  };

  // Confirm Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteModalState.item) return;
    const itemToDelete = deleteModalState.item;
    setDeleteModalState(prev => ({ ...prev, isDeleting: true }));

    try {
      // 1. Immediately remove from local state and storage
      setRiwayatList(prev => {
        const updated = prev.filter(r => r.id !== itemToDelete.id);
        safeSetItem(STORAGE_KEY, updated);
        return updated;
      });

      // 2. Call server delete endpoint (with forward=false because client forwards directly below)
      try {
        await fetch(`/api/kgb/${encodeURIComponent(itemToDelete.id)}?forward=false`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Server delete error:', err);
      }

      // 3. Direct Google Apps Script delete
      if (appConfig.webAppUrl) {
        deleteKGBDirectly(appConfig.webAppUrl, {
          nip: itemToDelete.nip,
          noSk: itemToDelete.noSk,
          tmt: itemToDelete.tmt
        }).catch(err => console.warn('Direct Google Sheets delete error:', err));
      }

      setFeedbackMsg({
        type: 'success',
        text: `Riwayat KGB untuk ${itemToDelete.nama} (SK: ${itemToDelete.noSk || '-'}) berhasil dihapus.`
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Gagal menghapus data riwayat'
      });
    } finally {
      setDeleteModalState({ isOpen: false, item: null, isDeleting: false });
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  // Real-time check for duplicate entry using combination: NIP + Nomor SK + TMT
  const duplicateDetectedInForm = useMemo(() => {
    // If saving or form is not active, do not compute duplicate
    if (!isFormOpen || isSaving) return null;

    const trimmedNip = (formData.nip || '').trim();
    const trimmedNoSk = (formData.noSk || '').trim();
    const normalizedFormTmt = formatToDDMMYYYY(formData.tmt);

    if (!trimmedNip || !trimmedNoSk || trimmedNoSk === '-' || trimmedNoSk === '0' || !normalizedFormTmt) return null;

    return riwayatList.find(item => {
      if (editingId && item.id === editingId) return false;
      const itemNip = (item.nip || '').trim();
      const itemNoSk = (item.noSk || (item as any).no_sk || (item as any).nosk || '').trim();
      const itemTmt = formatToDDMMYYYY(item.tmt || (item as any).TMT_kgb || (item as any).tmt_kgb || (item as any).tmtkgb);

      return (
        itemNip.toLowerCase() === trimmedNip.toLowerCase() &&
        itemNoSk.toLowerCase() === trimmedNoSk.toLowerCase() &&
        itemTmt === normalizedFormTmt
      );
    }) || null;
  }, [formData.nip, formData.noSk, formData.tmt, editingId, riwayatList, isFormOpen, isSaving]);

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nip.trim() || !formData.nama.trim()) {
      setFeedbackMsg({ type: 'error', text: 'NIP dan Nama GTK wajib diisi!' });
      return;
    }
    if (!formData.noSk.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Nomor SK KGB wajib diisi!' });
      return;
    }
    if (!formData.tglSk || !formData.tmt) {
      setFeedbackMsg({ type: 'error', text: 'Tanggal SK dan TMT KGB wajib diisi!' });
      return;
    }
    if (!formData.gajiPokok || Number(formData.gajiPokok) <= 0) {
      setFeedbackMsg({ type: 'error', text: 'Gaji Pokok wajib diisi dengan nominal yang valid!' });
      return;
    }

    const trimmedNip = formData.nip.trim();
    const trimmedNoSk = formData.noSk.trim();
    const formattedTglSk = formatToDDMMYYYY(formData.tglSk);
    const formattedTmt = formatToDDMMYYYY(formData.tmt);

    // PENGECEKAN DULU: Cek apakah kombinasi NIP + Nomor SK + TMT sudah ada
    // Kalo data sudah ada, batalkan dan TIDAK BISA simpan data
    const duplicateEntry = riwayatList.find(item => {
      if (editingId && item.id === editingId) return false;
      const itemNip = (item.nip || '').trim();
      const itemNoSk = (item.noSk || (item as any).no_sk || (item as any).nosk || '').trim();
      const itemTmt = formatToDDMMYYYY(item.tmt || (item as any).TMT_kgb || (item as any).tmt_kgb || (item as any).tmtkgb);

      return (
        itemNip.toLowerCase() === trimmedNip.toLowerCase() &&
        itemNoSk.toLowerCase() === trimmedNoSk.toLowerCase() &&
        itemTmt === formattedTmt
      );
    });

    if (duplicateEntry) {
      setDuplicateModalData({
        isOpen: true,
        nip: trimmedNip,
        nama: formData.nama.trim(),
        noSk: trimmedNoSk,
        tmt: formattedTmt,
        extraInfo: `Gaji Pokok: ${formatRupiah(duplicateEntry.gajiPokok || (duplicateEntry as any).gaji_pokok || 0)} | Golongan: ${duplicateEntry.gol || '-'} | Status: ${duplicateEntry.status || 'Aktif'}`
      });
      setFeedbackMsg({
        type: 'error',
        text: `Data riwayat sudah ada! Riwayat KGB untuk NIP ${trimmedNip} dengan Nomor SK "${trimmedNoSk}" dan TMT "${formattedTmt}" sudah terdaftar sebelumnya. Tidak dapat menyimpan data duplikat.`
      });
      return; // Berhenti di sini, tidak ada penyimpanan apapun
    }

    setIsSaving(true);
    const currentTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Final status: Jika user, pertahankan status yang sedang diedit (atau 'Proses' jika buat baru); jika admin, gunakan formData.status
    const existingItemForEdit = editingId ? riwayatList.find(item => item.id === editingId) : null;
    const finalStatus = isUser 
      ? (existingItemForEdit ? (existingItemForEdit.status || 'Proses') : 'Proses') 
      : (formData.status || 'Proses');

    const savedDetails: SavedDetailItem[] = [
      { label: 'Nama Lengkap GTK', value: formData.nama.trim() },
      { label: 'NIP GTK', value: formData.nip.trim() },
      { label: 'Pangkat / Golongan', value: formData.gol.trim() },
      { label: 'Nomor SK KGB', value: formData.noSk.trim() },
      { label: 'Tanggal SK', value: formattedTglSk },
      { label: 'TMT KGB', value: formattedTmt },
      { label: 'Masa Kerja', value: `${formData.masaKerjaThn} Tahun ${formData.masaKerjaBln} Bulan` },
      { label: 'Gaji Pokok Baru', value: formatRupiah(formData.gajiPokok) },
      { label: 'Status Riwayat', value: finalStatus }
    ];

    try {
      if (editingId) {
        // Update
        const updatedItem: RiwayatKGB = {
          id: editingId,
          no: formData.no || '',
          nip: formData.nip.trim(),
          nama: formData.nama.trim(),
          gol: formData.gol.trim(),
          noSk: formData.noSk.trim(),
          tglSk: formattedTglSk,
          tmt: formattedTmt,
          masaKerjaThn: Number(formData.masaKerjaThn) || 0,
          masaKerjaBln: Number(formData.masaKerjaBln) || 0,
          gajiPokok: Number(formData.gajiPokok) || 0,
          status: finalStatus,
          timestamp: currentTimestamp,
          keterangan: formData.keterangan.trim()
        };

        // 1. Simpan ke local state & storage seketika
        resetForm();

        const updatedList = riwayatList.map(item => (item.id === editingId ? { ...item, ...updatedItem } : item));
        setRiwayatList(updatedList);
        safeSetItem(STORAGE_KEY, updatedList);

        setHighlightedRowId(editingId);
        setTimeout(() => setHighlightedRowId(null), 6000);

        setSuccessModalData({
          isOpen: true,
          title: 'Riwayat KGB Berhasil Diperbarui!',
          subtitle: `Data riwayat kenaikan gaji berkala untuk ${formData.nama} telah tersimpan dan disinkronkan ke Spreadsheet.`,
          actionType: 'update',
          dataDetails: savedDetails,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });

        // 2. Sinkronisasi ke Google Apps Script dan Backend di background
        if (appConfig.webAppUrl) {
          saveKGBDirectly(appConfig.webAppUrl, updatedItem, true).catch(err => {
            console.warn('Background sync to Google Apps Script failed:', err);
          });
          fetch(`/api/kgb/${encodeURIComponent(editingId)}?forward=false`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...updatedItem, skipSheetsForward: true })
          }).catch(e => console.warn('Backend update cache error:', e));
        } else {
          fetch(`/api/kgb/${encodeURIComponent(editingId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedItem)
          }).catch(e => console.warn('Backend update error:', e));
        }
      } else {
        // Create new
        const newEntryId = `KGB-${Date.now()}`;
        const newEntry: RiwayatKGB = {
          id: newEntryId,
          no: riwayatList.length + 1,
          nip: formData.nip.trim(),
          nama: formData.nama.trim(),
          gol: formData.gol.trim(),
          noSk: formData.noSk.trim(),
          tglSk: formattedTglSk,
          tmt: formattedTmt,
          masaKerjaThn: Number(formData.masaKerjaThn) || 0,
          masaKerjaBln: Number(formData.masaKerjaBln) || 0,
          gajiPokok: Number(formData.gajiPokok) || 0,
          status: finalStatus,
          timestamp: currentTimestamp,
          keterangan: formData.keterangan.trim(),
          createdAt: new Date().toISOString().split('T')[0]
        };

        // 1. Simpan ke local state & storage seketika - data baru ditempatkan di paling bawah
        resetForm();

        const updatedList = [...riwayatList, newEntry];
        setRiwayatList(updatedList);
        safeSetItem(STORAGE_KEY, updatedList);

        // Reset pencarian agar data baru di paling bawah terlihat
        setSearchQuery('');

        // Arahkan halaman ke halaman terakhir dari daftar riwayat yang tampak untuk user saat ini
        const visibleItems = isUser && currentUser
          ? updatedList.filter(item => isOwnerOfRecord(item.nip, item.nama, currentUser))
          : updatedList;
        const targetPage = Math.ceil(visibleItems.length / itemsPerPage) || 1;
        setCurrentPage(targetPage);

        // Highlight dan scroll ke baris baru di paling bawah
        setHighlightedRowId(newEntryId);
        setTimeout(() => {
          const el = document.getElementById(`row-kgb-${newEntryId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
        setTimeout(() => setHighlightedRowId(null), 6000);

        setSuccessModalData({
          isOpen: true,
          title: 'Riwayat KGB Berhasil Ditambahkan!',
          subtitle: `Data SK KGB untuk ${formData.nama} berhasil tersimpan sebagai teks.`,
          actionType: 'create',
          dataDetails: savedDetails,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });

        // 2. Sinkronisasi ke Google Apps Script dan Backend di background
        if (appConfig.webAppUrl) {
          saveKGBDirectly(appConfig.webAppUrl, newEntry, false).catch(err => {
            console.warn('Background sync to Google Apps Script failed:', err);
          });
          fetch('/api/kgb?forward=false', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newEntry, skipSheetsForward: true })
          }).catch(e => console.warn('Backend create cache error:', e));
        } else {
          fetch('/api/kgb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEntry)
          }).catch(e => console.warn('Backend create error:', e));
        }

        // 3. Kirim notifikasi Telegram untuk data KGB baru
        notifyKGBBaru(newEntry, undefined, appConfig.webAppUrl)
          .then(tgRes => {
            if (tgRes && tgRes.success) {
              console.log('Notifikasi Telegram KGB berhasil:', tgRes.message);
            }
          })
          .catch(err => {
            console.warn('Telegram notification for KGB failed:', err);
          });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Gagal menyimpan data ke Spreadsheet' });
    } finally {
      setIsSaving(false);
    }
  };

  // Sync All to Google Sheets
  const handleSyncGoogleSheets = async () => {
    setIsSyncing(true);
    try {
      let success = false;
      const promises: Promise<any>[] = [];

      if (appConfig.webAppUrl) {
        promises.push(syncAllKGBDirectly(appConfig.webAppUrl, riwayatList));
      }
      promises.push(
        fetch('/api/kgb/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: riwayatList })
        }).then(res => res.ok).catch(() => false)
      );

      const results = await Promise.allSettled(promises);
      success = results.some(r => r.status === 'fulfilled' && r.value === true);

      if (success || appConfig.webAppUrl) {
        setSuccessModalData({
          isOpen: true,
          title: 'Sinkronisasi Seluruh Riwayat KGB Berhasil!',
          subtitle: `Sebanyak ${riwayatList.length} data riwayat KGB telah berhasil disinkronkan ke Spreadsheet.`,
          actionType: 'syncAll',
          dataDetails: [
            { label: 'Jumlah Baris Disinkronkan', value: `${riwayatList.length} data riwayat KGB` },
            { label: 'Tipe Data Kolom', value: 'Plain Text (Format @)' },
            { label: 'Format Tanggal', value: 'dd/MM/yyyy (hh/mm/yyyy)' },
            { label: 'Waktu Sinkronisasi', value: new Date().toLocaleString('id-ID') }
          ],
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
      } else {
        setFeedbackMsg({ type: 'error', text: 'Gagal menyinkronkan. Pastikan Web App URL sudah terpasang di Pengaturan.' });
        setTimeout(() => setFeedbackMsg(null), 4000);
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Koneksi sinkronisasi gagal.' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Reset to default dataset
  const handleRestoreDefault = () => {
    if (window.confirm('Reset riwayat KGB ke data awal bawaan sistem? Data yang belum tersimpan ke backup akan terganti.')) {
      setRiwayatList(INITIAL_RIWAYAT_KGB);
      safeSetItem(STORAGE_KEY, INITIAL_RIWAYAT_KGB);
      setFeedbackMsg({ type: 'success', text: 'Data riwayat KGB berhasil dikembalikan ke data awal.' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  // Filtered List
  const filteredRiwayat = useMemo(() => {
    return effectiveRiwayatList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        (item.nama || '').toLowerCase().includes(q) ||
        (item.nip || '').includes(q) ||
        (item.gol || '').toLowerCase().includes(q) ||
        (item.noSk || '').toLowerCase().includes(q) ||
        (item.status || '').toLowerCase().includes(q) ||
        (item.keterangan || '').toLowerCase().includes(q)
      );
    });
  }, [effectiveRiwayatList, searchQuery]);

  // Pagination
  const totalItems = filteredRiwayat.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedRiwayat = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRiwayat.slice(start, start + itemsPerPage);
  }, [filteredRiwayat, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Boundary guard: Cegah currentPage melebihi totalPages jika data atau filter berubah
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Export Excel matching exact Sheet "kgb" headers: No, nip, nama, gol, no_sk, tgl_sk, TMT_kgb, masa_kerja_tahun, masa_kerja_bln, gaji_pokok, timestamp, status
  const handleExportExcel = () => {
    const data = filteredRiwayat.map((r, idx) => ({
      'No': r.no || idx + 1,
      'nip': r.nip || '-',
      'nama': r.nama || '-',
      'gol': r.gol || '-',
      'no_sk': r.noSk || '-',
      'tgl_sk': r.tglSk || '-',
      'TMT_kgb': r.tmt || '-',
      'masa_kerja_tahun': r.masaKerjaThn || 0,
      'masa_kerja_bln': r.masaKerjaBln || 0,
      'gaji_pokok': r.gajiPokok || 0,
      'timestamp': r.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
      'status': r.status || 'Aktif'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'kgb');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `kgb_${dateStr}.xlsx`);
  };

  // Export PDF
  const handlePrintPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Kop Surat
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text('PEMERINTAH PROVINSI SULAWESI SELATAN', pageWidth / 2, 14, { align: 'center' });
    doc.text('DINAS PENDIDIKAN', pageWidth / 2, 18.5, { align: 'center' });
    doc.setFontSize(13);
    doc.text('UPT SMK NEGERI 1 PALOPO', pageWidth / 2, 24, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text('Jl. K.H. Ahmad Dahlan No. 15, Amassangan, Wara, Kota Palopo, Sulawesi Selatan 91921', pageWidth / 2, 28.5, { align: 'center' });

    doc.setLineWidth(0.6);
    doc.line(14, 31.5, pageWidth - 14, 31.5);
    doc.setLineWidth(0.2);
    doc.line(14, 32.5, pageWidth - 14, 32.5);

    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text('DAFTAR RIWAYAT KENAIKAN GAJI BERKALA (KGB) GTK', pageWidth / 2, 39, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Per Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} | Total: ${filteredRiwayat.length}`, pageWidth / 2, 43.5, { align: 'center' });

    const tableBody = filteredRiwayat.map((r, idx) => [
      r.no || idx + 1,
      r.nip || '-',
      r.nama || '-',
      r.gol || '-',
      r.noSk || '-',
      r.tglSk || '-',
      r.tmt || '-',
      `${r.masaKerjaThn || 0} Thn ${r.masaKerjaBln || 0} Bln`,
      formatRupiah(r.gajiPokok || 0),
      r.status || 'Aktif'
    ]);

    autoTable(doc, {
      startY: 47,
      head: [['No', 'NIP', 'Nama Lengkap', 'Gol', 'No. SK KGB', 'Tgl SK', 'TMT KGB', 'Masa Kerja', 'Gaji Pokok', 'Status']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 32, halign: 'center' },
        2: { cellWidth: 42 },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 38 },
        5: { cellWidth: 22, halign: 'center' },
        6: { cellWidth: 22, halign: 'center' },
        7: { cellWidth: 26, halign: 'center' },
        8: { cellWidth: 30, halign: 'right' },
        9: { cellWidth: 20, halign: 'center' }
      },
      styles: { font: 'times', fontSize: 7.5, cellPadding: 2 }
    });

    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
  };

  return (
    <div className="space-y-6 w-full">
      {/* User Role Informational Banner */}
      {isUser && currentUser && (
        <div className="bg-teal-50 border border-teal-200/90 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 text-teal-950 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-teal-950 leading-tight">
                {currentUser.nama}
              </h2>
              <p className="text-xs text-teal-800 mt-0.5">
                Nip.: {currentUser.nip || '-'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alert / Feedback Notification */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-2xs animate-in fade-in duration-200 ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedbackMsg(null)}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* FORM INPUT RIWAYAT KGB */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xs overflow-hidden">
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight">
                  {editingId ? 'Edit Data Riwayat KGB GTK' : 'Form Input Riwayat Kenaikan Gaji Berkala (KGB)'}
                </h2>
              </div>
              <p className="text-xs text-teal-100">
                {editingId ? 'Perbarui data riwayat KGB yang dipilih' : 'Tambahkan data SK Kenaikan Gaji Berkala beserta nominal gaji pokok baru'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isFormOpen && (
              <button
                type="button"
                onClick={() => setIsFormOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white text-teal-900 hover:bg-teal-50 font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buka Form Input</span>
              </button>
            )}
            {isFormOpen && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup Form</span>
              </button>
            )}
          </div>
        </div>

        {isFormOpen && (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 space-y-5 animate-in slide-from-top-2 duration-200">
            {/* Quick Auto-Select GTK */}
            <div className="bg-teal-50/80 p-3.5 rounded-xl border border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-teal-900 font-semibold">
                <User className="w-4 h-4 text-teal-700" />
                <span>Pilih Cepat dari Data GTK (Auto-fill NIP & Nama):</span>
              </div>
              <select
                onChange={(e) => handleSelectGTK(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-teal-200 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 cursor-pointer text-xs"
              >
                <option value="">-- Pilih GTK untuk Isi Otomatis --</option>
                {effectiveGtkList.map((g, idx) => (
                  <option key={`opt-gtk-${g.id || g.nip || g.nama || 'gtk'}-${idx}`} value={g.nip || g.nama}>
                    {g.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Grid Form Inputs matching sheet header: nip, nama, gol, no_sk, tgl_sk, TMT_kgb, masa_kerja_tahun, masa_kerja_bln, gaji_pokok, status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* 1. NIP */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  NIP <span className="text-rose-500">*</span>
                  {isUser && <span className="text-[10px] text-teal-700 ml-1 font-normal">(Terkunci Akun)</span>}
                </label>
                <input
                  type="text"
                  required
                  readOnly={isUser}
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  placeholder="Contoh: 197205121998021001"
                  className={`w-full px-3 py-2 rounded-lg border font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 ${
                    isUser ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-600' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              {/* 2. Nama */}
              <div className="lg:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Nama Lengkap GTK <span className="text-rose-500">*</span>
                  {isUser && <span className="text-[10px] text-teal-700 ml-1 font-normal">(Terkunci Akun)</span>}
                </label>
                <input
                  type="text"
                  required
                  readOnly={isUser}
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Nama lengkap beserta gelar akademik"
                  className={`w-full px-3 py-2 rounded-lg border font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 ${
                    isUser ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-600' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              {/* 3. Golongan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Golongan Ruang <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.gol}
                  onChange={(e) => setFormData({ ...formData, gol: e.target.value })}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {formData.gol && !activeGolonganList.includes(formData.gol) && (
                    <option value={formData.gol}>
                      {formData.gol}
                    </option>
                  )}
                  {activeGolonganList.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Nomor SK KGB (no_sk) */}
              <div className="lg:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Nomor Surat / SK KGB (no_sk) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.noSk}
                  onChange={(e) => setFormData({ ...formData, noSk: e.target.value })}
                  placeholder="Contoh: 822.4/112/Disdik/2023"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* 5. Tanggal SK (tgl_sk) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Tanggal SK (tgl_sk) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.tglSk}
                  onChange={(e) => setFormData({ ...formData, tglSk: e.target.value })}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* 6. TMT KGB (TMT_kgb) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  TMT KGB (TMT_kgb) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.tmt}
                  onChange={(e) => setFormData({ ...formData, tmt: e.target.value })}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* 7. Masa Kerja Tahun (masa_kerja_tahun) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Masa Kerja Tahun (masa_kerja_tahun) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    required
                    value={formData.masaKerjaThn}
                    onChange={(e) => setFormData({ ...formData, masaKerjaThn: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Tahun</span>
                </div>
              </div>

              {/* 8. Masa Kerja Bulan (masa_kerja_bln) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Masa Kerja Bulan (masa_kerja_bln) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={11}
                    required
                    value={formData.masaKerjaBln}
                    onChange={(e) => setFormData({ ...formData, masaKerjaBln: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Bulan</span>
                </div>
              </div>

              {/* 9. Gaji Pokok (gaji_pokok) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Gaji Pokok Baru (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={formData.gajiPokok}
                  onChange={(e) => setFormData({ ...formData, gajiPokok: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 font-mono font-bold text-teal-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {formatRupiah(formData.gajiPokok || 0)}
                </span>
              </div>

              {/* 10. Status */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-slate-700">
                    Status Berkas
                  </label>
                  {isUser && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      {/* Terkunci (Hanya Admin) */}
                    </span>
                  )}
                </div>
                <select
                  id="input-status-berkas-kgb"
                  disabled={isUser}
                  value={formData.status || 'Proses'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 ${
                    isUser 
                      ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-600' 
                      : 'bg-white border-slate-300 cursor-pointer'
                  }`}
                >
                  <option value="Proses">Proses</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Aktif">Aktif</option>
                </select>
                {isUser ? (
                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                     {/*Status berkas diatur ke <strong>{formData.status || 'Proses'}</strong> dan hanya dapat diubah oleh Administrator.*/}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Status berkas KGB: <strong>Proses</strong> (pengajuan), <strong>Selesai</strong> (disetujui), atau <strong>Aktif</strong>.
                  </p>
                )}
              </div>
            </div>

            {/* Inline Duplicate Alert Warning */}
            {duplicateDetectedInForm && (
              <div 
                id="inline-duplicate-warning-kgb"
                className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-950">Data Riwayat Sudah Ada di Sistem!</span>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold rounded-md uppercase">
                        NIP + No. SK + TMT
                      </span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      Data riwayat KGB untuk <strong>{duplicateDetectedInForm.nama}</strong> (NIP: {duplicateDetectedInForm.nip}) dengan Nomor SK <strong>"{formData.noSk.trim()}"</strong> dan TMT <strong>"{formatToDDMMYYYY(formData.tmt)}"</strong> sudah pernah tersimpan di sistem (Status: <strong>{duplicateDetectedInForm.status || 'Aktif'}</strong>).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleJumpToRecord(duplicateDetectedInForm.id)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat di Tabel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(duplicateDetectedInForm)}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 font-semibold text-xs rounded-lg border border-amber-300 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-amber-700" />
                    <span>Edit Data Ini</span>
                  </button>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer text-xs disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving || !!duplicateDetectedInForm}
                className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                title={duplicateDetectedInForm ? "Data riwayat sudah terdaftar di sistem, tidak dapat menyimpan data duplikat" : undefined}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Menyimpan ke Spreadsheet...</span>
                  </>
                ) : duplicateDetectedInForm ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-300" />
                    <span>Data Sudah Terdaftar</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{editingId ? 'Simpan Perubahan' : 'Simpan Riwayat KGB'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* TABEL DATA RIWAYAT KGB - Clean Grid Style (Matching Verval PD) */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden w-full">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4 bg-slate-50/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input - Disembunyikan jika login sebagai user */}
            {!isUser && (
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari berdasarkan NIP, Nama, Golongan, No SK KGB..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-2xs placeholder:text-slate-400"
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
            )}

            {/* Action Buttons */}
            <div className={`flex flex-wrap items-center gap-2 ${isUser ? 'ml-auto' : ''}`}>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData(initialFormData);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah KGB</span>
              </button>

              <button
                type="button"
                onClick={() => loadKGBData(true)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-2xs transition-colors shrink-0 cursor-pointer disabled:opacity-60"
                title="Muat ulang data dari Google Sheets sheet 'kgb'"
              >
                <RefreshCw className={`w-4 h-4 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Memuat...' : 'Muat Ulang'}</span>
              </button>

              {/* Tombol Pengaturan Notifikasi Telegram (Hanya Tampil untuk Admin) */}
              {!isUser && (
                <button
                  type="button"
                  onClick={() => setIsTelegramModalOpen(true)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs shrink-0 ${
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
                  />
                </button>
              )}
            </div>
          </div>

          {/* Counter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-xs">
            <span className="text-slate-500">
              Menampilkan <strong>{filteredRiwayat.length}</strong> dari <strong>{effectiveRiwayatList.length}</strong> riwayat KGB
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div ref={tableContainerRef} className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                <th className="py-2.5 px-3 w-12 text-center border-r border-slate-300">No</th>
                <th className="py-2.5 px-3 min-w-[160px] border-r border-slate-300">NIP</th>
                <th className="py-2.5 px-4 min-w-[200px] border-r border-slate-300 font-bold">Nama GTK</th>
                <th className="py-2.5 px-3 min-w-[90px] text-center border-r border-slate-300">Gol</th>
                <th className="py-2.5 px-3 min-w-[170px] border-r border-slate-300">Nomor SK (no_sk)</th>
                <th className="py-2.5 px-3 min-w-[100px] text-center border-r border-slate-300">Tgl SK</th>
                <th className="py-2.5 px-3 min-w-[100px] text-center border-r border-slate-300">TMT KGB</th>
                <th className="py-2.5 px-3 min-w-[120px] text-center border-r border-slate-300">Masa Kerja</th>
                <th className="py-2.5 px-3 min-w-[140px] text-right border-r border-slate-300">Gaji Pokok (Rp)</th>
                <th className="py-2.5 px-3 min-w-[90px] text-center border-r border-slate-300">Status</th>
                <th className="py-2.5 px-3 text-center sticky right-0 bg-slate-100 shadow-xs w-24 border-l border-slate-300">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {paginatedRiwayat.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 italic">
                    <TrendingUp className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                    <p className="font-semibold text-slate-600">Belum ada data riwayat KGB.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Klik tombol "Tambah KGB" atau "Muat Ulang" untuk mengambil data.</p>
                  </td>
                </tr>
              ) : (
                paginatedRiwayat.map((item, idx) => {
                  const itemIndex = isUser ? ((currentPage - 1) * itemsPerPage + idx + 1) : (item.no ? item.no : ((currentPage - 1) * itemsPerPage + idx + 1));
                  const isHighlighted = highlightedRowId === item.id;
                    return (
                    <tr 
                      id={`row-kgb-${item.id || idx}`}
                      key={`kgb-row-${item.id || item.nip || 'id'}-${idx}`}
                      className="transition-colors border-b border-slate-200 bg-white hover:bg-slate-50"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-500 border-r border-slate-200 font-medium">
                        {itemIndex}
                      </td>

                      <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                        {item.nip || '-'}
                      </td>

                      <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200">
                        {item.nama}
                      </td>

                      <td className="py-2.5 px-3 text-center font-medium text-slate-800 border-r border-slate-200">
                        {item.gol || '-'}
                      </td>

                      <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                        {item.noSk || (item as any).no_sk || (item as any).nosk || '-'}
                      </td>

                      <td className="py-2.5 px-3 text-center font-medium text-slate-800 border-r border-slate-200 text-xs">
                        {formatDisplayDate(item.tglSk || (item as any).tgl_sk || (item as any).tglsk)}
                      </td>

                      <td className="py-2.5 px-3 text-center font-medium text-slate-800 border-r border-slate-200 text-xs">
                        {formatDisplayDate(item.tmt || (item as any).TMT_kgb || (item as any).tmt_kgb || (item as any).tmtkgb)}
                      </td>

                      <td className="py-2.5 px-3 text-center font-medium text-slate-800 border-r border-slate-200">
                        {item.masaKerjaThn !== undefined ? item.masaKerjaThn : ((item as any).masa_kerja_tahun || 0)} Thn {item.masaKerjaBln !== undefined ? item.masaKerjaBln : ((item as any).masa_kerja_bln || 0)} Bln
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium text-slate-800 border-r border-slate-200">
                        {formatRupiah(item.gajiPokok !== undefined ? item.gajiPokok : ((item as any).gaji_pokok || 0))}
                      </td>

                      <td className="py-2.5 px-3 text-center font-medium text-slate-800 border-r border-slate-200">
                        {item.status || 'Aktif'}
                      </td>

                      <td className="py-2.5 px-3 text-center sticky right-0 bg-white shadow-xs border-l border-slate-200">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Riwayat KGB"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-delete-kgb-${item.id || idx}`}
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Data Riwayat"
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

        {/* Clean Footer Bar (Matching Verval PD) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Menampilkan</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-md border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-hidden cursor-pointer shadow-2xs"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>
              dari <strong className="text-slate-900">{totalItems}</strong> data Riwayat KGB
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 font-semibold text-slate-800">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sync / Save Success Feedback Modal */}
      <SyncSuccessModal
        isOpen={successModalData.isOpen}
        onClose={() => setSuccessModalData(prev => ({ ...prev, isOpen: false }))}
        title={successModalData.title}
        subtitle={successModalData.subtitle}
        actionType={successModalData.actionType}
        dataDetails={successModalData.dataDetails}
        timestamp={successModalData.timestamp}
      />

      {/* Duplicate Warning Modal */}
      <DuplicateWarningModal
        isOpen={duplicateModalData.isOpen}
        onClose={() => setDuplicateModalData(prev => ({ ...prev, isOpen: false }))}
        onViewInTable={() => {
          setSearchQuery(duplicateModalData.nip || duplicateModalData.noSk);
          setIsFormOpen(false);
          window.scrollTo({ top: 400, behavior: 'smooth' });
        }}
        category="kgb"
        nip={duplicateModalData.nip}
        nama={duplicateModalData.nama}
        noSk={duplicateModalData.noSk}
        tmt={duplicateModalData.tmt}
        extraInfo={duplicateModalData.extraInfo}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false, isDeleting: false }))}
        onConfirm={handleConfirmDelete}
        title="Hapus Riwayat KGB"
        itemName={deleteModalState.item?.nama}
        isDeleting={deleteModalState.isDeleting}
        itemDetails={deleteModalState.item ? [
          { label: 'Nama GTK', value: deleteModalState.item.nama },
          { label: 'NIP GTK', value: deleteModalState.item.nip || '-' },
          { label: 'Nomor SK KGB', value: deleteModalState.item.noSk || '-' },
          { label: 'TMT KGB', value: deleteModalState.item.tmt || '-' },
          { label: 'Gaji Pokok', value: formatRupiah(deleteModalState.item.gajiPokok || 0) }
        ] : []}
      />

      {/* Telegram Config Modal */}
      {!isUser && (
        <TelegramConfigModal
          isOpen={isTelegramModalOpen}
          onClose={() => setIsTelegramModalOpen(false)}
          onConfigSaved={(cfg) => setTelegramConfig(cfg)}
        />
      )}
    </div>
  );
};

export default GTKKGBView;
