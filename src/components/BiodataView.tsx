import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  FileSpreadsheet,
  Eye, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  SlidersHorizontal, 
  X,
  UserCheck,
  FileText,
  AlertCircle,
  Layers,
  Users,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, WaliKelas, Jurusan, GTKData } from '../types';
import { INITIAL_WALI_KELAS, INITIAL_WALI_KELAS_LIST } from '../data/initialWaliKelas';
import { INITIAL_JURUSAN_LIST, getJurusanByKelas } from '../data/initialJurusan';
import { isUserRole } from '../utils/authUtils';
import { 
  ALL_DOWNLOAD_COLUMNS, 
  getGTKAllowedDownloadHeaders,
  DEFAULT_GTK_ALLOWED_DOWNLOAD_HEADERS,
  fetchGTKAllowedDownloadHeadersFromServer
} from '../data/gtkDownloadColumns';
import { GTKDownloadHeadersModal } from './GTKDownloadHeadersModal';

interface BiodataViewProps {
  students: Student[];
  waliKelasMap?: Record<string, string>;
  waliKelasList?: WaliKelas[];
  jurusanList?: Jurusan[];
  webAppUrl?: string;
  currentUser?: GTKData | null;
  allowedGtkHeaders?: string[];
  onUpdateAllowedGtkHeaders?: (keys: string[]) => void;
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onViewStudent: (student: Student) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const BiodataView: React.FC<BiodataViewProps> = ({
  students,
  waliKelasMap = INITIAL_WALI_KELAS,
  waliKelasList = INITIAL_WALI_KELAS_LIST,
  jurusanList = INITIAL_JURUSAN_LIST,
  webAppUrl,
  currentUser,
  allowedGtkHeaders: propAllowedGtkHeaders,
  onUpdateAllowedGtkHeaders,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onViewStudent,
  onRefresh,
  isRefreshing
}) => {
  const isUser = isUserRole(currentUser);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('Semua');
  const [selectedJK, setSelectedJK] = useState('Semua');
  const [selectedAgama, setSelectedAgama] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua'); // BARU: Filter Status

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Allowed GTK Download Headers state (managed by Admin, synchronized with server)
  const [allowedGtkHeaders, setAllowedGtkHeaders] = useState<string[]>(() => {
    return propAllowedGtkHeaders && propAllowedGtkHeaders.length > 0
      ? propAllowedGtkHeaders
      : getGTKAllowedDownloadHeaders();
  });
  const [isGtkHeadersModalOpen, setIsGtkHeadersModalOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Sync if prop from parent updates
  React.useEffect(() => {
    if (propAllowedGtkHeaders && propAllowedGtkHeaders.length > 0) {
      setAllowedGtkHeaders(propAllowedGtkHeaders);
    }
  }, [propAllowedGtkHeaders]);

  // Always fetch latest allowed download headers from server on mount
  React.useEffect(() => {
    let isMounted = true;
    fetchGTKAllowedDownloadHeadersFromServer(webAppUrl).then((headers) => {
      if (isMounted && headers && headers.length > 0) {
        setAllowedGtkHeaders(headers);
        if (onUpdateAllowedGtkHeaders) {
          onUpdateAllowedGtkHeaders(headers);
        }
      }
    });

    const handleCustomUpdate = (e: any) => {
      if (isMounted && e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setAllowedGtkHeaders(e.detail);
        if (onUpdateAllowedGtkHeaders) {
          onUpdateAllowedGtkHeaders(e.detail);
        }
      }
    };

    window.addEventListener('gtk_download_headers_updated', handleCustomUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('gtk_download_headers_updated', handleCustomUpdate);
    };
  }, [webAppUrl, onUpdateAllowedGtkHeaders]);

  // Column visibility state (default all standard columns visible for Admin)
  const [visibleColumns, setVisibleColumns] = useState({
    nama: true,
    kelas: true,
    nipd: true,
    nisn: true,
    jk: true,
    tempatLahir: true,
    tanggalLahir: true,
    agama: true,
    alamat: true,
    ayah: true,
    pekerjaanAyah: true,
    ibu: true,
    pekerjaanIbu: true,
    status: true,
  });

  const [showColumnToggle, setShowColumnToggle] = useState(false);

  // Check if a column should be rendered in table
  const isColVisible = (colKey: string) => {
    if (isUser) {
      return allowedGtkHeaders.includes(colKey);
    }
    return Boolean(visibleColumns[colKey as keyof typeof visibleColumns]);
  };

  // Unique lists for dropdown filters with natural alphabetical & numerical sorting
  const uniqueClasses = useMemo(() => {
    const classList = students.map((s) => s.kelas).filter((k): k is string => Boolean(k));
    const set = new Set<string>(classList);
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    return ['Semua', ...sorted];
  }, [students]);

  const uniqueAgama = useMemo(() => {
    const agamaList = students.map((s) => s.agama).filter((a): a is string => Boolean(a));
    const set = new Set<string>(agamaList);
    return ['Semua', ...Array.from(set).sort()];
  }, [students]);

  // BARU: Unique Status list
  const uniqueStatus = useMemo(() => {
    const statusList = students.map((s) => s.status || 'Aktif').filter((s): s is string => Boolean(s));
    const set = new Set<string>(statusList);
    return ['Semua', ...Array.from(set).sort()];
  }, [students]);

  // Filter students based on search and filters
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Search query match
      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        (student.nama || '').toLowerCase().includes(query) ||
        (student.nipd || '').toLowerCase().includes(query) ||
        (student.nisn || '').toLowerCase().includes(query) ||
        (student.alamat || '').toLowerCase().includes(query) ||
        (student.ayah || (student as any).nama_ayah || '').toLowerCase().includes(query) ||
        (student.pekerjaanAyah || (student as any).kerja_ayah || (student as any).kerjaayah || '').toLowerCase().includes(query) ||
        (student.ibu || (student as any).nama_ibu || '').toLowerCase().includes(query) ||
        (student.pekerjaanIbu || (student as any).kerja_ibu || (student as any).kerjaibu || '').toLowerCase().includes(query) ||
        (student.tempatLahir || '').toLowerCase().includes(query);

      // Class match
      const matchKelas = selectedKelas === 'Semua' || student.kelas === selectedKelas;

      // JK match
      const matchJK = selectedJK === 'Semua' || student.jk === selectedJK;

      // Agama match
      const matchAgama = selectedAgama === 'Semua' || student.agama === selectedAgama;

      // BARU: Status match
      const matchStatus = selectedStatus === 'Semua' || (student.status || 'Aktif') === selectedStatus;

      return matchQuery && matchKelas && matchJK && matchAgama && matchStatus;
    });
  }, [students, searchQuery, selectedKelas, selectedJK, selectedAgama, selectedStatus]);

  // Pagination calculations
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Export Excel Handler with configurable columns
  const handleExportExcel = (forceAsGTK = false) => {
    const isExportingAsGTK = isUser || forceAsGTK;
    const activeHeaders = isExportingAsGTK 
      ? allowedGtkHeaders 
      : ALL_DOWNLOAD_COLUMNS.map((c) => c.key);
    
    // Filter columns in defined order that are permitted
    const exportColumns = ALL_DOWNLOAD_COLUMNS.filter((col) => activeHeaders.includes(col.key));

    const excelData = filteredStudents.map((student, idx) => {
      const row: Record<string, any> = {
        'No': idx + 1,
      };

      for (const col of exportColumns) {
        row[col.headerName] = col.getValue(student, idx);
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set professional column widths
    const colWidths = [
      { wch: 6 }, // No
      ...exportColumns.map((c) => ({ wch: c.excelWidth }))
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    const sheetName = selectedKelas !== 'Semua' ? selectedKelas.substring(0, 31) : 'Biodata Siswa';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const dateStr = new Date().toISOString().split('T')[0];
    const modeSuffix = isExportingAsGTK ? (isUser ? '' : '_Format_GTK') : '_Lengkap';
    const fileName = selectedKelas !== 'Semua'
      ? `Biodata_Siswa_${selectedKelas.replace(/[^a-zA-Z0-9]/g, '_')}${modeSuffix}_${dateStr}.xlsx`
      : `Biodata_Siswa_SMKN1_Palopo${modeSuffix}_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    setExportDropdownOpen(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Main Table Card */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xs overflow-hidden w-full">
        {/* Controls Bar */}
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
                placeholder="Cari berdasarkan Nama, NIPD, NISN, Alamat..."
                className="w-full pl-10 pr-9 py-2.5 bg-white rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Export Excel Button */}
              {!isUser ? (
                <div className="relative inline-flex rounded-xl shadow-2xs">
                  <button
                    onClick={() => handleExportExcel(false)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-l-xl border border-emerald-600 transition-colors shrink-0 cursor-pointer"
                    title="Ekspor seluruh data siswa lengkap ke file Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Ekspor Excel</span>
                  </button>
                  <button
                    onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                    className="px-2 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-r-xl border-l border-emerald-500 transition-colors shrink-0 cursor-pointer"
                    title="Opsi ekspor Excel"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {exportDropdownOpen && (
                    <div 
                      className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleExportExcel(false)}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between font-semibold cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          Ekspor Semua Kolom (Admin)
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">19 Kolom</span>
                      </button>
                      <button
                        onClick={() => handleExportExcel(true)}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          Uji Ekspor Format GTK
                        </span>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-100">
                          {allowedGtkHeaders.length} Kolom
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handleExportExcel(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl border border-emerald-600 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title={`Ekspor data siswa ke Excel (${allowedGtkHeaders.length} kolom diizinkan oleh Admin)`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Ekspor Excel</span>
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-800/80 text-emerald-100 rounded-full">
                    {allowedGtkHeaders.length} Kolom
                  </span>
                </button>
              )}

              {/* Admin Button: Atur Header Download GTK */}
              {!isUser && (
                <button
                  onClick={() => setIsGtkHeadersModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title="Atur kolom apa saja yang diizinkan untuk diunduh oleh GTK yang login sebagai User"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Atur Header Download GTK</span>
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full">
                    {allowedGtkHeaders.length}
                  </span>
                </button>
              )}

              {!isUser && (
                <button
                  onClick={() => setShowColumnToggle(!showColumnToggle)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title="Atur kolom yang ditampilkan"
                >
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <span>Kolom</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/80 text-xs">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>

            {/* Class Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium">Kelas:</span>
              <select
                value={selectedKelas}
                onChange={(e) => {
                  setSelectedKelas(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {uniqueClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium">JK:</span>
              <select
                value={selectedJK}
                onChange={(e) => {
                  setSelectedJK(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Semua">Semua (L/P)</option>
                <option value="L">Laki-Laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            {/* Agama Filter (Hanya Admin) */}
            {!isUser && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">Agama:</span>
                <select
                  value={selectedAgama}
                  onChange={(e) => {
                    setSelectedAgama(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {uniqueAgama.map((agm) => (
                    <option key={agm} value={agm}>
                      {agm}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* BARU: Status Filter (Hanya Admin) */}
            {!isUser && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {uniqueStatus.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reset Filters */}
            {(selectedKelas !== 'Semua' || selectedJK !== 'Semua' || (!isUser && selectedAgama !== 'Semua') || (!isUser && selectedStatus !== 'Semua') || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedKelas('Semua');
                  setSelectedJK('Semua');
                  setSelectedAgama('Semua');
                  setSelectedStatus('Semua'); // BARU: Reset Status
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="text-rose-600 hover:text-rose-800 font-bold underline px-2 py-1"
              >
                Reset Filter
              </button>
            )}

            <div className="ml-auto text-slate-500">
              Menampilkan <strong className="text-slate-900">{filteredStudents.length}</strong> dari {students.length} siswa
            </div>
          </div>

          {/* Column Toggles Dropdown Modal (Admin Only) */}
          {!isUser && showColumnToggle && (
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-xs text-slate-800">Tampilkan / Sembunyikan Kolom Tabel:</span>
                <button
                  onClick={() => setShowColumnToggle(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                {Object.keys(visibleColumns).map((colKey) => (
                  <label
                    key={colKey}
                    className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-50 border border-slate-100"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[colKey as keyof typeof visibleColumns]}
                      onChange={() =>
                        setVisibleColumns((prev) => ({
                          ...prev,
                          [colKey]: !prev[colKey as keyof typeof visibleColumns],
                        }))
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="capitalize font-medium text-slate-700">
                      {colKey === 'jk'
                        ? 'JK'
                        : colKey === 'nipd'
                        ? 'NIPD'
                        : colKey === 'nisn'
                        ? 'NISN'
                        : colKey === 'tempatLahir'
                        ? 'Tempat Lahir'
                        : colKey === 'tanggalLahir'
                        ? 'Tanggal Lahir'
                        : colKey === 'pekerjaanAyah'
                        ? 'Pekerjaan Ayah'
                        : colKey === 'pekerjaanIbu'
                        ? 'Pekerjaan Ibu'
                        : colKey === 'status'
                        ? 'Status'
                        : colKey}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Data Table - Clean Grid Style (Columns auto-fit content length) */}
        <div className="overflow-x-auto relative w-full border border-slate-200 rounded-xl shadow-xs">
            <table className="w-max min-w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                  <th className="py-2.5 px-3 text-center whitespace-nowrap border-r border-slate-300">No</th>
                  {isColVisible('nama') && <th className="py-2.5 px-4 whitespace-nowrap border-r border-slate-300 font-bold">Nama</th>}
                  {isColVisible('kelas') && <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300">Kelas</th>}
                  {isColVisible('nipd') && <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300">NIPD</th>}
                  {isColVisible('nisn') && <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300">NISN</th>}
                  {isColVisible('jk') && <th className="py-2.5 px-3 text-center whitespace-nowrap border-r border-slate-300">JK</th>}
                  {isColVisible('tempatLahir') && <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300">Tempat Lahir</th>}
                  {isColVisible('tanggalLahir') && <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300">Tanggal Lahir</th>}
                  {isColVisible('agama') && <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300">Agama</th>}
                  {isColVisible('alamat') && <th className="py-2.5 px-4 whitespace-nowrap border-r border-slate-300">Alamat</th>}
                  {isColVisible('ayah') && <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300">Ayah</th>}
                  {isColVisible('pekerjaanAyah') && <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300">Pekerjaan Ayah</th>}
                  {isColVisible('ibu') && <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300">Ibu</th>}
                  {isColVisible('pekerjaanIbu') && <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300">Pekerjaan Ibu</th>}
                  {isColVisible('noHp') && <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300">No HP</th>}
                  {isColVisible('email') && <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300">Email</th>}
                  {isColVisible('sekolahAsal') && <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300">Sekolah Asal</th>}
                  {isColVisible('status') && <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-300">Status</th>}
                  {isColVisible('ket') && <th className="py-2.5 px-3 whitespace-nowrap">Keterangan</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={1 + ['nama', 'kelas', 'nipd', 'nisn', 'jk', 'tempatLahir', 'tanggalLahir', 'agama', 'alamat', 'ayah', 'pekerjaanAyah', 'ibu', 'pekerjaanIbu', 'noHp', 'email', 'sekolahAsal', 'status', 'ket'].filter(isColVisible).length} className="py-12 text-center text-slate-500">
                      <div className="max-w-xs mx-auto space-y-2">
                        <UserCheck className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-semibold text-slate-700">Tidak ada data siswa ditemukan</p>
                        <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau reset filter.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student, idx) => {
                    const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr
                        key={student.id ? `${student.id}-${idx}` : `stu-${idx}`}
                        className="hover:bg-slate-50 transition-colors border-b border-slate-200"
                      >
                        <td className="py-2.5 px-3 text-center text-slate-500 font-medium whitespace-nowrap border-r border-slate-200">
                          {itemIndex}
                        </td>

                        {/* 1. Nama */}
                        {isColVisible('nama') && (
                          <td className="py-2.5 px-4 font-semibold text-slate-800 hover:text-indigo-600 transition-colors whitespace-nowrap border-r border-slate-200">
                            <button
                              onClick={() => onViewStudent(student)}
                              className="text-left hover:underline focus:outline-hidden cursor-pointer whitespace-nowrap block"
                            >
                              {student.nama}
                            </button>
                          </td>
                        )}

                        {/* 2. Kelas */}
                        {isColVisible('kelas') && (
                          <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {student.kelas}
                          </td>
                        )}

                        {/* 3. NIPD */}
                        {isColVisible('nipd') && (
                          <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {student.nipd}
                          </td>
                        )}

                        {/* 4. NISN */}
                        {isColVisible('nisn') && (
                          <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {student.nisn}
                          </td>
                        )}

                        {/* 5. JK */}
                        {isColVisible('jk') && (
                          <td className="py-2.5 px-3 text-center font-medium text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {student.jk || '-'}
                          </td>
                        )}

                        {/* 6. Tempat Lahir */}
                        {isColVisible('tempatLahir') && (
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {student.tempatLahir || '-'}
                          </td>
                        )}

                        {/* 7. Tanggal Lahir */}
                        {isColVisible('tanggalLahir') && (
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {formatDate(student.tanggalLahir)}
                          </td>
                        )}

                        {/* 8. Agama */}
                        {isColVisible('agama') && (
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {student.agama || '-'}
                          </td>
                        )}

                        {/* 9. Alamat */}
                        {isColVisible('alamat') && (
                          <td className="py-2.5 px-4 text-slate-800 whitespace-nowrap border-r border-slate-200" title={student.alamat}>
                            {student.alamat || '-'}
                          </td>
                        )}

                        {/* 10. Ayah */}
                        {isColVisible('ayah') && (
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {student.ayah || (student as any).nama_ayah || (student as any).namaayah || '-'}
                          </td>
                        )}

                        {/* 10b. Pekerjaan Ayah */}
                        {isColVisible('pekerjaanAyah') && (
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {student.pekerjaanAyah || (student as any).kerja_ayah || (student as any).kerjaayah || (student as any).pekerjaan_ayah || '-'}
                          </td>
                        )}

                        {/* 11. Ibu */}
                        {isColVisible('ibu') && (
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {student.ibu || (student as any).nama_ibu || (student as any).namaibu || '-'}
                          </td>
                        )}

                        {/* 11b. Pekerjaan Ibu */}
                        {isColVisible('pekerjaanIbu') && (
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {student.pekerjaanIbu || (student as any).kerja_ibu || (student as any).kerjaibu || (student as any).pekerjaan_ibu || '-'}
                          </td>
                        )}

                        {/* 12. No HP */}
                        {isColVisible('noHp') && (
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {student.noHp || '-'}
                          </td>
                        )}

                        {/* 13. Email */}
                        {isColVisible('email') && (
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {student.email || '-'}
                          </td>
                        )}

                        {/* 14. Sekolah Asal */}
                        {isColVisible('sekolahAsal') && (
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {student.sekolahAsal || '-'}
                          </td>
                        )}

                        {/* 15. Status (Tampilan Polosan tanpa highlight) */}
                        {isColVisible('status') && (
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap border-r border-slate-200">
                            {student.status || 'Aktif'}
                          </td>
                        )}

                        {/* 16. Keterangan */}
                        {isColVisible('ket') && (
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                            {student.ket || '-'}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Tampilkan</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-white rounded border border-slate-300 font-semibold text-slate-800"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>data per halaman</span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Halaman <strong className="text-slate-900">{currentPage}</strong> dari {totalPages}
            </span>

            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Pengaturan Header Download GTK (Admin Only) */}
      {!isUser && (
        <GTKDownloadHeadersModal
          isOpen={isGtkHeadersModalOpen}
          onClose={() => setIsGtkHeadersModalOpen(false)}
          currentAllowedKeys={allowedGtkHeaders}
          webAppUrl={webAppUrl}
          onSaveSuccess={(updatedKeys) => {
            setAllowedGtkHeaders(updatedKeys);
            if (onUpdateAllowedGtkHeaders) {
              onUpdateAllowedGtkHeaders(updatedKeys);
            }
          }}
        />
      )}
    </div>
  );
};