import React, { useState, useMemo } from 'react';
import { Student, Jurusan } from '../types';
import { Printer, Download, ChevronDown, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { INITIAL_JURUSAN_LIST, getJurusanByKelas } from '../data/initialJurusan';
import { LOGO_BASE64 } from '../assets/logoBase64';
import { parseToYYYYMMDD } from '../utils/dateUtils';

interface RekapViewProps {
  students: Student[];
  jurusanList?: Jurusan[];
}

interface ClassSummary {
  total: number;
  laki: number;
  perempuan: number;
  agamaMap: Record<string, number>;
  ageMap: Record<string, number>;
}

interface ProgramKeahlianSummary {
  kode: string;
  programKeahlian: string;
  laki: number;
  perempuan: number;
  total: number;
}

export const calculateStudentAge = (birthDateStr?: string): number | null => {
  if (!birthDateStr) return null;
  const isoDate = parseToYYYYMMDD(birthDateStr);
  if (!isoDate) return null;
  const parts = isoDate.split('-');
  if (parts.length < 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1900 || y > 2100) return null;

  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = (today.getMonth() + 1) - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age--;
  }
  return age >= 0 && age < 100 ? age : null;
};

export const getAgeCategory = (age: number | null): string => {
  if (age === null) return 'Belum Ada Data';
  if (age < 15) return '< 15 Thn';
  if (age === 15) return '15 Thn';
  if (age === 16) return '16 Thn';
  if (age === 17) return '17 Thn';
  if (age === 18) return '18 Thn';
  if (age === 19) return '19 Thn';
  return '≥ 20 Thn';
};

export const RekapView: React.FC<RekapViewProps> = ({ 
  students,
  jurusanList = INITIAL_JURUSAN_LIST
}) => {
  const [activeTab, setActiveTab] = useState<'jk' | 'agama' | 'jurusan' | 'umur'>('jurusan');
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);

  // Standard religions list matching screenshot
  const religions = ['Islam', 'Kristen', 'Katholik', 'Hindu', 'Budha', 'Khonghucu'];

  // Rekapitulasi peserta didik hanya menghitung siswa yang berstatus Aktif
  // Siswa mutasi keluar / mengundurkan diri (Tidak Aktif) otomatis berkurang dari rekap
  const activeStudents = useMemo(() => {
    return students.filter((s) => {
      const st = (s.status || '').toLowerCase().trim();
      if (st === 'tidak aktif' || st.includes('tidak') || st === 'mutasi' || st === 'keluar' || st === 'mengundurkan diri') {
        return false;
      }
      return true;
    });
  }, [students]);

  // Total student counts (hanya siswa aktif)
  const totalSiswa = activeStudents.length;
  const totalLaki = activeStudents.filter((s) => s.jk === 'L').length;
  const totalPerempuan = activeStudents.filter((s) => s.jk === 'P').length;

  // Agama total counts overall
  const religionTotals: Record<string, number> = {};
  religions.forEach((r) => (religionTotals[r] = 0));

  activeStudents.forEach((s) => {
    let agm = (s.agama || '').trim();
    if (agm === 'Buddha') agm = 'Budha';
    if (agm) {
      religionTotals[agm] = (religionTotals[agm] || 0) + 1;
    }
  });

  // Standard Age Categories for Secondary/Vocational School (SMK)
  const standardAgeCategories = ['< 15 Thn', '15 Thn', '16 Thn', '17 Thn', '18 Thn', '19 Thn', '≥ 20 Thn'];
  const hasUnknownAge = activeStudents.some((s) => calculateStudentAge(s.tanggalLahir) === null);
  const activeAgeCategories = hasUnknownAge
    ? [...standardAgeCategories, 'Belum Ada Data']
    : standardAgeCategories;

  const overallAgeMap: Record<string, { laki: number; perempuan: number; total: number }> = {};
  activeAgeCategories.forEach((cat) => {
    overallAgeMap[cat] = { laki: 0, perempuan: 0, total: 0 };
  });

  const validAges: number[] = [];

  // Aggregate by Grade Level (Kelas 10, Kelas 11, Kelas 12)
  const levelMap: Record<
    string,
    {
      laki: number;
      perempuan: number;
      total: number;
      agamaMap: Record<string, number>;
      ageMap: Record<string, number>;
    }
  > = {};

  // Aggregate Program Keahlian by Grade Level
  const levelJurusanMap: Record<string, Record<string, ProgramKeahlianSummary>> = {};
  const overallJurusanMap: Record<string, ProgramKeahlianSummary> = {};

  activeStudents.forEach((student) => {
    const rawClass = (student.kelas || '').trim();
    let levelName = 'Lainnya';
    const numMatch = rawClass.match(/^(\d+)/);
    if (numMatch) {
      levelName = `Kelas ${numMatch[1]}`;
    } else {
      const romanMatch = rawClass.match(/^(XII|XI|X|IX|VIII|VII)/i);
      if (romanMatch) {
        levelName = `Kelas ${romanMatch[1].toUpperCase()}`;
      } else if (rawClass) {
        levelName = `Kelas ${rawClass}`;
      }
    }

    if (!levelMap[levelName]) {
      levelMap[levelName] = { laki: 0, perempuan: 0, total: 0, agamaMap: {}, ageMap: {} };
    }
    levelMap[levelName].total += 1;
    if (student.jk === 'L') levelMap[levelName].laki += 1;
    if (student.jk === 'P') levelMap[levelName].perempuan += 1;

    let agm = (student.agama || '').trim();
    if (agm === 'Buddha') agm = 'Budha';
    if (agm) {
      levelMap[levelName].agamaMap[agm] = (levelMap[levelName].agamaMap[agm] || 0) + 1;
    }

    // Age calculation for Grade Level and Overall
    const age = calculateStudentAge(student.tanggalLahir);
    if (age !== null) {
      validAges.push(age);
    }
    const ageCat = getAgeCategory(age);
    levelMap[levelName].ageMap[ageCat] = (levelMap[levelName].ageMap[ageCat] || 0) + 1;

    if (!overallAgeMap[ageCat]) {
      overallAgeMap[ageCat] = { laki: 0, perempuan: 0, total: 0 };
    }
    overallAgeMap[ageCat].total += 1;
    if (student.jk === 'L') overallAgeMap[ageCat].laki += 1;
    if (student.jk === 'P') overallAgeMap[ageCat].perempuan += 1;

    // Program Keahlian Aggregation
    const matchedJurusan = getJurusanByKelas(rawClass, jurusanList);
    const progKey = matchedJurusan?.programKeahlian || (matchedJurusan?.kode ? `Program ${matchedJurusan.kode}` : 'Lainnya');
    const kodeKey = matchedJurusan?.kode || '-';

    // Per Level Jurusan
    if (!levelJurusanMap[levelName]) {
      levelJurusanMap[levelName] = {};
    }
    if (!levelJurusanMap[levelName][progKey]) {
      levelJurusanMap[levelName][progKey] = {
        kode: kodeKey,
        programKeahlian: progKey,
        laki: 0,
        perempuan: 0,
        total: 0
      };
    }
    levelJurusanMap[levelName][progKey].total += 1;
    if (student.jk === 'L') levelJurusanMap[levelName][progKey].laki += 1;
    if (student.jk === 'P') levelJurusanMap[levelName][progKey].perempuan += 1;

    // Overall Jurusan
    if (!overallJurusanMap[progKey]) {
      overallJurusanMap[progKey] = {
        kode: kodeKey,
        programKeahlian: progKey,
        laki: 0,
        perempuan: 0,
        total: 0
      };
    }
    overallJurusanMap[progKey].total += 1;
    if (student.jk === 'L') overallJurusanMap[progKey].laki += 1;
    if (student.jk === 'P') overallJurusanMap[progKey].perempuan += 1;
  });

  const levelList = Object.entries(levelMap)
    .map(([level, data]) => ({ level, ...data }))
    .sort((a, b) => a.level.localeCompare(b.level, undefined, { numeric: true, sensitivity: 'base' }));

  // Formatted Program Keahlian Level List
  const levelJurusanList = Object.entries(levelJurusanMap)
    .map(([level, jurusanObj]) => {
      const items = Object.values(jurusanObj).sort((a, b) =>
        a.programKeahlian.localeCompare(b.programKeahlian)
      );
      const totalLakiLevel = items.reduce((sum, item) => sum + item.laki, 0);
      const totalPerempuanLevel = items.reduce((sum, item) => sum + item.perempuan, 0);
      const totalLevel = items.reduce((sum, item) => sum + item.total, 0);
      return {
        level,
        items,
        totalLaki: totalLakiLevel,
        totalPerempuan: totalPerempuanLevel,
        total: totalLevel
      };
    })
    .sort((a, b) => a.level.localeCompare(b.level, undefined, { numeric: true, sensitivity: 'base' }));

  const overallJurusanList = Object.values(overallJurusanMap).sort((a, b) =>
    a.programKeahlian.localeCompare(b.programKeahlian)
  );

  // Formatted Overall Age List
  const overallAgeList = activeAgeCategories.map((cat) => {
    const data = overallAgeMap[cat] || { laki: 0, perempuan: 0, total: 0 };
    const pct = totalSiswa > 0 ? ((data.total / totalSiswa) * 100).toFixed(1) : '0';
    return {
      category: cat,
      laki: data.laki,
      perempuan: data.perempuan,
      total: data.total,
      percentage: pct
    };
  });

  const avgAge = validAges.length > 0 
    ? (validAges.reduce((sum, a) => sum + a, 0) / validAges.length).toFixed(1)
    : '-';
  const minAge = validAges.length > 0 ? Math.min(...validAges) : '-';
  const maxAge = validAges.length > 0 ? Math.max(...validAges) : '-';

  // Aggregate by Rombel (10 AKL 1, 10 AKL 2, etc.)
  const classMap: Record<string, ClassSummary> = {};

  activeStudents.forEach((student) => {
    const cls = (student.kelas || 'Lainnya').trim();
    if (!classMap[cls]) {
      classMap[cls] = { total: 0, laki: 0, perempuan: 0, agamaMap: {}, ageMap: {} };
    }
    classMap[cls].total += 1;
    if (student.jk === 'L') classMap[cls].laki += 1;
    if (student.jk === 'P') classMap[cls].perempuan += 1;

    let agm = (student.agama || '').trim();
    if (agm === 'Buddha') agm = 'Budha';
    if (agm) {
      classMap[cls].agamaMap[agm] = (classMap[cls].agamaMap[agm] || 0) + 1;
    }

    const age = calculateStudentAge(student.tanggalLahir);
    const ageCat = getAgeCategory(age);
    classMap[cls].ageMap[ageCat] = (classMap[cls].ageMap[ageCat] || 0) + 1;
  });

  const classList = Object.entries(classMap)
    .map(([kelas, data]) => ({ kelas, ...data }))
    .sort((a, b) => a.kelas.localeCompare(b.kelas, undefined, { numeric: true, sensitivity: 'base' }));

  // Helper to draw official Kop Surat on any page
  const drawKopSurat = (doc: jsPDF, title: string, subtitle?: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 10;

    try {
      doc.addImage(LOGO_BASE64, 'PNG', 12, 7.5, 21, 21);
    } catch {
      // Ignore if image fails
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('PEMERINTAH PROVINSI SULAWESI SELATAN', pageWidth / 2, 11, { align: 'center' });
    doc.setFontSize(10.5);
    doc.text('DINAS PENDIDIKAN', pageWidth / 2, 15.5, { align: 'center' });
    doc.setFontSize(11.5);
    doc.text('SEKOLAH MENENGAH KEJURUAN NEGERI 1 PALOPO', pageWidth / 2, 20.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Jl. KHM. Kasim NO. 10 Kota Palopo Sulawesi Selatan', pageWidth / 2, 25, { align: 'center' });
    doc.text('Website : http://www.smkn1-palopo.sch.id E.mail: info@smknegeri1palopo.sch.id', pageWidth / 2, 28.5, { align: 'center' });

    // Double separator line
    doc.setLineWidth(0.6);
    doc.line(marginX, 31, pageWidth - marginX, 31);
    doc.setLineWidth(0.15);
    doc.line(marginX, 31.8, pageWidth - marginX, 31.8);

    // Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, pageWidth / 2, 38, { align: 'center' });

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(subtitle, pageWidth / 2, 42.5, { align: 'center' });
    }
  };

  // Helper to draw signature footer
  const drawSignatureFooter = (doc: jsPDF, currentY: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;

    let signY = currentY + 12;
    if (signY + 35 > pageHeight - 10) {
      doc.addPage();
      signY = 20;
    }

    const bulanIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const today = new Date();
    const formattedDate = `Palopo, ${today.getDate()} ${bulanIndo[today.getMonth()]} ${today.getFullYear()}`;

    const signX = pageWidth - marginX - 65;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(formattedDate, signX, signY);
    doc.text('Kepala SMKN 1 Palopo,', signX, signY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text('RIDWAN, S.T., M.Si.', signX, signY + 22);
    doc.setFont('helvetica', 'normal');
    doc.text('NIP. 19700303 200701 1 032', signX, signY + 26);
  };

  // Helper to render Jurusan / Program Keahlian section
  const renderJurusanReport = (doc: jsPDF, academicYear: string, withSign: boolean) => {
    drawKopSurat(
      doc,
      'LAPORAN REKAPITULASI PROGRAM KEAHLIAN',
      `Tahun Ajaran ${academicYear}`
    );

    let lastY = 46;

    // Render Table per Grade Level
    levelJurusanList.forEach((levelItem) => {
      // Check if space is too tight for table header
      if (lastY + 30 > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        drawKopSurat(doc, 'LAPORAN REKAPITULASI PROGRAM KEAHLIAN (LANJUTAN)', `Tahun Ajaran ${academicYear}`);
        lastY = 46;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${levelItem.level}`, 10, lastY);

      const bodyData = levelItem.items.map((item, idx) => [
        String(idx + 1),
        item.programKeahlian,
        String(item.laki),
        String(item.perempuan),
        String(item.total)
      ]);

      bodyData.push([
        '',
        'Jumlah', // atau kondisi: levelItem.level === 'Kelas 12' ? 'Jumlah Total' : `Jumlah ${levelItem.level}`
        String(levelItem.totalLaki),
        String(levelItem.totalPerempuan),
        String(levelItem.total)
      ]);

      autoTable(doc, {
        startY: lastY + 2,
        margin: { left: 10, right: 10 },
        head: [['No', 'Program Keahlian', 'Laki-Laki', 'Perempuan', 'Jumlah']],
        body: bodyData,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2,
          textColor: [30, 41, 59],
          lineColor: [203, 213, 225],
          lineWidth: 0.15
        },
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'left' },
          2: { halign: 'center', cellWidth: 26 },
          3: { halign: 'center', cellWidth: 26 },
          4: { halign: 'center', cellWidth: 26 }
        },
        didParseCell: (data) => {
          if (data.row.index === bodyData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
          }
        }
      });

      lastY = (doc as any).lastAutoTable.finalY + 8;
    });

    // Overall Rekapitulasi Program Keahlian
    if (lastY + 45 > doc.internal.pageSize.getHeight() - 25) {
      doc.addPage();
      drawKopSurat(doc, 'REKAPITULASI KESELURUHAN PROGRAM KEAHLIAN', `Tahun Ajaran ${academicYear}`);
      lastY = 46;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Total Rekapitulasi Program Keahlian (Semua Tingkat)', 10, lastY);

    const overallBody = overallJurusanList.map((item, idx) => [
      String(idx + 1),
      item.programKeahlian,
      String(item.laki),
      String(item.perempuan),
      String(item.total)
    ]);

    overallBody.push([
      '',
      'Total Seluruh Siswa',
      String(totalLaki),
      String(totalPerempuan),
      String(totalSiswa)
    ]);

    autoTable(doc, {
      startY: lastY + 2,
      margin: { left: 10, right: 10 },
      head: [['No', 'Program Keahlian', 'Laki-Laki', 'Perempuan', 'Jumlah']],
      body: overallBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 26 },
        3: { halign: 'center', cellWidth: 26 },
        4: { halign: 'center', cellWidth: 26 }
      },
      didParseCell: (data) => {
        if (data.row.index === overallBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [236, 253, 245];
        }
      }
    });

    lastY = (doc as any).lastAutoTable.finalY;
    if (withSign) {
      drawSignatureFooter(doc, lastY);
    }
  };

  // Helper to render Jenis Kelamin section
  const renderJKReport = (doc: jsPDF, academicYear: string, withSign: boolean) => {
    drawKopSurat(
      doc,
      'LAPORAN REKAPITULASI PESERTA DIDIK MENURUT JENIS KELAMIN',
      `Tahun Ajaran ${academicYear}`
    );

    let lastY = 46;

    // Table 1: Tingkat Kelas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('1. Rekapitulasi Berdasarkan Tingkat Kelas', 10, lastY);

    const levelBody = levelList.map((item, idx) => [
      String(idx + 1),
      item.level,
      String(item.laki),
      String(item.perempuan),
      String(item.total)
    ]);

    levelBody.push([
      '',
      'Jumlah Total',
      String(totalLaki),
      String(totalPerempuan),
      String(totalSiswa)
    ]);

    autoTable(doc, {
      startY: lastY + 2,
      margin: { left: 10, right: 10 },
      head: [['No', 'Tingkat Kelas', 'Laki-Laki', 'Perempuan', 'Jumlah']],
      body: levelBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 26 },
        3: { halign: 'center', cellWidth: 26 },
        4: { halign: 'center', cellWidth: 26 }
      },
      didParseCell: (data) => {
        if (data.row.index === levelBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    });

    lastY = (doc as any).lastAutoTable.finalY + 8;

    // Table 2: Rombongan Belajar
    if (lastY + 30 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      drawKopSurat(doc, 'REKAPITULASI ROMBONGAN BELAJAR (ROMBEL)', `Tahun Ajaran ${academicYear}`);
      lastY = 46;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('2. Rekapitulasi Berdasarkan Rombongan Belajar (Rombel)', 10, lastY);

    const classBody = classList.map((item, idx) => [
      String(idx + 1),
      item.kelas,
      String(item.laki),
      String(item.perempuan),
      String(item.total)
    ]);

    classBody.push([
      '',
      'Jumlah Total',
      String(totalLaki),
      String(totalPerempuan),
      String(totalSiswa)
    ]);

    autoTable(doc, {
      startY: lastY + 2,
      margin: { left: 10, right: 10 },
      head: [['No', 'Nama Rombel / Kelas', 'Laki-Laki', 'Perempuan', 'Jumlah']],
      body: classBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 26 },
        3: { halign: 'center', cellWidth: 26 },
        4: { halign: 'center', cellWidth: 26 }
      },
      didParseCell: (data) => {
        if (data.row.index === classBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    });

    lastY = (doc as any).lastAutoTable.finalY;
    if (withSign) {
      drawSignatureFooter(doc, lastY);
    }
  };

  // Helper to render Agama section
  const renderAgamaReport = (doc: jsPDF, academicYear: string, withSign: boolean) => {
    drawKopSurat(
      doc,
      'LAPORAN REKAPITULASI PESERTA DIDIK MENURUT AGAMA',
      `Tahun Ajaran ${academicYear}`
    );

    let lastY = 46;

    // Table 1: Tingkat Kelas Agama
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('1. Rekapitulasi Agama Berdasarkan Tingkat Kelas', 10, lastY);

    const levelAgamaBody = levelList.map((item, idx) => [
      String(idx + 1),
      item.level,
      String(item.agamaMap['Islam'] || 0),
      String(item.agamaMap['Kristen'] || 0),
      String(item.agamaMap['Katholik'] || 0),
      String(item.agamaMap['Hindu'] || 0),
      String(item.agamaMap['Budha'] || 0),
      String(item.agamaMap['Khonghucu'] || 0),
      String(item.total)
    ]);

    levelAgamaBody.push([
      '',
      'Jumlah Total',
      String(religionTotals['Islam'] || 0),
      String(religionTotals['Kristen'] || 0),
      String(religionTotals['Katholik'] || 0),
      String(religionTotals['Hindu'] || 0),
      String(religionTotals['Budha'] || 0),
      String(religionTotals['Khonghucu'] || 0),
      String(totalSiswa)
    ]);

    autoTable(doc, {
      startY: lastY + 2,
      margin: { left: 10, right: 10 },
      head: [['No', 'Tingkat Kelas', 'Islam', 'Kristen', 'Katholik', 'Hindu', 'Budha', 'Khonghucu', 'Jumlah']],
      body: levelAgamaBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 18 },
        5: { halign: 'center', cellWidth: 18 },
        6: { halign: 'center', cellWidth: 18 },
        7: { halign: 'center', cellWidth: 18 },
        8: { halign: 'center', cellWidth: 20 }
      },
      didParseCell: (data) => {
        if (data.row.index === levelAgamaBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    });

    lastY = (doc as any).lastAutoTable.finalY + 8;

    // Table 2: Rombel Agama
    if (lastY + 30 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      drawKopSurat(doc, 'REKAPITULASI AGAMA BERDASARKAN ROMBEL', `Tahun Ajaran ${academicYear}`);
      lastY = 46;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('2. Rekapitulasi Agama Berdasarkan Rombongan Belajar (Rombel)', 10, lastY);

    const classAgamaBody = classList.map((item, idx) => [
      String(idx + 1),
      item.kelas,
      String(item.agamaMap['Islam'] || 0),
      String(item.agamaMap['Kristen'] || 0),
      String(item.agamaMap['Katholik'] || 0),
      String(item.agamaMap['Hindu'] || 0),
      String(item.agamaMap['Budha'] || 0),
      String(item.agamaMap['Khonghucu'] || 0),
      String(item.total)
    ]);

    classAgamaBody.push([
      '',
      'Jumlah Total',
      String(religionTotals['Islam'] || 0),
      String(religionTotals['Kristen'] || 0),
      String(religionTotals['Katholik'] || 0),
      String(religionTotals['Hindu'] || 0),
      String(religionTotals['Budha'] || 0),
      String(religionTotals['Khonghucu'] || 0),
      String(totalSiswa)
    ]);

    autoTable(doc, {
      startY: lastY + 2,
      margin: { left: 10, right: 10 },
      head: [['No', 'Nama Rombel / Kelas', 'Islam', 'Kristen', 'Katholik', 'Hindu', 'Budha', 'Khonghucu', 'Jumlah']],
      body: classAgamaBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7,
        cellPadding: 1.6,
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 18 },
        5: { halign: 'center', cellWidth: 18 },
        6: { halign: 'center', cellWidth: 18 },
        7: { halign: 'center', cellWidth: 18 },
        8: { halign: 'center', cellWidth: 20 }
      },
      didParseCell: (data) => {
        if (data.row.index === classAgamaBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    });

    lastY = (doc as any).lastAutoTable.finalY;
    if (withSign) {
      drawSignatureFooter(doc, lastY);
    }
  };

  // Helper to render Usia / Umur section
  const renderUmurReport = (doc: jsPDF, academicYear: string, withSign: boolean) => {
    drawKopSurat(
      doc,
      'LAPORAN REKAPITULASI PESERTA DIDIK MENURUT KELOMPOK USIA',
      `Tahun Ajaran ${academicYear}`
    );

    let lastY = 46;

    // Table 1: Ringkasan Usia & Jenis Kelamin
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('1. Ringkasan Menurut Kelompok Usia & Jenis Kelamin', 10, lastY);

    const overallAgeBody = overallAgeList.map((item, idx) => [
      String(idx + 1),
      item.category,
      String(item.laki),
      String(item.perempuan),
      String(item.total),
      `${item.percentage}%`
    ]);

    overallAgeBody.push([
      '',
      'Jumlah Total',
      String(totalLaki),
      String(totalPerempuan),
      String(totalSiswa),
      '100%'
    ]);

    autoTable(doc, {
      startY: lastY + 2,
      margin: { left: 10, right: 10 },
      head: [['No', 'Kelompok Usia', 'Laki-Laki', 'Perempuan', 'Jumlah Siswa', 'Persentase']],
      body: overallAgeBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 26 },
        3: { halign: 'center', cellWidth: 26 },
        4: { halign: 'center', cellWidth: 26 },
        5: { halign: 'center', cellWidth: 26 }
      },
      didParseCell: (data) => {
        if (data.row.index === overallAgeBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    });

    lastY = (doc as any).lastAutoTable.finalY + 8;

    // Table 2: Tingkat Kelas Usia
    if (lastY + 32 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      drawKopSurat(doc, 'REKAPITULASI USIA BERDASARKAN TINGKAT KELAS', `Tahun Ajaran ${academicYear}`);
      lastY = 46;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('2. Rekapitulasi Usia Berdasarkan Tingkat Kelas', 10, lastY);

    const levelAgeBody = levelList.map((item, idx) => [
      String(idx + 1),
      item.level,
      ...activeAgeCategories.map((cat) => String(item.ageMap[cat] || 0)),
      String(item.total)
    ]);

    levelAgeBody.push([
      '',
      'Jumlah Total',
      ...activeAgeCategories.map((cat) => String(overallAgeMap[cat]?.total || 0)),
      String(totalSiswa)
    ]);

    autoTable(doc, {
      startY: lastY + 2,
      margin: { left: 10, right: 10 },
      head: [['No', 'Tingkat Kelas', ...activeAgeCategories, 'Jumlah']],
      body: levelAgeBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left' }
      },
      didParseCell: (data) => {
        if (data.row.index === levelAgeBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    });

    lastY = (doc as any).lastAutoTable.finalY + 8;

    // Table 3: Rombel Usia
    if (lastY + 32 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      drawKopSurat(doc, 'REKAPITULASI USIA BERDASARKAN ROMBEL', `Tahun Ajaran ${academicYear}`);
      lastY = 46;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('3. Rekapitulasi Usia Berdasarkan Rombongan Belajar (Rombel)', 10, lastY);

    const classAgeBody = classList.map((item, idx) => [
      String(idx + 1),
      item.kelas,
      ...activeAgeCategories.map((cat) => String(item.ageMap[cat] || 0)),
      String(item.total)
    ]);

    classAgeBody.push([
      '',
      'Jumlah Total',
      ...activeAgeCategories.map((cat) => String(overallAgeMap[cat]?.total || 0)),
      String(totalSiswa)
    ]);

    autoTable(doc, {
      startY: lastY + 2,
      margin: { left: 10, right: 10 },
      head: [['No', 'Nama Rombel / Kelas', ...activeAgeCategories, 'Jumlah']],
      body: classAgeBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7,
        cellPadding: 1.6,
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left' }
      },
      didParseCell: (data) => {
        if (data.row.index === classAgeBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    });

    lastY = (doc as any).lastAutoTable.finalY;
    if (withSign) {
      drawSignatureFooter(doc, lastY);
    }
  };

  // Generate Professional PDF Export (A4)
  const handleExportPDF = (type: 'jurusan' | 'jk' | 'agama' | 'umur' | 'all' = activeTab) => {
    setShowPrintDropdown(false);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}/${currentYear + 1}`;

    if (type === 'jurusan') {
      renderJurusanReport(doc, academicYear, true);
    } else if (type === 'jk') {
      renderJKReport(doc, academicYear, true);
    } else if (type === 'agama') {
      renderAgamaReport(doc, academicYear, true);
    } else if (type === 'umur') {
      renderUmurReport(doc, academicYear, true);
    } else if (type === 'all') {
      // 1. Rekapitulasi Program Keahlian
      renderJurusanReport(doc, academicYear, false);
      
      // 2. Rekapitulasi Jenis Kelamin
      doc.addPage();
      renderJKReport(doc, academicYear, false);
      
      // 3. Rekapitulasi Agama Siswa
      doc.addPage();
      renderAgamaReport(doc, academicYear, false);

      // 4. Rekapitulasi Usia Siswa
      doc.addPage();
      renderUmurReport(doc, academicYear, true);
    }

    const typeName = type === 'jurusan' ? 'Program_Keahlian' : type === 'jk' ? 'Jenis_Kelamin' : type === 'agama' ? 'Agama' : type === 'umur' ? 'Usia_Umur' : 'Lengkap_Semua_Kategori';
    doc.save(`Laporan_Rekapitulasi_${typeName}_SMKN1_Palopo_${currentYear}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Rekapitulasi Peserta Didik
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan ringkasan peserta didik SMKN 1 Palopo
          </p>
        </div>

        {/* Print / PDF Action Group */}
        <div className="relative inline-flex self-start sm:self-auto shadow-2xs">
          <button
            onClick={() => handleExportPDF(activeTab)}
            className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-l-lg flex items-center gap-2 transition-colors cursor-pointer"
            title="Cetak/Unduh Laporan PDF tab aktif saat ini"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF ({activeTab === 'jurusan' ? 'Program Keahlian' : activeTab === 'jk' ? 'Jenis Kelamin' : activeTab === 'agama' ? 'Agama' : 'Usia / Umur'})</span>
          </button>
          
          <button
            onClick={() => setShowPrintDropdown(!showPrintDropdown)}
            className="px-2.5 py-2.5 bg-blue-800 hover:bg-blue-900 text-white rounded-r-lg border-l border-blue-600 transition-colors cursor-pointer"
            title="Opsi Laporan Rekapitulasi"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          {showPrintDropdown && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                Pilih Dokumen PDF (A4)
              </div>
              <button
                onClick={() => handleExportPDF('jurusan')}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
              >
                <span>Rekap Program Keahlian</span>
                {activeTab === 'jurusan' && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
              <button
                onClick={() => handleExportPDF('jk')}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
              >
                <span>Rekap Jenis Kelamin</span>
                {activeTab === 'jk' && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
              <button
                onClick={() => handleExportPDF('agama')}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
              >
                <span>Rekap Agama Siswa</span>
                {activeTab === 'agama' && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
              <button
                onClick={() => handleExportPDF('umur')}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
              >
                <span>Rekap Usia / Umur Siswa</span>
                {activeTab === 'umur' && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
              <div className="border-t border-slate-100 my-1"></div>
              <button
                onClick={() => handleExportPDF('all')}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-blue-700 font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Laporan Lengkap</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Layout: Left Tab Buttons + Right Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 items-start">
        {/* Left Navigation Card */}
        <div className="md:col-span-1">
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <button
              onClick={() => setActiveTab('jurusan')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'jurusan'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              Program Keahlian
            </button>
            <button
              onClick={() => setActiveTab('jk')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'jk'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              Jenis Kelamin
            </button>
            <button
              onClick={() => setActiveTab('agama')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'agama'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              Agama
            </button>
            <button
              onClick={() => setActiveTab('umur')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'umur'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              Usia / Umur
            </button>
          </div>
        </div>

        {/* Right Main Content */}
        <div className="md:col-span-3 lg:col-span-4 space-y-6">
          {activeTab === 'jurusan' && (
            <>
              {/* Cards per Grade Level (e.g. Kelas 10, Kelas 11, Kelas 12) */}
              {levelJurusanList.map((levelItem) => (
                <div 
                  key={levelItem.level} 
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                      {levelItem.level}
                    </h3>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                      Total: {levelItem.total} Siswa
                    </span>
                  </div>
                  <div className="overflow-x-auto p-4 pt-2">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                          <th className="py-2.5 px-3 w-12 text-center">No</th>
                          <th className="py-2.5 px-3">Program Keahlian</th>
                          <th className="py-2.5 px-3 text-center w-28">Laki-laki</th>
                          <th className="py-2.5 px-3 text-center w-28">Perempuan</th>
                          <th className="py-2.5 px-3 text-center w-28">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {levelItem.items.map((item, idx) => (
                          <tr key={item.programKeahlian} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                            <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 text-slate-800 font-medium">{item.programKeahlian}</td>
                            <td className="py-2.5 px-3 text-center text-slate-700">{item.laki}</td>
                            <td className="py-2.5 px-3 text-center text-slate-700">{item.perempuan}</td>
                            <td className="py-2.5 px-3 text-center text-slate-900 font-semibold">{item.total}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold text-slate-900 border-t-2 border-slate-200 bg-slate-50/80">
                          <td colSpan={2} className="py-3 px-3">Jumlah </td> {/*{levelItem.level}</td> */}
                          <td className="py-3 px-3 text-center">{levelItem.totalLaki}</td>
                          <td className="py-3 px-3 text-center">{levelItem.totalPerempuan}</td>
                          <td className="py-3 px-3 text-center text-blue-600">{levelItem.total}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}

              {/* Total Rekapitulasi Program Keahlian Semua Kelas */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                    Rekapitulasi Program Keahlian (Semua Tingkat)
                  </h3>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    Total Siswa: {totalSiswa}
                  </span>
                </div>
                <div className="overflow-x-auto p-4 pt-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                        <th className="py-2.5 px-3 w-12 text-center">No</th>
                        <th className="py-2.5 px-3">Program Keahlian</th>
                        <th className="py-2.5 px-3 text-center w-28">Laki-laki</th>
                        <th className="py-2.5 px-3 text-center w-28">Perempuan</th>
                        <th className="py-2.5 px-3 text-center w-28">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overallJurusanList.map((item, idx) => (
                        <tr key={item.programKeahlian} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                          <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">{item.programKeahlian}</td>
                          <td className="py-2.5 px-3 text-center text-slate-700">{item.laki}</td>
                          <td className="py-2.5 px-3 text-center text-slate-700">{item.perempuan}</td>
                          <td className="py-2.5 px-3 text-center text-slate-900 font-semibold">{item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold text-slate-900 border-t-2 border-slate-200 bg-slate-50/60">
                        <td colSpan={2} className="py-3 px-3">Total Seluruh Siswa</td>
                        <td className="py-3 px-3 text-center">{totalLaki}</td>
                        <td className="py-3 px-3 text-center">{totalPerempuan}</td>
                        <td className="py-3 px-3 text-center text-slate-900">{totalSiswa}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'jk' && (
            <>
              {/* Card 1: Tabel Kelas Berdasarkan Jenis Kelamin */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-xs sm:text-sm text-slate-700">
                    Tabel Kelas Berdasarkan Jenis Kelamin
                  </h3>
                </div>
                <div className="overflow-x-auto p-4 pt-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                        <th className="py-2.5 px-3 w-12">No</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        <th className="py-2.5 px-3">Laki-laki</th>
                        <th className="py-2.5 px-3">Perempuan</th>
                        <th className="py-2.5 px-3">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {levelList.map((item, idx) => (
                        <tr key={item.level} className={idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                          <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{item.level}</td>
                          <td className="py-2.5 px-3 text-slate-700">{item.laki}</td>
                          <td className="py-2.5 px-3 text-slate-700">{item.perempuan}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold text-slate-900 border-t border-slate-200">
                        <td colSpan={2} className="py-3 px-3">Jumlah</td>
                        <td className="py-3 px-3">{totalLaki}</td>
                        <td className="py-3 px-3">{totalPerempuan}</td>
                        <td className="py-3 px-3">{totalSiswa}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Card 2: Tabel Rombel Berdasarkan Jenis Kelamin */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-xs sm:text-sm text-slate-700">
                    Tabel Rombel Berdasarkan Jenis Kelamin
                  </h3>
                </div>
                <div className="overflow-x-auto p-4 pt-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                        <th className="py-2.5 px-3 w-12">No</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        <th className="py-2.5 px-3">Laki-laki</th>
                        <th className="py-2.5 px-3">Perempuan</th>
                        <th className="py-2.5 px-3">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classList.map((item, idx) => (
                        <tr key={item.kelas} className={idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                          <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{item.kelas}</td>
                          <td className="py-2.5 px-3 text-slate-700">{item.laki}</td>
                          <td className="py-2.5 px-3 text-slate-700">{item.perempuan}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold text-slate-900 border-t border-slate-200">
                        <td colSpan={2} className="py-3 px-3">Jumlah</td>
                        <td className="py-3 px-3">{totalLaki}</td>
                        <td className="py-3 px-3">{totalPerempuan}</td>
                        <td className="py-3 px-3">{totalSiswa}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'agama' && (
            <>
              {/* Card 1: Tabel Kelas Berdasarkan Agama */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-xs sm:text-sm text-slate-700">
                    Tabel Kelas Berdasarkan Agama
                  </h3>
                </div>
                <div className="overflow-x-auto p-4 pt-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                        <th className="py-2.5 px-3 w-12">No</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        {religions.map((rel) => (
                          <th key={rel} className="py-2.5 px-3">{rel}</th>
                        ))}
                        <th className="py-2.5 px-3">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {levelList.map((item, idx) => {
                        const rowTotal = religions.reduce((sum, rel) => sum + (item.agamaMap[rel] || 0), 0);
                        return (
                          <tr key={item.level} className={idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 text-slate-700 font-medium">{item.level}</td>
                            {religions.map((rel) => (
                              <td key={rel} className="py-2.5 px-3 text-slate-700">
                                {item.agamaMap[rel] || 0}
                              </td>
                            ))}
                            <td className="py-2.5 px-3 text-slate-700 font-medium">{rowTotal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold text-slate-900 border-t border-slate-200">
                        <td colSpan={2} className="py-3 px-3">Jumlah</td>
                        {religions.map((rel) => (
                          <td key={rel} className="py-3 px-3">
                            {religionTotals[rel] || 0}
                          </td>
                        ))}
                        <td className="py-3 px-3">{totalSiswa}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Card 2: Tabel Rombel Berdasarkan Agama */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-xs sm:text-sm text-slate-700">
                    Tabel Rombel Berdasarkan Agama
                  </h3>
                </div>
                <div className="overflow-x-auto p-4 pt-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                        <th className="py-2.5 px-3 w-12">No</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        {religions.map((rel) => (
                          <th key={rel} className="py-2.5 px-3">{rel}</th>
                        ))}
                        <th className="py-2.5 px-3">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classList.map((item, idx) => {
                        const rowTotal = religions.reduce((sum, rel) => sum + (item.agamaMap[rel] || 0), 0);
                        return (
                          <tr key={item.kelas} className={idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 text-slate-700 font-medium">{item.kelas}</td>
                            {religions.map((rel) => (
                              <td key={rel} className="py-2.5 px-3 text-slate-700">
                                {item.agamaMap[rel] || 0}
                              </td>
                            ))}
                            <td className="py-2.5 px-3 text-slate-700 font-medium">{rowTotal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold text-slate-900 border-t border-slate-200">
                        <td colSpan={2} className="py-3 px-3">Jumlah</td>
                        {religions.map((rel) => (
                          <td key={rel} className="py-3 px-3">
                            {religionTotals[rel] || 0}
                          </td>
                        ))}
                        <td className="py-3 px-3">{totalSiswa}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'umur' && (
            <>
              {/* Quick Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-[11px] font-medium text-slate-500">Total Siswa Terdata</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">{totalSiswa} <span className="text-xs font-normal text-slate-500">Siswa</span></p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-[11px] font-medium text-slate-500">Rata-rata Usia</p>
                  <p className="text-lg font-bold text-blue-700 mt-0.5">{avgAge} <span className="text-xs font-normal text-slate-500">Tahun</span></p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-[11px] font-medium text-slate-500">Usia Termuda</p>
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">{minAge} <span className="text-xs font-normal text-slate-500">Tahun</span></p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-[11px] font-medium text-slate-500">Usia Tertua</p>
                  <p className="text-lg font-bold text-amber-700 mt-0.5">{maxAge} <span className="text-xs font-normal text-slate-500">Tahun</span></p>
                </div>
              </div>

              {/* Card 1: Distribusi Menurut Kelompok Usia & Jenis Kelamin */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-xs sm:text-sm text-slate-700 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                    Tabel Distribusi Menurut Kelompok Usia & Jenis Kelamin
                  </h3>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                    Total: {totalSiswa} Siswa
                  </span>
                </div>
                <div className="overflow-x-auto p-4 pt-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                        <th className="py-2.5 px-3 w-12 text-center">No</th>
                        <th className="py-2.5 px-3">Kelompok Usia</th>
                        <th className="py-2.5 px-3 text-center w-28">Laki-laki</th>
                        <th className="py-2.5 px-3 text-center w-28">Perempuan</th>
                        <th className="py-2.5 px-3 text-center w-28">Jumlah Siswa</th>
                        <th className="py-2.5 px-3 text-center w-28">Persentase</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overallAgeList.map((item, idx) => (
                        <tr key={item.category} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                          <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">{item.category}</td>
                          <td className="py-2.5 px-3 text-center text-slate-700">{item.laki}</td>
                          <td className="py-2.5 px-3 text-center text-slate-700">{item.perempuan}</td>
                          <td className="py-2.5 px-3 text-center text-slate-900 font-semibold">{item.total}</td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-medium">{item.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold text-slate-900 border-t-2 border-slate-200 bg-slate-50/80">
                        <td colSpan={2} className="py-3 px-3">Jumlah Total</td>
                        <td className="py-3 px-3 text-center">{totalLaki}</td>
                        <td className="py-3 px-3 text-center">{totalPerempuan}</td>
                        <td className="py-3 px-3 text-center text-blue-700">{totalSiswa}</td>
                        <td className="py-3 px-3 text-center">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Card 2: Tabel Rekapitulasi Usia Berdasarkan Tingkat Kelas */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-xs sm:text-sm text-slate-700">
                    Tabel Kelas Berdasarkan Kelompok Usia
                  </h3>
                </div>
                <div className="overflow-x-auto p-4 pt-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                        <th className="py-2.5 px-3 w-12 text-center">No</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        {activeAgeCategories.map((cat) => (
                          <th key={cat} className="py-2.5 px-3 text-center">{cat}</th>
                        ))}
                        <th className="py-2.5 px-3 text-center">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {levelList.map((item, idx) => {
                        const rowTotal = activeAgeCategories.reduce((sum, cat) => sum + (item.ageMap[cat] || 0), 0);
                        return (
                          <tr key={item.level} className={idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 text-slate-700 font-medium">{item.level}</td>
                            {activeAgeCategories.map((cat) => (
                              <td key={cat} className="py-2.5 px-3 text-center text-slate-700">
                                {item.ageMap[cat] || 0}
                              </td>
                            ))}
                            <td className="py-2.5 px-3 text-center text-slate-700 font-semibold">{rowTotal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold text-slate-900 border-t border-slate-200">
                        <td colSpan={2} className="py-3 px-3">Jumlah</td>
                        {activeAgeCategories.map((cat) => (
                          <td key={cat} className="py-3 px-3 text-center">
                            {overallAgeMap[cat]?.total || 0}
                          </td>
                        ))}
                        <td className="py-3 px-3 text-center">{totalSiswa}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Card 3: Tabel Rekapitulasi Usia Berdasarkan Rombongan Belajar (Rombel) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-xs sm:text-sm text-slate-700">
                    Tabel Rombel Berdasarkan Kelompok Usia
                  </h3>
                </div>
                <div className="overflow-x-auto p-4 pt-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                        <th className="py-2.5 px-3 w-12 text-center">No</th>
                        <th className="py-2.5 px-3">Kelas / Rombel</th>
                        {activeAgeCategories.map((cat) => (
                          <th key={cat} className="py-2.5 px-3 text-center">{cat}</th>
                        ))}
                        <th className="py-2.5 px-3 text-center">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classList.map((item, idx) => {
                        const rowTotal = activeAgeCategories.reduce((sum, cat) => sum + (item.ageMap[cat] || 0), 0);
                        return (
                          <tr key={item.kelas} className={idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 text-slate-700 font-medium">{item.kelas}</td>
                            {activeAgeCategories.map((cat) => (
                              <td key={cat} className="py-2.5 px-3 text-center text-slate-700">
                                {item.ageMap[cat] || 0}
                              </td>
                            ))}
                            <td className="py-2.5 px-3 text-center text-slate-700 font-semibold">{rowTotal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold text-slate-900 border-t border-slate-200">
                        <td colSpan={2} className="py-3 px-3">Jumlah</td>
                        {activeAgeCategories.map((cat) => (
                          <td key={cat} className="py-3 px-3 text-center">
                            {overallAgeMap[cat]?.total || 0}
                          </td>
                        ))}
                        <td className="py-3 px-3 text-center">{totalSiswa}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};



