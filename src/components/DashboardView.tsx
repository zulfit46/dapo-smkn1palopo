import React, { useState, useMemo } from 'react';
import { Student, ActiveTab, AppTheme } from '../types';
import { 
  Smile, 
  User, 
  Users, 
  ArrowRight, 
  GraduationCap, 
  TrendingUp, 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  Award, 
  CreditCard,
  Layers,
  Activity,
  PieChart,
  Info,
  ExternalLink,
  Globe
} from 'lucide-react';

interface DashboardViewProps {
  students: Student[];
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenCodeGsModal: () => void;
  onAddStudent: () => void;
  theme?: AppTheme;
}

/**
 * Helper untuk mengelompokkan jenjang kelas siswa secara akurat
 * Selaras 100% dengan pengelompokan di Menu Rekapitulasi (RekapView)
 */
export function parseGradeLevel(rawClass: string = ''): '10' | '11' | '12' | 'Lainnya' {
  const c = (rawClass || '').trim();
  if (!c) return 'Lainnya';

  // 1. Cek angka di awal rombel (misal "10 AKL 1", "11 Kuliner 2", "12 TJKT 3", "10-1", "10.RPL")
  const numMatch = c.match(/^(\d+)/);
  if (numMatch) {
    const num = numMatch[1];
    if (num === '10') return '10';
    if (num === '11') return '11';
    if (num === '12') return '12';
  }

  // 2. Cek romawi (XII, XI, X) - diperiksa berurutan
  const romanMatch = c.match(/^(XII|XI|X)\b/i) || c.match(/\b(XII|XI|X)\b/i);
  if (romanMatch) {
    const rom = romanMatch[1].toUpperCase();
    if (rom === 'XII') return '12';
    if (rom === 'XI') return '11';
    if (rom === 'X') return '10';
  }

  // 3. Cek angka 10, 11, 12 dengan batas kata (misal "Kelas 10", "Tingkat 11")
  const wordNumMatch = c.match(/\b(10|11|12)\b/);
  if (wordNumMatch) {
    return wordNumMatch[1] as '10' | '11' | '12';
  }

  return 'Lainnya';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  onNavigateTab,
  theme = 'aurora-glass'
}) => {
  const isGlass = theme === 'aurora-glass';

  // Selaras dengan Rekapitulasi: Hanya menghitung peserta didik yang berstatus Aktif
  // Siswa mutasi keluar / mengundurkan diri (Tidak Aktif) otomatis berkurang dari dashboard
  const activeStudents = useMemo(() => {
    return students.filter((s) => {
      const st = (s.status || '').toLowerCase().trim();
      if (st === 'tidak aktif' || st.includes('tidak') || st === 'mutasi' || st === 'keluar' || st === 'mengundurkan diri') {
        return false;
      }
      return true;
    });
  }, [students]);

  const totalSiswa = activeStudents.length;
  const totalLaki = activeStudents.filter((s) => s.jk === 'L').length;
  const totalPerempuan = activeStudents.filter((s) => s.jk === 'P').length;

  const classCounts = activeStudents.reduce((acc, s) => {
    const k = (s.kelas || '').trim();
    if (k) {
      acc[k] = (acc[k] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const totalRombel = Object.keys(classCounts).length;

  // Distribusi tingkat kelas nyata sesuai data riil (hanya siswa aktif)
  const kelasCounts = { '10': 0, '11': 0, '12': 0, 'Lainnya': 0 };
  activeStudents.forEach((s) => {
    const lvl = parseGradeLevel(s.kelas);
    kelasCounts[lvl] = (kelasCounts[lvl] || 0) + 1;
  });

  const kelasX = kelasCounts['10'];
  const kelasXI = kelasCounts['11'];
  const kelasXII = kelasCounts['12'];
  const kelasLainnya = kelasCounts['Lainnya'];

  // Donut chart state & calculations
  const [donutMode, setDonutMode] = useState<'tingkat' | 'gender'>('tingkat');
  const [hoveredDonutIdx, setHoveredDonutIdx] = useState<number | null>(null);

  const tingkatTotal = totalSiswa || 1;
  const genderTotal = (totalLaki + totalPerempuan) || totalSiswa || 1;

  const pctX = totalSiswa > 0 ? ((kelasX / tingkatTotal) * 100).toFixed(1) : '0';
  const pctXI = totalSiswa > 0 ? ((kelasXI / tingkatTotal) * 100).toFixed(1) : '0';
  const pctXII = totalSiswa > 0 ? ((kelasXII / tingkatTotal) * 100).toFixed(1) : '0';
  const pctLainnya = totalSiswa > 0 ? ((kelasLainnya / tingkatTotal) * 100).toFixed(1) : '0';

  const pctLaki = genderTotal > 0 ? ((totalLaki / genderTotal) * 100).toFixed(1) : '0';
  const pctPerempuan = genderTotal > 0 ? ((totalPerempuan / genderTotal) * 100).toFixed(1) : '0';

  const tingkatSegments = [
    {
      id: 'tingkat-x',
      label: 'Tingkat X',
      sublabel: 'Kelas 10',
      value: kelasX,
      percentage: pctX,
      gradientId: 'gradDonutTingkatX',
      gradStart: '#a855f7',
      gradEnd: '#6366f1',
      dotColor: 'bg-purple-500',
      barBg: 'bg-gradient-to-r from-purple-500 to-indigo-500',
    },
    {
      id: 'tingkat-xi',
      label: 'Tingkat XI',
      sublabel: 'Kelas 11',
      value: kelasXI,
      percentage: pctXI,
      gradientId: 'gradDonutTingkatXI',
      gradStart: '#22d3ee',
      gradEnd: '#0284c7',
      dotColor: 'bg-cyan-500',
      barBg: 'bg-gradient-to-r from-cyan-400 to-blue-500',
    },
    {
      id: 'tingkat-xii',
      label: 'Tingkat XII',
      sublabel: 'Kelas 12',
      value: kelasXII,
      percentage: pctXII,
      gradientId: 'gradDonutTingkatXII',
      gradStart: '#f472b6',
      gradEnd: '#db2777',
      dotColor: 'bg-pink-500',
      barBg: 'bg-gradient-to-r from-pink-500 to-rose-500',
    },
  ];

  if (kelasLainnya > 0) {
    tingkatSegments.push({
      id: 'tingkat-lainnya',
      label: 'Lainnya',
      sublabel: 'Belum Terpetakan',
      value: kelasLainnya,
      percentage: pctLainnya,
      gradientId: 'gradDonutLainnya',
      gradStart: '#94a3b8',
      gradEnd: '#64748b',
      dotColor: 'bg-slate-500',
      barBg: 'bg-gradient-to-r from-slate-400 to-slate-600',
    });
  }

  const genderSegments = [
    {
      id: 'gender-l',
      label: 'Laki-laki',
      sublabel: 'Peserta Didik Pria',
      value: totalLaki,
      percentage: pctLaki,
      gradientId: 'gradDonutLaki',
      gradStart: '#38bdf8',
      gradEnd: '#0284c7',
      dotColor: 'bg-sky-500',
      barBg: 'bg-gradient-to-r from-sky-400 to-blue-600',
    },
    {
      id: 'gender-p',
      label: 'Perempuan',
      sublabel: 'Peserta Didik Wanita',
      value: totalPerempuan,
      percentage: pctPerempuan,
      gradientId: 'gradDonutPerempuan',
      gradStart: '#f472b6',
      gradEnd: '#db2777',
      dotColor: 'bg-pink-500',
      barBg: 'bg-gradient-to-r from-pink-400 to-rose-600',
    },
  ];

  const activeSegments = donutMode === 'tingkat' ? tingkatSegments : genderSegments;
  const currentTotal = donutMode === 'tingkat' ? tingkatTotal : genderTotal;

  // Arc path generator for SVG Donut
  const getArcPath = (cx: number, cy: number, rIn: number, rOut: number, startAngle: number, endAngle: number) => {
    const x1Out = cx + rOut * Math.cos(startAngle);
    const y1Out = cy + rOut * Math.sin(startAngle);
    const x2Out = cx + rOut * Math.cos(endAngle);
    const y2Out = cy + rOut * Math.sin(endAngle);

    const x1In = cx + rIn * Math.cos(endAngle);
    const y1In = cy + rIn * Math.sin(endAngle);
    const x2In = cx + rIn * Math.cos(startAngle);
    const y2In = cy + rIn * Math.sin(startAngle);

    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    return `M ${x1Out} ${y1Out} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2Out} ${y2Out} L ${x1In} ${y1In} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x2In} ${y2In} Z`;
  };

  let currentAngle = -Math.PI / 2;
  const gap = activeSegments.length > 1 ? 0.05 : 0; // Separation gap in radians

  const computedSlices = activeSegments.map((seg, idx) => {
    const angleSpan = (seg.value / (currentTotal || 1)) * 2 * Math.PI;
    const isHovered = hoveredDonutIdx === idx;
    const rOut = isHovered ? 92 : 84;
    const rIn = isHovered ? 52 : 55;

    const start = currentAngle + gap / 2;
    const end = Math.max(start + 0.01, currentAngle + angleSpan - gap / 2);
    currentAngle += angleSpan;

    const path = getArcPath(120, 120, rIn, rOut, start, end);
    return {
      ...seg,
      path,
      isHovered
    };
  });

  const activeHoveredSeg = hoveredDonutIdx !== null ? activeSegments[hoveredDonutIdx] : null;

  // Stat cards with colors matching mockup in aurora-glass mode
  const statCards = [
    {
      id: 'pd',
      title: 'Jumlah Peserta Didik',
      subtitle: 'Siswa Terdaftar Aktif',
      value: totalSiswa.toLocaleString('id-ID'),
      icon: <Smile className="w-5 h-5 text-white" />,
      glassGradient: 'from-[#a855f7] via-[#8b5cf6] to-[#6366f1]',
      classicGradient: 'from-emerald-500 via-teal-500 to-emerald-600',
      tabTarget: 'biodata' as ActiveTab,
      code: 'TOTAL_PD'
    },
    {
      id: 'laki',
      title: 'Jumlah Laki-laki',
      subtitle: 'Peserta Didik Pria',
      value: totalLaki.toLocaleString('id-ID'),
      icon: <User className="w-5 h-5 text-white" />,
      glassGradient: 'from-[#0ea5e9] via-[#06b6d4] to-[#0284c7]',
      classicGradient: 'from-sky-400 via-cyan-500 to-blue-500',
      tabTarget: 'biodata' as ActiveTab,
      code: 'GENDER_L'
    },
    {
      id: 'perempuan',
      title: 'Jumlah Perempuan',
      subtitle: 'Peserta Didik Wanita',
      value: totalPerempuan.toLocaleString('id-ID'),
      icon: <User className="w-5 h-5 text-white" />,
      glassGradient: 'from-[#ec4899] via-[#f43f5e] to-[#db2777]',
      classicGradient: 'from-fuchsia-500 via-pink-500 to-rose-500',
      tabTarget: 'biodata' as ActiveTab,
      code: 'GENDER_P'      
    },
    {
      id: 'rombel',
      title: 'Jumlah Rombel',
      subtitle: 'Rombongan Belajar',
      value: totalRombel.toLocaleString('id-ID'),
      icon: <Users className="w-5 h-5 text-white" />,
      glassGradient: 'from-[#6366f1] via-[#7c3aed] to-[#8b5cf6]',
      classicGradient: 'from-violet-600 via-indigo-600 to-purple-700',
      tabTarget: 'rekap' as ActiveTab,
      code: 'ROMBEL_AKTIF'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className={`rounded-3xl p-6 lg:p-7 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden transition-all duration-300 ${
        isGlass 
          ? 'bg-gradient-to-r from-[#2e1065] via-[#4c1d95] to-[#1e1b4b] border border-purple-400/30 text-white shadow-purple-900/20' 
          : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white'
      }`}>
        {/* Soft decorative background aurora blur */}
        {isGlass && (
          <>
            <div className="absolute top-[-50%] right-[10%] w-72 h-72 bg-cyan-400/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-50%] left-[20%] w-72 h-72 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />
          </>
        )}

        <div className="space-y-2.5 max-w-xl z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-white/10 border border-white/20 text-purple-200">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span>Sistem Informasi Manajemen Data SMKN 1 Palopo</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight">
            Data Peserta Didik & Guru Terintegrasi
          </h2>
          <p className="text-xs lg:text-sm text-purple-200/80 leading-relaxed max-w-md">
            {/* Pengelolaan otomatis database sekolah tersinkronisasi langsung dengan Google Sheets.*/}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigateTab('biodata')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <span>Buka Biodata Siswa</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigateTab('absen')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer backdrop-blur-xs"
            >
              <span>Verval PD</span>
            </button>
          </div>
        </div>

        <div className={`hidden lg:flex flex-col items-center justify-center p-6 rounded-2xl border backdrop-blur-md text-center min-w-[200px] z-10 ${
          isGlass 
            ? 'bg-white/10 border-white/20 shadow-xl shadow-purple-950/40' 
            : 'bg-slate-800/50 border-slate-700/50'
        }`}>
          <GraduationCap className="w-12 h-12 text-cyan-300 mb-2" />
          <span className="text-xs text-purple-200/90 font-medium">Total Terdaftar</span>
          <span className="text-3xl font-extrabold text-white mt-0.5">{totalSiswa} Siswa</span>
          <span className="text-[10px] text-emerald-300 mt-1 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Data Tersinkron
          </span>
        </div>
      </div>

      {/* 4 Stat Cards matching style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.id}
            onClick={() => onNavigateTab(card.tabTarget)}
            className={`relative overflow-hidden bg-gradient-to-r ${
              isGlass ? card.glassGradient : card.classicGradient
            } p-5 sm:p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group flex items-center justify-between min-h-[115px] border ${
              isGlass ? 'border-white/25 shadow-purple-900/15' : 'border-transparent'
            }`}
          >
            {/* Soft decorative background circles */}
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/15 rounded-full blur-2xs pointer-events-none" />
            <div className="absolute right-8 -top-8 w-20 h-20 bg-white/15 rounded-full blur-2xs pointer-events-none" />

            {/* Left Content: Title & Value */}
            <div className="relative z-10 flex flex-col justify-between h-full space-y-2">
              <span className="text-xs sm:text-sm font-semibold text-white/95 tracking-tight leading-tight">
                {card.title}
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-xs">
                {card.value}
              </span>
            </div>

            {/* Right Content: Icon Container */}
            <div className="relative z-10 w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-xs group-hover:scale-110 transition-transform">
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Middle Section: Donut Chart + Quick Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Donut Chart Card */}
        <div className={`lg:col-span-2 rounded-3xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between ${
          isGlass
            ? 'bg-white/70 backdrop-blur-xl border border-white/80 shadow-xl shadow-blue-500/5 text-slate-800'
            : 'bg-white border border-slate-200 shadow-xs text-slate-800'
        }`}>
          <div>
            {/* Header with Title and Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 tracking-tight">
                    Statistik & Distribusi Peserta Didik
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                   {/*  Grafik */}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Grafik
                </p>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => { setDonutMode('tingkat'); setHoveredDonutIdx(null); }}
                  className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    donutMode === 'tingkat'
                      ? 'bg-white text-purple-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  Jenjang Kelas
                </button>
                <button
                  type="button"
                  onClick={() => { setDonutMode('gender'); setHoveredDonutIdx(null); }}
                  className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    donutMode === 'gender'
                      ? 'bg-white text-purple-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  Jenis Kelamin
                </button>
              </div>
            </div>

            {/* Donut Chart Visual & Interactive Legend */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2 px-1">
              {/* Donut SVG Container with Center Counter */}
              <div className="relative w-52 h-52 sm:w-56 sm:h-56 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full drop-shadow-xs overflow-visible" viewBox="0 0 240 240">
                  <defs>
                    {activeSegments.map((seg) => (
                      <linearGradient key={seg.gradientId} id={seg.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={seg.gradStart} />
                        <stop offset="100%" stopColor={seg.gradEnd} />
                      </linearGradient>
                    ))}
                  </defs>

                  {/* Subtle Background Guide Ring */}
                  <circle cx="120" cy="120" r="70" fill="none" stroke="#f1f5f9" strokeWidth="26" />

                  {/* Donut Slices */}
                  {computedSlices.map((slice, idx) => (
                    <path
                      key={slice.id}
                      d={slice.path}
                      fill={`url(#${slice.gradientId})`}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        transformOrigin: '120px 120px',
                        filter: slice.isHovered 
                          ? 'drop-shadow(0 6px 12px rgba(124, 58, 237, 0.35))' 
                          : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.06))',
                        opacity: hoveredDonutIdx !== null && hoveredDonutIdx !== idx ? 0.6 : 1,
                      }}
                      onMouseEnter={() => setHoveredDonutIdx(idx)}
                      onMouseLeave={() => setHoveredDonutIdx(null)}
                    />
                  ))}
                </svg>

                {/* Center Readout (Dynamic on Hover) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none px-2">
                  {activeHoveredSeg ? (
                    <div className="animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {activeHoveredSeg.label}
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight my-0.5">
                        {activeHoveredSeg.value.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {activeHoveredSeg.percentage}% Siswa
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {donutMode === 'tingkat' ? 'Total Siswa' : 'Total Gender'}
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight my-0.5">
                        {totalSiswa.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200/60">
                        <CheckCircle2 className="w-3 h-3" />
                        Siswa Aktif
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Legend & Proportion Bars */}
              <div className="flex-1 w-full space-y-2.5">
                {activeSegments.map((seg, idx) => {
                  const isHovered = hoveredDonutIdx === idx;
                  return (
                    <div
                      key={seg.id}
                      onMouseEnter={() => setHoveredDonutIdx(idx)}
                      onMouseLeave={() => setHoveredDonutIdx(null)}
                      className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isHovered
                          ? 'bg-slate-50 border-purple-300 shadow-sm translate-x-1'
                          : 'bg-slate-50/60 border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-3 h-3 rounded-full ${seg.dotColor} shrink-0 shadow-xs ring-2 ring-white`} />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block leading-tight">
                              {seg.label}
                            </span>
                            <span className="text-[10px] text-slate-400 leading-tight">
                              {seg.sublabel}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 block leading-tight">
                            {seg.value.toLocaleString('id-ID')} Siswa
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {seg.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Distribution progress bar */}
                      <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${seg.barBg}`}
                          style={{ width: `${seg.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Metrics under chart */}
          <div className={`grid ${donutMode === 'tingkat' ? (kelasLainnya > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3') : 'grid-cols-2'} gap-3 mt-4 pt-3 border-t border-slate-100`}>
            {donutMode === 'tingkat' ? (
              <>
                <div 
                  onMouseEnter={() => setHoveredDonutIdx(0)}
                  onMouseLeave={() => setHoveredDonutIdx(null)}
                  className={`text-center p-2.5 rounded-2xl transition-all cursor-pointer ${
                    hoveredDonutIdx === 0 
                      ? 'bg-purple-50 border border-purple-200 shadow-2xs' 
                      : 'bg-slate-50/80 hover:bg-slate-100/80 border border-transparent'
                  }`}
                >
                  <span className="text-[11px] text-slate-500 font-medium">Tingkat X</span>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900">{kelasX} Siswa</p>
                  <span className="text-[10px] font-bold text-purple-600">{pctX}%</span>
                </div>
                <div 
                  onMouseEnter={() => setHoveredDonutIdx(1)}
                  onMouseLeave={() => setHoveredDonutIdx(null)}
                  className={`text-center p-2.5 rounded-2xl transition-all cursor-pointer ${
                    hoveredDonutIdx === 1 
                      ? 'bg-cyan-50 border border-cyan-200 shadow-2xs' 
                      : 'bg-slate-50/80 hover:bg-slate-100/80 border border-transparent'
                  }`}
                >
                  <span className="text-[11px] text-slate-500 font-medium">Tingkat XI</span>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900">{kelasXI} Siswa</p>
                  <span className="text-[10px] font-bold text-cyan-600">{pctXI}%</span>
                </div>
                <div 
                  onMouseEnter={() => setHoveredDonutIdx(2)}
                  onMouseLeave={() => setHoveredDonutIdx(null)}
                  className={`text-center p-2.5 rounded-2xl transition-all cursor-pointer ${
                    hoveredDonutIdx === 2 
                      ? 'bg-pink-50 border border-pink-200 shadow-2xs' 
                      : 'bg-slate-50/80 hover:bg-slate-100/80 border border-transparent'
                  }`}
                >
                  <span className="text-[11px] text-slate-500 font-medium">Tingkat XII</span>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900">{kelasXII} Siswa</p>
                  <span className="text-[10px] font-bold text-pink-600">{pctXII}%</span>
                </div>
                {kelasLainnya > 0 && (
                  <div 
                    onMouseEnter={() => setHoveredDonutIdx(3)}
                    onMouseLeave={() => setHoveredDonutIdx(null)}
                    className={`text-center p-2.5 rounded-2xl transition-all cursor-pointer ${
                      hoveredDonutIdx === 3 
                        ? 'bg-slate-100 border border-slate-300 shadow-2xs' 
                        : 'bg-slate-50/80 hover:bg-slate-100/80 border border-transparent'
                    }`}
                  >
                    <span className="text-[11px] text-slate-500 font-medium">Lainnya</span>
                    <p className="text-sm sm:text-base font-extrabold text-slate-900">{kelasLainnya} Siswa</p>
                    <span className="text-[10px] font-bold text-slate-600">{pctLainnya}%</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div 
                  onMouseEnter={() => setHoveredDonutIdx(0)}
                  onMouseLeave={() => setHoveredDonutIdx(null)}
                  className={`text-center p-2.5 rounded-2xl transition-all cursor-pointer ${
                    hoveredDonutIdx === 0 
                      ? 'bg-sky-50 border border-sky-200 shadow-2xs' 
                      : 'bg-slate-50/80 hover:bg-slate-100/80 border border-transparent'
                  }`}
                >
                  <span className="text-[11px] text-slate-500 font-medium">Laki-laki</span>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900">{totalLaki} Siswa</p>
                  <span className="text-[10px] font-bold text-sky-600">{pctLaki}%</span>
                </div>
                <div 
                  onMouseEnter={() => setHoveredDonutIdx(1)}
                  onMouseLeave={() => setHoveredDonutIdx(null)}
                  className={`text-center p-2.5 rounded-2xl transition-all cursor-pointer ${
                    hoveredDonutIdx === 1 
                      ? 'bg-pink-50 border border-pink-200 shadow-2xs' 
                      : 'bg-slate-50/80 hover:bg-slate-100/80 border border-transparent'
                  }`}
                >
                  <span className="text-[11px] text-slate-500 font-medium">Perempuan</span>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900">{totalPerempuan} Siswa</p>
                  <span className="text-[10px] font-bold text-pink-600">{pctPerempuan}%</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Quick Summary Card (Matching 'Seenarrd' Card in Mockup) */}
        <div className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 ${
          isGlass
            ? 'bg-white/70 backdrop-blur-xl border border-white/80 shadow-xl shadow-purple-500/5 text-slate-800'
            : 'bg-white border border-slate-200 shadow-xs text-slate-800'
        }`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Ringkasan Sistem</h4>
                  <span className="text-[11px] text-slate-400">SMKN 1 Palopo</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Aktif
              </span>
            </div>

            <div className="space-y-3 mt-4">
              {/* Item 1 */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <span className="text-xs font-semibold text-slate-700">Rombongan Belajar</span>
                </div>
                <span className="text-xs font-bold text-slate-900">{totalRombel} Rombel</span>
              </div>

              {/* Item 2 */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="text-xs font-semibold text-slate-700">Verval Peserta Didik</span>
                </div>
                <span className="text-xs font-bold text-emerald-600">Terbuka</span>
              </div>

              {/* Item 3 */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                  <span className="text-xs font-semibold text-slate-700">Rasio Siswa L/P</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {totalLaki && totalPerempuan ? `${Math.round((totalLaki / totalSiswa) * 100)}% / ${Math.round((totalPerempuan / totalSiswa) * 100)}%` : '41% / 59%'}
                </span>
              </div>
            </div>

            {/* Info Section: Link Dapodik & Link Info GTK */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 mb-2.5">
                <div className="w-5 h-5 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Info className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-800 tracking-wide">Info</span>
              </div>

              <div className="space-y-2">
                {/* Link Dapodik */}
                <a
                  href="https://ptk.datadik.kemendikdasmen.go.id/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/90 hover:bg-blue-50/70 border border-slate-150 hover:border-blue-200 transition-all duration-200"
                  title="Buka Link Dapodik (https://ptk.datadik.kemendikdasmen.go.id/)"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-100/90 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 block truncate transition-colors">
                        Link Dapodik
                      </span>
                      <span className="text-[10px] text-slate-400 group-hover:text-blue-600/80 block truncate font-mono transition-colors">
                        https://ptk.datadik.kemendikdasmen.go.id/
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />
                </a>

                {/* Link Info GTK */}
                <a
                  href="https://info.gtk.kemendikdasmen.go.id/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/90 hover:bg-emerald-50/70 border border-slate-150 hover:border-emerald-200 transition-all duration-200"
                  title="Buka Link Info GTK (https://info.gtk.kemendikdasmen.go.id/)"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100/90 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 block truncate transition-colors">
                        Link Info GTK
                      </span>
                      <span className="text-[10px] text-slate-400 group-hover:text-emerald-600/80 block truncate font-mono transition-colors">
                        https://info.gtk.kemendikdasmen.go.id/
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0 transition-colors" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Quick Access Pill Controls (Matching bottom controls in mockup) */}
      <div className={`rounded-3xl p-5 sm:p-6 transition-all duration-300 ${
        isGlass 
          ? 'bg-white/65 backdrop-blur-xl border border-white/70 shadow-lg shadow-purple-500/5' 
          : 'bg-white border border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="font-bold text-sm text-slate-900">Akses Cepat Modul</h4>
            <p className="text-xs text-slate-500">Pintasan navigasi cepat ke form dan laporan data utama</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigateTab('biodata')}
            className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer group ${
              isGlass 
                ? 'bg-white/70 hover:bg-white/90 border-white/80 shadow-2xs hover:shadow-md' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <User className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 block">Biodata Siswa</span>
            <span className="text-[10px] text-slate-500">1.500+ data lengkap</span>
          </button>

          <button
            onClick={() => onNavigateTab('absen')}
            className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer group ${
              isGlass 
                ? 'bg-white/70 hover:bg-white/90 border-white/80 shadow-2xs hover:shadow-md' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 block">Verval PD</span>
            <span className="text-[10px] text-slate-500">Wali Kelas</span>
          </button>

          <button
            onClick={() => onNavigateTab('gtk-biodata')}
            className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer group ${
              isGlass 
                ? 'bg-white/70 hover:bg-white/90 border-white/80 shadow-2xs hover:shadow-md' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 block">Biodata GTK</span>
            <span className="text-[10px] text-slate-500">Guru & Tenaga PTK</span>
          </button>

          <button
            onClick={() => onNavigateTab('gtk-pangkat')}
            className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer group ${
              isGlass 
                ? 'bg-white/70 hover:bg-white/90 border-white/80 shadow-2xs hover:shadow-md' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 block">Riwayat Pangkat</span>
            <span className="text-[10px] text-slate-500">Golongan & SK</span>
          </button>

          <button
            onClick={() => onNavigateTab('gtk-kgb')}
            className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer group ${
              isGlass 
                ? 'bg-white/70 hover:bg-white/90 border-white/80 shadow-2xs hover:shadow-md' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 block">Riwayat KGB</span>
            <span className="text-[10px] text-slate-500">Gaji berkala</span>
          </button>
        </div>
      </div>
    </div>
  );
};

