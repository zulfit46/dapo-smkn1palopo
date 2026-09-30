import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  Search, 
  X, 
  Check, 
  Users, 
  BookOpen, 
  Calendar, 
  UserCheck, 
  UserMinus,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Student, WaliKelas, Jurusan, GTKData } from '../types';
import { INITIAL_WALI_KELAS_LIST } from '../data/initialWaliKelas';
import { INITIAL_JURUSAN_LIST, getJurusanByKelas } from '../data/initialJurusan';
import { LOGO_BASE64 } from '../assets/logoBase64';
import { isUserRole } from '../utils/authUtils';

interface AbsenPDViewProps {
  students: Student[];
  waliKelasList?: WaliKelas[];
  jurusanList?: Jurusan[];
  currentUser?: GTKData | null;
}

export const AbsenPDView: React.FC<AbsenPDViewProps> = ({
  students,
  waliKelasList = INITIAL_WALI_KELAS_LIST,
  jurusanList = INITIAL_JURUSAN_LIST,
  currentUser
}) => {
  const isUser = isUserRole(currentUser);

  // Class list sorted naturally (dari data siswa aktif)
  const uniqueClasses = useMemo(() => {
    const classList = students
      .filter((s) => {
        const st = (s.status || '').toLowerCase().trim();
        return !(st === 'tidak aktif' || st.includes('tidak') || st === 'mutasi' || st === 'keluar' || st === 'mengundurkan diri');
      })
      .map((s) => s.kelas)
      .filter((k): k is string => Boolean(k));
    const set = new Set<string>(classList);
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [students]);

  // Selected class (default to first class if available)
  const [selectedKelas, setSelectedKelas] = useState<string>(() => uniqueClasses[0] || 'Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [tahunAjaran, setTahunAjaran] = useState('2026/2027');

  // Multi-Rombel Print Modal State
  const [showCetakAbsenModal, setShowCetakAbsenModal] = useState(false);
  const [selectedPrintKelasList, setSelectedPrintKelasList] = useState<string[]>([]);
  const [searchRombelQuery, setSearchRombelQuery] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfGenerationStatus, setPdfGenerationStatus] = useState<string>('');

  // Helper for agama abbreviation
  const getAgamaAbbr = (agama: string | undefined): string => {
    if (!agama) return '';
    const lower = agama.toLowerCase().trim();
    if (lower.includes('islam')) return 'Is';
    if (lower.includes('katolik')) return 'Ka';
    if (lower.includes('kristen')) return 'Kr';
    if (lower.includes('hindu')) return 'Hi';
    if (lower.includes('buddha') || lower.includes('budha')) return 'Bu';
    if (lower.includes('konghucu') || lower.includes('khonghucu')) return 'Ko';
    return agama.substring(0, 2);
  };

  // Filter students based on selected class and search query (Hanya siswa aktif yang ditampilkan di daftar absen)
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        // Otomatis tidak ditampilkan di absen jika status Tidak Aktif (mutasi keluar, mengundurkan diri, dsb.)
        const st = (s.status || '').toLowerCase().trim();
        const isTidakAktif = st === 'tidak aktif' || st.includes('tidak') || st === 'mutasi' || st === 'keluar' || st === 'mengundurkan diri';
        if (isTidakAktif) {
          return false;
        }

        const matchKelas = selectedKelas === 'Semua' || s.kelas === selectedKelas;
        const query = searchQuery.toLowerCase().trim();
        const matchQuery =
          !query ||
          (s.nama || '').toLowerCase().includes(query) ||
          (s.nipd || '').toLowerCase().includes(query) ||
          (s.nisn || '').toLowerCase().includes(query);
        return matchKelas && matchQuery;
      })
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  }, [students, selectedKelas, searchQuery]);

  // Metadata for the currently selected class
  const classMetadata = useMemo(() => {
    // Hitung siswa tidak aktif / mutasi di kelas ini
    const inactiveCount = students.filter(
      (s) => (selectedKelas === 'Semua' || s.kelas === selectedKelas) &&
             s.status && s.status.toLowerCase().trim() === 'tidak aktif'
    ).length;

    if (selectedKelas === 'Semua') {
      return {
        programKeahlian: 'Semua Program Keahlian',
        konsentrasiKeahlian: 'Semua Konsentrasi',
        waliKelas: null,
        totalL: filteredStudents.filter((s) => s.jk === 'L').length,
        totalP: filteredStudents.filter((s) => s.jk === 'P').length,
        total: filteredStudents.length,
        totalInactive: inactiveCount
      };
    }

    const matchedJurusan = getJurusanByKelas(
      selectedKelas,
      jurusanList && jurusanList.length > 0 ? jurusanList : INITIAL_JURUSAN_LIST
    );

    const wali = (waliKelasList && waliKelasList.length > 0 ? waliKelasList : INITIAL_WALI_KELAS_LIST).find(
      (w) => w.kelas.trim().toLowerCase() === selectedKelas.trim().toLowerCase()
    );

    return {
      programKeahlian: matchedJurusan?.programKeahlian || '-',
      konsentrasiKeahlian: matchedJurusan?.konsentrasiKeahlian || '-',
      waliKelas: wali || null,
      totalL: filteredStudents.filter((s) => s.jk === 'L').length,
      totalP: filteredStudents.filter((s) => s.jk === 'P').length,
      total: filteredStudents.length,
      totalInactive: inactiveCount
    };
  }, [selectedKelas, jurusanList, waliKelasList, filteredStudents, students]);

  // PDF Page Generator (Official SMKN 1 Palopo attendance sheet format - hanya siswa aktif)
  const renderAbsenPage = (doc: jsPDF, kelasTarget: string) => {
    const classStudents = students
      .filter((s) => {
        if (s.kelas !== kelasTarget) return false;
        const st = (s.status || '').toLowerCase().trim();
        return !(st === 'tidak aktif' || st.includes('tidak') || st === 'mutasi' || st === 'keluar' || st === 'mengundurkan diri');
      })
      .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 10;

    // 1. Kop Surat
    try {
      doc.addImage(LOGO_BASE64, 'PNG', 12, 7.5, 21, 21);
    } catch {
      // ignore
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

    // Double separator line below header
    doc.setLineWidth(0.6);
    doc.line(marginX, 31, pageWidth - marginX, 31);
    doc.setLineWidth(0.15);
    doc.line(marginX, 31.8, pageWidth - marginX, 31.8);

    // 2. Metadata Section
    const metaY = 36;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');

    const matchedJurusan = getJurusanByKelas(
      kelasTarget,
      jurusanList && jurusanList.length > 0 ? jurusanList : INITIAL_JURUSAN_LIST
    );

    const programKeahlian = matchedJurusan?.programKeahlian || '';
    const konsentrasiKeahlian = matchedJurusan?.konsentrasiKeahlian || '';

    doc.text('Program Keahlian', marginX + 1, metaY);
    doc.text(':', marginX + 32, metaY);
    doc.setFont('helvetica', 'bold');
    doc.text(programKeahlian, marginX + 35, metaY);
    doc.setFont('helvetica', 'normal');

    doc.text('Konsentrasi Keahlian', marginX + 1, metaY + 3.8);
    doc.text(':', marginX + 32, metaY + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.text(konsentrasiKeahlian, marginX + 35, metaY + 3.8);
    doc.setFont('helvetica', 'normal');

    doc.text('Mata Pelajaran', marginX + 1, metaY + 7.6);
    doc.text(':', marginX + 32, metaY + 7.6);

    const rightX = 145;
    doc.text('Kelas', rightX, metaY);
    doc.text(':', rightX + 18, metaY);
    doc.setFont('helvetica', 'bold');
    doc.text(kelasTarget, rightX + 22, metaY);

    doc.setFont('helvetica', 'normal');
    doc.text('Semester', rightX, metaY + 3.8);
    doc.text(':', rightX + 18, metaY + 3.8);
    doc.text(semester, rightX + 22, metaY + 3.8);

    doc.text('Tahun', rightX, metaY + 7.6);
    doc.text(':', rightX + 18, metaY + 7.6);
    doc.text(tahunAjaran, rightX + 22, metaY + 7.6);

    // 3. Attendance Table
    const tableHead = [
      [
        { content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'NIS', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'NISN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'NAMA SISWA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'L/P', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Agama', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'PERTEMUAN KE-', colSpan: 18, styles: { halign: 'center', valign: 'middle' } },
        { content: 'KEHADIRAN', colSpan: 3, styles: { halign: 'center', valign: 'middle' } },
        { content: 'KET', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
      ],
      [
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18',
        'A', 'I', 'S'
      ]
    ];

    const tableBody = classStudents.map((s, idx) => [
      idx + 1,
      s.nipd || '',
      s.nisn || '',
      (s.nama || '').toUpperCase(),
      s.jk || '',
      getAgamaAbbr(s.agama),
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '',
      ''
    ]);

    autoTable(doc, {
      startY: 51,
      head: tableHead as any,
      body: tableBody,
      theme: 'grid',
      margin: { left: marginX, right: marginX, bottom: 25 },
      styles: {
        font: 'helvetica',
        fontSize: 5.5,
        cellPadding: 0.5,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
        halign: 'center',
        fontSize: 5.5
      },
      columnStyles: {
        0: { cellWidth: 5.5, halign: 'center' },
        1: { cellWidth: 13.5, halign: 'center' },
        2: { cellWidth: 15.5, halign: 'center' },
        3: { cellWidth: 38, halign: 'left' },
        4: { cellWidth: 5.5, halign: 'center' },
        5: { cellWidth: 7.5, halign: 'center' },
        6: { cellWidth: 4.3, halign: 'center' },
        7: { cellWidth: 4.3, halign: 'center' },
        8: { cellWidth: 4.3, halign: 'center' },
        9: { cellWidth: 4.3, halign: 'center' },
        10: { cellWidth: 4.3, halign: 'center' },
        11: { cellWidth: 4.3, halign: 'center' },
        12: { cellWidth: 4.3, halign: 'center' },
        13: { cellWidth: 4.3, halign: 'center' },
        14: { cellWidth: 4.3, halign: 'center' },
        15: { cellWidth: 4.3, halign: 'center' },
        16: { cellWidth: 4.3, halign: 'center' },
        17: { cellWidth: 4.3, halign: 'center' },
        18: { cellWidth: 4.3, halign: 'center' },
        19: { cellWidth: 4.3, halign: 'center' },
        20: { cellWidth: 4.3, halign: 'center' },
        21: { cellWidth: 4.3, halign: 'center' },
        22: { cellWidth: 4.3, halign: 'center' },
        23: { cellWidth: 4.3, halign: 'center' },
        24: { cellWidth: 4.3, halign: 'center' },
        25: { cellWidth: 4.3, halign: 'center' },
        26: { cellWidth: 4.3, halign: 'center' },
        27: { cellWidth: 11.7, halign: 'center' }
      }
    });

    let finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 200;

    if (finalY > 240) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 8;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Left Signature
    doc.text('Guru Mata Pelajaran', marginX + 10, finalY);
    doc.text('........................................', marginX + 10, finalY + 18);
    doc.text('NIP.', marginX + 10, finalY + 22);

    // Right Signature
    const waliKelasObj = (waliKelasList && waliKelasList.length > 0 ? waliKelasList : INITIAL_WALI_KELAS_LIST).find(
      (w) => w.kelas.trim().toLowerCase() === kelasTarget.trim().toLowerCase()
    );

    const rightSigX = 145;
    doc.text('Mengetahui,', rightSigX, finalY - 4);
    doc.text('Wali Kelas', rightSigX, finalY);
    doc.setFont('helvetica', 'bold');
    doc.text(waliKelasObj?.nama || '........................................', rightSigX, finalY + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${waliKelasObj?.nip || '................................'}`, rightSigX, finalY + 22);
  };

  // Handler for printing multiple / selected classes
  const handleCetakAbsenMultiple = async (classList: string[]) => {
    if (classList.length === 0) return;

    setIsGeneratingPDF(true);
    setPdfGenerationStatus(`Mempersiapkan pembuatan PDF untuk ${classList.length} rombel...`);

    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        classList.forEach((kelasName, index) => {
          if (index > 0) {
            doc.addPage();
          }
          setPdfGenerationStatus(`Menyusun halaman absen untuk kelas ${kelasName} (${index + 1}/${classList.length})...`);
          renderAbsenPage(doc, kelasName);
        });

        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, '_blank');

        setIsGeneratingPDF(false);
        setPdfGenerationStatus('');
        setShowCetakAbsenModal(false);
      } catch (err) {
        console.error('Gagal mencetak PDF absen:', err);
        alert('Terjadi kesalahan saat memproses dokumen PDF. Silakan coba lagi.');
        setIsGeneratingPDF(false);
        setPdfGenerationStatus('');
      }
    }, 150);
  };

  // Quick print current class
  const handleQuickPrintCurrent = () => {
    if (selectedKelas !== 'Semua') {
      handleCetakAbsenMultiple([selectedKelas]);
    } else {
      setSelectedPrintKelasList(uniqueClasses);
      setShowCetakAbsenModal(true);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header & Toolbar (No Kop Surat here, purely clean dashboard controls) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                <BookOpen className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Download Absen Peserta Didik
                </h2>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {selectedKelas !== 'Semua' && (
              <button
                id="btn-cetak-absen-current"
                onClick={handleQuickPrintCurrent}
                disabled={isGeneratingPDF}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title={`Cetak Lembar Absen ${selectedKelas} (PDF)`}
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Absen {selectedKelas} (PDF)</span>
              </button>
            )}

            <button
              id="btn-pilih-rombel-cetak"
              onClick={() => {
                if (selectedKelas !== 'Semua') {
                  setSelectedPrintKelasList([selectedKelas]);
                } else {
                  setSelectedPrintKelasList(uniqueClasses);
                }
                setShowCetakAbsenModal(true);
              }}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Pilih satu atau lebih rombel untuk dicetak PDF sekaligus"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Multi-Rombel PDF</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          {/* 1. Pilih Kelas / Rombel */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Rombel / Kelas
            </label>
            <select
              id="select-kelas-absen"
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Semua">Semua Rombel</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Cari Siswa */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Cari Nama / NIS / NISN
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik kata kunci..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Semester */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value as 'Ganjil' | 'Genap')}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          {/* 4. Tahun Ajaran */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tahun Ajaran
            </label>
            <input
              type="text"
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              placeholder="Contoh: 2026/2027"
            />
          </div>
        </div>

        {/* Class Info (Tanpa Highlight) */}
        {selectedKelas !== 'Semua' && (
          <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-700">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-600">Program Keahlian</span>
              <span className="text-slate-400">:</span>
              <span className="font-semibold text-slate-900">{classMetadata.programKeahlian}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-600">Konsentrasi Keahlian</span>
              <span className="text-slate-400">:</span>
              <span className="font-semibold text-slate-900">{classMetadata.konsentrasiKeahlian}</span>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Table (format tabelnya sama sperti format absen yang tabel nya saja, tidak perlu ada kopnya) */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-slate-800 text-[11px] select-text">
            <thead>
              {/* Row 1 of Header */}
              <tr className="bg-slate-100 font-bold text-slate-800 text-center border-b border-slate-300">
                <th rowSpan={2} className="py-2.5 px-2 w-10 border-r border-slate-300">
                  No
                </th>
                <th rowSpan={2} className="py-2.5 px-2 min-w-[75px] max-w-[90px] border-r border-slate-300">
                  NIS
                </th>
                <th rowSpan={2} className="py-2.5 px-2 min-w-[85px] max-w-[100px] border-r border-slate-300">
                  NISN
                </th>
                <th rowSpan={2} className="py-2.5 px-3 min-w-[200px] text-left border-r border-slate-300">
                  NAMA SISWA
                </th>
                <th rowSpan={2} className="py-2.5 px-1.5 w-10 border-r border-slate-300">
                  L/P
                </th>
                <th rowSpan={2} className="py-2.5 px-2 w-12 border-r border-slate-300">
                  Agama
                </th>
                <th colSpan={18} className="py-1 px-1 border-r border-slate-300 bg-slate-200/70">
                  PERTEMUAN KE-
                </th>
                <th colSpan={3} className="py-1 px-1 border-r border-slate-300 bg-slate-200/70">
                  KEHADIRAN
                </th>
                <th rowSpan={2} className="py-2.5 px-2 min-w-[80px]">
                  KET
                </th>
              </tr>

              {/* Row 2 of Header (Numbered meetings 1 to 18 and Attendance categories A, I, S) */}
              <tr className="bg-slate-100 font-bold text-slate-700 text-center text-[10px] border-b border-slate-300">
                {Array.from({ length: 18 }, (_, i) => (
                  <th key={`p-${i + 1}`} className="py-1 px-0.5 w-7 min-w-[28px] border-r border-slate-300">
                    {i + 1}
                  </th>
                ))}
                <th className="py-1 px-0.5 w-7 min-w-[28px] border-r border-slate-300 bg-rose-50 text-rose-800">
                  A
                </th>
                <th className="py-1 px-0.5 w-7 min-w-[28px] border-r border-slate-300 bg-amber-50 text-amber-800">
                  I
                </th>
                <th className="py-1 px-0.5 w-7 min-w-[28px] border-r border-slate-300 bg-blue-50 text-blue-800">
                  S
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={28} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-1">
                      <Users className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="font-semibold text-slate-700 text-xs">Tidak ada data siswa ditemukan</p>
                      <p className="text-[11px] text-slate-400">
                        {searchQuery ? 'Coba ubah kata kunci pencarian Anda' : 'Silakan pilih rombel lain'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => (
                  <tr key={`stu-row-${student.id || student.nisn || student.nipd || 's'}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    {/* No */}
                    <td className="py-1.5 px-2 text-center font-medium text-slate-600 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    {/* NIS */}
                    <td className="py-1.5 px-2 text-center text-slate-700 font-medium text-xs border-r border-slate-200">
                      {student.nipd || '-'}
                    </td>
                    {/* NISN */}
                    <td className="py-1.5 px-2 text-center text-slate-700 font-medium text-xs border-r border-slate-200">
                      {student.nisn || '-'}
                    </td>
                    {/* NAMA SISWA */}
                    <td className="py-1.5 px-3 font-semibold text-slate-900 uppercase border-r border-slate-200 whitespace-nowrap">
                      {student.nama}
                    </td>
                    {/* L/P */}
                    <td className="py-1.5 px-1.5 text-center font-medium text-slate-800 border-r border-slate-200">
                      {student.jk || '-'}
                    </td>
                    {/* Agama */}
                    <td className="py-1.5 px-2 text-center text-slate-600 text-[10px] border-r border-slate-200">
                      {getAgamaAbbr(student.agama) || '-'}
                    </td>
                    {/* 18 Pertemuan Columns */}
                    {Array.from({ length: 18 }, (_, i) => (
                      <td 
                        key={`cell-p-${i}`} 
                        className="py-1.5 px-0.5 border-r border-slate-200 text-center bg-slate-50/20 hover:bg-indigo-50/40 transition-colors"
                      />
                    ))}
                    {/* Kehadiran A, I, S */}
                    <td className="py-1.5 px-0.5 border-r border-slate-200 text-center bg-rose-50/10" />
                    <td className="py-1.5 px-0.5 border-r border-slate-200 text-center bg-amber-50/10" />
                    <td className="py-1.5 px-0.5 border-r border-slate-200 text-center bg-blue-50/10" />
                    {/* KET */}
                    <td className="py-1.5 px-2 text-slate-500 text-[10px]" />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Signatures preview when specific class is selected */}
        {selectedKelas !== 'Semua' && filteredStudents.length > 0 && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs text-slate-700">
            <div>
              <p className="font-semibold text-slate-800">Guru Mata Pelajaran,</p>
              <div className="h-16 flex items-end">
                <p className="font-bold text-slate-800 underline underline-offset-4">
                  ..................................................................
                </p>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">NIP. .......................................................</p>
            </div>

            <div className="sm:text-right">
              <p className="text-slate-600">Mengetahui,</p>
              <p className="font-semibold text-slate-800">Wali Kelas {selectedKelas}</p>
              <div className="h-14 flex items-end sm:justify-end">
                <p className="font-bold text-slate-900 underline underline-offset-4">
                  {classMetadata.waliKelas?.nama || '..................................................................'}
                </p>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                NIP. {classMetadata.waliKelas?.nip || '.......................................................'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Pilihan Cetak Absen PDF (Per Kelas / Multi Rombel) */}
      {showCetakAbsenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Cetak Lembar Absen Siswa (PDF)</h3>
                  <p className="text-xs text-slate-300">Pilih rombel untuk dicetak dalam format resmi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isGeneratingPDF) setShowCetakAbsenModal(false);
                }}
                disabled={isGeneratingPDF}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {isGeneratingPDF && (
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center gap-3 animate-pulse">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
                  <div className="text-xs font-semibold">
                    {pdfGenerationStatus || 'Sedang memproses dokumen PDF...'}
                  </div>
                </div>
              )}

              {/* Rombel Selection List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Pilih Rombel / Kelas yang Ingin Dicetak:
                  </span>
                  {selectedPrintKelasList.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold shadow-2xs">
                      {selectedPrintKelasList.length} Rombel Dipilih
                    </span>
                  )}
                </div>

                {/* Search & Quick Controls */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari rombel (misal: AKL, RPL, X)..."
                        value={searchRombelQuery}
                        onChange={(e) => setSearchRombelQuery(e.target.value)}
                        disabled={isGeneratingPDF}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = uniqueClasses.filter((c) =>
                          c.toLowerCase().includes(searchRombelQuery.toLowerCase())
                        );
                        setSelectedPrintKelasList((prev) => Array.from(new Set([...prev, ...filtered])));
                      }}
                      disabled={isGeneratingPDF}
                      className="px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 bg-white border border-indigo-200 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Pilih Hasil Cari
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPrintKelasList(uniqueClasses)}
                      disabled={isGeneratingPDF}
                      className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Pilih Semua
                    </button>
                    {selectedPrintKelasList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedPrintKelasList([])}
                        disabled={isGeneratingPDF}
                        className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 bg-white border border-rose-200 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                        title="Hapus semua centang"
                      >
                        <X className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>

                  {/* Checklist Rombel */}
                  <div className="max-h-56 overflow-y-auto p-2 bg-slate-50/50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {uniqueClasses
                      .filter((cls) => cls.toLowerCase().includes(searchRombelQuery.toLowerCase()))
                      .map((cls) => {
                        const isChecked = selectedPrintKelasList.includes(cls);
                        return (
                          <button
                            type="button"
                            key={cls}
                            onClick={() => {
                              if (isGeneratingPDF) return;
                              setSelectedPrintKelasList((prev) =>
                                prev.includes(cls)
                                  ? prev.filter((item) => item !== cls)
                                  : [...prev, cls].sort((a, b) =>
                                      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
                                    )
                              );
                            }}
                            className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all text-xs font-semibold cursor-pointer border ${
                              isChecked
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                                isChecked
                                  ? 'bg-white text-indigo-600 border-white'
                                  : 'bg-white border-slate-300'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{cls}</span>
                          </button>
                        );
                      })}
                    {uniqueClasses.filter((cls) => cls.toLowerCase().includes(searchRombelQuery.toLowerCase())).length === 0 && (
                      <div className="col-span-full py-6 text-center text-xs text-slate-400">
                        Tidak ada rombel yang cocok dengan kata kunci.
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCetakAbsenMultiple(selectedPrintKelasList)}
                  disabled={selectedPrintKelasList.length === 0 || isGeneratingPDF}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {selectedPrintKelasList.length === 0
                      ? 'Centang Minimal 1 Rombel'
                      : selectedPrintKelasList.length === 1
                      ? `Cetak Lembar Absen ${selectedPrintKelasList[0]}`
                      : `Cetak ${selectedPrintKelasList.length} Rombel Terpilih (${selectedPrintKelasList.length} Halaman PDF)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};