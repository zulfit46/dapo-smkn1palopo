import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Printer, 
  BadgeCheck, 
  Users, 
  Shield,
  Briefcase,
  Eye,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Building,
  Award,
  BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GTKData } from '../types';
import { INITIAL_GTK_LIST } from '../data/initialGTK';

interface GTKViewProps {
  gtkList?: GTKData[];
}

export const GTKView: React.FC<GTKViewProps> = ({ 
  gtkList = INITIAL_GTK_LIST 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua');
  const [selectedJenisPtk, setSelectedJenisPtk] = useState<string>('Semua');
  const [selectedJk, setSelectedJk] = useState<string>('Semua');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedGTKDetail, setSelectedGTKDetail] = useState<GTKData | null>(null);

  // Statistics calculation
  const totalGTK = gtkList.length;
  const totalPNS = gtkList.filter(g => (g.statusKepegawaian || '').toUpperCase() === 'PNS').length;
  const totalPPPK = gtkList.filter(g => (g.statusKepegawaian || '').toUpperCase() === 'PPPK').length;
  const totalHonorer = gtkList.filter(g => {
    const s = (g.statusKepegawaian || '').toLowerCase();
    return s.includes('honor') || s.includes('gtt') || s.includes('ptt') || (!s.includes('pns') && !s.includes('pppk') && s !== '');
  }).length;

  // Filtered GTK list
  const filteredGTK = useMemo(() => {
    return gtkList.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        (item.nama || '').toLowerCase().includes(q) ||
        (item.nip || '').includes(q) ||
        (item.nuptk || '').includes(q) ||
        (item.nik || '').includes(q) ||
        (item.jenisPtk || '').toLowerCase().includes(q) ||
        (item.tugasTambahan || '').toLowerCase().includes(q);

      const matchesStatus = 
        selectedStatus === 'Semua' || 
        (selectedStatus === 'PNS' && (item.statusKepegawaian || '').toUpperCase() === 'PNS') ||
        (selectedStatus === 'PPPK' && (item.statusKepegawaian || '').toUpperCase() === 'PPPK') ||
        (selectedStatus === 'Honorer' && (item.statusKepegawaian || '').toLowerCase().includes('honor'));

      const matchesJenisPtk = 
        selectedJenisPtk === 'Semua' || (item.jenisPtk || '').toLowerCase().includes(selectedJenisPtk.toLowerCase());

      const matchesJk = 
        selectedJk === 'Semua' || item.jk === selectedJk;

      return matchesSearch && matchesStatus && matchesJenisPtk && matchesJk;
    });
  }, [gtkList, searchQuery, selectedStatus, selectedJenisPtk, selectedJk]);

  // Export to Excel with all 51 headers
  const handleExportExcel = () => {
    const exportData = filteredGTK.map((g, idx) => ({
      'No': idx + 1,
      'Nama': g.nama,
      'NUPTK': g.nuptk || '-',
      'JK': g.jk,
      'Tempat Lahir': g.tempatLahir || '-',
      'Tanggal Lahir': g.tanggalLahir || '-',
      'NIP': g.nip || '-',
      'Status Kepegawaian': g.statusKepegawaian || '-',
      'Jenis PTK': g.jenisPtk || '-',
      'Agama': g.agama || '-',
      'Alamat Jalan': g.alamatJalan || '-',
      'RT': g.rt || '-',
      'RW': g.rw || '-',
      'Nama Dusun': g.namaDusun || '-',
      'Desa/Kelurahan': g.desaKelurahan || '-',
      'Kecamatan': g.kecamatan || '-',
      'Kode Pos': g.kodePos || '-',
      'Telepon': g.telepon || '-',
      'HP': g.hp || '-',
      'Email': g.email || '-',
      'Tugas Tambahan': g.tugasTambahan || '-',
      'SK CPNS': g.skCpns || '-',
      'Tanggal CPNS': g.tanggalCpns || '-',
      'SK Pengangkatan': g.skPengangkatan || '-',
      'TMT Pengangkatan': g.tmtPengangkatan || '-',
      'Lembaga Pengangkatan': g.lembagaPengangkatan || '-',
      'Pangkat Golongan': g.pangkatGolongan || '-',
      'Sumber Gaji': g.sumberGaji || '-',
      'Nama Ibu Kandung': g.namaIbuKandung || '-',
      'Status Perkawinan': g.statusPerkawinan || '-',
      'Nama Suami/Istri': g.namaSuamiIstri || '-',
      'NIP Suami/Istri': g.nipSuamiIstri || '-',
      'Pekerjaan Suami/Istri': g.pekerjaanSuamiIstri || '-',
      'TMT PNS': g.tmtPns || '-',
      'Sudah Lisensi Kepala Sekolah': g.sudahLisensiKepalaSekolah || '-',
      'Pernah Diklat Kepengawasan': g.pernahDiklatKepengawasan || '-',
      'Keahlian Braille': g.keahlianBraille || '-',
      'Keahlian Bahasa Isyarat': g.keahlianBahasaIsyarat || '-',
      'NPWP': g.npwp || '-',
      'Nama Wajib Pajak': g.namaWajibPajak || '-',
      'Kewarganegaraan': g.kewarganegaraan || '-',
      'Bank': g.bank || '-',
      'Nomor Rekening Bank': g.nomorRekeningBank || '-',
      'Rekening Atas Nama': g.rekeningAtasNama || '-',
      'NIK': g.nik || '-',
      'No KK': g.noKk || '-',
      'Karpeg': g.karpeg || '-',
      'Karis/Karsu': g.karisKarsu || '-',
      'Lintang': g.lintang || '-',
      'Bujur': g.bujur || '-',
      'NUKS': g.nuks || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_GTK');
    XLSX.writeFile(workbook, `Data_GTK_SMKN1_Palopo_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shadow-2xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Data Guru & Tenaga Kependidikan (GTK)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Sheet resmi: <code className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">gtk</code> | UPT SMK Negeri 1 Palopo
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Ekspor seluruh 51 kolom GTK ke Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel (51 Kolom)</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total GTK Terdaftar</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalGTK}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1 font-medium">
              <BadgeCheck className="w-3.5 h-3.5" /> Terdata Lengkap
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Pegawai Negeri Sipil (PNS)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{totalPNS}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Aparatur Sipil Negara</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">PPPK Kemendikbud</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{totalPPPK}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Pegawai Pemerintah PK</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Guru & Tenaga Honorer</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{totalHonorer}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">GTT / PTT Sekolah</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama GTK, NIP, NUPTK, NIK, tugas tambahan, atau jenis PTK..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 text-slate-700"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tabel
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kartu
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

          {/* Status Kepegawaian */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="Semua">Semua Status</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="Honorer">Honorer / GTT / PTT</option>
            </select>
          </div>

          {/* Jenis PTK */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Jenis PTK:</span>
            <select
              value={selectedJenisPtk}
              onChange={(e) => setSelectedJenisPtk(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="Semua">Semua Jenis PTK</option>
              <option value="Guru Mapel">Guru Mapel</option>
              <option value="Guru BK">Guru BK</option>
              <option value="Kepala Sekolah">Kepala Sekolah</option>
              <option value="Tenaga Administrasi">Tenaga Administrasi</option>
              <option value="Tenaga Perpustakaan">Tenaga Perpustakaan</option>
            </select>
          </div>

          {/* JK */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">L/P:</span>
            <select
              value={selectedJk}
              onChange={(e) => setSelectedJk(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="Semua">Semua L/P</option>
              <option value="L">Laki-Laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>

          {(searchQuery || selectedStatus !== 'Semua' || selectedJenisPtk !== 'Semua' || selectedJk !== 'Semua') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('Semua');
                setSelectedJenisPtk('Semua');
                setSelectedJk('Semua');
              }}
              className="ml-auto text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Content (Table or Cards) */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">Nama Lengkap & NIP / NUPTK</th>
                  <th className="py-3.5 px-4">Jenis PTK</th>
                  <th className="py-3.5 px-4">Tugas Tambahan</th>
                  <th className="py-3.5 px-4">Pangkat / Golongan</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">L/P</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGTK.length > 0 ? (
                  filteredGTK.map((item, index) => (
                    <tr key={`gtk-table-${item.id || item.nip || 'row'}-${index}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            item.jk === 'P'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          }`}>
                            {item.nama.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{item.nama}</p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span>NIP: {item.nip && item.nip !== '-' ? item.nip : '-'}</span>
                              {item.nuptk && item.nuptk !== '-' && (
                                <>
                                  <span>•</span>
                                  <span>NUPTK: {item.nuptk}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {item.jenisPtk || 'Guru Mapel'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {item.tugasTambahan && item.tugasTambahan !== '-' ? item.tugasTambahan : '-'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {item.pangkatGolongan && item.pangkatGolongan !== '-' ? item.pangkatGolongan : '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-800">
                        {item.statusKepegawaian || 'Honorer'}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-800">
                        {item.jk || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedGTKDetail(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-semibold transition-colors cursor-pointer text-xs"
                          title="Lihat Rincian 51 Kolom"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Rincian</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">Tidak ada data GTK yang cocok</p>
                      <p className="text-xs text-slate-400 mt-0.5">Coba ubah kata kunci atau reset filter pencarian</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Menampilkan <strong>{filteredGTK.length}</strong> dari <strong>{totalGTK}</strong> GTK terdaftar</span>
            <span className="text-[11px] text-slate-400">Sheet: gtk | SMKN 1 Palopo</span>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGTK.map((item, index) => (
            <div 
              key={`gtk-card-${item.id || item.nip || 'card'}-${index}`}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      item.jk === 'P'
                        ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    }`}>
                      {item.nama.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-snug">{item.nama}</h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">NIP: {item.nip || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-4 text-xs">
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 font-medium">Jenis PTK:</span>
                    <span className="font-semibold text-slate-800">{item.jenisPtk || 'Guru Mapel'}</span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-indigo-50/50 rounded-xl">
                    <span className="text-indigo-600 font-medium">Tugas Tambahan:</span>
                    <span className="font-bold text-indigo-700">{item.tugasTambahan || '-'}</span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 text-[11px] block">Pangkat / Golongan:</span>
                    <span className="font-medium text-slate-700 text-xs">{item.pangkatGolongan || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-[10px] ${
                  (item.statusKepegawaian || '').toUpperCase() === 'PNS'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : (item.statusKepegawaian || '').toUpperCase() === 'PPPK'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <BadgeCheck className="w-3 h-3" />
                  {item.statusKepegawaian || 'Honorer'}
                </span>

                <button
                  onClick={() => setSelectedGTKDetail(item)}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Detail Lengkap</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 51-Column GTK Detail Modal */}
      {selectedGTKDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">{selectedGTKDetail.nama}</h2>
                  <p className="text-xs text-slate-400">
                    NIP: {selectedGTKDetail.nip || '-'} | NUPTK: {selectedGTKDetail.nuptk || '-'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGTKDetail(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 51 Columns Grouped */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs bg-slate-50/50">
              {/* Group 1: Data Utama & Kepegawaian */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Award className="w-4 h-4" /> 1. Data Pribadi & Kepegawaian
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nama Lengkap:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.nama}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Jenis Kelamin:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.jk === 'L' ? 'Laki-Laki (L)' : 'Perempuan (P)'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tempat, Tanggal Lahir:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.tempatLahir || '-'}, {selectedGTKDetail.tanggalLahir || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Status Kepegawaian:</span>
                    <span className="font-bold text-emerald-700">{selectedGTKDetail.statusKepegawaian || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Jenis PTK:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.jenisPtk || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tugas Tambahan:</span>
                    <span className="font-semibold text-indigo-700">{selectedGTKDetail.tugasTambahan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Pangkat / Golongan:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.pangkatGolongan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Sumber Gaji:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.sumberGaji || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Agama:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.agama || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Kewarganegaraan:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.kewarganegaraan || 'Indonesia'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nama Ibu Kandung:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.namaIbuKandung || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Status Perkawinan:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.statusPerkawinan || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Group 2: SK & Riwayat Pengangkatan */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Shield className="w-4 h-4" /> 2. SK & Riwayat Pengangkatan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[11px]">SK CPNS:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.skCpns || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tanggal CPNS:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.tanggalCpns || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">TMT PNS:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.tmtPns || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">SK Pengangkatan:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.skPengangkatan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">TMT Pengangkatan:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.tmtPengangkatan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Lembaga Pengangkatan:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.lembagaPengangkatan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Lisensi Kepala Sekolah:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.sudahLisensiKepalaSekolah || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Diklat Kepengawasan:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.pernahDiklatKepengawasan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">NUKS:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.nuks || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Group 3: Alamat & Kontak */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <MapPin className="w-4 h-4" /> 3. Alamat Domisili & Kontak
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <span className="text-slate-400 block text-[11px]">Alamat Jalan:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.alamatJalan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">RT / RW:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.rt || '-'}/{selectedGTKDetail.rw || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Dusun:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.namaDusun || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Kelurahan / Desa:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.desaKelurahan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Kecamatan & Kode Pos:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.kecamatan || '-'} ({selectedGTKDetail.kodePos || '-'})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">No. Handphone (HP):</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.hp || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email Pribadi / Dinas:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Koordinat (Lintang/Bujur):</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.lintang || '-'}, {selectedGTKDetail.bujur || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Group 4: Rekening, NPWP & Dokumen Kependudukan */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <CreditCard className="w-4 h-4" /> 4. Dokumen Kependudukan & Rekening Bank
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[11px]">NIK (KTP):</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedGTKDetail.nik || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nomor Kartu Keluarga (KK):</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedGTKDetail.noKk || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">NPWP:</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedGTKDetail.npwp || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nama Wajib Pajak:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.namaWajibPajak || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Bank:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.bank || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nomor Rekening Bank:</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedGTKDetail.nomorRekeningBank || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Rekening Atas Nama:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.rekeningAtasNama || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Karpeg / Karis / Karsu:</span>
                    <span className="font-semibold text-slate-800">{selectedGTKDetail.karpeg || '-'} / {selectedGTKDetail.karisKarsu || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Keahlian Khusus:</span>
                    <span className="font-semibold text-slate-800">Braille: {selectedGTKDetail.keahlianBraille || 'Tidak'} | Isyarat: {selectedGTKDetail.keahlianBahasaIsyarat || 'Tidak'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedGTKDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
