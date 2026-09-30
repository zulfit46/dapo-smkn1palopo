import React, { useState, useEffect } from 'react';
import { MutasiMasukItem, WilayahItem } from '../types';
import { formatToDDMMYYYY, parseToYYYYMMDD } from '../utils/dateUtils';
import { 
  X, 
  UserPlus, 
  Users, 
  MapPin, 
  Building2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Edit,
  Calendar
} from 'lucide-react';

interface MutasiMasukModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<MutasiMasukItem, 'id' | 'createdAt'>, isEditing?: boolean, editingId?: string) => void;
  availableRombel: string[];
  isAdmin?: boolean;
  initialData?: MutasiMasukItem | null;
  isEditing?: boolean;
}

const API_WILAYAH = "https://www.emsifa.com/api-wilayah-indonesia/api";

// Fallback jika emsifa API mengalami kendala jaringan
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

export const MutasiMasukModal: React.FC<MutasiMasukModalProps> = ({
  isOpen,
  onClose,
  onSave,
  availableRombel = [],
  isAdmin = false,
  initialData = null,
  isEditing = false
}) => {
  // Form fields
  const [nisn, setNisn] = useState('');
  const [nama, setNama] = useState('');
  const [selectedProvinsi, setSelectedProvinsi] = useState('');
  const [selectedKabKota, setSelectedKabKota] = useState('');
  const [selectedKecamatan, setSelectedKecamatan] = useState('');
  const [sekolahAsal, setSekolahAsal] = useState('');
  const [rombelTujuan, setRombelTujuan] = useState('');
  const [tglMasuk, setTglMasuk] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Pending' | 'Diterima'>('Pending');

  // Wilayah Data & Loading states
  const [provinces, setProvinces] = useState<WilayahItem[]>([]);
  const [regencies, setRegencies] = useState<WilayahItem[]>([]);
  const [districts, setDistricts] = useState<WilayahItem[]>([]);

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingRegencies, setIsLoadingRegencies] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset form when modal opens or initialData changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialData && isEditing) {
      setNisn(initialData.nisn || '');
      setNama(initialData.nama || '');
      setSekolahAsal(initialData.sekolahAsal || '');
      setRombelTujuan(initialData.rombelTujuan || '');
      const rawDate = initialData.tglMasuk || initialData.tanggalPengajuan || initialData.timestamp || '';
      setTglMasuk(rawDate ? parseToYYYYMMDD(rawDate) : new Date().toISOString().split('T')[0]);
      setStatus(initialData.status === 'Diterima' ? 'Diterima' : 'Pending');
      if (initialData.provinsiId) setSelectedProvinsi(initialData.provinsiId);
      if (initialData.kabKotaId) setSelectedKabKota(initialData.kabKotaId);
      if (initialData.kecamatanId) setSelectedKecamatan(initialData.kecamatanId);
      setErrorMessage(null);
    } else {
      setNisn('');
      setNama('');
      setSelectedProvinsi('');
      setSelectedKabKota('');
      setSelectedKecamatan('');
      setSekolahAsal('');
      setRombelTujuan('');
      setTglMasuk(new Date().toISOString().split('T')[0]);
      setStatus('Pending');
      setErrorMessage(null);
    }
  }, [isOpen, initialData, isEditing]);

  // 1. Fetch Provinces on mount / when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchProvinces = async () => {
      setIsLoadingProvinces(true);
      try {
        const res = await fetch(`${API_WILAYAH}/provinces.json`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProvinces(data);
        } else {
          setProvinces(FALLBACK_PROVINCES);
        }
      } catch (error) {
        console.warn('Error fetching provinces, using fallback:', error);
        setProvinces(FALLBACK_PROVINCES);
      } finally {
        setIsLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, [isOpen]);

  // Auto-match province by name when editing if ID wasn't stored
  useEffect(() => {
    if (initialData && isEditing && provinces.length > 0 && !selectedProvinsi && initialData.provinsiNama) {
      const match = provinces.find(
        p => p.name.trim().toLowerCase() === initialData.provinsiNama?.trim().toLowerCase()
      );
      if (match) setSelectedProvinsi(match.id);
    }
  }, [provinces, initialData, isEditing, selectedProvinsi]);

  // 2. Fetch Kab/Kota when Provinsi changes
  useEffect(() => {
    if (!selectedProvinsi) {
      setRegencies([]);
      setSelectedKabKota('');
      setDistricts([]);
      setSelectedKecamatan('');
      return;
    }

    const fetchRegencies = async () => {
      setIsLoadingRegencies(true);
      setRegencies([]);
      setSelectedKabKota('');
      setDistricts([]);
      setSelectedKecamatan('');

      try {
        const res = await fetch(`${API_WILAYAH}/regencies/${selectedProvinsi}.json`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setRegencies(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching regencies:', error);
      } finally {
        setIsLoadingRegencies(false);
      }
    };

    fetchRegencies();
  }, [selectedProvinsi]);

  // Auto-match regency by name when editing
  useEffect(() => {
    if (initialData && isEditing && regencies.length > 0 && !selectedKabKota && initialData.kabKotaNama) {
      const cleanTarget = initialData.kabKotaNama.replace(/KABUPATEN |KOTA /g, '').trim().toLowerCase();
      const match = regencies.find(
        r => r.name.trim().toLowerCase().includes(cleanTarget) || cleanTarget.includes(r.name.trim().toLowerCase())
      );
      if (match) setSelectedKabKota(match.id);
    }
  }, [regencies, initialData, isEditing, selectedKabKota]);

  // 3. Fetch Kecamatan when Kab/Kota changes
  useEffect(() => {
    if (!selectedKabKota) {
      setDistricts([]);
      setSelectedKecamatan('');
      return;
    }

    const fetchDistricts = async () => {
      setIsLoadingDistricts(true);
      setDistricts([]);
      setSelectedKecamatan('');

      try {
        const res = await fetch(`${API_WILAYAH}/districts/${selectedKabKota}.json`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setDistricts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching districts:', error);
      } finally {
        setIsLoadingDistricts(false);
      }
    };

    fetchDistricts();
  }, [selectedKabKota]);

  // Auto-match district by name when editing
  useEffect(() => {
    if (initialData && isEditing && districts.length > 0 && !selectedKecamatan && initialData.kecamatanNama) {
      const match = districts.find(
        d => d.name.trim().toLowerCase() === initialData.kecamatanNama?.trim().toLowerCase()
      );
      if (match) setSelectedKecamatan(match.id);
    }
  }, [districts, initialData, isEditing, selectedKecamatan]);

  // Reset form
  const handleReset = () => {
    setNisn('');
    setNama('');
    setSelectedProvinsi('');
    setSelectedKabKota('');
    setSelectedKecamatan('');
    setSekolahAsal('');
    setRombelTujuan('');
    setStatus('Pending');
    setErrorMessage(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Close modal when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!nisn.trim()) {
      setErrorMessage('NISN wajib diisi');
      return;
    }
    if (!/^\d+$/.test(nisn.trim())) {
      setErrorMessage('NISN hanya boleh berupa angka');
      return;
    }
    if (nisn.trim().length !== 10) {
      setErrorMessage('NISN harus tepat 10 digit');
      return;
    }
    if (!nama.trim()) {
      setErrorMessage('Nama Siswa wajib diisi');
      return;
    }
    if (!selectedProvinsi && !initialData?.provinsiNama) {
      setErrorMessage('Silakan pilih Provinsi asal');
      return;
    }
    if (!selectedKabKota && !initialData?.kabKotaNama) {
      setErrorMessage('Silakan pilih Kabupaten/Kota asal');
      return;
    }
    if (!selectedKecamatan && !initialData?.kecamatanNama) {
      setErrorMessage('Silakan pilih Kecamatan asal');
      return;
    }
    if (!sekolahAsal.trim()) {
      setErrorMessage('Nama Sekolah Asal wajib diisi');
      return;
    }
    if (!rombelTujuan.trim()) {
      setErrorMessage('Silakan pilih Rombel Tujuan penempatan siswa');
      return;
    }

    setIsSubmitting(true);

    const provObj = provinces.find(p => p.id === selectedProvinsi);
    const kabObj = regencies.find(k => k.id === selectedKabKota);
    const kecObj = districts.find(d => d.id === selectedKecamatan);

    // Aturan Peran:
    // field status hanya muncul di akun admin,
    // jadi jika status user, tidak ditampilkan field status, dan otomatis data akan terisi "Pending"
    const finalStatus: 'Pending' | 'Diterima' = isAdmin ? status : 'Pending';
    const textDate = formatToDDMMYYYY(tglMasuk || new Date());
    const rawTs = initialData?.timestamp || `${textDate} ${new Date().toTimeString().split(' ')[0]}`;

    const newRecord: Omit<MutasiMasukItem, 'id' | 'createdAt'> = {
      no: initialData?.no,
      nisn: nisn.trim(),
      nama: nama.trim(),
      provinsiId: selectedProvinsi || initialData?.provinsiId || '',
      provinsiNama: provObj?.name || initialData?.provinsiNama || selectedProvinsi,
      kabKotaId: selectedKabKota || initialData?.kabKotaId || '',
      kabKotaNama: kabObj?.name || initialData?.kabKotaNama || selectedKabKota,
      kecamatanId: selectedKecamatan || initialData?.kecamatanId || '',
      kecamatanNama: kecObj?.name || initialData?.kecamatanNama || selectedKecamatan,
      sekolahAsal: sekolahAsal.trim(),
      rombelTujuan: rombelTujuan.trim(),
      tglMasuk: textDate,
      tanggalPengajuan: textDate,
      timestamp: rawTs,
      status: finalStatus,
      keterangan: finalStatus === 'Diterima' ? 'Mutasi Masuk Disetujui' : 'Pengajuan Mutasi Masuk (Pending Verifikasi)'
    };

    onSave(newRecord, isEditing, initialData?.id);
    setIsSubmitting(false);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs shrink-0">
              {isEditing ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-emerald-800 tracking-tight">
                {isEditing ? 'Edit Data Mutasi Masuk' : 'Form Mutasi Masuk'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-normal">
                {isEditing 
                  ? 'Perbarui rincian atau status verifikasi mutasi masuk siswa'
                  : 'Isi form berikut untuk mengajukan mutasi masuk siswa baru'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-modal-x"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl bg-white/80 border border-slate-200/80 hover:bg-slate-100 shadow-2xs transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Tutup Form (Esc)"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 sm:space-y-5">
          
          {/* 1. Data Siswa Baru */}
          <div className="border border-slate-200/80 rounded-2xl p-4 sm:p-5 bg-slate-50/40 space-y-3.5">
            <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs sm:text-sm">
              <Users className="w-4 h-4 text-slate-500" />
              <span>Data Siswa Baru</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* NISN */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  NISN <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value.replace(/\D/g, ''))}
                  placeholder="Masukkan NISN (10 digit)"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              {/* Nama Siswa */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lengkap siswa"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* 2. Alamat Asal */}
          <div className="border border-slate-200/80 rounded-2xl p-4 sm:p-5 bg-slate-50/40 space-y-3.5">
            <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs sm:text-sm">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span>Alamat Asal</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Provinsi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Provinsi <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedProvinsi}
                    onChange={(e) => setSelectedProvinsi(e.target.value)}
                    disabled={isLoadingProvinces}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer pr-9 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">
                      {isLoadingProvinces ? 'Memuat Provinsi...' : 'Pilih Provinsi'}
                    </option>
                    {provinces.map((prov) => (
                      <option key={prov.id} value={prov.id}>
                        {prov.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    {isLoadingProvinces ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* Kab/Kota */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kab/Kota <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedKabKota}
                    onChange={(e) => setSelectedKabKota(e.target.value)}
                    disabled={!selectedProvinsi || isLoadingRegencies}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer pr-9 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">
                      {!selectedProvinsi 
                        ? 'Pilih provinsi dulu' 
                        : isLoadingRegencies 
                          ? 'Memuat Kab/Kota...' 
                          : 'Pilih Kab/Kota'}
                    </option>
                    {regencies.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    {isLoadingRegencies ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Kecamatan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kecamatan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedKecamatan}
                  onChange={(e) => setSelectedKecamatan(e.target.value)}
                  disabled={!selectedKabKota || isLoadingDistricts}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer pr-9 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">
                    {!selectedKabKota 
                      ? 'Pilih kab/kota dulu' 
                      : isLoadingDistricts 
                        ? 'Memuat Kecamatan...' 
                        : 'Pilih Kecamatan'}
                  </option>
                  {districts.map((dist) => (
                    <option key={dist.id} value={dist.id}>
                      {dist.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  {isLoadingDistricts ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Asal Sekolah & Penempatan */}
          <div className="border border-slate-200/80 rounded-2xl p-4 sm:p-5 bg-slate-50/40 space-y-3.5">
            <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs sm:text-sm">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>Asal Sekolah & Penempatan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Nama Sekolah Asal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Sekolah Asal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={sekolahAsal}
                  onChange={(e) => setSekolahAsal(e.target.value)}
                  placeholder="Nama sekolah asal"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              {/* Rombel Tujuan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rombel Tujuan <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={rombelTujuan}
                    onChange={(e) => setRombelTujuan(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer pr-9"
                    required
                  >
                    <option value="">Pilih rombel tujuan</option>
                    {availableRombel.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Tanggal Masuk (tgl_masuk dari timestamp sebagai teks) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tanggal Masuk (Tgl Masuk)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={tglMasuk}
                  onChange={(e) => setTglMasuk(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Data tanggal masuk disinkronkan ke header spreadsheet sebagai teks tanggal (DD/MM/YYYY).
                </p>
              </div>
            </div>
          </div>

          {/* 4. Status Mutasi: Khusus Akun Admin */}
          {isAdmin ? (
            <div className="border border-emerald-200/80 rounded-2xl p-4 sm:p-5 bg-emerald-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Status Mutasi</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Hak Akses Admin
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('Pending')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    status === 'Pending'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/30'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Clock className={`w-4 h-4 ${status === 'Pending' ? 'text-white' : 'text-amber-500'}`} />
                  <span>Pending</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('Diterima')}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    status === 'Diterima'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-600/30'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 ${status === 'Diterima' ? 'text-white' : 'text-emerald-600'}`} />
                  <span>Diterima</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                {status === 'Diterima'
                  ? 'Status "Diterima" menyetujui mutasi siswa dan siap ditempatkan di rombel tujuan.'
                  : 'Status "Pending" menandai bahwa berkas mutasi siswa masih menunggu verifikasi.'}
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Status mutasi otomatis terisi <strong>Pending</strong> dan akan diverifikasi oleh Admin.</span>
            </div>
          )}

          {/* Action Buttons: Batal & Simpan */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              id="btn-cancel-mutasi"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 sm:px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Batal</span>
            </button>

            <button
              type="submit"
              id="btn-submit-mutasi"
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Data...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Simpan Perubahan' : 'Simpan Data Mutasi'}</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
