import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Printer, 
  Eye, 
  X, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight,
  GraduationCap,
  Shield,
  Award,
  Users,
  BarChart3,
  BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GTKData, PembelajaranData } from '../types';
import { INITIAL_GTK_LIST } from '../data/initialGTK';
import { GTKDetailModal } from './GTKDetailModal';
import { GTKProfileCard } from './GTKProfileCard';
import { isUserRole, isOwnerOfRecord } from '../utils/authUtils';

interface GTKBiodataViewProps {
  gtkList?: GTKData[];
  pembelajaranList?: PembelajaranData[];
  currentUser?: GTKData | null;
  onNavigateTab?: (tab: any) => void;
}

export const GTKBiodataView: React.FC<GTKBiodataViewProps> = ({ 
  gtkList = INITIAL_GTK_LIST,
  pembelajaranList = [],
  currentUser,
  onNavigateTab
}) => {
  const isUser = isUserRole(currentUser);

  // If role is 'user', restrict the list to strictly the authenticated user's record
  const effectiveGtkList = useMemo(() => {
    if (isUser && currentUser) {
      const userFiltered = gtkList.filter((g) => isOwnerOfRecord(g.nip, g.nama, currentUser));
      // If found in gtkList, return it; otherwise fallback to currentUser itself
      return userFiltered.length > 0 ? userFiltered : [currentUser];
    }
    return gtkList;
  }, [gtkList, isUser, currentUser]);

  // User's GTK record for detailed profile view
  const userGtk = useMemo(() => {
    if (!currentUser) return null;
    const found = gtkList.find((g) => isOwnerOfRecord(g.nip, g.nama, currentUser));
    if (found) {
      return { ...currentUser, ...found };
    }
    return currentUser;
  }, [gtkList, currentUser]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua');
  const [selectedJenisPtk, setSelectedJenisPtk] = useState<string>('Semua');
  const [selectedJenjang, setSelectedJenjang] = useState<string>('Semua');
  const [selectedJK, setSelectedJK] = useState<string>('Semua');
  const [selectedAgama, setSelectedAgama] = useState<string>('Semua');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Column visibility state (matching Biodata Peserta Didik pattern)
  const [visibleColumns, setVisibleColumns] = useState({
    nama: true,
    nuptk: true,
    jk: true,
    tempatLahir: true,
    tanggalLahir: true,
    nip: true,
    statusKepegawaian: true,
    jenisPtk: true,
    jenjang: true,
    tugasTambahan: true,
    jabatanPtk: true,
    agama: true,
    alamatJalan: true,
    hp: true
  });

  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [selectedGTKDetail, setSelectedGTKDetail] = useState<GTKData | null>(null);

  const formatColumnLabel = (key: string) => {
    switch (key) {
      case 'nama': return 'Nama Lengkap';
      case 'nuptk': return 'NUPTK';
      case 'jk': return 'Jenis Kelamin';
      case 'tempatLahir': return 'Tempat Lahir';
      case 'tanggalLahir': return 'Tanggal Lahir';
      case 'nip': return 'NIP';
      case 'statusKepegawaian': return 'Status Kepegawaian';
      case 'jenisPtk': return 'Jenis PTK';
      case 'jenjang': return 'Jenjang';
      case 'tugasTambahan': return 'Tugas Tambahan';
      case 'jabatanPtk': return 'Jabatan PTK';
      case 'agama': return 'Agama';
      case 'alamatJalan': return 'Alamat Jalan';
      case 'hp': return 'No HP';
      default: return key.replace(/([A-Z])/g, ' $1');
    }
  };

  // Unique lists for dropdown filters
  const uniqueStatus = useMemo(() => {
    const list = effectiveGtkList.map((g) => (g.statusKepegawaian || '').trim()).filter(Boolean);
    const set = new Set<string>(list);
    return ['Semua', ...Array.from(set).sort()];
  }, [effectiveGtkList]);

  const uniqueJenisPtk = useMemo(() => {
    const list = effectiveGtkList.map((g) => (g.jenisPtk || '').trim()).filter(Boolean);
    const set = new Set<string>(list);
    return ['Semua', ...Array.from(set).sort()];
  }, [effectiveGtkList]);

  const uniqueJenjang = useMemo(() => {
    const list = effectiveGtkList.map((g) => (g.jenjang || '').trim()).filter(Boolean);
    const set = new Set<string>(list);
    return ['Semua', ...Array.from(set).sort()];
  }, [effectiveGtkList]);

  const uniqueAgama = useMemo(() => {
    const list = effectiveGtkList.map((g) => (g.agama || '').trim()).filter(Boolean);
    const set = new Set<string>(list);
    return ['Semua', ...Array.from(set).sort()];
  }, [effectiveGtkList]);

  // Filtered GTK
  const filteredGTK = useMemo(() => {
    return effectiveGtkList.filter((gtk) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (gtk.nama || '').toLowerCase().includes(q) ||
        (gtk.nip || '').includes(q) ||
        (gtk.nuptk || '').includes(q) ||
        (gtk.nik || '').includes(q) ||
        (gtk.alamatJalan || '').toLowerCase().includes(q) ||
        (gtk.tempatLahir || '').toLowerCase().includes(q) ||
        (gtk.jenjang || '').toLowerCase().includes(q) ||
        (gtk.tugasTambahan || '').toLowerCase().includes(q) ||
        (gtk.jabatanPtk || gtk.jabatan_ptk || '').toLowerCase().includes(q);

      const matchStatus =
        selectedStatus === 'Semua' || (gtk.statusKepegawaian || '').trim() === selectedStatus;

      const matchJenis =
        selectedJenisPtk === 'Semua' || (gtk.jenisPtk || '').trim() === selectedJenisPtk;

      const matchJenjang =
        selectedJenjang === 'Semua' || (gtk.jenjang || '').trim() === selectedJenjang;

      const matchJK =
        selectedJK === 'Semua' || gtk.jk === selectedJK;

      const matchAgama =
        selectedAgama === 'Semua' || (gtk.agama || '').trim() === selectedAgama;

      return matchQuery && matchStatus && matchJenis && matchJenjang && matchJK && matchAgama;
    });
  }, [effectiveGtkList, searchQuery, selectedStatus, selectedJenisPtk, selectedJenjang, selectedJK, selectedAgama]);

  // Pagination calculations
  const totalItems = filteredGTK.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedGTK = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGTK.slice(start, start + itemsPerPage);
  }, [filteredGTK, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Export Excel Handler
  const handleExportExcel = () => {
    const excelData = filteredGTK.map((g, idx) => ({
      'No': idx + 1,
      'Nama': g.nama || '',
      'NUPTK': g.nuptk || '-',
      'JK': g.jk || '',
      'Tempat Lahir': g.tempatLahir || '-',
      'Tanggal Lahir': g.tanggalLahir || '-',
      'NIP': g.nip || '-',
      'Status Kepegawaian': g.statusKepegawaian || '-',
      'Jenis PTK': g.jenisPtk || '-',
      'Jenjang': g.jenjang || '-',
      'Tugas Tambahan': g.tugasTambahan || '-',
      'Jabatan PTK': g.jabatanPtk || g.jabatan_ptk || '-',
      'Pangkat Golongan': g.pangkatGolongan || '-',
      'Agama': g.agama || '-',
      'Alamat Jalan': g.alamatJalan || '-',
      'HP': g.hp || '-',
      'Email': g.email || '-',
      'Sumber Gaji': g.sumberGaji || '-',
      'Bank': g.bank || '-',
      'Nomor Rekening': g.nomorRekeningBank || '-',
      'NIK': g.nik || '-',
      'NPWP': g.npwp || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Biodata GTK');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Biodata_GTK_SMKN1_Palopo_${dateStr}.xlsx`);
  };

  // Cetak PDF Handler
  const handlePrintPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Kop Surat
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text('PEMERINTAH PROVINSI SULAWESI SELATAN', pageWidth / 2, 14, { align: 'center' });
    doc.text('DINAS PENDIDIKAN', pageWidth / 2, 18.5, { align: 'center' });
    doc.setFontSize(13);
    doc.text('UPT SMK NEGERI 1 PALOPO', pageWidth / 2, 24, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text('Jl. K.H. Ahmad Dahlan No. 15, Amassangan, Wara, Kota Palopo, Sulawesi Selatan 91921', pageWidth / 2, 28.5, { align: 'center' });

    doc.setLineWidth(0.6);
    doc.line(14, 31.5, pageWidth - 14, 31.5);
    doc.setLineWidth(0.2);
    doc.line(14, 32.5, pageWidth - 14, 32.5);

    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text('DAFTAR BIODATA GURU & TENAGA KEPENDIDIKAN (GTK)', pageWidth / 2, 39, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} | Total: ${filteredGTK.length} Orang`, pageWidth / 2, 43.5, { align: 'center' });

    const tableBody = filteredGTK.map((g, idx) => [
      idx + 1,
      g.nama || '-',
      g.nuptk || '-',
      g.jk || '-',
      g.nip || '-',
      g.statusKepegawaian || '-',
      g.jenisPtk || '-',
      g.jenjang || '-',
      g.tugasTambahan || '-',
      g.jabatanPtk || g.jabatan_ptk || '-',
      g.hp || '-'
    ]);

    autoTable(doc, {
      startY: 47,
      head: [['No', 'Nama Lengkap', 'NUPTK', 'JK', 'NIP', 'Status', 'Jenis PTK', 'Jenjang', 'Tugas Tambahan', 'Jabatan PTK', 'No HP']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 26, halign: 'center' },
        3: { cellWidth: 9, halign: 'center' },
        4: { cellWidth: 32, halign: 'center' },
        5: { cellWidth: 22 },
        6: { cellWidth: 26 },
        7: { cellWidth: 16, halign: 'center' },
        8: { cellWidth: 32 },
        9: { cellWidth: 32 },
        10: { cellWidth: 22 }
      },
      styles: { font: 'times', fontSize: 7, cellPadding: 2 }
    });

    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`Biodata_GTK_SMKN1_Palopo_${dateStr}.pdf`);
  };

  // JIKA LOGIN SEBAGAI USER: Tampilkan langsung data profil lengkap (seperti modal detail, tapi bukan modal dan bukan tabel)
  if (isUser && userGtk) {
    return (
      <div className="w-full animate-in fade-in duration-150">
        <GTKProfileCard gtk={userGtk} pembelajaranList={pembelajaranList} onNavigateTab={onNavigateTab} />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* User Role Informational Banner */}
      {isUser && currentUser && (
        <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 text-emerald-950 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-emerald-950 leading-tight">
                {currentUser.nama}
              </h2>
              <p className="text-xs text-emerald-800 mt-0.5">
                Nip.: {currentUser.nip || '-'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      {/* GTK BIODATA TABLE - Clean Grid Style (Matching Verval PD) */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden w-full">
        {/* Controls Bar - Disembunyikan jika login sebagai user */}
        {!isUser && (
          <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4 bg-slate-50/50">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari berdasarkan Nama, NIP, NUPTK, NIK, Alamat..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl border border-emerald-600 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title="Ekspor data biodata GTK ke Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Ekspor Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintPDF}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl border border-indigo-600 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title="Cetak Biodata GTK ke file PDF Resmi"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowColumnToggle(!showColumnToggle)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title="Atur kolom yang ditampilkan"
                >
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                  <span>Kolom</span>
                </button>

                {onNavigateTab && (
                  <>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('gtk-pembelajaran')}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl border border-blue-200 shadow-2xs transition-colors shrink-0 cursor-pointer"
                      title="Lihat Data Pembelajaran & Jam Mengajar PTK"
                    >
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Pembelajaran</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateTab('rekap-gtk')}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 shadow-2xs transition-colors shrink-0 cursor-pointer"
                      title="Lihat Rekapitulasi GTK (Jenjang, Jenis PTK, Status Kepegawaian)"
                    >
                      <BarChart3 className="w-4 h-4 text-indigo-600" />
                      <span>Rekap GTK</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/80 text-xs">
              <span className="font-semibold text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {uniqueStatus.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jenis PTK Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">Jenis PTK:</span>
                <select
                  value={selectedJenisPtk}
                  onChange={(e) => {
                    setSelectedJenisPtk(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-[180px]"
                >
                  {uniqueJenisPtk.map((jp) => (
                    <option key={jp} value={jp}>
                      {jp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jenjang Filter */}
              {uniqueJenjang.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-medium">Jenjang:</span>
                  <select
                    value={selectedJenjang}
                    onChange={(e) => {
                      setSelectedJenjang(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {uniqueJenjang.map((jj) => (
                      <option key={jj} value={jj}>
                        {jj}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Gender Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">JK:</span>
                <select
                  value={selectedJK}
                  onChange={(e) => {
                    setSelectedJK(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Semua">Semua (L/P)</option>
                  <option value="L">Laki-Laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>

              {/* Agama Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">Agama:</span>
                <select
                  value={selectedAgama}
                  onChange={(e) => {
                    setSelectedAgama(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {uniqueAgama.map((agm) => (
                    <option key={agm} value={agm}>
                      {agm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Column Visibility Selector Modal / Dropdown */}
        {!isUser && showColumnToggle && (
          <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex flex-wrap gap-4 text-xs">
            <span className="font-semibold text-emerald-900 self-center">Pilih Kolom Tampil:</span>
            {Object.keys(visibleColumns).map((colKey) => (
              <label key={colKey} className="flex items-center gap-1.5 cursor-pointer text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={visibleColumns[colKey as keyof typeof visibleColumns]}
                  onChange={(e) =>
                    setVisibleColumns((prev) => ({
                      ...prev,
                      [colKey]: e.target.checked
                    }))
                  }
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="capitalize">{formatColumnLabel(colKey)}</span>
              </label>
            ))}
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                <th className="py-2.5 px-3 w-12 text-center border-r border-slate-300">No</th>
                {visibleColumns.nama && <th className="py-2.5 px-4 min-w-[200px] border-r border-slate-300 font-bold">Nama Lengkap</th>}
                {visibleColumns.nuptk && <th className="py-2.5 px-3 min-w-[140px] border-r border-slate-300">NUPTK</th>}
                {visibleColumns.jk && <th className="py-2.5 px-3 text-center w-14 border-r border-slate-300">JK</th>}
                {visibleColumns.tempatLahir && <th className="py-2.5 px-3 min-w-[130px] border-r border-slate-300">Tempat Lahir</th>}
                {visibleColumns.tanggalLahir && <th className="py-2.5 px-3 min-w-[110px] border-r border-slate-300">Tanggal Lahir</th>}
                {visibleColumns.nip && <th className="py-2.5 px-3 min-w-[160px] border-r border-slate-300">NIP</th>}
                {visibleColumns.statusKepegawaian && <th className="py-2.5 px-3 min-w-[140px] border-r border-slate-300">Status</th>}
                {visibleColumns.jenisPtk && <th className="py-2.5 px-3 min-w-[150px] border-r border-slate-300">Jenis PTK</th>}
                {visibleColumns.jenjang && <th className="py-2.5 px-3 min-w-[100px] border-r border-slate-300">Jenjang</th>}
                {visibleColumns.tugasTambahan && <th className="py-2.5 px-3 min-w-[160px] border-r border-slate-300">Tugas Tambahan</th>}
                {visibleColumns.jabatanPtk && <th className="py-2.5 px-3 min-w-[160px] border-r border-slate-300">Jabatan PTK</th>}
                {visibleColumns.agama && <th className="py-2.5 px-3 min-w-[90px] border-r border-slate-300">Agama</th>}
                {visibleColumns.alamatJalan && <th className="py-2.5 px-4 min-w-[200px] border-r border-slate-300">Alamat</th>}
                {visibleColumns.hp && <th className="py-2.5 px-3 min-w-[120px] border-r border-slate-300">No HP</th>}
                <th className="py-2.5 px-3 text-center sticky right-0 bg-slate-100 shadow-xs w-20 border-l border-slate-300">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {paginatedGTK.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-500 italic">
                    <GraduationCap className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                    <p className="font-semibold text-slate-600">Tidak ada data GTK yang sesuai dengan filter.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter status.</p>
                  </td>
                </tr>
              ) : (
                paginatedGTK.map((gtk, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr 
                      key={`gtk-bio-${gtk.id || gtk.nip || 'row'}-${idx}`}
                      className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-200"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-500 border-r border-slate-200 font-medium">
                        {itemIndex}
                      </td>

                      {visibleColumns.nama && (
                        <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200">
                          <button
                            type="button"
                            onClick={() => setSelectedGTKDetail(gtk)}
                            className="text-left hover:text-emerald-700 hover:underline cursor-pointer"
                          >
                            {gtk.nama}
                          </button>
                        </td>
                      )}

                      {visibleColumns.nuptk && (
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          {gtk.nuptk || '-'}
                        </td>
                      )}

                      {visibleColumns.jk && (
                        <td className="py-2.5 px-3 text-center font-medium text-slate-800 border-r border-slate-200">
                          {gtk.jk || '-'}
                        </td>
                      )}

                      {visibleColumns.tempatLahir && (
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          {gtk.tempatLahir || '-'}
                        </td>
                      )}

                      {visibleColumns.tanggalLahir && (
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          {gtk.tanggalLahir || '-'}
                        </td>
                      )}

                      {visibleColumns.nip && (
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          {gtk.nip || '-'}
                        </td>
                      )}

                      {visibleColumns.statusKepegawaian && (
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          {gtk.statusKepegawaian || '-'}
                        </td>
                      )}

                      {visibleColumns.jenisPtk && (
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          {gtk.jenisPtk || '-'}
                        </td>
                      )}

                      {visibleColumns.jenjang && (
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          {gtk.jenjang || '-'}
                        </td>
                      )}

                      {visibleColumns.tugasTambahan && (
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          {gtk.tugasTambahan || '-'}
                        </td>
                      )}

                      {visibleColumns.jabatanPtk && (
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          {gtk.jabatanPtk || gtk.jabatan_ptk || '-'}
                        </td>
                      )}

                      {visibleColumns.agama && (
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          {gtk.agama || '-'}
                        </td>
                      )}

                      {visibleColumns.alamatJalan && (
                        <td className="py-2.5 px-4 font-medium text-slate-800 border-r border-slate-200 truncate max-w-[220px]" title={gtk.alamatJalan}>
                          {gtk.alamatJalan || '-'}
                        </td>
                      )}

                      {visibleColumns.hp && (
                        <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">
                          {gtk.hp || '-'}
                        </td>
                      )}

                      <td className="py-2.5 px-3 text-center sticky right-0 bg-white shadow-xs border-l border-slate-200">
                        <button
                          type="button"
                          onClick={() => setSelectedGTKDetail(gtk)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Lihat Detail Lengkap GTK (51 Kolom)"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Footer Bar (Matching Verval PD) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Menampilkan</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-md border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-hidden cursor-pointer shadow-2xs"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>
              dari <strong className="text-slate-900">{totalItems}</strong> data GTK
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 font-semibold text-slate-800">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* GTK Detail Modal */}
      <GTKDetailModal
        isOpen={Boolean(selectedGTKDetail)}
        onClose={() => setSelectedGTKDetail(null)}
        gtk={selectedGTKDetail}
        pembelajaranList={pembelajaranList}
      />
    </div>
  );
};

export default GTKBiodataView;
