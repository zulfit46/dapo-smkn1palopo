import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { Activity, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface DataPeriodikViewProps {
  students: Student[];
}

export const DataPeriodikView: React.FC<DataPeriodikViewProps> = ({ students }) => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return students.filter(s => 
      (s.nama || '').toLowerCase().includes(q) ||
      (s.nipd || '').toLowerCase().includes(q) ||
      (s.kelas || '').toLowerCase().includes(q)
    );
  }, [students, search]);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" /> Data Periodik Peserta Didik
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Informasi perkembangan fisik (tinggi/berat badan) dan rincian perjalanan ke sekolah.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari siswa..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Clean Grid Table */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                <th className="py-2.5 px-3 text-center border-r border-slate-300 w-12">No</th>
                <th className="py-2.5 px-4 border-r border-slate-300 font-bold">Nama Siswa</th>
                <th className="py-2.5 px-3 border-r border-slate-300">Kelas</th>
                <th className="py-2.5 px-3 border-r border-slate-300">NIPD</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-300">Tinggi (cm)</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-300">Berat (kg)</th>
                <th className="py-2.5 px-3 border-r border-slate-300">Jarak Tempat Tinggal</th>
                <th className="py-2.5 px-3 border-r border-slate-300">Waktu Tempuh</th>
                <th className="py-2.5 px-3 text-center">Jml Saudara</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 italic">
                    Tidak ada data siswa ditemukan
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={student.id ? `${student.id}-${idx}` : `stu-${idx}`} className="hover:bg-slate-50 transition-colors border-b border-slate-200">
                      <td className="py-2.5 px-3 text-center text-slate-500 border-r border-slate-200">{itemIndex}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200">{student.nama}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">{student.kelas}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 border-r border-slate-200">{student.nipd}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800 border-r border-slate-200">{student.tinggiBadan || 165} cm</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800 border-r border-slate-200">{student.beratBadan || 55} kg</td>
                      <td className="py-2.5 px-3 text-slate-800 border-r border-slate-200">{student.jarakSekolah || '1 - 3 km'}</td>
                      <td className="py-2.5 px-3 text-slate-800 border-r border-slate-200">{student.waktuTempuh || '15 menit'}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-800">{student.jumlahSaudara ?? 1}</td>
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
              <option value={100}>100</option>
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
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 shadow-2xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

