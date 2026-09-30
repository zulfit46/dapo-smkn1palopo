import React, { useState, useEffect } from 'react';
import { Student, GTKData } from '../types';
import { User, MapPin, Calendar, Users, Phone, Mail, GraduationCap, Printer, X, ShieldCheck, Lock, Key, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { isUserRole } from '../utils/authUtils';

interface StudentDetailModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (student: Student) => void;
  currentUser?: GTKData | null;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  isOpen,
  onClose,
  onEdit,
  currentUser
}) => {
  const isUser = isUserRole(currentUser);
  const [showAccessPrompt, setShowAccessPrompt] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [accessError, setAccessError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Reset state whenever modal opens or student changes
  useEffect(() => {
    if (isOpen) {
      setShowAccessPrompt(false);
      setAccessCode('');
      setAccessError('');
      setShowPassword(false);
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleVerifyAccessCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!accessCode.trim()) {
      setAccessError('Silakan masukkan kode akses.');
      return;
    }

    if (accessCode.trim() === 'rumahdapodik') {
      setShowAccessPrompt(false);
      setAccessCode('');
      setAccessError('');
      onClose();
      onEdit(student);
    } else {
      setAccessError('Kode akses salah! Anda tidak memiliki izin untuk mengedit data siswa.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:border-none print:m-0 print:max-w-none relative">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
              student.jk === 'L' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400' : 'bg-rose-500/20 text-rose-300 border-rose-400'
            }`}>
              {student.nama.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold">{student.nama}</h2>
              <p className="text-xs text-indigo-200 flex items-center gap-2 mt-0.5">
                <span>Kelas: <strong className="text-white">{student.kelas}</strong></span>
                <span>•</span>
                <span>NISN: <strong className="text-white">{student.nisn}</strong></span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print-only title */}
        <div className="hidden print:block text-center py-4 border-b">
          <h1 className="text-xl font-bold">KARTU BIODATA PESERTA DIDIK</h1>
          <p className="text-sm text-slate-600">SMKN 1 Palopo</p>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">
          {/* Main Info Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Data Pokok Siswa
              </h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                student.jk === 'L' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {student.jk === 'L' ? 'Laki-Laki (L)' : 'Perempuan (P)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Nama Lengkap</span>
                <span className="font-bold text-slate-900">{student.nama}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Kelas</span>
                <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs inline-block mt-0.5">
                  {student.kelas}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">NIPD</span>
                <span className="text-slate-800 font-semibold">{student.nipd}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">NISN</span>
                <span className="text-slate-800 font-semibold">{student.nisn}</span>
              </div>
            </div>
          </div>

          {/* Birth & Religion (Admin Only) */}
          {!isUser && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <Calendar className="w-4 h-4" /> Tempat / Tanggal Lahir & Agama
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Tempat Lahir</span>
                  <span className="font-semibold text-slate-800">{student.tempatLahir || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Tanggal Lahir</span>
                  <span className="font-semibold text-slate-800">{formatDate(student.tanggalLahir)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Agama</span>
                  <span className="font-semibold text-slate-800">{student.agama || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Address & Parents (Admin Only) */}
          {!isUser && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <Users className="w-4 h-4" /> Alamat & Orang Tua
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="sm:col-span-2">
                  <span className="text-xs text-slate-500 block">Alamat Lengkap</span>
                  <span className="font-medium text-slate-800 leading-relaxed block mt-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {student.alamat || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Nama Ayah Kandung</span>
                  <span className="font-semibold text-slate-900">{student.ayah || (student as any).nama_ayah || (student as any).namaayah || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Pekerjaan Ayah</span>
                  <span className="font-medium text-slate-800">{student.pekerjaanAyah || (student as any).kerja_ayah || (student as any).kerjaayah || (student as any).pekerjaan_ayah || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Nama Ibu Kandung</span>
                  <span className="font-semibold text-slate-900">{student.ibu || (student as any).nama_ibu || (student as any).namaibu || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Pekerjaan Ibu</span>
                  <span className="font-medium text-slate-800">{student.pekerjaanIbu || (student as any).kerja_ibu || (student as any).kerjaibu || (student as any).pekerjaan_ibu || '-'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center print:hidden ${
          isUser ? 'justify-end' : 'justify-between'
        }`}>
          {!isUser && (
            <button
              onClick={() => {
                setAccessCode('');
                setAccessError('');
                setShowAccessPrompt(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Edit Biodata</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

        {/* Access Code Verification Modal Overlay */}
        {showAccessPrompt && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Verifikasi Kode Akses Edit</h3>
                  <p className="text-xs text-slate-500">Hanya pengguna terotorisasi yang dapat mengedit data.</p>
                </div>
              </div>

              <form onSubmit={handleVerifyAccessCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Masukkan Kode Akses
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={accessCode}
                      onChange={(e) => {
                        setAccessCode(e.target.value);
                        if (accessError) setAccessError('');
                      }}
                      placeholder="Masukkan kode akses..."
                      autoFocus
                      className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border text-xs rounded-xl focus:outline-hidden focus:ring-2 transition-colors ${
                        accessError
                          ? 'border-rose-300 text-rose-900 focus:ring-rose-400 bg-rose-50/30'
                          : 'border-slate-300 text-slate-800 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {accessError && (
                    <div className="mt-2 text-xs text-rose-600 flex items-center gap-1.5 font-medium animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{accessError}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccessPrompt(false);
                      setAccessCode('');
                      setAccessError('');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verifikasi & Edit</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

