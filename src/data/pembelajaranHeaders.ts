import { safeGetItem, safeSetItem } from '../utils/storage';

export interface PembelajaranHeaderDefinition {
  key: string;
  label: string;
  sheetHeader: string;
  defaultVisible: boolean;
  description: string;
  align?: 'left' | 'center' | 'right';
  minWidth?: number;
}

export const ALL_PEMBELAJARAN_HEADERS: PembelajaranHeaderDefinition[] = [
  {
    key: 'no',
    label: 'No',
    sheetHeader: 'No',
    defaultVisible: true,
    description: 'Nomor urut penugasan',
    align: 'center',
    minWidth: 50
  },
  {
    key: 'jenisRombel',
    label: 'Jenis Rombel',
    sheetHeader: 'Jenis Rombel',
    defaultVisible: true,
    description: 'Jenis Rombongan Belajar (Kelas reguler / teori / praktik)',
    align: 'left',
    minWidth: 120
  },
  {
    key: 'tingkat',
    label: 'Tingkat',
    sheetHeader: 'Tingkat',
    defaultVisible: true,
    description: 'Tingkat kelas (10, 11, atau 12)',
    align: 'center',
    minWidth: 80
  },
  {
    key: 'namaRombel',
    label: 'Nama Rombel',
    sheetHeader: 'Nama Rombel',
    defaultVisible: true,
    description: 'Nama rombongan belajar / kelas',
    align: 'left',
    minWidth: 120
  },
  {
    key: 'kurikulum',
    label: 'Kurikulum',
    sheetHeader: 'Kurikulum',
    defaultVisible: true,
    description: 'Kurikulum yang digunakan (Kurikulum Merdeka / K13)',
    align: 'left',
    minWidth: 140
  },
  {
    key: 'programKeahlian',
    label: 'Program/Kompetensi Keahlian',
    sheetHeader: 'Program/Kompetensi Keahlian',
    defaultVisible: true,
    description: 'Program atau kompetensi keahlian kejuruan',
    align: 'left',
    minWidth: 180
  },
  {
    key: 'namaPtk',
    label: 'Nama PTK',
    sheetHeader: 'Nama PTK',
    defaultVisible: true,
    description: 'Nama lengkap Guru / Pendidik yang mengajar',
    align: 'left',
    minWidth: 200
  },
  {
    key: 'nuptk',
    label: 'NUPTK',
    sheetHeader: 'NUPTK',
    defaultVisible: true,
    description: 'Nomor Unik Pendidik dan Tenaga Kependidikan',
    align: 'center',
    minWidth: 140
  },
  {
    key: 'ptkInduk',
    label: 'PTK Induk',
    sheetHeader: 'PTK Induk',
    defaultVisible: true,
    description: 'Status PTK pada sekolah (Induk / Non Induk)',
    align: 'center',
    minWidth: 90
  },
  {
    key: 'kepegawaian',
    label: 'Kepegawaian',
    sheetHeader: 'Kepegawaian',
    defaultVisible: true,
    description: 'Status kepegawaian PTK (PNS, PPPK, Honorer, dll)',
    align: 'center',
    minWidth: 110
  },
  {
    key: 'namaMatpel',
    label: 'Nama Matpel',
    sheetHeader: 'Nama Matpel',
    defaultVisible: true,
    description: 'Nama mata pelajaran yang diampu',
    align: 'left',
    minWidth: 180
  },
  {
    key: 'kodeMatpel',
    label: 'Kode Matpel',
    sheetHeader: 'Kode Matpel',
    defaultVisible: true,
    description: 'Kode mata pelajaran resmi',
    align: 'center',
    minWidth: 100
  },
  {
    key: 'jjm',
    label: 'JJM',
    sheetHeader: 'JJM',
    defaultVisible: true,
    description: 'Jumlah Jam Mengajar tatap muka per minggu',
    align: 'center',
    minWidth: 70
  },
  {
    key: 'jmlSiswa',
    label: 'Jml Siswa',
    sheetHeader: 'Jml Siswa',
    defaultVisible: true,
    description: 'Jumlah peserta didik dalam rombel',
    align: 'center',
    minWidth: 80
  },
  {
    key: 'tglSkMengajar',
    label: 'Tgl SK Mengajar',
    sheetHeader: 'Tgl SK Mengajar',
    defaultVisible: true,
    description: 'Tanggal penetapan Surat Keputusan Pembagian Tugas',
    align: 'center',
    minWidth: 120
  },
  {
    key: 'skMengajar',
    label: 'SK Mengajar',
    sheetHeader: 'SK Mengajar',
    defaultVisible: true,
    description: 'Nomor SK Pembagian Tugas Mengajar',
    align: 'left',
    minWidth: 160
  },
  {
    key: 'statusDiKurikulum',
    label: 'Status di Kurikulum',
    sheetHeader: 'Status di Kurikulum',
    defaultVisible: true,
    description: 'Status penempatan mapel pada struktur kurikulum',
    align: 'center',
    minWidth: 130
  }
];

export const STORAGE_KEY_PEMBELAJARAN_HEADERS = 'dapodik_pembelajaran_visible_headers';

export const DEFAULT_VISIBLE_HEADER_KEYS = ALL_PEMBELAJARAN_HEADERS.map(h => h.key);

/**
 * Mendapatkan daftar key header pembelajaran yang diizinkan/ditampilkan oleh Admin
 */
export function getPembelajaranVisibleHeaders(): string[] {
  const cached = safeGetItem<string[] | null>(STORAGE_KEY_PEMBELAJARAN_HEADERS, null);
  if (Array.isArray(cached) && cached.length > 0) {
    // Validasi apakah key-key tersebut masih terdaftar
    const validKeys = new Set(ALL_PEMBELAJARAN_HEADERS.map(h => h.key));
    const filtered = cached.filter(k => validKeys.has(k));
    if (filtered.length > 0) {
      return filtered;
    }
  }
  return [...DEFAULT_VISIBLE_HEADER_KEYS];
}

/**
 * Menyimpan konfigurasi daftar header yang ditampilkan (Hanya Admin)
 */
export function savePembelajaranVisibleHeaders(keys: string[]): void {
  safeSetItem(STORAGE_KEY_PEMBELAJARAN_HEADERS, keys);
  try {
    window.dispatchEvent(new CustomEvent('pembelajaran_headers_updated', { detail: keys }));
  } catch {}
}
