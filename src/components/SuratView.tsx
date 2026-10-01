import React, { useState, useMemo, useRef } from 'react';
import { Student, GTKData, WaliKelas, Jurusan } from '../types';
import { LOGO_BASE64 } from '../assets/logoBase64';
import { INITIAL_JURUSAN_LIST, getJurusanByKelas } from '../data/initialJurusan';
import { 
  Printer, 
  Download, 
  Search, 
  X, 
  Check, 
  FileCheck, 
  GraduationCap, 
  School, 
  User, 
  Calendar, 
  MapPin, 
  Building2, 
  RefreshCw, 
  Sliders, 
  Eye, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import jsPDF from 'jspdf';

interface SuratViewProps {
  students: Student[];
  currentUser?: GTKData | null;
  waliKelasList?: WaliKelas[];
  jurusanList?: Jurusan[];
}

type JenisSurat = 'pindah' | 'ket-siswa';

export function formatNIP(rawNip?: string): string {
  if (!rawNip) return '';
  const digits = rawNip.replace(/\s+/g, '');
  if (digits.length === 18) {
    return `${digits.slice(0, 8)} ${digits.slice(8, 14)} ${digits.slice(14, 15)} ${digits.slice(15, 18)}`;
  }
  return rawNip;
}

export function formatIndonesianDate(dateInput?: string | Date): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export const SuratView: React.FC<SuratViewProps> = ({
  students,
  currentUser,
  waliKelasList = [],
  jurusanList = INITIAL_JURUSAN_LIST
}) => {
  const [jenisSurat, setJenisSurat] = useState<JenisSurat>('pindah');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(() => {
    // Default to the first student if available, so user immediately sees preview
    return students.length > 0 ? students[0] : null;
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Common Form Fields
  const todayISO = new Date().toISOString().split('T')[0];
  const [tanggalSurat, setTanggalSurat] = useState<string>(todayISO);
  const [nomorSuratPindah, setNomorSuratPindah] = useState('421.5/ 1572-UPT.SMKN 1/PLP');
  const [nomorSuratKet, setNomorSuratKet] = useState('421.5/1618-UPT SMKN.1/PLP');
  
  // Data Penandatangan (Kepala Sekolah)
  const [namaKepsek, setNamaKepsek] = useState('Ridwan, ST.,M.Si');
  const [pangkatKepsek, setPangkatKepsek] = useState('Pembina Tk.I, IV/b');
  const [nipKepsek, setNipKepsek] = useState('197003032007011032');
  const [jabatanKepsek, setJabatanKepsek] = useState('Kepala Sekolah');
  const [unitKerjaKepsek, setUnitKerjaKepsek] = useState('SMK Negeri 1 Palopo');
  const [showSignatureStamp, setShowSignatureStamp] = useState(true);

  // Field Spesifik Surat Pindah
  const [sekolahTujuan, setSekolahTujuan] = useState('SMA NEGERI 4 PALOPO');
  const [diterimaDiSekolah, setDiterimaDiSekolah] = useState('16 Juli 2025');
  const [berasalDariSekolah, setBerasalDariSekolah] = useState('SMK Negeri 1 Palopo');
  const [sekarangKelas, setSekarangKelas] = useState('');
  const [customAlamat, setCustomAlamat] = useState('');
  const [pekerjaanOrtu, setPekerjaanOrtu] = useState('-');

  // Field Spesifik Surat Ket Siswa (Sesuai Format Resmi)
  const [tahunPelajaran, setTahunPelajaran] = useState('2026/2027');
  const [nisSiswa, setNisSiswa] = useState('2025076');
  const [kelasJurusanKet, setKelasJurusanKet] = useState('XI / Akuntansi');
  const [keperluanSurat, setKeperluanSurat] = useState('Pengurusan Beasiswa PIP');

  // Preview Zoom state
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const matchedJurusan = useMemo(() => {
    if (!selectedStudent?.kelas) return null;
    return getJurusanByKelas(selectedStudent.kelas, jurusanList);
  }, [selectedStudent, jurusanList]);

  // Effect when selected student changes: sync student specific fields
  React.useEffect(() => {
    if (selectedStudent) {
      setCustomAlamat(selectedStudent.alamat || 'Jl. KHM. Kasim No. 10 Palopo');
      
      // Kelas: extract grade level if possible, e.g. "XI RPL 1" -> "XI" or full class
      const k = selectedStudent.kelas || '';
      const matchRoman = k.match(/^(XII|XI|X)\b/i);
      setSekarangKelas(matchRoman ? matchRoman[1].toUpperCase() : (k || 'X'));

      // Tanggal Diterima
      if (selectedStudent.tanggalMasuk) {
        setDiterimaDiSekolah(formatIndonesianDate(selectedStudent.tanggalMasuk));
      } else {
        setDiterimaDiSekolah('16 Juli 2025');
      }

      // Pekerjaan Ortu
      const kerja = selectedStudent.pekerjaanAyah || selectedStudent.pekerjaanIbu || selectedStudent.kerja_ayah || selectedStudent.kerja_ibu || '-';
      setPekerjaanOrtu(kerja);

      // NIS & Kelas / Jurusan untuk Surat Keterangan
      setNisSiswa(selectedStudent.nipd || selectedStudent.nis || '2025041');
      const roman = matchRoman ? matchRoman[1].toUpperCase() : (k.split(' ')[0] || 'XI');
      const jurusanName = (matchedJurusan as any)?.nama || matchedJurusan?.konsentrasiKeahlian || (k.includes(' ') ? k.split(' ').slice(1).join(' ') : 'Akuntansi');
      setKelasJurusanKet(`${roman} / ${jurusanName}`);
    }
  }, [selectedStudent, matchedJurusan]);

  // Filtered students for search suggestions
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return students
      .filter((s) => {
        const nameMatch = (s.nama || '').toLowerCase().includes(q);
        const nisnMatch = (s.nisn || '').includes(q);
        const nipdMatch = (s.nipd || '').includes(q);
        const kelasMatch = (s.kelas || '').toLowerCase().includes(q);
        return nameMatch || nisnMatch || nipdMatch || kelasMatch;
      })
      .slice(0, 10);
  }, [searchQuery, students]);

  // Format student details
  const studentNama = (selectedStudent?.nama || 'NAMA SISWA').toUpperCase();
  const studentTTL = useMemo(() => {
    if (!selectedStudent) return 'Palopo, 3 September 2010';
    const tempat = selectedStudent.tempatLahir || 'Palopo';
    const tgl = formatIndonesianDate(selectedStudent.tanggalLahir) || '3 September 2010';
    return `${tempat}, ${tgl}`;
  }, [selectedStudent]);

  const studentJK = useMemo(() => {
    if (!selectedStudent) return 'Laki-laki';
    const raw = String(selectedStudent.jk || '').toUpperCase();
    return raw.startsWith('P') || raw.startsWith('W') ? 'Perempuan' : 'Laki-laki';
  }, [selectedStudent]);

  const studentAgama = selectedStudent?.agama || 'Islam';
  const studentNISN = selectedStudent?.nisn || '0103197235';
  const studentNIPD = selectedStudent?.nipd || '-';
  const studentAyah = selectedStudent?.ayah || selectedStudent?.nama_ayah || 'Aspar';
  const studentIbu = selectedStudent?.ibu || selectedStudent?.nama_ibu || 'Andi Asmah';

  const programKeahlian = matchedJurusan?.programKeahlian || 'Teknik Komputer dan Informatika';
  const konsentrasiKeahlian = matchedJurusan?.konsentrasiKeahlian || selectedStudent?.kelas || '-';

  // Handle Select Student
  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  // PRINT VIA BROWSER
  const handlePrint = () => {
    window.print();
  };

  // DOWNLOAD PDF VIA JSPDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 20;

    // 1. Kop Surat
    try {
      doc.addImage(LOGO_BASE64, 'PNG', marginX, 10, 22, 22);
    } catch (err) {
      console.warn('Gagal memuat logo di PDF:', err);
    }

    if (jenisSurat === 'ket-siswa') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('PEMERINTAH PROVINSI SULAWESI SELATAN', pageWidth / 2, 14, { align: 'center' });
      doc.text('DINAS PENDIDIKAN', pageWidth / 2, 19, { align: 'center' });
      doc.setFontSize(12.5);
      doc.text('UPT-SMK NEG. 1 PALOPO', pageWidth / 2, 24.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.text('Jln.K.H.M. Kasim No.10 Telp.(0471) 3200930, Kelurahan Pattene, Kota Palopo', pageWidth / 2, 29, { align: 'center' });
      doc.text('Website : http://smknegeri1palopo.sch.id Email : info@smknegeri1palopo.sch.id', pageWidth / 2, 32.5, { align: 'center' });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('PEMERINTAH PROVINSI SULAWESI SELATAN', pageWidth / 2, 14, { align: 'center' });
      doc.text('DINAS PENDIDIKAN', pageWidth / 2, 19, { align: 'center' });
      doc.setFontSize(12);
      doc.text('SEKOLAH MENENGAH KEJURUAN NEGERI 1 PALOPO', pageWidth / 2, 24.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Jl. KHM. Kasim NO. 10 Kota Palopo Sulawesi Selatan', pageWidth / 2, 29, { align: 'center' });
      doc.text('Website : http://www.smkn1-palopo.sch.id E.mail: info@smknegeri1palopo.sch.id', pageWidth / 2, 32.5, { align: 'center' });
    }

    // Double Separator Line
    doc.setLineWidth(0.65);
    doc.line(marginX, 35, pageWidth - marginX, 35);
    doc.setLineWidth(0.2);
    doc.line(marginX, 35.8, pageWidth - marginX, 35.8);

    if (jenisSurat === 'pindah') {
      // SURAT KETERANGAN PINDAH
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      const titleY = 43;
      doc.text('SURAT KETERANGAN PINDAH', pageWidth / 2, titleY, { align: 'center' });
      // Title Underline
      const titleWidth = doc.getTextWidth('SURAT KETERANGAN PINDAH');
      doc.setLineWidth(0.3);
      doc.line((pageWidth - titleWidth) / 2, titleY + 0.8, (pageWidth + titleWidth) / 2, titleY + 0.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Nomor : ${nomorSuratPindah}`, pageWidth / 2, titleY + 5.5, { align: 'center' });

      // Opening text
      let currY = 56;
      doc.text('Kepala SMK Negeri 1 Palopo dengan ini menerangkan bahwa :', marginX, currY);

      // List of 12 items
      currY += 6;
      const numX = marginX + 3;
      const labelX = marginX + 8;
      const colonX = marginX + 56;
      const valueX = marginX + 59;
      const lineH = 5.2;

      const items = [
        { no: '1.', label: 'Nama', value: studentNama, isBold: true },
        { no: '2.', label: 'Tempat / Tgl Lahir', value: studentTTL },
        { no: '3.', label: 'Jenis Kelamin', value: studentJK },
        { no: '4.', label: 'Agama', value: studentAgama },
        { no: '5.', label: 'Alamat', value: customAlamat, multiline: true },
        { no: '6.', label: 'Berasal dari sekolah', value: berasalDariSekolah },
        { no: '7.', label: 'Diterima di SMKN 1 Palopo', value: diterimaDiSekolah },
        { no: '8.', label: 'NISN', value: studentNISN },
        { no: '9.', label: 'Sekarang duduk dikelas', value: sekarangKelas || selectedStudent?.kelas || 'XI' },
        { 
          no: '10.', 
          label: 'Nama Orang Tua', 
          value: '', 
          isParent: true,
          ayah: studentAyah,
          ibu: studentIbu
        },
        { no: '11.', label: 'Pekerjaan', value: pekerjaanOrtu || '-' },
        { no: '12.', label: 'Alamat', value: customAlamat, multiline: true }
      ];

      items.forEach((item) => {
        doc.setFont('helvetica', 'normal');
        doc.text(item.no, numX, currY);
        doc.text(item.label, labelX, currY);
        doc.text(':', colonX, currY);

        if (item.isParent) {
          currY += lineH;
          doc.text('Ayah', labelX + 6, currY);
          doc.text(':', colonX, currY);
          doc.text(item.ayah || '-', valueX, currY);

          currY += lineH;
          doc.text('Ibu', labelX + 6, currY);
          doc.text(':', colonX, currY);
          doc.text(item.ibu || '-', valueX, currY);
        } else if (item.multiline) {
          const splitText = doc.splitTextToSize(item.value || '-', pageWidth - valueX - marginX);
          doc.text(splitText, valueX, currY);
          if (splitText.length > 1) {
            currY += (splitText.length - 1) * 4.2;
          }
        } else {
          if (item.isBold) doc.setFont('helvetica', 'bold');
          doc.text(item.value || '-', valueX, currY);
          if (item.isBold) doc.setFont('helvetica', 'normal');
        }
        currY += lineH;
      });

      // Transfer statement paragraph
      currY += 2;
      const transferText = `Atas permintaan orang tua / wali, anak tersebut diatas pindah dari UPT SMK Negeri 1 Palopo ke ${sekolahTujuan.toUpperCase()}.`;
      const splitTransfer = doc.splitTextToSize(transferText, pageWidth - (marginX * 2));
      doc.text(splitTransfer, marginX, currY);
      currY += splitTransfer.length * 4.5 + 3;

      // Warning text in italic
      doc.setFont('helvetica', 'italic');
      const warningText = 'Dengan dikeluarkannya surat keterangan ini, siswa tersebut diatas tidak diperkenankan masuk kembali. Dengan mempergunakan surat pindah tersebut.';
      const splitWarning = doc.splitTextToSize(warningText, pageWidth - (marginX * 2) - 8);
      doc.text(splitWarning, marginX + 6, currY);
      currY += splitWarning.length * 4.5 + 4;

      // Closing text
      doc.setFont('helvetica', 'normal');
      const closingText = 'Demikian Surat Keterangan ini kami berikan kepada yang bersangkutan untuk dipergunakan seperlunya.';
      const splitClosing = doc.splitTextToSize(closingText, pageWidth - (marginX * 2));
      doc.text(splitClosing, marginX, currY);
      currY += splitClosing.length * 4.5 + 5;

      // TTD Section (Right aligned)
      const ttdX = pageWidth - marginX - 65;
      const tglStr = `Palopo, ${formatIndonesianDate(tanggalSurat)}`;
      doc.text(tglStr, ttdX, currY);
      currY += 5;
      doc.text(jabatanKepsek + ',', ttdX, currY);

      // Signature spacing / Stamp
      currY += 22;
      doc.setFont('helvetica', 'bold');
      doc.text(namaKepsek, ttdX, currY);
      const nameWidth = doc.getTextWidth(namaKepsek);
      doc.line(ttdX, currY + 0.6, ttdX + nameWidth, currY + 0.6);

      currY += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.text(`Pangkat : ${pangkatKepsek}`, ttdX, currY);
      currY += 4.5;
      doc.text(`NIP: ${nipKepsek}`, ttdX, currY);

      doc.save(`Surat_Keterangan_Pindah_${studentNama.replace(/\s+/g, '_')}_${studentNISN}.pdf`);
    } else {
      // SURAT KETERANGAN SISWA (SESUAI DOKUMEN RESMI)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      const titleY = 44;
      doc.text('SURAT KETERANGAN', pageWidth / 2, titleY, { align: 'center' });
      const titleWidth = doc.getTextWidth('SURAT KETERANGAN');
      doc.setLineWidth(0.35);
      doc.line((pageWidth - titleWidth) / 2, titleY + 0.8, (pageWidth + titleWidth) / 2, titleY + 0.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Nomor : ${nomorSuratKet}`, pageWidth / 2, titleY + 5.5, { align: 'center' });

      let currY = 58;
      doc.text('Yang bertanda tangan di bawah ini :', marginX, currY);

      // Bagian Pejabat Penerang
      currY += 7;
      const labelX = marginX + 8;
      const colonX = marginX + 46;
      const valueX = marginX + 49;
      const lineH = 5.6;

      const kepsekItems = [
        { label: 'Nama', value: namaKepsek },
        { label: 'Pangkat / Gol.', value: pangkatKepsek },
        { label: 'NIP', value: nipKepsek },
        { label: 'Jabatan', value: jabatanKepsek },
        { label: 'Unit Kerja', value: unitKerjaKepsek }
      ];

      kepsekItems.forEach((item) => {
        doc.text(item.label, labelX, currY);
        doc.text(':', colonX, currY);
        doc.text(item.value, valueX, currY);
        currY += lineH;
      });

      // Menerangkan bahwa :
      currY += 2;
      doc.text('Menerangkan bahwa :', marginX, currY);

      // Bagian Siswa
      currY += 7;
      const siswaItems = [
        { label: 'Nama', value: studentNama, isBold: true },
        { label: 'NIS/NISN', value: `${nisSiswa}/ ${studentNISN}`, isBold: false },
        { label: 'Kelas', value: kelasJurusanKet, isBold: false }
      ];

      siswaItems.forEach((item) => {
        doc.text(item.label, labelX, currY);
        doc.text(':', colonX, currY);
        if (item.isBold) doc.setFont('helvetica', 'bold');
        doc.text(item.value, valueX, currY);
        if (item.isBold) doc.setFont('helvetica', 'normal');
        currY += lineH;
      });

      // Kalimat Pernyataan
      currY += 5;
      let pernyataan = `Benar adalah siswa pada SMK Negeri 1 Palopo Tahun Pelajaran ${tahunPelajaran}.`;
      if (keperluanSurat && keperluanSurat.trim()) {
        pernyataan += ` Surat Keterangan ini dibuat untuk keperluan ${keperluanSurat.trim()}.`;
      }
      const splitPernyataan = doc.splitTextToSize(pernyataan, pageWidth - 2 * marginX);
      doc.text(splitPernyataan, marginX, currY);
      currY += splitPernyataan.length * 5.2;

      const penutup = 'Demikian Surat Keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.';
      doc.text(penutup, marginX, currY);

      // TTD Section (Kanan Bawah)
      currY += 16;
      const ttdX = pageWidth - marginX - 68;
      const tglStr = `Palopo, ${formatIndonesianDate(tanggalSurat)}`;
      doc.text(tglStr, ttdX, currY);
      currY += 5.5;
      doc.text(jabatanKepsek + ',', ttdX, currY);

      currY += 24;
      doc.setFont('helvetica', 'bold');
      doc.text(namaKepsek, ttdX, currY);
      const nameWidth = doc.getTextWidth(namaKepsek);
      doc.setLineWidth(0.3);
      doc.line(ttdX, currY + 0.6, ttdX + nameWidth, currY + 0.6);

      currY += 4.8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Pangkat : ${pangkatKepsek.split(',')[0].trim()}`, ttdX, currY);
      currY += 4.8;
      doc.text(`NIP. ${formatNIP(nipKepsek)}`, ttdX, currY);

      doc.save(`Surat_Keterangan_${studentNama.replace(/\s+/g, '_')}_${studentNISN}.pdf`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #surat-print-container, #surat-print-container * {
            visibility: visible;
          }
          #surat-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Banner & Tab Navigation */}
      <div className="no-print bg-white rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Layanan Surat Peserta Didik
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Cetak & download Surat Keterangan Pindah dan Surat Keterangan Siswa resmi (PDF & Siap Cetak)
              </p>
            </div>
          </div>

          {/* Action Tabs: Surat Pindah vs Surat Ket Siswa */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setJenisSurat('pindah')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                jenisSurat === 'pindah'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🚚</span>
              <span>Surat Pindah</span>
            </button>
            <button
              type="button"
              onClick={() => setJenisSurat('ket-siswa')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                jenisSurat === 'ket-siswa'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🎓</span>
              <span>Surat Ket Siswa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Controls & Right A4 Live Sheet Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Controls & Input Form (5 cols on lg) */}
        <div className="no-print lg:col-span-5 space-y-4">
          {/* 1. Quick Student Search & Selected Banner */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-600" />
                Cari & Pilih Siswa
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {students.length} Siswa Terdaftar
              </span>
            </div>

            {/* Search Input with Instant Dropdown */}
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="Ketik Nama Siswa atau NISN..."
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {isSearchOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                  {searchResults.map((s) => (
                    <button
                      key={s.id || s.nisn}
                      type="button"
                      onClick={() => handleSelectStudent(s)}
                      className="w-full px-4 py-2.5 text-left hover:bg-indigo-50/70 transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 group-hover:text-indigo-700 truncate">
                          {s.nama}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                          <span>NISN: {s.nisn || '-'}</span>
                          <span>•</span>
                          <span>Kelas: {s.kelas || '-'}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-800 shrink-0">
                        {s.jk === 'P' ? 'Perempuan' : 'Laki-laki'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Student Card */}
            {selectedStudent ? (
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                    Siswa Terpilih
                  </span>
                  <span className="text-xs font-bold text-indigo-900 font-mono">
                    {selectedStudent.nisn || '-'}
                  </span>
                </div>
                <div>
                  <div className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                    {selectedStudent.nama}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>Kelas: <b>{selectedStudent.kelas || '-'}</b></span>
                    <span>•</span>
                    <span>TTL: {studentTTL}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center font-medium">
                Pilih atau cari salah satu siswa untuk mengisi format surat otomatis.
              </div>
            )}
          </div>

          {/* 2. Form Input Spesifik Surat */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              Parameter & Isian Surat {jenisSurat === 'pindah' ? 'Pindah' : 'Keterangan'}
            </div>

            <div className="space-y-3 text-xs">
              {/* Nomor Surat */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nomor Surat:
                </label>
                <input
                  type="text"
                  value={jenisSurat === 'pindah' ? nomorSuratPindah : nomorSuratKet}
                  onChange={(e) => {
                    if (jenisSurat === 'pindah') setNomorSuratPindah(e.target.value);
                    else setNomorSuratKet(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-xs font-semibold"
                />
              </div>

              {/* Tanggal Surat */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tanggal Surat:
                </label>
                <input
                  type="date"
                  value={tanggalSurat}
                  onChange={(e) => setTanggalSurat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-medium"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Teks formal: <b>Palopo, {formatIndonesianDate(tanggalSurat)}</b>
                </span>
              </div>

              {/* SURAT PINDAH SPECIFIC: Sekolah Yang Dituju */}
              {jenisSurat === 'pindah' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Sekolah yang Dituju (Pindah Ke):
                    </label>
                    <input
                      type="text"
                      value={sekolahTujuan}
                      onChange={(e) => setSekolahTujuan(e.target.value)}
                      placeholder="Contoh: SMA NEGERI 4 PALOPO"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 uppercase"
                    />
                    {/* Quick Suggestions Chips */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['SMA NEGERI 4 PALOPO', 'SMAN 1 PALOPO', 'SMAN 2 PALOPO', 'SMKN 2 PALOPO', 'SMA COKROAMINOTO'].map((sch) => (
                        <button
                          key={sch}
                          type="button"
                          onClick={() => setSekolahTujuan(sch)}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-800 transition-colors"
                        >
                          {sch}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Sekarang Duduk Dikelas:
                      </label>
                      <input
                        type="text"
                        value={sekarangKelas}
                        onChange={(e) => setSekarangKelas(e.target.value)}
                        placeholder="Contoh: XI"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Diterima di SMKN 1:
                      </label>
                      <input
                        type="text"
                        value={diterimaDiSekolah}
                        onChange={(e) => setDiterimaDiSekolah(e.target.value)}
                        placeholder="Contoh: 16 Juli 2025"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* SURAT KET SISWA SPECIFIC: NIS, Kelas, Tahun Pelajaran */}
              {jenisSurat === 'ket-siswa' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        NIS Siswa:
                      </label>
                      <input
                        type="text"
                        value={nisSiswa}
                        onChange={(e) => setNisSiswa(e.target.value)}
                        placeholder="Contoh: 2025076"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        NISN Siswa:
                      </label>
                      <input
                        type="text"
                        disabled
                        value={studentNISN}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono text-xs font-semibold text-slate-600 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kelas & Konsentrasi Keahlian:
                    </label>
                    <input
                      type="text"
                      value={kelasJurusanKet}
                      onChange={(e) => setKelasJurusanKet(e.target.value)}
                      placeholder="Contoh: XI / Akuntansi"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tahun Pelajaran:
                    </label>
                    <input
                      type="text"
                      value={tahunPelajaran}
                      onChange={(e) => setTahunPelajaran(e.target.value)}
                      placeholder="Contoh: 2026/2027"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Keperluan Surat (Opsional):
                    </label>
                    <input
                      type="text"
                      value={keperluanSurat}
                      onChange={(e) => setKeperluanSurat(e.target.value)}
                      placeholder="Contoh: Pengurusan Beasiswa PIP / Persyaratan Bank"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                    />
                  </div>
                </>
              )}

              {/* Data Alamat & Pekerjaan Ortu (Hanya untuk Surat Pindah) */}
              {jenisSurat === 'pindah' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Alamat Lengkap Siswa / Orang Tua:
                    </label>
                    <textarea
                      rows={2}
                      value={customAlamat}
                      onChange={(e) => setCustomAlamat(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Pekerjaan Orang Tua:
                    </label>
                    <input
                      type="text"
                      value={pekerjaanOrtu}
                      onChange={(e) => setPekerjaanOrtu(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3. Penandatangan (Kepala Sekolah) & Digital Stamp */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-3 text-xs">
            <div className="font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Penandatangan (Kepala Sekolah)</span>
              <span className="text-[10px] text-slate-400 font-normal">Sesuai Dokumen Resmi</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-600 mb-0.5">Nama Lengkap & Gelar:</label>
                <input
                  type="text"
                  value={namaKepsek}
                  onChange={(e) => setNamaKepsek(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Pangkat / Golongan:</label>
                <input
                  type="text"
                  value={pangkatKepsek}
                  onChange={(e) => setPangkatKepsek(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">NIP:</label>
                <input
                  type="text"
                  value={nipKepsek}
                  onChange={(e) => setNipKepsek(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Jabatan:</label>
                <input
                  type="text"
                  value={jabatanKepsek}
                  onChange={(e) => setJabatanKepsek(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Unit Kerja:</label>
                <input
                  type="text"
                  value={unitKerjaKepsek}
                  onChange={(e) => setUnitKerjaKepsek(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 pt-2 border-t border-slate-100 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSignatureStamp}
                onChange={(e) => setShowSignatureStamp(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-700 text-xs font-semibold">
                Sertakan Cap Stempel Resmi & Tanda Tangan Digital
              </span>
            </label>
          </div>

          {/* Action Buttons: Cetak & Download PDF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handlePrint}
              className="py-3 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              title="Cetak Surat Langsung"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak (Print)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
              title="Download Dokumen PDF Siap Cetak"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Sheet Preview (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Zoom & View Controls Bar */}
          <div className="no-print w-full flex flex-wrap items-center justify-between gap-2 pb-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-slate-700">Pratinjau Kertas A4 (Live Preview)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.max(70, prev - 10))}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100 font-bold"
                  title="Zoom Out"
                >
                  -
                </button>
                <span className="text-xs font-mono font-bold w-12 text-center text-slate-700">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.min(130, prev + 10))}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100 font-bold"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold ml-1"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Scalable Container for A4 Sheet */}
          <div 
            className="w-full flex justify-center overflow-x-auto p-1 sm:p-2"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            {/* Real Official A4 Sheet */}
            <div 
              id="surat-print-container"
              className="bg-white text-black shadow-2xl rounded-sm w-[210mm] min-h-[297mm] p-[18mm] sm:p-[20mm] font-['Calibri',sans-serif] text-[12pt] leading-[1.5] select-text relative border border-slate-200"
              style={{ boxSizing: 'border-box' }}
            >
              {/* 1. KOP SURAT (TETAP TEPAT DI TENGAH KERTAS WALAU ADA LOGO DI KIRI) */}
              <div className="relative pb-3 min-h-[90px] flex items-center justify-center">
                {/* Logo SMKN 1 Palopo di samping kiri secara absolut */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[76px] h-[76px] flex items-center justify-center select-none pointer-events-none">
                  <img 
                    src={LOGO_BASE64} 
                    alt="Logo SMKN 1 Palopo" 
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Header Text - Benar-benar di tengah kertas (Full Width text-center) */}
                {jenisSurat === 'ket-siswa' ? (
                  <div className="w-full text-center font-sans text-slate-950 px-20">
                    <h3 className="text-[13pt] font-bold tracking-tight uppercase leading-tight font-sans">
                      PEMERINTAH PROVINSI SULAWESI SELATAN
                    </h3>
                    <h2 className="text-[13pt] font-bold tracking-tight uppercase leading-tight font-sans">
                      DINAS PENDIDIKAN
                    </h2>
                    <h1 className="text-[14.5pt] font-black tracking-tight uppercase leading-tight font-sans mt-0.5">
                      UPT-SMK NEG. 1 PALOPO
                    </h1>
                    <p className="text-[8.5pt] font-normal font-sans leading-tight mt-1 text-slate-900">
                      Jln.K.H.M. Kasim No.10 Telp.(0471) 3200930, Kelurahan Pattene, Kota Palopo
                    </p>
                    <p className="text-[8pt] font-normal font-sans leading-tight text-slate-800">
                      Website : <span className="underline text-blue-700">http://smknegeri1palopo.sch.id</span> Email : <span className="underline text-blue-700">info@smknegeri1palopo.sch.id</span>
                    </p>
                  </div>
                ) : (
                  <div className="w-full text-center font-sans text-slate-950 px-20">
                    <h3 className="text-[13pt] font-bold tracking-tight uppercase leading-tight font-sans">
                      PEMERINTAH PROVINSI SULAWESI SELATAN
                    </h3>
                    <h2 className="text-[13pt] font-bold tracking-tight uppercase leading-tight font-sans">
                      DINAS PENDIDIKAN
                    </h2>
                    <h1 className="text-[14pt] font-black tracking-tight uppercase leading-tight font-sans mt-0.5">
                      SEKOLAH MENENGAH KEJURUAN NEGERI 1 PALOPO
                    </h1>
                    <p className="text-[8.5pt] font-normal font-sans leading-tight mt-1 text-slate-900">
                      Jl. KHM. Kasim NO. 10 Kota Palopo Sulawesi Selatan
                    </p>
                    <p className="text-[8pt] font-normal font-sans leading-tight text-slate-800">
                      Website : http://www.smkn1-palopo.sch.id E.mail: info@smknegeri1palopo.sch.id
                    </p>
                  </div>
                )}
              </div>

              {/* Double Separator Line */}
              <div className="border-b-[2.5px] border-black mt-2"></div>
              <div className="border-b-[0.8px] border-black mt-[1.5px]"></div>

              {/* 2. DOKUMEN ISI */}
              {jenisSurat === 'pindah' ? (
                /* ================= SURAT KETERANGAN PINDAH ================= */
                <div className="text-[12pt] text-black leading-[1.5] space-y-4 pt-2 font-['Calibri',sans-serif]">
                  {/* Judul & Nomor */}
                  <div className="text-center space-y-1">
                    <h2 className="text-[14pt] font-bold uppercase underline tracking-wider font-['Calibri',sans-serif]">
                      SURAT KETERANGAN PINDAH
                    </h2>
                    <p className="text-[12pt] font-['Calibri',sans-serif]">
                      Nomor : {nomorSuratPindah}
                    </p>
                  </div>

                  {/* Paragraf Pembuka */}
                  <p className="pt-2 text-justify leading-[1.5]">
                    Kepala SMK Negeri 1 Palopo dengan ini menerangkan bahwa :
                  </p>

                  {/* 12 Poin Siswa Sesuai Foto */}
                  <div className="space-y-1 pl-2 text-[12pt] font-['Calibri',sans-serif] leading-[1.5]">
                    {/* 1. Nama */}
                    <div className="flex">
                      <span className="w-6 shrink-0">1.</span>
                      <span className="w-48 shrink-0">Nama</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="font-bold flex-1 uppercase">{studentNama}</span>
                    </div>

                    {/* 2. TTL */}
                    <div className="flex">
                      <span className="w-6 shrink-0">2.</span>
                      <span className="w-48 shrink-0">Tempat / Tgl Lahir</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1">{studentTTL}</span>
                    </div>

                    {/* 3. JK */}
                    <div className="flex">
                      <span className="w-6 shrink-0">3.</span>
                      <span className="w-48 shrink-0">Jenis Kelamin</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1">{studentJK}</span>
                    </div>

                    {/* 4. Agama */}
                    <div className="flex">
                      <span className="w-6 shrink-0">4.</span>
                      <span className="w-48 shrink-0">Agama</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1">{studentAgama}</span>
                    </div>

                    {/* 5. Alamat */}
                    <div className="flex items-start">
                      <span className="w-6 shrink-0">5.</span>
                      <span className="w-48 shrink-0">Alamat</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1 leading-snug">{customAlamat}</span>
                    </div>

                    {/* 6. Berasal dari sekolah */}
                    <div className="flex">
                      <span className="w-6 shrink-0">6.</span>
                      <span className="w-48 shrink-0">Berasal dari sekolah</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1">{berasalDariSekolah}</span>
                    </div>

                    {/* 7. Diterima di SMKN 1 Palopo */}
                    <div className="flex">
                      <span className="w-6 shrink-0">7.</span>
                      <span className="w-48 shrink-0">Diterima di SMKN 1 Palopo</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1">{diterimaDiSekolah}</span>
                    </div>

                    {/* 8. NISN */}
                    <div className="flex">
                      <span className="w-6 shrink-0">8.</span>
                      <span className="w-48 shrink-0">NISN</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1 font-mono">{studentNISN}</span>
                    </div>

                    {/* 9. Sekarang duduk dikelas */}
                    <div className="flex">
                      <span className="w-6 shrink-0">9.</span>
                      <span className="w-48 shrink-0">Sekarang duduk dikelas</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1">{sekarangKelas || selectedStudent?.kelas || 'XI'}</span>
                    </div>

                    {/* 10. Nama Orang Tua */}
                    <div className="flex">
                      <span className="w-6 shrink-0">10.</span>
                      <span className="w-48 shrink-0">Nama Orang Tua</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1"></span>
                    </div>
                    <div className="flex pl-6">
                      <span className="w-42 shrink-0 pl-2">Ayah</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1">{studentAyah || '-'}</span>
                    </div>
                    <div className="flex pl-6">
                      <span className="w-42 shrink-0 pl-2">Ibu</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1">{studentIbu || '-'}</span>
                    </div>

                    {/* 11. Pekerjaan */}
                    <div className="flex">
                      <span className="w-6 shrink-0">11.</span>
                      <span className="w-48 shrink-0">Pekerjaan</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1">{pekerjaanOrtu || '-'}</span>
                    </div>

                    {/* 12. Alamat */}
                    <div className="flex items-start">
                      <span className="w-6 shrink-0">12.</span>
                      <span className="w-48 shrink-0">Alamat</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1 leading-snug">{customAlamat}</span>
                    </div>
                  </div>

                  {/* Paragraf Keterangan Pindah Ke */}
                  <p className="text-justify pt-1 leading-[1.5]">
                    Atas permintaan orang tua / wali, anak tersebut diatas pindah dari UPT SMK Negeri 1 Palopo ke{' '}
                    <strong className="font-bold uppercase">{sekolahTujuan}</strong>.
                  </p>

                  {/* Paragraf Peringatan / Italic Sesuai Foto */}
                  <p className="text-justify italic pl-8 pr-4 font-['Calibri',sans-serif] text-[12pt] leading-[1.5]">
                    Dengan dikeluarkannya surat keterangan ini, siswa tersebut diatas tidak diperkenankan
                    masuk kembali. Dengan mempergunakan surat pindah tersebut.
                  </p>

                  {/* Paragraf Penutup */}
                  <p className="text-justify leading-[1.5]">
                    Demikian Surat Keterangan ini kami berikan kepada yang bersangkutan untuk dipergunakan seperlunya.
                  </p>

                  {/* Tanda Tangan & Cap Resmi */}
                  <div className="pt-4 flex justify-end">
                    <div className="w-64 text-left font-['Calibri',sans-serif] text-[12pt] leading-[1.5] relative">
                      <p>Palopo, {formatIndonesianDate(tanggalSurat)}</p>
                      <p className="font-medium">{jabatanKepsek},</p>

                      {/* Tanda Tangan & Stempel Resmi */}
                      <div className="h-20 my-1 relative flex items-center">
                        {showSignatureStamp && (
                          <div className="absolute -left-7 -top-2 flex items-center select-none pointer-events-none">
                            {/* Realistic Official Round Stamp SVG */}
                            <div className="w-24 h-24 text-indigo-800/85 rotate-[-12deg] shrink-0 opacity-90 drop-shadow-xs">
                              <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-current stroke-[2.2]">
                                <circle cx="50" cy="50" r="46" />
                                <circle cx="50" cy="50" r="41" strokeWidth="1.2" />
                                <circle cx="50" cy="50" r="28" strokeWidth="1.2" />
                                <path id="stamp-top-text" d="M 16,50 A 34,34 0 1,1 84,50" fill="none" stroke="none" />
                                <text className="text-[6.5px] font-black uppercase tracking-widest fill-current">
                                  <textPath href="#stamp-top-text" startOffset="50%" textAnchor="middle">
                                    PEMERINTAH PROVINSI
                                  </textPath>
                                </text>
                                <path id="stamp-bottom-text" d="M 84,50 A 34,34 0 0,1 16,50" fill="none" stroke="none" />
                                <text className="text-[6.2px] font-black uppercase tracking-wider fill-current">
                                  <textPath href="#stamp-bottom-text" startOffset="50%" textAnchor="middle">
                                    UPT SMKN 1 PALOPO
                                  </textPath>
                                </text>
                                <polygon points="50,39 53,47 61,47 55,52 57,60 50,55 43,60 45,52 39,47 47,47" fill="currentColor" stroke="none" opacity="0.8" />
                              </svg>
                            </div>

                            {/* Realistic Stylized Signature SVG */}
                            <div className="w-32 h-16 -ml-14 mt-3 text-slate-900 drop-shadow-xs">
                              <svg viewBox="0 0 140 70" className="w-full h-full stroke-current fill-none stroke-[2.4] stroke-linecap-round stroke-linejoin-round">
                                <path d="M 15 48 C 22 25, 30 18, 38 42 C 45 60, 52 10, 58 35 C 64 48, 70 30, 80 40 L 95 38 C 110 36, 125 42, 135 45 M 28 42 L 85 43" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info Nama & NIP */}
                      <p className="font-bold underline text-[12pt]">{namaKepsek}</p>
                      <p className="text-[12pt] text-slate-800">Pangkat : {pangkatKepsek}</p>
                      <p className="text-[12pt] text-slate-800 font-mono">NIP: {nipKepsek}</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* ================= SURAT KETERANGAN SISWA (FORMAT RESMI) ================= */
                <div className="text-[12pt] text-black leading-[1.5] space-y-4 pt-2 font-['Calibri',sans-serif]">
                  {/* Judul & Nomor */}
                  <div className="text-center space-y-1">
                    <h2 className="text-[14pt] font-bold uppercase underline tracking-wider font-['Calibri',sans-serif]">
                      SURAT KETERANGAN
                    </h2>
                    <p className="text-[12pt] font-['Calibri',sans-serif] font-medium">
                      Nomor : {nomorSuratKet}
                    </p>
                  </div>

                  {/* Paragraf Pembuka */}
                  <p className="pt-3 text-justify font-['Calibri',sans-serif] leading-[1.5]">
                    Yang bertanda tangan di bawah ini :
                  </p>

                  {/* Identitas Pejabat */}
                  <div className="space-y-1.5 pl-6 text-[12pt] font-['Calibri',sans-serif] leading-[1.5]">
                    <div className="flex">
                      <span className="w-36 shrink-0">Nama</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1 font-semibold">{namaKepsek}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 shrink-0">Pangkat / Gol.</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1">{pangkatKepsek}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 shrink-0">NIP</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1 font-mono">{nipKepsek}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 shrink-0">Jabatan</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1">{jabatanKepsek}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 shrink-0">Unit Kerja</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1">{unitKerjaKepsek}</span>
                    </div>
                  </div>

                  {/* Menerangkan bahwa : */}
                  <p className="pt-2 text-justify font-sans">
                    Menerangkan bahwa :
                  </p>

                  {/* Identitas Siswa */}
                  <div className="space-y-1.5 pl-6 text-[12pt] font-['Calibri',sans-serif] leading-[1.5]">
                    <div className="flex">
                      <span className="w-36 shrink-0">Nama</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="font-bold flex-1 uppercase">{studentNama}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 shrink-0">NIS/NISN</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1">{nisSiswa}/ {studentNISN}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 shrink-0">Kelas</span>
                      <span className="w-4 shrink-0">:</span>
                      <span className="flex-1">{kelasJurusanKet}</span>
                    </div>
                  </div>

                  {/* Paragraf Pernyataan */}
                  <p className="pt-3 text-justify font-['Calibri',sans-serif] leading-[1.5]">
                    Benar adalah siswa pada SMK Negeri 1 Palopo Tahun Pelajaran {tahunPelajaran}.
                    {keperluanSurat && keperluanSurat.trim() ? ` Surat Keterangan ini dibuat untuk keperluan ${keperluanSurat.trim()}.` : ''}
                  </p>

                  {/* Paragraf Penutup */}
                  <p className="pt-1 text-justify font-['Calibri',sans-serif] leading-[1.5]">
                    Demikian Surat Keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.
                  </p>

                  {/* Tanda Tangan & Cap Resmi */}
                  <div className="pt-8 flex justify-end">
                    <div className="w-72 text-left font-['Calibri',sans-serif] text-[12pt] leading-[1.5] relative">
                      <p>Palopo, {formatIndonesianDate(tanggalSurat)}</p>
                      <p className="font-medium">{jabatanKepsek},</p>

                      {/* Tanda Tangan & Stempel Resmi */}
                      <div className="h-24 my-1 relative flex items-center">
                        {showSignatureStamp && (
                          <div className="absolute -left-8 -top-3 flex items-center select-none pointer-events-none">
                            {/* Stempel Ungu Bulat */}
                            <div className="w-28 h-28 text-indigo-900/85 rotate-[-8deg] shrink-0 opacity-90 drop-shadow-xs">
                              <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-current stroke-[2.2]">
                                <circle cx="50" cy="50" r="47" />
                                <circle cx="50" cy="50" r="42" strokeWidth="1.2" />
                                <circle cx="50" cy="50" r="28" strokeWidth="1.2" />
                                <path id="stamp-ket-top" d="M 14,50 A 36,36 0 1,1 86,50" fill="none" stroke="none" />
                                <text className="text-[6.2px] font-black uppercase tracking-widest fill-current">
                                  <textPath href="#stamp-ket-top" startOffset="50%" textAnchor="middle">
                                    PEMERINTAH PROVINSI SULAWESI SELATAN
                                  </textPath>
                                </text>
                                <path id="stamp-ket-mid" d="M 22,50 A 28,28 0 0,1 78,50" fill="none" stroke="none" />
                                <text className="text-[5.5px] font-bold uppercase tracking-wider fill-current">
                                  <textPath href="#stamp-ket-mid" startOffset="50%" textAnchor="middle">
                                    DINAS PENDIDIKAN
                                  </textPath>
                                </text>
                                <path id="stamp-ket-bottom" d="M 86,50 A 36,36 0 0,1 14,50" fill="none" stroke="none" />
                                <text className="text-[6.5px] font-black uppercase tracking-wider fill-current">
                                  <textPath href="#stamp-ket-bottom" startOffset="50%" textAnchor="middle">
                                    UPT SMK 1 PALOPO
                                  </textPath>
                                </text>
                                <polygon points="50,38 53,46 61,46 55,51 57,59 50,54 43,59 45,51 39,46 47,46" fill="currentColor" stroke="none" opacity="0.85" />
                              </svg>
                            </div>

                            {/* Coretan Tanda Tangan */}
                            <div className="w-36 h-20 -ml-16 mt-2 text-slate-900 drop-shadow-xs">
                              <svg viewBox="0 0 140 70" className="w-full h-full stroke-current fill-none stroke-[2.4] stroke-linecap-round stroke-linejoin-round">
                                <path d="M 12 45 C 18 22, 28 15, 36 38 C 42 55, 48 8, 56 32 C 62 45, 68 28, 76 38 L 92 36 C 108 34, 122 40, 134 44 M 26 40 L 82 41 M 80 34 L 88 18 L 105 12" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info Nama, Pangkat, NIP */}
                      <p className="font-bold underline text-[12pt] tracking-wide">{namaKepsek}</p>
                      <p className="text-[12pt] text-slate-900">Pangkat : {pangkatKepsek.split(',')[0].trim()}</p>
                      <p className="text-[12pt] text-slate-900">NIP. {formatNIP(nipKepsek)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
