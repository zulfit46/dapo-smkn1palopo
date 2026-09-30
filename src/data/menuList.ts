import { ActiveTab, GTKData, WaliKelas } from '../types';
import { isUserRole, getWaliKelasForUser } from '../utils/authUtils';

export interface MenuItemDefinition {
  id: string;
  kode: string;
  nama: string;
  kategori: 'Dashboard' | 'GTK' | 'Peserta Didik' | 'Rekapitulasi';
  tab: ActiveTab;
  aliases: string[];
  deskripsi: string;
  contohInput: string;
}

/**
 * Daftar Resmi Kode Menu yang dapat diinputkan pada kolom 'akses_menu' sheet gtk.
 * Format standar menggunakan: <kelompok_menu>-<nama_sub_menu>
 */
export const DAFTAR_AKSES_MENU: MenuItemDefinition[] = [
  // 1. DASHBOARD
  {
    id: 'dashboard',
    kode: 'dashboard',
    nama: 'Dashboard Utama',
    kategori: 'Dashboard',
    tab: 'dashboard',
    aliases: ['dashboard', 'dashboard-utama', 'home', 'beranda'],
    deskripsi: 'Ikhtisar statistik total siswa, rombel, gender, dan profil sekolah',
    contohInput: 'dashboard'
  },

  // 2. GTK (GURU & TENAGA KEPENDIDIKAN)
  {
    id: 'gtk-biodata',
    kode: 'gtk-biodata',
    nama: 'Biodata GTK',
    kategori: 'GTK',
    tab: 'gtk-biodata',
    aliases: ['gtk-biodata', 'gtk', 'biodata-gtk', 'gtk-data', 'data-gtk'],
    deskripsi: 'Daftar data dan profil Guru serta Tenaga Kependidikan',
    contohInput: 'gtk-biodata'
  },
  {
    id: 'gtk-pangkat',
    kode: 'gtk-pangkat',
    nama: 'Pangkat GTK',
    kategori: 'GTK',
    tab: 'gtk-pangkat',
    aliases: ['gtk-pangkat', 'pangkat', 'naikpangkat', 'riwayat-pangkat', 'pangkat-gtk'],
    deskripsi: 'Riwayat SK dan kenaikan pangkat GTK',
    contohInput: 'gtk-pangkat'
  },
  {
    id: 'gtk-kgb',
    kode: 'gtk-kgb',
    nama: 'KGB GTK (Gaji Berkala)',
    kategori: 'GTK',
    tab: 'gtk-kgb',
    aliases: ['gtk-kgb', 'kgb', 'gajiberkala', 'riwayat-kgb', 'kgb-gtk'],
    deskripsi: 'Riwayat kenaikan gaji berkala (KGB) GTK',
    contohInput: 'gtk-kgb'
  },
  {
    id: 'gtk-pembelajaran',
    kode: 'gtk-pembelajaran',
    nama: 'Pembelajaran',
    kategori: 'GTK',
    tab: 'gtk-pembelajaran',
    aliases: ['gtk-pembelajaran', 'pembelajaran', 'jadwal-pembelajaran', 'mengajar', 'sk-mengajar', 'pembagian-tugas', 'tugas-mengajar'],
    deskripsi: 'Data SK pembagian tugas mengajar, rombel, mapel, dan jam mengajar (JJM) GTK',
    contohInput: 'gtk-pembelajaran'
  },
  {
    id: 'gtk-akses_menu',
    kode: 'gtk-akses_menu',
    nama: 'Akses Menu',
    kategori: 'GTK',
    tab: 'akses-menu',
    aliases: ['gtk-akses_menu', 'gtk-aksesmenu', 'akses-menu', 'aksesmenu', 'atur-akses', 'kelola-akses', 'hak-akses', 'hakakses', 'izin-menu', 'menu-akses'],
    deskripsi: 'Pengaturan hak akses menu untuk setiap akun GTK oleh Administrator',
    contohInput: 'gtk-akses_menu'
  },

  // 3. PESERTA DIDIK
  {
    id: 'peserta_didik-biodata',
    kode: 'peserta_didik-biodata',
    nama: 'Biodata Peserta Didik',
    kategori: 'Peserta Didik',
    tab: 'biodata',
    aliases: ['peserta_didik-biodata', 'peserta-didik-biodata', 'biodata', 'biodata-pd', 'pd-biodata', 'siswa', 'biodata-siswa'],
    deskripsi: 'Identitas lengkap siswa (Nama, Kelas, NISN, NIPD, Agama, Orang Tua, Alamat)',
    contohInput: 'peserta_didik-biodata'
  },
  {
    id: 'peserta_didik-absenPD',
    kode: 'peserta_didik-absenPD',
    nama: 'Absen PD (Presensi Rombel)',
    kategori: 'Peserta Didik',
    tab: 'absen-pd',
    aliases: ['peserta_didik-absenpd', 'peserta_didik-absen-pd', 'peserta-didik-absen-pd', 'peserta-didik-absenpd', 'absen-pd', 'absenpd', 'lembar-absen'],
    deskripsi: 'Format tabel lembar presensi (18 pertemuan) dan pencetakan PDF per rombel',
    contohInput: 'peserta_didik-absenPD'
  },
  {
    id: 'peserta_didik-registrasi',
    kode: 'peserta_didik-registrasi',
    nama: 'Registrasi Peserta Didik',
    kategori: 'Peserta Didik',
    tab: 'registrasi',
    aliases: ['peserta_didik-registrasi', 'peserta-didik-registrasi', 'registrasi', 'registrasi-pd', 'pd-registrasi', 'registrasi-siswa'],
    deskripsi: 'Status registrasi, tanggal masuk, sekolah asal, dan nomor peserta ujian',
    contohInput: 'peserta_didik-registrasi'
  },
  {
    id: 'peserta_didik-data_periodik',
    kode: 'peserta_didik-data_periodik',
    nama: 'Data Periodik Siswa',
    kategori: 'Peserta Didik',
    tab: 'data-periodik',
    aliases: ['peserta_didik-data_periodik', 'peserta_didik-data-periodik', 'peserta-didik-data-periodik', 'data-periodik', 'periodik', 'data-periodik-pd'],
    deskripsi: 'Tinggi badan, berat badan, jarak ke sekolah, waktu tempuh, dan saudara kandung',
    contohInput: 'peserta_didik-data_periodik'
  },
  {
    id: 'peserta_didik-vervalPD',
    kode: 'peserta_didik-vervalPD',
    nama: 'Verval PD (Status Siswa)',
    kategori: 'Peserta Didik',
    tab: 'absen',
    aliases: ['peserta_didik-vervalpd', 'peserta_didik-verval-pd', 'peserta-didik-verval-pd', 'peserta_didik-absen', 'absen', 'verval-pd', 'verval'],
    deskripsi: 'Verifikasi dan validasi status peserta didik (Aktif, Mutasi, Lulus, Dikeluarkan)',
    contohInput: 'peserta_didik-vervalPD'
  },
  {
    id: 'peserta_didik-mutasi',
    kode: 'peserta_didik-mutasi',
    nama: 'Mutasi Peserta Didik',
    kategori: 'Peserta Didik',
    tab: 'mutasi',
    aliases: ['peserta_didik-mutasi', 'peserta-didik-mutasi', 'mutasi', 'mutasi-pd', 'pd-mutasi', 'mutasi-siswa', 'mutasi-masuk', 'mutasi-keluar'],
    deskripsi: 'Pengajuan dan pencatatan mutasi masuk dan mutasi keluar peserta didik',
    contohInput: 'peserta_didik-mutasi'
  },
  {
    id: 'peserta_didik-surat',
    kode: 'peserta_didik-surat',
    nama: 'Surat Peserta Didik',
    kategori: 'Peserta Didik',
    tab: 'surat',
    aliases: ['peserta_didik-surat', 'peserta-didik-surat', 'surat', 'surat-pd', 'surat-pindah', 'surat-ket-siswa'],
    deskripsi: 'Penerbitan Surat Keterangan Pindah dan Surat Keterangan Siswa Aktif dengan Kop Resmi',
    contohInput: 'peserta_didik-surat'
  },

  // 4. REKAPITULASI
  {
    id: 'rekapitulasi-pd',
    kode: 'rekapitulasi-pd',
    nama: 'Rekap Peserta Didik',
    kategori: 'Rekapitulasi',
    tab: 'rekap-pd',
    aliases: [
      'rekapitulasi-pd',
      'rekapitulasi-peserta_didik',
      'rekapitulasi-pesertadidik',
      'rekapitulasi-peserta-didik',
      'rekap-peserta-didik',
      'rekap-pesertadidik',
      'rekap-pd',
      'rekap',
      'rekap-siswa',
      'rekapitulasi-siswa',
      'peserta_didik-rekap'
    ],
    deskripsi: 'Statistik agregasi siswa per rombel, jurusan, tingkat, dan gender',
    contohInput: 'rekapitulasi-peserta_didik'
  },
  {
    id: 'rekapitulasi-gtk',
    kode: 'rekapitulasi-gtk',
    nama: 'Rekap GTK',
    kategori: 'Rekapitulasi',
    tab: 'rekap-gtk',
    aliases: [
      'rekapitulasi-gtk',
      'rekapitulasi-guru',
      'rekapitulasi-ptk',
      'rekap-gtk',
      'rekap-guru',
      'rekap-ptk',
      'gtk-rekap'
    ],
    deskripsi: 'Statistik agregasi GTK berdasarkan status kepegawaian, jenis PTK, dan gender',
    contohInput: 'rekapitulasi-gtk'
  }
];

/**
 * Normalisasi string kode menu (lowercase, ubah dash/underscore ke format standar)
 */
export function normalizeMenuCode(code: string): string {
  return code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Parsing isi kolom 'akses_menu' dari sheet gtk
 * Mengembalikan:
 * - null jika tidak ada batasan (kolom kosong/undefined -> gunakan hak akses default sesuai role)
 * - Set<ActiveTab> berisi tab yang diizinkan jika kolom terisi
 */
export function parseAksesMenuString(raw?: string | null): Set<ActiveTab> | null {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'default') {
    return null;
  }

  // Jika diisi wildcard bintang atau semua/all -> akses seluruh tab
  const lower = trimmed.toLowerCase();
  if (lower === '*' || lower === 'semua' || lower === 'all' || lower === 'full') {
    const allTabs = new Set<ActiveTab>(DAFTAR_AKSES_MENU.map(m => m.tab));
    allTabs.add('gtk');
    allTabs.add('rekap');
    return allTabs;
  }

  // Pisahkan berdasarkan spasi, koma, titik koma, pipa, atau enter
  const tokens = trimmed.split(/[\s,;|\n\r]+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const allowedTabs = new Set<ActiveTab>();

  tokens.forEach(token => {
    const clean = normalizeMenuCode(token);
    if (!clean) return;

    // Cek apakah wildcard kategori
    // 1. Kategori Peserta Didik
    if (clean === 'pesertadidik' || clean === 'peserta_didik' || clean === 'pd') {
      allowedTabs.add('biodata');
      allowedTabs.add('absen-pd');
      allowedTabs.add('registrasi');
      allowedTabs.add('data-periodik');
      allowedTabs.add('absen');
      return;
    }

    // 2. Kategori GTK
    if (clean === 'gtk' || clean === 'gurudantenagakependidikan') {
      allowedTabs.add('gtk-biodata');
      allowedTabs.add('gtk');
      allowedTabs.add('gtk-pangkat');
      allowedTabs.add('gtk-kgb');
      allowedTabs.add('gtk-pembelajaran');
      allowedTabs.add('pembelajaran');
      return;
    }

    // 3. Kategori Rekapitulasi
    if (clean === 'rekap' || clean === 'rekapitulasi') {
      allowedTabs.add('rekap-pd');
      allowedTabs.add('rekap');
      allowedTabs.add('rekap-gtk');
      return;
    }

    // Cek pencocokan dengan daftar menu resmi atau alias
    for (const menu of DAFTAR_AKSES_MENU) {
      const matchKode = normalizeMenuCode(menu.kode) === clean;
      const matchAlias = menu.aliases.some(alias => normalizeMenuCode(alias) === clean);

      if (matchKode || matchAlias) {
        allowedTabs.add(menu.tab);
        if (menu.tab === 'gtk-biodata') allowedTabs.add('gtk');
        if (menu.tab === 'rekap-pd') allowedTabs.add('rekap');
      }
    }
  });

  return allowedTabs;
}

/**
 * Ekstrak string raw kolom 'akses_menu' secara aman dan case-insensitive dari objek GTK
 */
export function extractRawAksesMenu(currentUser?: GTKData | any | null): string {
  if (!currentUser || typeof currentUser !== 'object') return '';
  if (currentUser.akses_menu !== undefined && currentUser.akses_menu !== null && String(currentUser.akses_menu).trim()) {
    return String(currentUser.akses_menu).trim();
  }
  if (currentUser.aksesMenu !== undefined && currentUser.aksesMenu !== null && String(currentUser.aksesMenu).trim()) {
    return String(currentUser.aksesMenu).trim();
  }
  if (currentUser.status_menu !== undefined && currentUser.status_menu !== null && String(currentUser.status_menu).trim()) {
    return String(currentUser.status_menu).trim();
  }
  if (currentUser.statusMenu !== undefined && currentUser.statusMenu !== null && String(currentUser.statusMenu).trim()) {
    return String(currentUser.statusMenu).trim();
  }
  if (currentUser.hak_akses !== undefined && currentUser.hak_akses !== null && String(currentUser.hak_akses).trim()) {
    return String(currentUser.hak_akses).trim();
  }
  if (currentUser.hakAkses !== undefined && currentUser.hakAkses !== null && String(currentUser.hakAkses).trim()) {
    return String(currentUser.hakAkses).trim();
  }

  // Scan case-insensitive keys (misal: "Akses Menu", "AKSES_MENU", "Hak Akses")
  for (const key of Object.keys(currentUser)) {
    const kClean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
      kClean === 'aksesmenu' ||
      kClean === 'statusmenu' ||
      kClean === 'hakakses' ||
      kClean === 'menuakses' ||
      kClean === 'izinmenu'
    ) {
      const val = currentUser[key];
      if (val !== undefined && val !== null && String(val).trim()) {
        return String(val).trim();
      }
    }
  }

  return '';
}

/**
 * Cek apakah sebuah tab diizinkan untuk GTK yang sedang login
 */
export function isTabPermitted(
  tab: ActiveTab,
  currentUser?: GTKData | null,
  waliKelasList?: WaliKelas[]
): boolean {
  if (!currentUser) return true;

  // PENGECUALIAN KHUSUS:
  // Menu Verval PD ('absen') SELALU diizinkan jika GTK tersebut adalah Wali Kelas,
  // meskipun di pengaturan akses_menu / kolom akses_menu di spreadsheet ditiadakan.
  if (tab === 'absen' && Boolean(getWaliKelasForUser(currentUser, waliKelasList))) {
    return true;
  }

  // Baca raw string akses_menu (bisa dari akses_menu, aksesMenu, status_menu, statusMenu, hak_akses, dsb.)
  const rawAksesMenu = extractRawAksesMenu(currentUser);

  const parsedSet = parseAksesMenuString(rawAksesMenu);

  // 1. JIKA ADA DEFINISI AKSES_MENU DI SHEET GTK:
  // Berlaku aturan: HANYA tab yang ada di dalam parsedSet yang boleh diakses!
  if (parsedSet !== null) {
    if (tab === 'gtk' && parsedSet.has('gtk-biodata')) return true;
    if (tab === 'gtk-biodata' && parsedSet.has('gtk')) return true;
    if (tab === 'rekap' && parsedSet.has('rekap-pd')) return true;
    if (tab === 'rekap-pd' && parsedSet.has('rekap')) return true;

    return parsedSet.has(tab);
  }

  // 2. JIKA KOLOM AKSES_MENU KOSONG -> Menggunakan aturan hak akses default
  const isUser = isUserRole(currentUser);
  if (!isUser) {
    // Role non-user (Admin / Super Admin) memiliki akses penuh ke semua menu
    return true;
  }

  // Role 'user' biasa:
  // Menu Manajemen Akses Menu hanya untuk Admin secara default
  if (tab === 'akses-menu') {
    return false;
  }

  // Verval PD hanya bisa diakses jika merupakan Wali Kelas
  if (tab === 'absen') {
    return Boolean(getWaliKelasForUser(currentUser, waliKelasList));
  }

  // Tab lainnya dapat diakses secara default
  return true;
}

/**
 * Cek apakah sebuah kategori menu memiliki minimal 1 sub-menu yang boleh diakses
 */
export function isCategoryPermitted(
  category: 'gtk' | 'peserta-didik' | 'rekap',
  currentUser?: GTKData | null,
  waliKelasList?: WaliKelas[]
): boolean {
  if (category === 'gtk') {
    return (
      isTabPermitted('gtk-biodata', currentUser, waliKelasList) ||
      isTabPermitted('gtk-pangkat', currentUser, waliKelasList) ||
      isTabPermitted('gtk-kgb', currentUser, waliKelasList) ||
      isTabPermitted('gtk-pembelajaran', currentUser, waliKelasList) ||
      isTabPermitted('akses-menu', currentUser, waliKelasList)
    );
  }

  if (category === 'peserta-didik') {
    return (
      isTabPermitted('biodata', currentUser, waliKelasList) ||
      isTabPermitted('absen-pd', currentUser, waliKelasList) ||
      isTabPermitted('registrasi', currentUser, waliKelasList) ||
      isTabPermitted('data-periodik', currentUser, waliKelasList) ||
      isTabPermitted('absen', currentUser, waliKelasList) ||
      isTabPermitted('mutasi', currentUser, waliKelasList) ||
      isTabPermitted('surat', currentUser, waliKelasList)
    );
  }

  if (category === 'rekap') {
    return (
      isTabPermitted('rekap-pd', currentUser, waliKelasList) ||
      isTabPermitted('rekap-gtk', currentUser, waliKelasList)
    );
  }

  return true;
}

/**
 * Mendapatkan tab pertama yang diizinkan untuk pengguna
 * Digunakan untuk redirect otomatis jika tab yang aktif saat ini tidak boleh diakses
 */
export function getFirstPermittedTab(
  currentUser?: GTKData | null,
  waliKelasList?: WaliKelas[]
): ActiveTab {
  // Urutan prioritas pengecekan tab default
  const priorityOrder: ActiveTab[] = [
    'dashboard',
    'biodata',
    'absen-pd',
    'registrasi',
    'data-periodik',
    'absen',
    'gtk-biodata',
    'gtk-pangkat',
    'gtk-kgb',
    'rekap-pd',
    'rekap-gtk'
  ];

  for (const tab of priorityOrder) {
    if (isTabPermitted(tab, currentUser, waliKelasList)) {
      return tab;
    }
  }

  return 'dashboard';
}
