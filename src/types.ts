export interface Student {
  id: string;
  nama: string;
  kelas: string;
  nipd: string;
  nisn: string;
  jk: 'L' | 'P';
  tempatLahir: string;
  tanggalLahir: string;
  agama: string;
  alamat: string;
  ayah: string;
  ibu: string;
  pekerjaanAyah?: string;
  pekerjaanIbu?: string;
  // Dapodik / Google Sheets alias fields
  kerja_ayah?: string;
  kerja_ibu?: string;
  nama_ayah?: string;
  nama_ibu?: string;
  noHp?: string;
  email?: string;
  statusRegistrasi?: 'Aktif' | 'Siswa Baru' | 'Pindahan' | 'Lulus' | 'Keluar';
  status?: 'Aktif' | 'Tidak Aktif' | string;
  ket?: 'Mutasi' | 'Dikeluarkan' | 'Mengundurkan Diri' | 'Putus Sekolah' | 'Wafat' | 'Hilang' | string;
  timestamp?: string;
  vervalOleh?: string;
  verval_oleh?: string;
  tanggalMasuk?: string;
  sekolahAsal?: string;
  tinggiBadan?: number; // cm
  beratBadan?: number; // kg
  jarakSekolah?: string; // e.g. "< 1 km" or "1 - 5 km"
  waktuTempuh?: string; // e.g. "15 menit"
  jumlahSaudara?: number;
  [key: string]: any;
}

/**
 * Normalizes a raw or stored student record so that pekerjaanAyah (kerja_ayah)
 * and pekerjaanIbu (kerja_ibu) are consistently populated and mirrored.
 */
export function normalizeStudent(s: any): Student {
  if (!s || typeof s !== 'object') return s;

  const rawKerjaAyah =
    s.pekerjaanAyah ||
    s.kerja_ayah ||
    s.kerjaayah ||
    s['kerja_ayah'] ||
    s['kerjaayah'] ||
    s.pekerjaan_ayah ||
    s['pekerjaan_ayah'] ||
    s['Pekerjaan Ayah'] ||
    s.pkrjayah ||
    s.pekayah ||
    s.kerjaAyah ||
    '';

  const rawKerjaIbu =
    s.pekerjaanIbu ||
    s.kerja_ibu ||
    s.kerjaibu ||
    s['kerja_ibu'] ||
    s['kerjaibu'] ||
    s.pekerjaan_ibu ||
    s['pekerjaan_ibu'] ||
    s['Pekerjaan Ibu'] ||
    s.pkrjibu ||
    s.pekibu ||
    s.kerjaIbu ||
    '';

  const rawAyah =
    s.ayah ||
    s.nama_ayah ||
    s.namaayah ||
    s['nama_ayah'] ||
    s['Nama Ayah'] ||
    s.nmayah ||
    s.namaAyah ||
    '';

  const rawIbu =
    s.ibu ||
    s.nama_ibu ||
    s.namaibu ||
    s['nama_ibu'] ||
    s['Nama Ibu'] ||
    s.nmibu ||
    s.namaIbu ||
    '';

  const pekerjaanAyah = typeof rawKerjaAyah === 'string' ? rawKerjaAyah.trim() : String(rawKerjaAyah || '').trim();
  const pekerjaanIbu = typeof rawKerjaIbu === 'string' ? rawKerjaIbu.trim() : String(rawKerjaIbu || '').trim();
  const ayah = typeof rawAyah === 'string' ? rawAyah.trim() : String(rawAyah || '').trim();
  const ibu = typeof rawIbu === 'string' ? rawIbu.trim() : String(rawIbu || '').trim();

  // Standardize Gender (L / P)
  let cleanJk: 'L' | 'P' = 'L';
  const rawJk = String(s.jk || '').trim().toUpperCase();
  if (rawJk.startsWith('P') || rawJk.startsWith('W') || rawJk === 'PEREMPUAN' || rawJk === 'WANITA') {
    cleanJk = 'P';
  } else if (rawJk.startsWith('L') || rawJk === 'LAKI-LAKI' || rawJk === 'PRIA') {
    cleanJk = 'L';
  } else if (s.jk === 'P') {
    cleanJk = 'P';
  } else {
    cleanJk = (s.jk as 'L' | 'P') || 'L';
  }

  const cleanKelas = typeof s.kelas === 'string' ? s.kelas.trim() : String(s.kelas || '').trim();

  return {
    ...s,
    kelas: cleanKelas,
    jk: cleanJk,
    ayah: ayah || (s.ayah ?? ''),
    ibu: ibu || (s.ibu ?? ''),
    pekerjaanAyah: pekerjaanAyah || (s.pekerjaanAyah ?? ''),
    pekerjaanIbu: pekerjaanIbu || (s.pekerjaanIbu ?? ''),
    // Mirror the exact header names used by Google Sheets Dapodik
    kerja_ayah: pekerjaanAyah || s.kerja_ayah || '',
    kerja_ibu: pekerjaanIbu || s.kerja_ibu || '',
    nama_ayah: ayah || s.nama_ayah || '',
    nama_ibu: ibu || s.nama_ibu || '',
    status: s.status !== undefined && s.status !== null && String(s.status).trim() ? String(s.status).trim() : 'Aktif',
    ket: s.ket !== undefined && s.ket !== null ? String(s.ket).trim() : '',
  };
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  tanggal: string;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';
  catatan?: string;
}

export interface WaliKelas {
  kelas: string;
  nama: string;
  nip: string;
}

export interface Jurusan {
  kode: string;
  programKeahlian: string;
  konsentrasiKeahlian: string;
}

export interface AppConfig {
  spreadsheetId: string;
  sheetName: string;
  webAppUrl: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  notifyMutasiMasuk: boolean;
  notifyMutasiKeluar: boolean;
  notifyPangkatBaru: boolean;
  notifyKGBBaru: boolean;
  notifyVervalPD?: boolean;

  // Pengelompokan Notifikasi (Topik Forum / Thread ID di Telegram Supergroup)
  threadIdMutasiMasuk?: string;
  threadIdMutasiKeluar?: string;
  threadIdPangkat?: string;
  threadIdKGB?: string;
  threadIdVervalPD?: string;

  // Opsi Chat ID / Grup Khusus Terpisah per Kategori (opsional, jika tidak memakai 1 grup dengan topik)
  chatIdMutasiMasuk?: string;
  chatIdMutasiKeluar?: string;
  chatIdPangkat?: string;
  chatIdKGB?: string;
  chatIdVervalPD?: string;
}

export interface GTKData {
  id: string;
  no?: string | number;
  nama: string;
  nuptk?: string;
  jk: 'L' | 'P' | string;
  tempatLahir?: string;
  tanggalLahir?: string;
  nip?: string;
  statusKepegawaian?: string;
  jenisPtk?: string;
  jenjang?: string;
  tugasTambahan?: string;
  jabatanPtk?: string;
  jabatan_ptk?: string;
  gelarDepan?: string;
  gelarBelakang?: string;
  jurusanProdi?: string;
  sertifikasi?: string;
  tmtKerja?: string;
  mengajar?: string;
  jamTugasTambahan?: string;
  jjm?: string;
  totalJjm?: string;
  siswa?: string;
  kompetensi?: string;
  agama?: string;
  alamatJalan?: string;
  rt?: string;
  rw?: string;
  namaDusun?: string;
  desaKelurahan?: string;
  kecamatan?: string;
  kodePos?: string;
  telepon?: string;
  hp?: string;
  email?: string;
  skCpns?: string;
  tanggalCpns?: string;
  skPengangkatan?: string;
  tmtPengangkatan?: string;
  lembagaPengangkatan?: string;
  pangkatGolongan?: string;
  sumberGaji?: string;
  namaIbuKandung?: string;
  statusPerkawinan?: string;
  namaSuamiIstri?: string;
  nipSuamiIstri?: string;
  pekerjaanSuamiIstri?: string;
  tmtPns?: string;
  sudahLisensiKepalaSekolah?: string;
  pernahDiklatKepengawasan?: string;
  keahlianBraille?: string;
  keahlianBahasaIsyarat?: string;
  npwp?: string;
  namaWajibPajak?: string;
  kewarganegaraan?: string;
  bank?: string;
  nomorRekeningBank?: string;
  rekeningAtasNama?: string;
  nik?: string;
  noKk?: string;
  karpeg?: string;
  karisKarsu?: string;
  lintang?: string;
  bujur?: string;
  nuks?: string;
  status_login?: string;
  statusLogin?: string;
  akses_menu?: string;
  aksesMenu?: string;
  status_menu?: string;
  statusMenu?: string;
  [key: string]: any;
}

export interface RiwayatPangkat {
  id: string;
  no?: number | string;
  nip: string;
  nama: string;
  gol: string;
  noSk: string;
  tglSk: string;
  tmt: string;
  masaKerjaThn: number;
  masaKerjaBln: number;
  timestamp?: string;
  status?: string;
  keterangan?: string;
  createdAt?: string;
  rowIndex?: number;
  [key: string]: any;
}

export interface RiwayatKGB {
  id: string;
  no?: number | string;
  nip: string;
  nama: string;
  gol: string;
  noSk: string;
  tglSk: string;
  tmt: string;
  masaKerjaThn: number;
  masaKerjaBln: number;
  gajiPokok: number;
  timestamp?: string;
  status?: string;
  keterangan?: string;
  createdAt?: string;
  rowIndex?: number;
  [key: string]: any;
}

export interface WilayahItem {
  id: string;
  name: string;
  province_id?: string;
  regency_id?: string;
}

export interface MutasiMasukItem {
  id: string;
  no?: number;
  nisn: string;
  nama: string;
  provinsiId?: string;
  provinsiNama: string;
  kabKotaId?: string;
  kabKotaNama: string;
  kecamatanId?: string;
  kecamatanNama: string;
  sekolahAsal: string;
  rombelTujuan: string;
  tanggalPengajuan?: string;
  timestamp?: string;
  tglMasuk?: string;
  status: 'Pending' | 'Diterima';
  keterangan?: string;
  createdAt?: string;
  rowIndex?: number;
}

export interface MutasiKeluarItem {
  id: string;
  no?: number | string;
  nipd?: string;
  nisn: string;
  nama: string;
  tempatLahir?: string;
  tglLahir?: string;
  rombel?: string;
  ketMutasi?: string;
  pindahKe?: string;
  tglMutasi?: string;
  alasanMutasi?: string;
  uploadBerkas?: string;
  status?: 'Selesai' | 'Diproses' | string;
  timestamp?: string;
  createdAt?: string;
  rowIndex?: number;
}

export interface PembelajaranData {
  id: string;
  no?: string | number;
  jenisRombel?: string;
  tingkat?: string;
  namaRombel?: string;
  kurikulum?: string;
  programKeahlian?: string;
  namaPtk: string;
  nuptk?: string;
  ptkInduk?: string;
  kepegawaian?: string;
  namaMatpel?: string;
  kodeMatpel?: string;
  jjm?: string | number;
  jmlSiswa?: string | number;
  tglSkMengajar?: string;
  skMengajar?: string;
  statusDiKurikulum?: string;
  rowIndex?: number;
  [key: string]: any;
}

export type ActiveTab = 
  | 'dashboard' 
  | 'gtk' 
  | 'gtk-biodata' 
  | 'gtk-pangkat' 
  | 'gtk-kgb' 
  | 'gtk-pembelajaran'
  | 'pembelajaran'
  | 'akses-menu'
  | 'biodata' 
  | 'absen-pd'
  | 'registrasi' 
  | 'data-periodik' 
  | 'absen' 
  | 'mutasi'
  | 'surat'
  | 'surat-pindah'
  | 'surat-ket-siswa'
  | 'rekap' 
  | 'rekap-pd' 
  | 'rekap-gtk';

export type AppTheme = 'aurora-glass' | 'classic';

