import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GTKData } from '../types';
import { 
  ChevronDown, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  GraduationCap, 
  Users, 
  Briefcase, 
  Award, 
  BookOpen, 
  Check, 
  Layers, 
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { INITIAL_GTK_LIST } from '../data/initialGTK';
import { LOGO_BASE64 } from '../assets/logoBase64';

interface RekapGTKViewProps {
  gtkList?: GTKData[];
}

export const RekapGTKView: React.FC<RekapGTKViewProps> = ({ 
  gtkList = INITIAL_GTK_LIST 
}) => {
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'semua' | 'matriks' | 'jenjang' | 'jenis' | 'status'>('semua');
  const [matrixDisplayMode, setMatrixDisplayMode] = useState<'detail' | 'ringkas'>('detail');
  const [showDetailJenisPtk, setShowDetailJenisPtk] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActionsDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Total counts
  const totalGTK = gtkList.length;
  const totalLaki = gtkList.filter(g => g.jk === 'L').length;
  const totalPerempuan = gtkList.filter(g => g.jk === 'P').length;

  // -------------------------------------------------------------
  // Helper: Normalisasi Jenjang Pendidikan
  // -------------------------------------------------------------
  const normalizeJenjang = (rawJenjang?: string): string => {
    const raw = (rawJenjang || '').trim();
    if (!raw || raw === '-') return 'Belum Terdata';
    const upper = raw.toUpperCase();
    if (upper === 'S3' || upper === 'S-3' || upper.includes('DOKTOR')) return 'S3';
    if (upper === 'S2' || upper === 'S-2' || upper.includes('MAGISTER')) return 'S2';
    if (upper === 'S1' || upper === 'S-1' || upper.includes('SARJANA')) return 'S1';
    if (upper === 'D4' || upper === 'D-4' || upper.includes('DIPLOMA 4') || upper.includes('DIPLOMA IV')) return 'D4';
    if (upper === 'D3' || upper === 'D-3' || upper.includes('DIPLOMA 3') || upper.includes('DIPLOMA III')) return 'D3';
    if (upper === 'D2' || upper === 'D-2' || upper.includes('DIPLOMA 2') || upper.includes('DIPLOMA II')) return 'D2';
    if (upper === 'D1' || upper === 'D-1' || upper.includes('DIPLOMA 1') || upper.includes('DIPLOMA I')) return 'D1';
    if (upper === 'SMA' || upper === 'SMK' || upper === 'SLTA' || upper.includes('SMA') || upper.includes('SMK') || upper.includes('SEDERAJAT') || upper.includes('ALIYAH')) {
      return 'SMA / SMK / Sederajat';
    }
    if (upper === 'SMP' || upper === 'SLTP' || upper.includes('SMP') || upper.includes('TSANAWIYAH')) {
      return 'SMP / Sederajat';
    }
    if (upper === 'SD' || upper.includes('SD') || upper.includes('IBTIDAIYAH')) {
      return 'SD / Sederajat';
    }
    return raw;
  };

  const standardJenjangOrder = [
    'S3',
    'S2',
    'S1',
    'D4',
    'D3',
    'D2',
    'D1',
    'SMA / SMK / Sederajat',
    'SMP / Sederajat',
    'SD / Sederajat',
    'Belum Terdata'
  ];

  // -------------------------------------------------------------
  // Helper: Klasifikasi Kategori Pokok Jenis PTK
  // -------------------------------------------------------------
  const getJenisCategory = (g: GTKData): 'Kepala Sekolah' | 'Guru' | 'Tenaga Kependidikan' => {
    const raw = (g.jenisPtk || (g as any)['Jenis PTK'] || (g as any).jenisptk || '').trim().toLowerCase();
    if (raw === 'kepala sekolah' || (raw.includes('kepala sekolah') && !raw.includes('wakil'))) {
      return 'Kepala Sekolah';
    } else if (
      raw.includes('tenaga kependidikan') ||
      raw.includes('administrasi') ||
      raw.includes('perpustakaan') ||
      raw.includes('laboran') ||
      raw.includes('teknisi') ||
      raw.includes('satpam') ||
      raw.includes('penjaga') ||
      raw.includes('kebersihan') ||
      raw.includes('tata usaha') ||
      raw.includes('tu')
    ) {
      return 'Tenaga Kependidikan';
    } else if (
      raw.includes('guru') ||
      raw.includes('mapel') ||
      raw === 'bk' ||
      raw.includes('bimbingan konseling') ||
      raw.includes('kejuruan') ||
      raw.includes('pengajar') ||
      (raw.includes('pendidik') && !raw.includes('kependidikan'))
    ) {
      return 'Guru';
    }
    return 'Tenaga Kependidikan';
  };

  // -------------------------------------------------------------
  // 1. Rekapitulasi Berdasarkan Status Kepegawaian
  // -------------------------------------------------------------
  const standardStatusOrder = [
    'PNS',
    'PPPK',
    'PPPK Paruh Waktu',
    'Honor Daerah TK.I Provinsi',
    'Tenaga Honor Sekolah',
    'Guru Honor Sekolah'
  ];

  const statusMap: Record<string, { l: number; p: number; total: number }> = {};
  gtkList.forEach(g => {
    let rawStatus = (g.statusKepegawaian || '').trim();
    if (!rawStatus) rawStatus = 'Lainnya';

    let normalized = rawStatus;
    const sLower = rawStatus.toLowerCase();
    if (sLower === 'pns') normalized = 'PNS';
    else if (sLower === 'pppk') normalized = 'PPPK';
    else if (sLower.includes('paruh waktu')) normalized = 'PPPK Paruh Waktu';
    else if (sLower.includes('daerah') || sLower.includes('provinsi')) normalized = 'Honor Daerah TK.I Provinsi';
    else if (sLower.includes('tenaga honor') || sLower.includes('ptt')) normalized = 'Tenaga Honor Sekolah';
    else if (sLower.includes('guru honor') || sLower.includes('gtt')) normalized = 'Guru Honor Sekolah';

    if (!statusMap[normalized]) {
      statusMap[normalized] = { l: 0, p: 0, total: 0 };
    }
    statusMap[normalized].total += 1;
    if (g.jk === 'L') statusMap[normalized].l += 1;
    if (g.jk === 'P') statusMap[normalized].p += 1;
  });

  const sortedStatuses = Object.keys(statusMap).sort((a, b) => {
    const idxA = standardStatusOrder.indexOf(a);
    const idxB = standardStatusOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return b.localeCompare(a);
  });

  const rekapStatusRows = sortedStatuses.map(status => ({
    status,
    l: statusMap[status].l,
    p: statusMap[status].p,
    jumlah: statusMap[status].total
  }));

  // -------------------------------------------------------------
  // 2. Rekapitulasi Berdasarkan Jenis PTK (Kepala Sekolah, Guru, Tendik)
  // -------------------------------------------------------------
  const jenisGroups: { [key: string]: { l: number; p: number; total: number } } = {
    'Kepala Sekolah': { l: 0, p: 0, total: 0 },
    'Guru': { l: 0, p: 0, total: 0 },
    'Tenaga Kependidikan': { l: 0, p: 0, total: 0 }
  };

  // Detail jenis ptk rincian (Guru Mapel, Guru BK, Tenaga Administrasi Sekolah, dll)
  const detailJenisPtkMap: Record<string, { l: number; p: number; total: number }> = {};

  gtkList.forEach(g => {
    const cat = getJenisCategory(g);
    jenisGroups[cat].total += 1;
    if (g.jk === 'L') jenisGroups[cat].l += 1;
    if (g.jk === 'P') jenisGroups[cat].p += 1;

    // Rincian spesifik
    const rawSpecific = (g.jenisPtk || '').trim() || 'Lainnya';
    if (!detailJenisPtkMap[rawSpecific]) {
      detailJenisPtkMap[rawSpecific] = { l: 0, p: 0, total: 0 };
    }
    detailJenisPtkMap[rawSpecific].total += 1;
    if (g.jk === 'L') detailJenisPtkMap[rawSpecific].l += 1;
    if (g.jk === 'P') detailJenisPtkMap[rawSpecific].p += 1;
  });

  const rekapJenisRows = [
    { jenis: 'Kepala Sekolah', l: jenisGroups['Kepala Sekolah'].l, p: jenisGroups['Kepala Sekolah'].p, jumlah: jenisGroups['Kepala Sekolah'].total },
    { jenis: 'Guru', l: jenisGroups['Guru'].l, p: jenisGroups['Guru'].p, jumlah: jenisGroups['Guru'].total },
    { jenis: 'Tenaga Kependidikan', l: jenisGroups['Tenaga Kependidikan'].l, p: jenisGroups['Tenaga Kependidikan'].p, jumlah: jenisGroups['Tenaga Kependidikan'].total }
  ];

  const rekapDetailJenisRows = Object.keys(detailJenisPtkMap).sort().map(key => ({
    jenis: key,
    l: detailJenisPtkMap[key].l,
    p: detailJenisPtkMap[key].p,
    jumlah: detailJenisPtkMap[key].total
  }));

  // -------------------------------------------------------------
  // 3. Rekapitulasi Berdasarkan Jenjang Pendidikan
  // -------------------------------------------------------------
  const jenjangMap: Record<string, { l: number; p: number; total: number }> = {};

  gtkList.forEach(g => {
    const norm = normalizeJenjang(g.jenjang);
    if (!jenjangMap[norm]) {
      jenjangMap[norm] = { l: 0, p: 0, total: 0 };
    }
    jenjangMap[norm].total += 1;
    if (g.jk === 'L') jenjangMap[norm].l += 1;
    if (g.jk === 'P') jenjangMap[norm].p += 1;
  });

  // Urutkan jenjang berdasarkan hirarki akademis
  const sortedJenjangList = Object.keys(jenjangMap).sort((a, b) => {
    const idxA = standardJenjangOrder.indexOf(a);
    const idxB = standardJenjangOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const rekapJenjangRows = sortedJenjangList.map(j => ({
    jenjang: j,
    l: jenjangMap[j].l,
    p: jenjangMap[j].p,
    jumlah: jenjangMap[j].total,
    persentase: totalGTK > 0 ? ((jenjangMap[j].total / totalGTK) * 100).toFixed(1) : '0'
  }));

  // -------------------------------------------------------------
  // 4. Rekapitulasi Matriks Silang: Jenjang Pendidikan & Jenis PTK
  // -------------------------------------------------------------
  interface MatrixRowItem {
    jenjang: string;
    kepsek: { l: number; p: number; total: number };
    guru: { l: number; p: number; total: number };
    tendik: { l: number; p: number; total: number };
    total: { l: number; p: number; total: number };
  }

  const matrixMap: Record<string, MatrixRowItem> = {};

  // Inisialisasi setiap jenjang yang ada
  sortedJenjangList.forEach(j => {
    matrixMap[j] = {
      jenjang: j,
      kepsek: { l: 0, p: 0, total: 0 },
      guru: { l: 0, p: 0, total: 0 },
      tendik: { l: 0, p: 0, total: 0 },
      total: { l: 0, p: 0, total: 0 }
    };
  });

  gtkList.forEach(g => {
    const j = normalizeJenjang(g.jenjang);
    const cat = getJenisCategory(g);
    const item = matrixMap[j];
    if (!item) return;

    if (cat === 'Kepala Sekolah') {
      item.kepsek.total += 1;
      if (g.jk === 'L') item.kepsek.l += 1;
      if (g.jk === 'P') item.kepsek.p += 1;
    } else if (cat === 'Guru') {
      item.guru.total += 1;
      if (g.jk === 'L') item.guru.l += 1;
      if (g.jk === 'P') item.guru.p += 1;
    } else {
      item.tendik.total += 1;
      if (g.jk === 'L') item.tendik.l += 1;
      if (g.jk === 'P') item.tendik.p += 1;
    }

    item.total.total += 1;
    if (g.jk === 'L') item.total.l += 1;
    if (g.jk === 'P') item.total.p += 1;
  });

  const rekapMatrixRows = sortedJenjangList.map(j => matrixMap[j]);

  // Total kolom untuk Matriks Silang
  const matrixColumnTotals = {
    kepsek: {
      l: rekapMatrixRows.reduce((acc, r) => acc + r.kepsek.l, 0),
      p: rekapMatrixRows.reduce((acc, r) => acc + r.kepsek.p, 0),
      total: rekapMatrixRows.reduce((acc, r) => acc + r.kepsek.total, 0),
    },
    guru: {
      l: rekapMatrixRows.reduce((acc, r) => acc + r.guru.l, 0),
      p: rekapMatrixRows.reduce((acc, r) => acc + r.guru.p, 0),
      total: rekapMatrixRows.reduce((acc, r) => acc + r.guru.total, 0),
    },
    tendik: {
      l: rekapMatrixRows.reduce((acc, r) => acc + r.tendik.l, 0),
      p: rekapMatrixRows.reduce((acc, r) => acc + r.tendik.p, 0),
      total: rekapMatrixRows.reduce((acc, r) => acc + r.tendik.total, 0),
    },
    total: {
      l: totalLaki,
      p: totalPerempuan,
      total: totalGTK
    }
  };

  // -------------------------------------------------------------
  // Export to Excel
  // -------------------------------------------------------------
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const bulanIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const today = new Date();
    const formattedDate = `${today.getDate()} ${bulanIndo[today.getMonth()]} ${today.getFullYear()}`;

    // Sheet: Rekap PTK Komprehensif
    const wsData = [
      ['PEMERINTAH PROVINSI SULAWESI SELATAN'],
      ['DINAS PENDIDIKAN'],
      ['SEKOLAH MENENGAH KEJURUAN NEGERI 1 PALOPO'],
      ['Jl. KHM. Kasim NO. 10 Kota Palopo Sulawesi Selatan'],
      ['Website : http://www.smkn1-palopo.sch.id E.mail: info@smknegeri1palopo.sch.id'],
      [''],
      ['LAPORAN REKAPITULASI PTK (PENDIDIK & TENAGA KEPENDIDIKAN)'],
      [`Per Tanggal: ${formattedDate}`],
      [''],
      ['1. TABEL MATRIKS REKAPITULASI BERDASARKAN JENJANG & JENIS PTK'],
      ['Jenjang Pendidikan', 'Kepala Sekolah (L)', 'Kepala Sekolah (P)', 'Kepala Sekolah (Jumlah)', 'Guru (L)', 'Guru (P)', 'Guru (Jumlah)', 'Tenaga Kependidikan (L)', 'Tenaga Kependidikan (P)', 'Tenaga Kependidikan (Jumlah)', 'Total L', 'Total P', 'Total Semua'],
      ...rekapMatrixRows.map(r => [
        r.jenjang,
        r.kepsek.l, r.kepsek.p, r.kepsek.total,
        r.guru.l, r.guru.p, r.guru.total,
        r.tendik.l, r.tendik.p, r.tendik.total,
        r.total.l, r.total.p, r.total.total
      ]),
      [
        'Jumlah Total',
        matrixColumnTotals.kepsek.l, matrixColumnTotals.kepsek.p, matrixColumnTotals.kepsek.total,
        matrixColumnTotals.guru.l, matrixColumnTotals.guru.p, matrixColumnTotals.guru.total,
        matrixColumnTotals.tendik.l, matrixColumnTotals.tendik.p, matrixColumnTotals.tendik.total,
        matrixColumnTotals.total.l, matrixColumnTotals.total.p, matrixColumnTotals.total.total
      ],
      [''],
      ['2. TABEL REKAPITULASI BERDASARKAN JENJANG PENDIDIKAN'],
      ['Jenjang Pendidikan', 'L', 'P', 'Jumlah', 'Persentase (%)'],
      ...rekapJenjangRows.map(r => [r.jenjang, r.l, r.p, r.jumlah, `${r.persentase}%`]),
      ['Jumlah', totalLaki, totalPerempuan, totalGTK, '100%'],
      [''],
      ['3. TABEL REKAPITULASI BERDASARKAN JENIS PTK'],
      ['Jenis PTK', 'L', 'P', 'Jumlah'],
      ...rekapJenisRows.map(r => [r.jenis, r.l, r.p, r.jumlah]),
      ['Jumlah', totalLaki, totalPerempuan, totalGTK],
      [''],
      ['4. TABEL REKAPITULASI BERDASARKAN STATUS KEPEGAWAIAN'],
      ['Status Kepegawaian', 'L', 'P', 'Jumlah'],
      ...rekapStatusRows.map(r => [r.status, r.l, r.p, r.jumlah]),
      ['Jumlah', totalLaki, totalPerempuan, totalGTK],
      [''],
      ['', '', '', '', '', '', `Palopo, ${formattedDate}`],
      ['', '', '', '', '', '', 'Kepala SMKN 1 Palopo,'],
      [''],
      [''],
      ['', '', '', '', '', '', 'RIDWAN, S.T., M.Si.'],
      ['', '', '', '', '', '', 'NIP. 19700303 200701 1 032']
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Rekapitulasi PTK');
    XLSX.writeFile(wb, `Rekapitulasi_PTK_SMKN1_Palopo_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowActionsDropdown(false);
  };

  // -------------------------------------------------------------
  // Export to PDF
  // -------------------------------------------------------------
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 12;

    // Kop Surat
    try {
      doc.addImage(LOGO_BASE64, 'PNG', 14, 8, 20, 20);
    } catch {
      // Ignore if image fails
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PEMERINTAH PROVINSI SULAWESI SELATAN', pageWidth / 2, 11, { align: 'center' });
    doc.setFontSize(11);
    doc.text('DINAS PENDIDIKAN', pageWidth / 2, 16, { align: 'center' });
    doc.setFontSize(12.5);
    doc.text('SEKOLAH MENENGAH KEJURUAN NEGERI 1 PALOPO', pageWidth / 2, 21, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Jl. KHM. Kasim NO. 10 Kota Palopo Sulawesi Selatan | Website : http://www.smkn1-palopo.sch.id', pageWidth / 2, 25.5, { align: 'center' });

    // Double separator line
    doc.setLineWidth(0.6);
    doc.line(marginX, 28, pageWidth - marginX, 28);
    doc.setLineWidth(0.15);
    doc.line(marginX, 28.8, pageWidth - marginX, 28.8);

    // Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text('LAPORAN REKAPITULASI GTK (PENDIDIK & TENAGA KEPENDIDIKAN)', pageWidth / 2, 35, { align: 'center' });

    const bulanIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const today = new Date();
    const formattedDate = `Palopo, ${today.getDate()} ${bulanIndo[today.getMonth()]} ${today.getFullYear()}`;
    const subtitle = `Rekapitulasi Berdasarkan Jenjang Pendidikan, Jenis PTK, dan Status Kepegawaian | Per Tanggal: ${today.getDate()} ${bulanIndo[today.getMonth()]} ${today.getFullYear()}`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(subtitle, pageWidth / 2, 39.5, { align: 'center' });

    let currentY = 44;

    // Table 1: MATRIKS SILANG (Jenjang x Jenis PTK)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('1. Tabel Rekapitulasi Berdasarkan Jenjang Pendidikan & Jenis PTK', marginX + 1, currentY);

    const matrixHead = [
      [
        { content: 'Jenjang Pendidikan', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Kepala Sekolah', colSpan: 3, styles: { halign: 'center' } },
        { content: 'Guru', colSpan: 3, styles: { halign: 'center' } },
        { content: 'Tenaga Kependidikan', colSpan: 3, styles: { halign: 'center' } },
        { content: 'Total GTK', colSpan: 3, styles: { halign: 'center' } }
      ],
      [
        { content: 'L', styles: { halign: 'center' } },
        { content: 'P', styles: { halign: 'center' } },
        { content: 'Jml', styles: { halign: 'center' } },
        { content: 'L', styles: { halign: 'center' } },
        { content: 'P', styles: { halign: 'center' } },
        { content: 'Jml', styles: { halign: 'center' } },
        { content: 'L', styles: { halign: 'center' } },
        { content: 'P', styles: { halign: 'center' } },
        { content: 'Jml', styles: { halign: 'center' } },
        { content: 'L', styles: { halign: 'center' } },
        { content: 'P', styles: { halign: 'center' } },
        { content: 'Jml', styles: { halign: 'center' } }
      ]
    ];

    const matrixBody = [
      ...rekapMatrixRows.map(r => [
        r.jenjang,
        r.kepsek.l, r.kepsek.p, r.kepsek.total,
        r.guru.l, r.guru.p, r.guru.total,
        r.tendik.l, r.tendik.p, r.tendik.total,
        r.total.l, r.total.p, r.total.total
      ]),
      [
        { content: 'Jumlah Total', styles: { fontStyle: 'bold' } },
        { content: matrixColumnTotals.kepsek.l, styles: { fontStyle: 'bold' } },
        { content: matrixColumnTotals.kepsek.p, styles: { fontStyle: 'bold' } },
        { content: matrixColumnTotals.kepsek.total, styles: { fontStyle: 'bold' } },
        { content: matrixColumnTotals.guru.l, styles: { fontStyle: 'bold' } },
        { content: matrixColumnTotals.guru.p, styles: { fontStyle: 'bold' } },
        { content: matrixColumnTotals.guru.total, styles: { fontStyle: 'bold' } },
        { content: matrixColumnTotals.tendik.l, styles: { fontStyle: 'bold' } },
        { content: matrixColumnTotals.tendik.p, styles: { fontStyle: 'bold' } },
        { content: matrixColumnTotals.tendik.total, styles: { fontStyle: 'bold' } },
        { content: matrixColumnTotals.total.l, styles: { fontStyle: 'bold' } },
        { content: matrixColumnTotals.total.p, styles: { fontStyle: 'bold' } },
        { content: matrixColumnTotals.total.total, styles: { fontStyle: 'bold' } }
      ]
    ];

    autoTable(doc, {
      startY: currentY + 2.5,
      head: matrixHead as any,
      body: matrixBody as any,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', lineWidth: 0.15, lineColor: [203, 213, 225], fontSize: 8 },
      bodyStyles: { halign: 'center', fontSize: 8 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 55, fontStyle: 'bold' }
      },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.15 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;

    // Check if we need a new page for remaining tables
    if (currentY > 140) {
      doc.addPage();
      currentY = 20;
    }

    // Two side-by-side sub-tables: Jenjang & Jenis PTK
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('2. Tabel Berdasarkan Jenjang Pendidikan', marginX + 1, currentY);

    const tableBodyJenjang: any[] = [
      ...rekapJenjangRows.map(r => [r.jenjang, r.l, r.p, r.jumlah, `${r.persentase}%`]),
      [
        { content: 'Jumlah', styles: { fontStyle: 'bold' } },
        { content: totalLaki, styles: { fontStyle: 'bold' } },
        { content: totalPerempuan, styles: { fontStyle: 'bold' } },
        { content: totalGTK, styles: { fontStyle: 'bold' } },
        { content: '100%', styles: { fontStyle: 'bold' } }
      ]
    ];

    autoTable(doc, {
      startY: currentY + 2.5,
      head: [['Jenjang Pendidikan', 'L', 'P', 'Jumlah', 'Persentase']],
      body: tableBodyJenjang,
      theme: 'grid',
      tableWidth: 130,
      margin: { left: marginX },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', lineWidth: 0.15, lineColor: [203, 213, 225] },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 20 }
      },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.15 }
    });

    // Side table: Status Kepegawaian & Jenis PTK
    const rightTableX = marginX + 138;
    doc.text('3. Tabel Berdasarkan Jenis PTK & Status', rightTableX + 1, currentY);

    const tableBodyJenisStatus: any[] = [
      ...rekapJenisRows.map(r => [r.jenis, r.l, r.p, r.jumlah]),
      [
        { content: 'Jumlah', styles: { fontStyle: 'bold' } },
        { content: totalLaki, styles: { fontStyle: 'bold' } },
        { content: totalPerempuan, styles: { fontStyle: 'bold' } },
        { content: totalGTK, styles: { fontStyle: 'bold' } }
      ]
    ];

    autoTable(doc, {
      startY: currentY + 2.5,
      head: [['Jenis PTK', 'L', 'P', 'Jumlah']],
      body: tableBodyJenisStatus,
      theme: 'grid',
      tableWidth: pageWidth - rightTableX - marginX,
      margin: { left: rightTableX },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', lineWidth: 0.15, lineColor: [203, 213, 225] },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 65 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 25 }
      },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.15 }
    });

    // Signature
    const pageHeight = doc.internal.pageSize.getHeight();
    let signY = (doc as any).lastAutoTable.finalY + 10;
    if (signY + 30 > pageHeight - 10) {
      doc.addPage();
      signY = 20;
    }

    const signX = pageWidth - marginX - 65;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(formattedDate, signX, signY);
    doc.text('Kepala SMKN 1 Palopo,', signX, signY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text('RIDWAN, S.T., M.Si.', signX, signY + 20);
    doc.setFont('helvetica', 'normal');
    doc.text('NIP. 19700303 200701 1 032', signX, signY + 24);

    doc.save(`Rekapitulasi_PTK_SMKN1_Palopo_${new Date().toISOString().split('T')[0]}.pdf`);
    setShowActionsDropdown(false);
  };

  const handlePrint = () => {
    setShowActionsDropdown(false);
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Top Header with Title and Actions Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Rekapitulasi GTK (Guru & Tenaga Kependidikan)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan agregasi data berdasarkan Jenjang Pendidikan, Jenis PTK, dan Status Kepegawaian
          </p>
        </div>

        {/* Actions Dropdown Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              <span>Unduh / Cetak Laporan</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {showActionsDropdown && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 text-xs text-slate-700 animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Unduh Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>Unduh PDF Resmi (.pdf)</span>
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Cetak Langsung (Print)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total GTK */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">Total GTK</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-800">{totalGTK}</span>
              <span className="text-[11px] text-slate-500 font-medium">
               {/* (L: {totalLaki} | P: {totalPerempuan})*/}
              </span>
            </div>
          </div>
        </div>

        {/* Guru */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">Guru / Pengajar</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-800">{jenisGroups['Guru'].total}</span>
              <span className="text-[11px] text-slate-500 font-medium">
                {/* (L: {jenisGroups['Guru'].l} | P: {jenisGroups['Guru'].p})*/}
              </span>
            </div>
          </div>
        </div>

        {/* Tenaga Kependidikan */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">Tenaga Kependidikan</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-800">{jenisGroups['Tenaga Kependidikan'].total}</span>
              <span className="text-[11px] text-slate-500 font-medium">
               {/*  (L: {jenisGroups['Tenaga Kependidikan'].l} | P: {jenisGroups['Tenaga Kependidikan'].p})*/}
              </span>
            </div>
          </div>
        </div>

        {/* Kepala Sekolah */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">Kepala Sekolah</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-800">{jenisGroups['Kepala Sekolah'].total}</span>
              <span className="text-[11px] text-slate-500 font-medium">
                {/* (L: {jenisGroups['Kepala Sekolah'].l} | P: {jenisGroups['Kepala Sekolah'].p}) */}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('semua')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'semua'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Semua Rekapitulasi
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matriks')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'matriks'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Matriks Jenjang & Jenis PTK
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('jenjang')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'jenjang'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Jenjang Pendidikan
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('jenis')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'jenis'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Jenis PTK
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'status'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Status Kepegawaian
        </button>
      </div>

      {/* SECTION 1: MATRIKS REKAPITULASI BERDASARKAN JENJANG & JENIS PTK */}
      {(activeTab === 'semua' || activeTab === 'matriks') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Rekapitulasi Berdasarkan Jenjang Pendidikan & Jenis PTK (Matriks Silang)</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Pemetaan silang jenjang kualifikasi pendidikan terhadap kategori penugasan PTK
              </p>
            </div>

            {/* Display Mode Toggle */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 self-start sm:self-auto text-[11px]">
              <button
                type="button"
                onClick={() => setMatrixDisplayMode('detail')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  matrixDisplayMode === 'detail'
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Detail (L / P / Total)
              </button>
              <button
                type="button"
                onClick={() => setMatrixDisplayMode('ringkas')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  matrixDisplayMode === 'ringkas'
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ringkas (Jumlah)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              {matrixDisplayMode === 'detail' ? (
                // DETAIL HEADER
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                    <th rowSpan={2} className="py-2 px-4 text-left font-bold border-r border-slate-200 bg-slate-100 sticky left-0 z-10 w-44">
                      Jenjang Pendidikan
                    </th>
                    <th colSpan={3} className="py-2 px-2 text-center font-bold border-r border-slate-200 bg-amber-50/80 text-amber-900">
                      Kepala Sekolah
                    </th>
                    <th colSpan={3} className="py-2 px-2 text-center font-bold border-r border-slate-200 bg-blue-50/80 text-blue-900">
                      Guru
                    </th>
                    <th colSpan={3} className="py-2 px-2 text-center font-bold border-r border-slate-200 bg-emerald-50/80 text-emerald-900">
                      Tenaga Kependidikan
                    </th>
                    <th colSpan={3} className="py-2 px-2 text-center font-bold bg-slate-200/70 text-slate-900">
                      Total GTK
                    </th>
                  </tr>
                  <tr className="bg-slate-50 text-slate-700 font-semibold text-[11px] border-b border-slate-300">
                    <th className="py-1.5 px-2 text-center w-12 bg-amber-50/40">L</th>
                    <th className="py-1.5 px-2 text-center w-12 bg-amber-50/40">P</th>
                    <th className="py-1.5 px-2 text-center w-14 font-bold border-r border-slate-200 bg-amber-100/60 text-amber-900">Jml</th>

                    <th className="py-1.5 px-2 text-center w-12 bg-blue-50/40">L</th>
                    <th className="py-1.5 px-2 text-center w-12 bg-blue-50/40">P</th>
                    <th className="py-1.5 px-2 text-center w-14 font-bold border-r border-slate-200 bg-blue-100/60 text-blue-900">Jml</th>

                    <th className="py-1.5 px-2 text-center w-12 bg-emerald-50/40">L</th>
                    <th className="py-1.5 px-2 text-center w-12 bg-emerald-50/40">P</th>
                    <th className="py-1.5 px-2 text-center w-14 font-bold border-r border-slate-200 bg-emerald-100/60 text-emerald-900">Jml</th>

                    <th className="py-1.5 px-2 text-center w-12 bg-slate-100/60">L</th>
                    <th className="py-1.5 px-2 text-center w-12 bg-slate-100/60">P</th>
                    <th className="py-1.5 px-2 text-center w-16 font-bold bg-slate-200/80 text-slate-900">Total</th>
                  </tr>
                </thead>
              ) : (
                // RINGKAS HEADER
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                    <th className="py-2.5 px-4 text-left font-bold border-r border-slate-200">
                      Jenjang Pendidikan
                    </th>
                    <th className="py-2.5 px-4 text-center font-bold border-r border-slate-200 bg-amber-50/60 text-amber-900">
                      Kepala Sekolah
                    </th>
                    <th className="py-2.5 px-4 text-center font-bold border-r border-slate-200 bg-blue-50/60 text-blue-900">
                      Guru
                    </th>
                    <th className="py-2.5 px-4 text-center font-bold border-r border-slate-200 bg-emerald-50/60 text-emerald-900">
                      Tenaga Kependidikan
                    </th>
                    <th className="py-2.5 px-4 text-center font-bold bg-slate-200/70 text-slate-900">
                      Total GTK
                    </th>
                  </tr>
                </thead>
              )}

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rekapMatrixRows.length === 0 ? (
                  <tr>
                    <td colSpan={matrixDisplayMode === 'detail' ? 13 : 5} className="py-8 text-center text-slate-400">
                      Belum ada data GTK untuk direkapitulasi
                    </td>
                  </tr>
                ) : (
                  rekapMatrixRows.map((row) => (
                    <tr key={row.jenjang} className="hover:bg-slate-50/80 transition-colors">
                      {/* Jenjang */}
                      <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200 bg-white sticky left-0 z-10">
                        {row.jenjang}
                      </td>

                      {matrixDisplayMode === 'detail' ? (
                        <>
                          {/* Kepala Sekolah */}
                          <td className="py-2.5 px-2 text-center text-slate-600">{row.kepsek.l || '-'}</td>
                          <td className="py-2.5 px-2 text-center text-slate-600">{row.kepsek.p || '-'}</td>
                          <td className="py-2.5 px-2 text-center font-semibold text-amber-800 border-r border-slate-200 bg-amber-50/30">
                            {row.kepsek.total || '-'}
                          </td>

                          {/* Guru */}
                          <td className="py-2.5 px-2 text-center text-slate-600">{row.guru.l || '-'}</td>
                          <td className="py-2.5 px-2 text-center text-slate-600">{row.guru.p || '-'}</td>
                          <td className="py-2.5 px-2 text-center font-semibold text-blue-800 border-r border-slate-200 bg-blue-50/30">
                            {row.guru.total || '-'}
                          </td>

                          {/* Tenaga Kependidikan */}
                          <td className="py-2.5 px-2 text-center text-slate-600">{row.tendik.l || '-'}</td>
                          <td className="py-2.5 px-2 text-center text-slate-600">{row.tendik.p || '-'}</td>
                          <td className="py-2.5 px-2 text-center font-semibold text-emerald-800 border-r border-slate-200 bg-emerald-50/30">
                            {row.tendik.total || '-'}
                          </td>

                          {/* Total GTK */}
                          <td className="py-2.5 px-2 text-center text-slate-700 font-medium">{row.total.l || '-'}</td>
                          <td className="py-2.5 px-2 text-center text-slate-700 font-medium">{row.total.p || '-'}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-900 bg-slate-100/70">
                            {row.total.total}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-4 text-center font-semibold text-amber-800 border-r border-slate-200">
                            {row.kepsek.total || '-'}
                          </td>
                          <td className="py-2.5 px-4 text-center font-semibold text-blue-800 border-r border-slate-200">
                            {row.guru.total || '-'}
                          </td>
                          <td className="py-2.5 px-4 text-center font-semibold text-emerald-800 border-r border-slate-200">
                            {row.tendik.total || '-'}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-slate-900 bg-slate-50/50">
                            {row.total.total}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-slate-300 text-slate-900 font-bold bg-slate-100/70">
                  <td className="py-3 px-4 font-bold border-r border-slate-200 bg-slate-100 sticky left-0 z-10">
                    Jumlah Total
                  </td>

                  {matrixDisplayMode === 'detail' ? (
                    <>
                      <td className="py-3 px-2 text-center font-bold">{matrixColumnTotals.kepsek.l}</td>
                      <td className="py-3 px-2 text-center font-bold">{matrixColumnTotals.kepsek.p}</td>
                      <td className="py-3 px-2 text-center font-bold text-amber-900 border-r border-slate-200 bg-amber-100/50">
                        {matrixColumnTotals.kepsek.total}
                      </td>

                      <td className="py-3 px-2 text-center font-bold">{matrixColumnTotals.guru.l}</td>
                      <td className="py-3 px-2 text-center font-bold">{matrixColumnTotals.guru.p}</td>
                      <td className="py-3 px-2 text-center font-bold text-blue-900 border-r border-slate-200 bg-blue-100/50">
                        {matrixColumnTotals.guru.total}
                      </td>

                      <td className="py-3 px-2 text-center font-bold">{matrixColumnTotals.tendik.l}</td>
                      <td className="py-3 px-2 text-center font-bold">{matrixColumnTotals.tendik.p}</td>
                      <td className="py-3 px-2 text-center font-bold text-emerald-900 border-r border-slate-200 bg-emerald-100/50">
                        {matrixColumnTotals.tendik.total}
                      </td>

                      <td className="py-3 px-2 text-center font-bold">{matrixColumnTotals.total.l}</td>
                      <td className="py-3 px-2 text-center font-bold">{matrixColumnTotals.total.p}</td>
                      <td className="py-3 px-2 text-center font-extrabold text-slate-950 bg-slate-200/80">
                        {matrixColumnTotals.total.total}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-center font-bold text-amber-900 border-r border-slate-200">
                        {matrixColumnTotals.kepsek.total}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-900 border-r border-slate-200">
                        {matrixColumnTotals.guru.total}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-900 border-r border-slate-200">
                        {matrixColumnTotals.tendik.total}
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-slate-950 bg-slate-200/60">
                        {matrixColumnTotals.total.total}
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2 & 3: GRID CARDS (Jenjang Pendidikan & Jenis PTK) */}
      {(activeTab === 'semua' || activeTab === 'jenjang' || activeTab === 'jenis') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card: Tabel Berdasarkan Jenjang Pendidikan */}
          {(activeTab === 'semua' || activeTab === 'jenjang') && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>Tabel Berdasarkan Jenjang Pendidikan</span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Distribusi kualifikasi akademik seluruh GTK
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                  {rekapJenjangRows.length} Jenjang
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                      <th className="py-2.5 px-5 text-left font-semibold">Jenjang</th>
                      <th className="py-2.5 px-4 text-center font-semibold w-16">L</th>
                      <th className="py-2.5 px-4 text-center font-semibold w-16">P</th>
                      <th className="py-2.5 px-4 text-center font-semibold w-20">Jumlah</th>
                      <th className="py-2.5 px-4 text-center font-semibold w-20">Persentase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {rekapJenjangRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Belum ada data jenjang
                        </td>
                      </tr>
                    ) : (
                      rekapJenjangRows.map((row) => (
                        <tr key={row.jenjang} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-5 font-medium text-slate-800">
                            {row.jenjang}
                          </td>
                          <td className="py-2.5 px-4 text-center text-slate-600">
                            {row.l}
                          </td>
                          <td className="py-2.5 px-4 text-center text-slate-600">
                            {row.p}
                          </td>
                          <td className="py-2.5 px-4 text-center font-semibold text-slate-900">
                            {row.jumlah}
                          </td>
                          <td className="py-2.5 px-4 text-center text-slate-500 font-medium">
                            {row.persentase}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 text-slate-900 font-bold bg-slate-50/50">
                      <td className="py-3 px-5 font-bold">Jumlah</td>
                      <td className="py-3 px-4 text-center font-bold">{totalLaki}</td>
                      <td className="py-3 px-4 text-center font-bold">{totalPerempuan}</td>
                      <td className="py-3 px-4 text-center font-bold">{totalGTK}</td>
                      <td className="py-3 px-4 text-center font-bold">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Card: Tabel Berdasarkan Jenis PTK */}
          {(activeTab === 'semua' || activeTab === 'jenis') && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span>Tabel Berdasarkan Jenis PTK</span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Pengelompokan penugasan Guru dan Tenaga Kependidikan
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailJenisPtk(!showDetailJenisPtk)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                >
                  {showDetailJenisPtk ? 'Kategori Pokok' : 'Lihat Rincian'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                      <th className="py-2.5 px-5 text-left font-semibold">
                        {showDetailJenisPtk ? 'Jenis PTK (Rincian)' : 'Kategori PTK'}
                      </th>
                      <th className="py-2.5 px-4 text-center font-semibold w-16">L</th>
                      <th className="py-2.5 px-4 text-center font-semibold w-16">P</th>
                      <th className="py-2.5 px-4 text-center font-semibold w-20">Jumlah</th>
                      <th className="py-2.5 px-4 text-center font-semibold w-20">Persentase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(showDetailJenisPtk ? rekapDetailJenisRows : rekapJenisRows).map((row) => (
                      <tr key={row.jenis} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-5 font-medium text-slate-800">
                          {row.jenis}
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-600">
                          {row.l}
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-600">
                          {row.p}
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold text-slate-900">
                          {row.jumlah}
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-500 font-medium">
                          {totalGTK > 0 ? ((row.jumlah / totalGTK) * 100).toFixed(1) : '0'}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 text-slate-900 font-bold bg-slate-50/50">
                      <td className="py-3 px-5 font-bold">Jumlah</td>
                      <td className="py-3 px-4 text-center font-bold">{totalLaki}</td>
                      <td className="py-3 px-4 text-center font-bold">{totalPerempuan}</td>
                      <td className="py-3 px-4 text-center font-bold">{totalGTK}</td>
                      <td className="py-3 px-4 text-center font-bold">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: TABEL STATUS KEPEGAWAIAN */}
      {(activeTab === 'semua' || activeTab === 'status') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Tabel Berdasarkan Status Kepegawaian</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Rincian status ASN (PNS/PPPK) dan Non-ASN / Tenaga Honorer
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
              {rekapStatusRows.length} Kategori Status
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                  <th className="py-2.5 px-5 text-left font-semibold">Status Kepegawaian</th>
                  <th className="py-2.5 px-4 text-center font-semibold w-20">L</th>
                  <th className="py-2.5 px-4 text-center font-semibold w-20">P</th>
                  <th className="py-2.5 px-5 text-center font-semibold w-24">Jumlah</th>
                  <th className="py-2.5 px-5 text-center font-semibold w-24">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rekapStatusRows.map((row) => (
                  <tr key={row.status} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-5 font-normal text-slate-800">
                      {row.status}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-600 font-normal">
                      {row.l}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-600 font-normal">
                      {row.p}
                    </td>
                    <td className="py-2.5 px-5 text-center text-slate-900 font-semibold">
                      {row.jumlah}
                    </td>
                    <td className="py-2.5 px-5 text-center text-slate-500 font-medium">
                      {totalGTK > 0 ? ((row.jumlah / totalGTK) * 100).toFixed(1) : '0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 text-slate-900 font-bold bg-slate-50/40">
                  <td className="py-3 px-5 font-bold">Jumlah Total</td>
                  <td className="py-3 px-4 text-center font-bold">{totalLaki}</td>
                  <td className="py-3 px-4 text-center font-bold">{totalPerempuan}</td>
                  <td className="py-3 px-5 text-center font-bold">{totalGTK}</td>
                  <td className="py-3 px-5 text-center font-bold">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RekapGTKView;
