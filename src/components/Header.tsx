import React from 'react';
import { ActiveTab, GTKData, AppTheme } from '../types';
import { Menu, RefreshCw, FileCode, Palette } from 'lucide-react';
import { isUserRole } from '../utils/authUtils';

interface HeaderProps {
  activeTab: ActiveTab;
  onToggleMobileMenu: () => void;
  onOpenCodeGsModal: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  isGoogleSheetsConnected?: boolean;
  currentUser?: GTKData | null;
  onLogout?: () => void;
  theme?: AppTheme;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onToggleMobileMenu,
  onOpenCodeGsModal,
  onRefreshData,
  isRefreshing,
  currentUser,
  theme = 'aurora-glass',
  onToggleTheme
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Dashboard Utama', subtitle: 'Ikhtisar statistik dan ringkasan data siswa' };
      case 'biodata':
        return { title: 'Biodata Peserta Didik', subtitle: 'Informasi identitas lengkap siswa (Nama, Kelas, NIPD, NISN, JK, TTL, Agama, Alamat, Orang Tua)' };
      case 'absen-pd':
        return { title: 'Absen Peserta Didik (Absen PD)', subtitle: 'Format lembar presensi dan cetak absen siswa per rombongan belajar' };
      case 'registrasi':
        return { title: 'Registrasi Peserta Didik', subtitle: 'Status pendaftaran, tanggal masuk, dan sekolah asal' };
      case 'data-periodik':
        return { title: 'Data Periodik Siswa', subtitle: 'Ukuran fisik, jarak & waktu tempuh ke sekolah' };
      case 'absen':
        return { title: 'Verval Peserta Didik (Verval PD)', subtitle: 'Verifikasi dan validasi status keaktifan peserta didik' };
      case 'mutasi':
        return { title: 'Mutasi Peserta Didik', subtitle: 'Pencatatan dan pengajuan mutasi masuk dan mutasi keluar siswa' };
      case 'surat':
      case 'surat-pindah':
        return { title: 'Layanan Surat Peserta Didik', subtitle: 'Penerbitan Surat Keterangan Pindah dan Surat Keterangan Siswa Aktif' };
      case 'surat-ket-siswa':
        return { title: 'Surat Keterangan Siswa', subtitle: 'Penerbitan Surat Keterangan Siswa Aktif Sekolah' };
      case 'gtk':
      case 'gtk-biodata':
        return { title: 'Biodata GTK (Guru & Tenaga Kependidikan)', subtitle: 'Daftar biodata dan identitas lengkap PTK' };
      case 'gtk-pangkat':
        return { title: 'Riwayat Kepangkatan GTK', subtitle: 'Form input & data riwayat kenaikan pangkat GTK (NIP, Nama, Gol, No SK, Tgl SK, TMT, Masa Kerja)' };
      case 'gtk-kgb':
        return { title: 'Riwayat Kenaikan Gaji Berkala (KGB) GTK', subtitle: 'Form input & data riwayat KGB GTK (NIP, Nama, Gol, No SK, Tgl SK, TMT, Masa Kerja, Gaji Pokok)' };
      case 'gtk-pembelajaran':
      case 'pembelajaran':
        return { title: 'Pembelajaran & Beban Mengajar GTK', subtitle: 'Data pembagian tugas mengajar, SK mengajar, mata pelajaran, rombel, dan JJM guru dari sheet pembelajaran' };
      case 'akses-menu':
        return { title: 'Manajemen Akses Menu GTK', subtitle: 'Atur izin menu yang dapat diakses oleh masing-masing Guru & Tenaga Kependidikan' };
      case 'rekap':
      case 'rekap-pd':
        return { title: 'Rekapitulasi Peserta Didik', subtitle: 'Laporan dan rekapitulasi data siswa berdasarkan tingkat, jurusan, gender, agama, dan usia' };
      case 'rekap-gtk':
        return { title: 'Rekapitulasi GTK', subtitle: 'Laporan dan rekapitulasi guru & tenaga kependidikan berdasarkan status, jenis PTK, dan pangkat' };
      default:
        return { title: 'Data Siswa & GTK', subtitle: 'Aplikasi Terintegrasi Google Sheets SMKN 1 Palopo' };
    }
  };

  const { title } = getTabTitle();
  const isUser = isUserRole(currentUser);
  const isGlassTheme = theme === 'aurora-glass';

  return (
    <header className={`sticky top-0 z-30 px-4 lg:px-8 py-3.5 flex items-center justify-between transition-colors duration-300 ${
      isGlassTheme 
        ? 'bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-xs' 
        : 'bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-2xs'
    }`}>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 lg:hidden"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Toggle Theme Button (Tampil clean hanya nama tema) */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            id="btn-toggle-theme"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs border ${
              isGlassTheme
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 text-white border-purple-400/50 shadow-purple-500/25'
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs'
            }`}
            title={isGlassTheme ? 'Beralih ke Tema Klasik' : 'Beralih ke Tema Glassmorphic'}
          >
            <Palette className={`w-3.5 h-3.5 shrink-0 ${isGlassTheme ? 'text-amber-300 animate-pulse' : 'text-indigo-600'}`} />
            <span className="whitespace-nowrap">
              {isGlassTheme ? 'Glassmorphic' : 'Klasik'}
            </span>
          </button>
        )}

        {/* Script code.gs Button - Disembunyikan jika login sebagai user */}
        {!isUser && (
          <button
            onClick={onOpenCodeGsModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition-all border border-indigo-200 cursor-pointer shadow-2xs"
            title="Buka Panel Script code.gs & Google Sheets"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Script code.gs</span>
          </button>
        )}

        {/* Sync / Refresh Button */}
        <button
          onClick={onRefreshData}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 disabled:opacity-50 cursor-pointer"
          title="Refresh Data dari Server/Sheets"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          <span className="hidden sm:inline">Refresh Data</span>
        </button>
      </div>
    </header>
  );
};

