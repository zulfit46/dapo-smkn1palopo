import React, { useState } from 'react';
import { ActiveTab, GTKData, WaliKelas, AppTheme } from '../types';
import { SPREADSHEET_ID, SHEET_NAME } from '../data/codeGsScript';
import { DAPO1_BASE64 } from '../assets/dapo1Base64';
import { isUserRole, getWaliKelasForUser } from '../utils/authUtils';
import { isTabPermitted, isCategoryPermitted } from '../data/menuList';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  FileText, 
  Activity, 
  CalendarCheck, 
  BarChart3, 
  ChevronDown, 
  ChevronRight, 
  FileCode, 
  ExternalLink,
  GraduationCap,
  Sparkles,
  Award,
  CreditCard,
  LogOut,
  User,
  Palette,
  KeyRound,
  ArrowLeftRight,
  BookOpen,
  FileCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenCodeGsModal: () => void;
  onOpenDaftarMenuModal?: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isGoogleSheetsConnected: boolean;
  currentUser?: GTKData | null;
  waliKelasList?: WaliKelas[];
  onLogout?: () => void;
  theme?: AppTheme;
  onToggleTheme?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCodeGsModal,
  onOpenDaftarMenuModal,
  isMobileOpen,
  setIsMobileOpen,
  isGoogleSheetsConnected,
  currentUser,
  waliKelasList = [],
  onLogout,
  theme = 'aurora-glass',
  onToggleTheme
}) => {
  // Accordion state: hanya satu grup menu yang terbuka pada satu waktu
  const [openMenu, setOpenMenu] = useState<'gtk' | 'peserta-didik' | 'rekap' | null>(() => {
    if (activeTab === 'gtk' || activeTab === 'gtk-biodata' || activeTab === 'gtk-pangkat' || activeTab === 'gtk-kgb' || activeTab === 'gtk-pembelajaran' || activeTab === 'pembelajaran' || activeTab === 'akses-menu') return 'gtk';
    if (activeTab === 'biodata' || activeTab === 'registrasi' || activeTab === 'data-periodik' || activeTab === 'absen' || activeTab === 'mutasi' || activeTab === 'absen-pd') return 'peserta-didik';
    if (activeTab === 'rekap' || activeTab === 'rekap-pd' || activeTab === 'rekap-gtk') return 'rekap';
    return null;
  });
  const [logoError, setLogoError] = useState(false);

  const isGlass = theme === 'aurora-glass';

  // Fungsi toggle menu dengan sistem accordion (jika satu dibuka, yang lain otomatis menutup)
  const toggleMenu = (menu: 'gtk' | 'peserta-didik' | 'rekap') => {
    setOpenMenu(prev => prev === menu ? null : menu);
  };

  const isGTKOpen = openMenu === 'gtk';
  const isPesertaDidikOpen = openMenu === 'peserta-didik';
  const isRekapOpen = openMenu === 'rekap';

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  const isGTKActive = activeTab === 'gtk' || activeTab === 'gtk-biodata' || activeTab === 'gtk-pangkat' || activeTab === 'gtk-kgb' || activeTab === 'gtk-pembelajaran' || activeTab === 'pembelajaran' || activeTab === 'akses-menu';
  const isPesertaDidikActive = activeTab === 'biodata' || activeTab === 'absen-pd' || activeTab === 'registrasi' || activeTab === 'data-periodik' || activeTab === 'absen' || activeTab === 'mutasi' || activeTab === 'surat' || activeTab === 'surat-pindah' || activeTab === 'surat-ket-siswa';
  const isRekapActive = activeTab === 'rekap' || activeTab === 'rekap-pd' || activeTab === 'rekap-gtk';
  const isUser = isUserRole(currentUser);
  const userWali = getWaliKelasForUser(currentUser, waliKelasList);
  const canAccessVerval = !isUser || Boolean(userWali);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 flex flex-col transition-all duration-300 ease-in-out ${
          isGlass
            ? 'bg-gradient-to-b from-[#2e1065] via-[#3b127e] to-[#1c0847] text-purple-100 border-r border-purple-500/25 shadow-2xl backdrop-blur-md'
            : 'bg-slate-900 text-slate-300 border-r border-slate-800'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className={`p-5 flex items-center justify-between border-b ${
          isGlass ? 'border-purple-500/25' : 'border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg overflow-hidden border shrink-0 p-0 ${
              isGlass 
                ? 'bg-purple-900/60 border-purple-300/40 shadow-purple-950/60' 
                : 'bg-slate-800 border-white/20'
            }`}>
              <img 
                src={DAPO1_BASE64 || "/dapo-1.png"} 
                alt="Logo SMKN 1 Palopo" 
                className="w-full h-full object-cover block"
                loading="eager"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (target.src !== DAPO1_BASE64 && DAPO1_BASE64) {
                    target.src = DAPO1_BASE64;
                  } else {
                    setLogoError(true);
                  }
                }}
              />
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-tight leading-tight">
                SMKN 1 Palopo
              </h1>
              <span className={`text-[11px] font-medium flex items-center gap-1 ${
                isGlass ? 'text-purple-300' : 'text-slate-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isGoogleSheetsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {isGoogleSheetsConnected ? 'Online' : 'Mode Lokal'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <p className={`px-3 text-[10px] font-bold uppercase tracking-wider mb-2 ${
            isGlass ? 'text-purple-300/60' : 'text-slate-500'
          }`}>
            Menu Utama
          </p>

          {/* 1. Dashboard */}
          {isTabPermitted('dashboard', currentUser, waliKelasList) && (
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? isGlass
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/35 border border-white/20'
                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : isGlass
                    ? 'text-purple-200/80 hover:bg-white/10 hover:text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>
          )}

          {/* 2. GTK (Collapsible Parent) */}
          {isCategoryPermitted('gtk', currentUser, waliKelasList) && (
            <div className="space-y-1">
              <button
                onClick={() => toggleMenu('gtk')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isGTKActive
                    ? isGlass
                      ? 'bg-white/15 text-emerald-300 font-bold'
                      : 'bg-slate-800/80 text-emerald-300'
                    : isGlass
                      ? 'text-purple-200/80 hover:bg-white/10 hover:text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>GTK</span>
                </div>
                {isGTKOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {/* Submenu Items for GTK */}
              {isGTKOpen && (
                <div className={`pl-6 space-y-1 pr-1 border-l-2 ml-5 py-1 ${
                  isGlass ? 'border-purple-400/30' : 'border-emerald-500/20'
                }`}>
                  {/* Submenu: Biodata GTK */}
                  {isTabPermitted('gtk-biodata', currentUser, waliKelasList) && (
                    <button
                      onClick={() => handleNavClick('gtk-biodata')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'gtk-biodata' || activeTab === 'gtk'
                          ? isGlass
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-emerald-600 text-white shadow-xs'
                          : isGlass
                            ? 'text-purple-300/70 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Biodata</span>
                      </div>
                      {(activeTab === 'gtk-biodata' || activeTab === 'gtk') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  )}

                  {/* Submenu: Pangkat GTK */}
                  {isTabPermitted('gtk-pangkat', currentUser, waliKelasList) && (
                    <button
                      onClick={() => handleNavClick('gtk-pangkat')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'gtk-pangkat'
                          ? isGlass
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-emerald-600 text-white shadow-xs'
                          : isGlass
                            ? 'text-purple-300/70 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5" />
                        <span>Pangkat</span>
                      </div>
                      {activeTab === 'gtk-pangkat' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  )}

                  {/* Submenu: KGB GTK */}
                  {isTabPermitted('gtk-kgb', currentUser, waliKelasList) && (
                    <button
                      onClick={() => handleNavClick('gtk-kgb')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'gtk-kgb'
                          ? isGlass
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-emerald-600 text-white shadow-xs'
                          : isGlass
                            ? 'text-purple-300/70 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>KGB</span>
                      </div>
                      {activeTab === 'gtk-kgb' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  )}

                  {/* Submenu: Pembelajaran GTK */}
                  {isTabPermitted('gtk-pembelajaran', currentUser, waliKelasList) && (
                    <button
                      onClick={() => handleNavClick('gtk-pembelajaran')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'gtk-pembelajaran' || activeTab === 'pembelajaran'
                          ? isGlass
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-emerald-600 text-white shadow-xs'
                          : isGlass
                            ? 'text-purple-300/70 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Pembelajaran</span>
                      </div>
                      {(activeTab === 'gtk-pembelajaran' || activeTab === 'pembelajaran') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  )}

                  {/* Submenu: Akses Menu */}
                  {isTabPermitted('akses-menu', currentUser, waliKelasList) && (
                    <button
                      onClick={() => handleNavClick('akses-menu')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'akses-menu'
                          ? isGlass
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30 font-bold'
                            : 'bg-amber-600 text-white shadow-xs font-bold'
                          : isGlass
                            ? 'text-purple-300/70 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>Akses Menu</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          activeTab === 'akses-menu'
                            ? 'bg-white/25 text-white'
                            : isGlass
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          Admin
                        </span>
                        {activeTab === 'akses-menu' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Peserta Didik (Collapsible Parent) */}
          {isCategoryPermitted('peserta-didik', currentUser, waliKelasList) && (
            <div className="space-y-1">
              <button
                onClick={() => toggleMenu('peserta-didik')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isPesertaDidikActive
                    ? isGlass
                      ? 'bg-white/15 text-indigo-300 font-bold'
                      : 'bg-slate-800/80 text-indigo-300'
                    : isGlass
                      ? 'text-purple-200/80 hover:bg-white/10 hover:text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 shrink-0 text-indigo-400" />
                  <span>Peserta Didik</span>
                </div>
                {isPesertaDidikOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {/* Submenu Items */}
              {isPesertaDidikOpen && (
                <div className={`pl-6 space-y-1 pr-1 border-l-2 ml-5 py-1 ${
                  isGlass ? 'border-purple-400/30' : 'border-indigo-500/20'
                }`}>
                  {/* Submenu: Biodata */}
                  {isTabPermitted('biodata', currentUser, waliKelasList) && (
                    <button
                      onClick={() => handleNavClick('biodata')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'biodata'
                          ? isGlass
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-indigo-600 text-white shadow-xs'
                          : isGlass
                            ? 'text-purple-300/70 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Biodata</span>
                      </div>
                      {activeTab === 'biodata' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  )}

                  {/* Submenu: Absen PD */}
                  {isTabPermitted('absen-pd', currentUser, waliKelasList) && (
                    <button
                      onClick={() => handleNavClick('absen-pd')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'absen-pd'
                          ? isGlass
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-indigo-600 text-white shadow-xs'
                          : isGlass
                            ? 'text-purple-300/70 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>Absen PD</span>
                      </div>
                      {activeTab === 'absen-pd' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  )}

                  {/* Submenu: Registrasi */}
                  {isTabPermitted('registrasi', currentUser, waliKelasList) && (
                    <button
                      onClick={() => handleNavClick('registrasi')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'registrasi'
                          ? isGlass
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-indigo-600 text-white shadow-xs'
                          : isGlass
                            ? 'text-purple-300/70 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Registrasi</span>
                    </button>
                  )}

                  {/* Submenu: Data Periodik */}
                  {isTabPermitted('data-periodik', currentUser, waliKelasList) && (
                    <button
                      onClick={() => handleNavClick('data-periodik')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'data-periodik'
                          ? isGlass
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-indigo-600 text-white shadow-xs'
                          : isGlass
                            ? 'text-purple-300/70 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Data Periodik</span>
                    </button>
                  )}

                  {/* Submenu: Verval PD */}
                  {isTabPermitted('absen', currentUser, waliKelasList) && (
                    <button
                      onClick={() => handleNavClick('absen')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'absen'
                          ? isGlass
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-indigo-600 text-white shadow-xs'
                          : isGlass
                            ? 'text-purple-300/70 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <UserCheck className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Verval PD</span>
                      </div>
                      {activeTab === 'absen' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      )}
                    </button>
                  )}

                  {/* Submenu: Mutasi */}
                  {isTabPermitted('mutasi', currentUser, waliKelasList) && (
                    <button
                      onClick={() => handleNavClick('mutasi')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'mutasi'
                          ? isGlass
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-indigo-600 text-white shadow-xs'
                          : isGlass
                            ? 'text-purple-300/70 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ArrowLeftRight className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span className="truncate">Mutasi</span>
                      </div>
                      {activeTab === 'mutasi' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      )}
                    </button>
                  )}

                  {/* Submenu: Surat Peserta Didik */}
                  {isTabPermitted('surat', currentUser, waliKelasList) && (
                    <button
                      onClick={() => handleNavClick('surat')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'surat' || activeTab === 'surat-pindah' || activeTab === 'surat-ket-siswa'
                          ? isGlass
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-indigo-600 text-white shadow-xs'
                          : isGlass
                            ? 'text-purple-300/70 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span className="truncate">Surat PD</span>
                      </div>
                      {(activeTab === 'surat' || activeTab === 'surat-pindah' || activeTab === 'surat-ket-siswa') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. Rekapitulasi (Collapsible Parent) */}
          {isCategoryPermitted('rekap', currentUser, waliKelasList) && (
            <div className="space-y-1">
              <button
                onClick={() => toggleMenu('rekap')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isRekapActive
                    ? isGlass
                      ? 'bg-white/15 text-amber-300 font-bold'
                      : 'bg-slate-800/80 text-amber-300'
                    : isGlass
                      ? 'text-purple-200/80 hover:bg-white/10 hover:text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Rekapitulasi</span>
                </div>
                {isRekapOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {/* Submenu Items for Rekapitulasi */}
              {isRekapOpen && (
                <div className={`pl-6 space-y-1 pr-1 border-l-2 ml-5 py-1 ${
                  isGlass ? 'border-purple-400/30' : 'border-amber-500/20'
                }`}>
                  {/* Submenu: Rekap Peserta Didik */}
                  {isTabPermitted('rekap-pd', currentUser, waliKelasList) && (
                    <button
                      onClick={() => handleNavClick('rekap-pd')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'rekap-pd' || activeTab === 'rekap'
                          ? isGlass
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-amber-600 text-white shadow-xs'
                          : isGlass
                            ? 'text-purple-300/70 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" />
                        <span>Peserta Didik</span>
                      </div>
                      {(activeTab === 'rekap-pd' || activeTab === 'rekap') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  )}

                  {/* Submenu: Rekap GTK */}
                  {isTabPermitted('rekap-gtk', currentUser, waliKelasList) && (
                    <button
                      onClick={() => handleNavClick('rekap-gtk')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'rekap-gtk'
                          ? isGlass
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-emerald-600 text-white shadow-xs'
                          : isGlass
                            ? 'text-purple-300/70 hover:bg-white/10 hover:text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>GTK</span>
                      </div>
                      {activeTab === 'rekap-gtk' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Database Integrasi & Code.gs Modal Shortcut Button - Disembunyikan jika role user */}
          {!isUser && (
            <div className="pt-4 pb-2">
              <p className={`px-3 text-[10px] font-bold uppercase tracking-wider mb-2 ${
                isGlass ? 'text-purple-300/60' : 'text-slate-500'
              }`}>
                Database Integrasi
              </p>

              <button
                onClick={() => {
                  onOpenCodeGsModal();
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-xs group cursor-pointer ${
                  isGlass
                    ? 'bg-purple-900/40 border-purple-400/30 hover:border-purple-300 text-purple-200 shadow-sm'
                    : 'bg-gradient-to-r from-indigo-950/80 to-slate-800 border-indigo-500/30 hover:border-indigo-400 text-indigo-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg group-hover:scale-105 transition-transform ${
                    isGlass ? 'bg-purple-600/30 text-purple-300' : 'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold block text-white text-xs">Script code.gs</span>
                    <span className={`text-[10px] ${isGlass ? 'text-purple-300/70' : 'text-slate-400'}`}>Google Apps Script</span>
                  </div>
                </div>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
              </button>

              {/* Tombol Panduan Kode Akses Menu */}
              {/* {onOpenDaftarMenuModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenDaftarMenuModal();
                    setIsMobileOpen(false);
                  }}
                  className={`w-full mt-2 flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs group cursor-pointer ${
                    isGlass
                      ? 'bg-purple-900/30 border-purple-400/20 hover:border-purple-300 text-purple-200'
                      : 'bg-slate-800/80 border-slate-700 hover:border-indigo-400 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg group-hover:scale-105 transition-transform ${
                      isGlass ? 'bg-purple-600/30 text-purple-300' : 'bg-indigo-500/20 text-indigo-400'
                    }`}>
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold block text-white text-xs">Kode Akses Menu</span>
                      <span className={`text-[10px] ${isGlass ? 'text-purple-300/70' : 'text-slate-400'}`}>Panduan Sheet GTK</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                    isGlass ? 'bg-purple-500/30 text-purple-200' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}>
                    Daftar
                  </span>
                </button>
              )} */}
            </div>
          )}

          {/* Theme Switcher Button in Sidebar Navigation */}
          {onToggleTheme && (
            <div className="pt-2 pb-1">
              <p className={`px-3 text-[10px] font-bold uppercase tracking-wider mb-2 ${
                isGlass ? 'text-purple-300/60' : 'text-slate-500'
              }`}>
                Tampilan & Tema
              </p>
              <button
                onClick={onToggleTheme}
                id="sidebar-btn-toggle-theme"
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs cursor-pointer shadow-xs ${
                  isGlass
                    ? 'bg-purple-900/50 hover:bg-purple-800/60 border-purple-400/40 text-white'
                    : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-200'
                }`}
                title={isGlass ? 'Beralih ke Tema Klasik' : 'Beralih ke Tema Glassmorphic'}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${
                    isGlass ? 'bg-purple-600/40 text-amber-300' : 'bg-slate-700 text-indigo-400'
                  }`}>
                    <Palette className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold block text-white text-xs">
                      {isGlass ? 'Glassmorphic' : 'Klasik'}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          )}
        </nav>

        {/* User Card at bottom of Sidebar */}
        {currentUser && (
          <div className={`p-3.5 border-t text-xs mt-auto ${
            isGlass 
              ? 'bg-purple-950/70 border-purple-500/25' 
              : 'bg-slate-950/80 border-slate-800'
          }`}>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                isGlass
                  ? 'bg-purple-700/50 text-purple-200 border border-purple-400/40'
                  : 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
              }`}>
                {currentUser.nama ? currentUser.nama.charAt(0).toUpperCase() : 'G'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate" title={currentUser.nama}>
                  {currentUser.nama}
                </p>
                <p className={`text-[10px] truncate ${isGlass ? 'text-purple-300/70' : 'text-slate-400'}`}>
                  NIP: {currentUser.nip || '-'}
                </p>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 transition-all font-semibold text-xs cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
