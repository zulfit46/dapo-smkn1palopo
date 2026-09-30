import React, { useState, useMemo } from 'react';
import { 
  X, 
  User, 
  FileText, 
  MapPin, 
  CreditCard, 
  GraduationCap, 
  Phone, 
  Building, 
  Award, 
  Shield, 
  HeartHandshake,
  Clock,
  BookOpen
} from 'lucide-react';
import { GTKData, PembelajaranData } from '../types';
import { normalizeNip } from '../utils/authUtils';
import { safeGetItem } from '../utils/storage';

interface GTKDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  gtk: GTKData | null;
  pembelajaranList?: PembelajaranData[];
}

export const GTKDetailModal: React.FC<GTKDetailModalProps> = ({
  isOpen,
  onClose,
  gtk,
  pembelajaranList = []
}) => {
  const [activeDetailTab, setActiveDetailTab] = useState<'pribadi' | 'sk' | 'alamat' | 'kependudukan' | 'jjm'>('pribadi');

  // Ambil data pembelajaran dari props atau fallback ke local storage cache
  const effectivePembelajaranList = useMemo(() => {
    if (pembelajaranList && pembelajaranList.length > 0) return pembelajaranList;
    return safeGetItem<PembelajaranData[]>('dapodik_cached_pembelajaran', []);
  }, [pembelajaranList]);

  // Filter jadwal mengajar khusus GTK ini
  const myPembelajaranList = useMemo(() => {
    if (!gtk || !effectivePembelajaranList || effectivePembelajaranList.length === 0) return [];
    
    const userNuptk = normalizeNip(gtk.nuptk);
    const userNip = normalizeNip(gtk.nip);
    const userNama = (gtk.nama || '').trim();

    const cleanPersonName = (n: string) =>
      n.toLowerCase()
        .replace(/,\s*(s\.?pd|s\.?kom|m\.?pd|s\.?e|s\.?t|s\.?ag|m\.?si|drs\.?|dr\.?|h\.?|hj\.?|gr\.?|s\.?sos|m\.?kom|m\.?ti)/gi, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const cleanedUserNama = cleanPersonName(userNama);

    return effectivePembelajaranList.filter(item => {
      if (userNuptk && item.nuptk && normalizeNip(item.nuptk) === userNuptk) return true;
      if (userNip && item.nip && normalizeNip(item.nip) === userNip) return true;
      if (userNama && item.namaPtk && item.namaPtk.trim().toLowerCase() === userNama.toLowerCase()) return true;
      if (cleanedUserNama && item.namaPtk) {
        const cleanedItem = cleanPersonName(item.namaPtk);
        if (cleanedItem && (
          cleanedItem === cleanedUserNama || 
          cleanedItem.includes(cleanedUserNama) || 
          cleanedUserNama.includes(cleanedItem)
        )) return true;
      }
      return false;
    });
  }, [effectivePembelajaranList, gtk]);

  const totalJJM = useMemo(() => {
    return myPembelajaranList.reduce((acc, curr) => acc + (Number(curr.jjm) || 0), 0);
  }, [myPembelajaranList]);

  const tugasTambahanList = useMemo(() => {
    if (!gtk) return [];
    const raw = (gtk.tugasTambahan || '').trim();
    if (!raw || raw === '-') return [];
    const items = raw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    return items.length > 0 ? items : [raw];
  }, [gtk]);

  if (!isOpen || !gtk) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal - Polosan tanpa highlight/gradient */}
        <div className="bg-white border-b border-slate-200 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {gtk.nama || 'Detail GTK'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span>NIP: <span className="font-mono text-slate-700 font-semibold">{gtk.nip || '-'}</span></span>
                <span>•</span>
                <span>NUPTK: <span className="font-mono text-slate-700 font-semibold">{gtk.nuptk || '-'}</span></span>
                {gtk.statusKepegawaian && (
                  <>
                    <span>•</span>
                    <span className="text-slate-700 font-medium">
                      ({gtk.statusKepegawaian})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation - Polosan */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-5 text-xs font-semibold overflow-x-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveDetailTab('pribadi')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeDetailTab === 'pribadi'
                ? 'border-slate-800 text-slate-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5 text-slate-600" />
            <span>Pribadi & Kepegawaian</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDetailTab('sk')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeDetailTab === 'sk'
                ? 'border-slate-800 text-slate-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-slate-600" />
            <span>SK, Pangkat & Pengangkatan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDetailTab('alamat')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeDetailTab === 'alamat'
                ? 'border-slate-800 text-slate-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-slate-600" />
            <span>Alamat & Kontak</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDetailTab('kependudukan')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeDetailTab === 'kependudukan'
                ? 'border-slate-800 text-slate-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-600" />
            <span>Kependudukan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDetailTab('jjm')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeDetailTab === 'jjm'
                ? 'border-slate-800 text-slate-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            <span>JJM</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4 bg-white">
          {/* TAB 1: PRIBADI & KEPEGAWAIAN (Tanpa Tugas Tambahan) */}
          {activeDetailTab === 'pribadi' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  <span>Identitas Pribadi</span>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Nama Lengkap</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.nama || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Jenis Kelamin</span>
                    <span className="font-semibold text-slate-800">{gtk.jk === 'L' ? 'Laki-Laki (L)' : gtk.jk === 'P' ? 'Perempuan (P)' : gtk.jk || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Tempat, Tgl Lahir</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.tempatLahir || '-'}, {gtk.tanggalLahir || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Agama</span>
                    <span className="font-semibold text-slate-800">{gtk.agama || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Nama Ibu Kandung</span>
                    <span className="font-semibold text-slate-800">{gtk.namaIbuKandung || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Status Perkawinan</span>
                    <span className="font-semibold text-slate-800">{gtk.statusPerkawinan || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Kewarganegaraan</span>
                    <span className="font-semibold text-slate-800">{gtk.kewarganegaraan || 'Indonesia'}</span>
                  </div>
                </div>
              </div>

              {/* Status & Penugasan (Tanpa tugas tambahan) */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <Shield className="w-3.5 h-3.5 text-slate-600" />
                  <span>Status & Penugasan</span>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Status Kepegawaian</span>
                    <span className="font-semibold text-slate-800">{gtk.statusKepegawaian || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Jenis PTK</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.jenisPtk || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Jenjang</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.jenjang || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Jabatan PTK</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.jabatanPtk || gtk.jabatan_ptk || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">NUPTK</span>
                    <span className="font-semibold font-mono text-slate-800">{gtk.nuptk || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">NIP</span>
                    <span className="font-semibold font-mono text-slate-800">{gtk.nip || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Lisensi Kepala Sekolah</span>
                    <span className="font-semibold text-slate-800">{gtk.sudahLisensiKepalaSekolah || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">NUKS</span>
                    <span className="font-semibold text-slate-800">{gtk.nuks || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Data Pasangan */}
              <div className="md:col-span-2 bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <HeartHandshake className="w-3.5 h-3.5 text-slate-600" />
                  <span>Data Suami / Istri</span>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Nama Suami / Istri</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.namaSuamiIstri || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">NIP Suami / Istri</span>
                    <span className="font-semibold font-mono text-slate-800">{gtk.nipSuamiIstri || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Pekerjaan Suami / Istri</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.pekerjaanSuamiIstri || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SK, PANGKAT & PENGANGKATAN */}
          {activeDetailTab === 'sk' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <Award className="w-3.5 h-3.5 text-slate-600" />
                  <span>Pangkat & Golongan</span>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Pangkat / Golongan</span>
                    <span className="font-semibold text-slate-800">{gtk.pangkatGolongan || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">SK CPNS</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.skCpns || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Tanggal CPNS</span>
                    <span className="font-semibold text-slate-800">{gtk.tanggalCpns || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">TMT PNS</span>
                    <span className="font-semibold text-slate-800">{gtk.tmtPns || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Nomor Karpeg</span>
                    <span className="font-semibold font-mono text-slate-800">{gtk.karpeg || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <Building className="w-3.5 h-3.5 text-slate-600" />
                  <span>Riwayat Pengangkatan</span>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">SK Pengangkatan</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.skPengangkatan || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">TMT Pengangkatan</span>
                    <span className="font-semibold text-slate-800">{gtk.tmtPengangkatan || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Lembaga Pengangkat</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.lembagaPengangkatan || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Karis / Karsu</span>
                    <span className="font-semibold text-slate-800">{gtk.karisKarsu || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Diklat Kepengawasan</span>
                    <span className="font-semibold text-slate-800">{gtk.pernahDiklatKepengawasan || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ALAMAT & KONTAK (Tampilan disamakan dengan format tab Pribadi dan SK) */}
          {activeDetailTab === 'alamat' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <MapPin className="w-3.5 h-3.5 text-slate-600" />
                  <span>Alamat Domisili</span>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Alamat Jalan</span>
                    <span className="font-semibold text-slate-800 text-right max-w-[60%] truncate" title={gtk.alamatJalan}>{gtk.alamatJalan || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">RT / RW</span>
                    <span className="font-semibold text-slate-800">{gtk.rt || '-'}/{gtk.rw || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Kode Pos</span>
                    <span className="font-semibold text-slate-800">{gtk.kodePos || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Dusun</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.namaDusun || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Desa / Kelurahan</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.desaKelurahan || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Kecamatan</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.kecamatan || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Koordinat (Lintang, Bujur)</span>
                    <span className="font-semibold font-mono text-slate-800 text-right">{gtk.lintang || '-'}, {gtk.bujur || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                  <span>Kontak & Komunikasi</span>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">No. Handphone / WA</span>
                    <span className="font-semibold font-mono text-slate-800">{gtk.hp || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Telepon Rumah</span>
                    <span className="font-semibold text-slate-800">{gtk.telepon || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Email</span>
                    <span className="font-semibold text-slate-800 text-right max-w-[60%] truncate" title={gtk.email}>{gtk.email || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: KEPENDUDUKAN (Info rekening dan sumber gaji sudah dihapus) */}
          {activeDetailTab === 'kependudukan' && (
            <div className="max-w-2xl">
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>Dokumen Kependudukan & Pajak</span>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">NIK (No. KTP)</span>
                    <span className="font-semibold text-slate-800 font-mono">{gtk.nik || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Nomor Kartu Keluarga (KK)</span>
                    <span className="font-semibold text-slate-800 font-mono">{gtk.noKk || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">NPWP</span>
                    <span className="font-semibold text-slate-800 font-mono">{gtk.npwp || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Nama Wajib Pajak</span>
                    <span className="font-semibold text-slate-800">{gtk.namaWajibPajak || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: JJM (Tugas Tambahan & Jam Mengajar) */}
          {activeDetailTab === 'jjm' && (
            <div className="space-y-5">
              {/* Bagian 1: Info Tugas Tambahan Sederhana */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Tugas Tambahan
                </h3>
                {tugasTambahanList.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">- Tidak ada tugas tambahan -</p>
                ) : (
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-800 font-medium pl-1">
                    {tugasTambahanList.map((tugas, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {tugas}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Bagian 2: Jam Mengajar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-slate-600" />
                    <span>Daftar Jam Mengajar Tatap Muka</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    ({myPembelajaranList.length} Rombel / Penugasan)
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3 text-center w-12 border-r border-slate-200">No</th>
                        <th className="py-2.5 px-4 border-r border-slate-200">Rombel</th>
                        <th className="py-2.5 px-4 border-r border-slate-200">Nama Mapel</th>
                        <th className="py-2.5 px-3 text-center w-24">JJM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {myPembelajaranList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-500 italic">
                            <Clock className="w-5 h-5 mx-auto mb-1 text-slate-400 opacity-60" />
                            <p className="font-medium text-slate-600">Tidak ada jadwal jam mengajar yang tercatat</p>
                          </td>
                        </tr>
                      ) : (
                        myPembelajaranList.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-500 font-medium border-r border-slate-200">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900 border-r border-slate-200">
                              {item.namaRombel || '-'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-800 border-r border-slate-200">
                              {item.namaMatpel || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                              {item.jjm || 0}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {myPembelajaranList.length > 0 && (
                      <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                        <tr>
                          <td colSpan={3} className="py-2.5 px-4 text-right border-r border-slate-200 uppercase text-[11px] tracking-wider text-slate-700">
                            Total JJM :
                          </td>
                          <td className="py-2.5 px-3 text-center text-xs font-bold text-slate-900">
                            {totalJJM} Jam
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
