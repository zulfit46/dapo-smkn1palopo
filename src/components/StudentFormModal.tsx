import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { User, ShieldCheck, MapPin, Users, Calendar, Save, X } from 'lucide-react';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Partial<Student>) => void;
  initialData?: Student | null;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState<Partial<Student>>({
    nama: '',
    kelas: 'X IPA 1',
    nipd: '',
    nisn: '',
    jk: 'L',
    tempatLahir: '',
    tanggalLahir: '',
    agama: 'Islam',
    alamat: '',
    ayah: '',
    pekerjaanAyah: '',
    ibu: '',
    pekerjaanIbu: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        ayah: initialData.ayah || (initialData as any).nama_ayah || '',
        pekerjaanAyah: initialData.pekerjaanAyah || (initialData as any).kerja_ayah || (initialData as any).kerjaayah || (initialData as any).pekerjaan_ayah || '',
        ibu: initialData.ibu || (initialData as any).nama_ibu || '',
        pekerjaanIbu: initialData.pekerjaanIbu || (initialData as any).kerja_ibu || (initialData as any).kerjaibu || (initialData as any).pekerjaan_ibu || ''
      });
    } else {
      setFormData({
        nama: '',
        kelas: 'X IPA 1',
        nipd: `2223${Math.floor(1000 + Math.random() * 9000)}`,
        nisn: `006${Math.floor(1000000 + Math.random() * 9000000)}`,
        jk: 'L',
        tempatLahir: 'Jakarta',
        tanggalLahir: '2007-01-01',
        agama: 'Islam',
        alamat: '',
        ayah: '',
        pekerjaanAyah: '',
        ibu: '',
        pekerjaanIbu: ''
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!formData.nama?.trim()) newErrors.nama = 'Nama Wajib Diisi';
    if (!formData.kelas?.trim()) newErrors.kelas = 'Kelas Wajib Diisi';
    if (!formData.nipd?.trim()) newErrors.nipd = 'NIPD Wajib Diisi';
    if (!formData.nisn?.trim()) newErrors.nisn = 'NISN Wajib Diisi';
    if (!formData.tempatLahir?.trim()) newErrors.tempatLahir = 'Tempat Lahir Wajib Diisi';
    if (!formData.tanggalLahir?.trim()) newErrors.tanggalLahir = 'Tanggal Lahir Wajib Diisi';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      ...formData,
      kerja_ayah: formData.pekerjaanAyah || '',
      kerja_ibu: formData.pekerjaanIbu || '',
      nama_ayah: formData.ayah || '',
      nama_ibu: formData.ibu || ''
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {initialData ? 'Edit Biodata Siswa' : 'Tambah Siswa Baru'}
              </h2>
              <p className="text-xs text-slate-400">
                Data akan tersimpan secara terstruktur dan dapat disinkronkan ke Google Sheets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 bg-slate-50/50">
          {/* Section 1: Data Utama / Identitas */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <ShieldCheck className="w-4 h-4" /> 1. Identitas Utama Siswa
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="nama"
                  value={formData.nama || ''}
                  onChange={handleChange}
                  placeholder="Masukkan Nama Lengkap"
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white focus:outline-hidden focus:ring-2 ${
                    errors.nama ? 'border-rose-500 ring-rose-200' : 'border-slate-300 focus:ring-indigo-500'
                  }`}
                />
                {errors.nama && <p className="text-xs text-rose-500 mt-1">{errors.nama}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kelas <span className="text-rose-500">*</span>
                </label>
                <select
                  name="kelas"
                  value={formData.kelas || 'X IPA 1'}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="X IPA 1">X IPA 1</option>
                  <option value="X IPA 2">X IPA 2</option>
                  <option value="XI MIPA 1">XI MIPA 1</option>
                  <option value="XI IPS 1">XI IPS 1</option>
                  <option value="XII MIPA 1">XII MIPA 1</option>
                  <option value="XII MIPA 2">XII MIPA 2</option>
                  <option value="XII IPS 1">XII IPS 1</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Kelamin (JK) <span className="text-rose-500">*</span>
                </label>
                <select
                  name="jk"
                  value={formData.jk || 'L'}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="L">Laki-Laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIPD <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="nipd"
                  value={formData.nipd || ''}
                  onChange={handleChange}
                  placeholder="Nomor Induk Peserta Didik"
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white focus:outline-hidden focus:ring-2 ${
                    errors.nipd ? 'border-rose-500' : 'border-slate-300 focus:ring-indigo-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NISN <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="nisn"
                  value={formData.nisn || ''}
                  onChange={handleChange}
                  placeholder="Nomor Induk Siswa Nasional"
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white focus:outline-hidden focus:ring-2 ${
                    errors.nisn ? 'border-rose-500' : 'border-slate-300 focus:ring-indigo-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Kelahiran & Agama */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Calendar className="w-4 h-4" /> 2. Tempat/Tanggal Lahir & Agama
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tempat Lahir <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="tempatLahir"
                  value={formData.tempatLahir || ''}
                  onChange={handleChange}
                  placeholder="Kota Lahir"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Lahir <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="tanggalLahir"
                  value={formData.tanggalLahir || ''}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Agama <span className="text-rose-500">*</span>
                </label>
                <select
                  name="agama"
                  value={formData.agama || 'Islam'}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Islam">Islam</option>
                  <option value="Kristen">Kristen</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Khonghucu">Khonghucu</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Alamat & Orang Tua */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4" /> 3. Alamat & Data Orang Tua
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Tempat Tinggal
                </label>
                <textarea
                  name="alamat"
                  rows={2}
                  value={formData.alamat || ''}
                  onChange={handleChange}
                  placeholder="Jl. Nama Jalan No. XX, RT/RW, Kelurahan, Kecamatan, Kota"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Ayah Kandung
                </label>
                <input
                  type="text"
                  name="ayah"
                  value={formData.ayah || ''}
                  onChange={handleChange}
                  placeholder="Nama Lengkap Ayah"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pekerjaan Ayah
                </label>
                <input
                  type="text"
                  name="pekerjaanAyah"
                  list="pekerjaan-ayah-list"
                  value={formData.pekerjaanAyah || ''}
                  onChange={handleChange}
                  placeholder="Pilih atau ketik pekerjaan ayah"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="pekerjaan-ayah-list">
                  <option value="Wiraswasta" />
                  <option value="PNS / ASN" />
                  <option value="TNI / POLRI" />
                  <option value="Karyawan Swasta" />
                  <option value="Petani / Pekebun" />
                  <option value="Nelayan" />
                  <option value="Pedagang" />
                  <option value="Guru / Dosen" />
                  <option value="Buruh" />
                  <option value="Pensiunan" />
                  <option value="Tidak Bekerja" />
                  <option value="Lainnya" />
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Ibu Kandung
                </label>
                <input
                  type="text"
                  name="ibu"
                  value={formData.ibu || ''}
                  onChange={handleChange}
                  placeholder="Nama Lengkap Ibu"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pekerjaan Ibu
                </label>
                <input
                  type="text"
                  name="pekerjaanIbu"
                  list="pekerjaan-ibu-list"
                  value={formData.pekerjaanIbu || ''}
                  onChange={handleChange}
                  placeholder="Pilih atau ketik pekerjaan ibu"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="pekerjaan-ibu-list">
                  <option value="Ibu Rumah Tangga" />
                  <option value="Wiraswasta" />
                  <option value="PNS / ASN" />
                  <option value="Karyawan Swasta" />
                  <option value="Guru / Dosen" />
                  <option value="Pedagang" />
                  <option value="Petani / Pekebun" />
                  <option value="Buruh" />
                  <option value="Pensiunan" />
                  <option value="Tidak Bekerja" />
                  <option value="Lainnya" />
                </datalist>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-sm font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs"
            >
              <Save className="w-4 h-4" />
              Simpan Data Siswa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
