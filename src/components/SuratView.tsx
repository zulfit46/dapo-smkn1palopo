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
  ChevronDown,
  Edit3,
  SlidersHorizontal,
  Type,
  RotateCcw,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Plus,
  Minus,
  Palette,
  Save,
  Space,
  Lock
} from 'lucide-react';
import jsPDF from 'jspdf';
import { isAdminRole, isUserRole } from '../utils/authUtils';

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
  // Hanya role Admin yang dapat mengakses pengaturan surat, spasi, dan format mandiri
  const isAdmin = Boolean(currentUser ? isAdminRole(currentUser) : true);

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

  // Tab Pengaturan Panel Kiri: 'data' (Data Surat) atau 'layout' (Spasi & Tipografi Mandiri)
  const [activeSettingsTab, setActiveSettingsTab] = useState<'data' | 'layout'>('data');

  // Key LocalStorage untuk Menyimpan Format & Spasi Mandiri
  const STORAGE_KEY = 'smkn1_surat_layout_settings_v3';

  const loadSavedLayout = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading saved layout:', e);
    }
    return null;
  };

  const initialLayout = useMemo(() => loadSavedLayout(), []);

  // 1. Pilihan Font Resmi (Diterapkan Seragam ke Seluruh Dokumen)
  type PilihanFont = 'Calibri' | 'Times New Roman' | 'Arial' | 'Bookman Old Style';
  const [selectedFont, setSelectedFont] = useState<PilihanFont>(initialLayout?.selectedFont || 'Calibri');

  // 2. Pengaturan Ukuran Font Bagian Tertentu (Section Font Sizes)
  const [titleFontSize, setTitleFontSize] = useState<number>(initialLayout?.titleFontSize ?? 14); // Judul Surat (pt)
  const [nomorFontSize, setNomorFontSize] = useState<number>(initialLayout?.nomorFontSize ?? 11); // Nomor Surat (pt)
  const [bodyFontSize, setBodyFontSize] = useState<number>(initialLayout?.bodyFontSize ?? 11.5); // Teks Isi & Paragraf (pt)
  const [itemFontSize, setItemFontSize] = useState<number>(initialLayout?.itemFontSize ?? 11.5); // Rincian Data Siswa (pt)
  const [peringatanFontSize, setPeringatanFontSize] = useState<number>(initialLayout?.peringatanFontSize ?? 11); // Peringatan Pindah (pt)
  const [ttdFontSize, setTtdFontSize] = useState<number>(initialLayout?.ttdFontSize ?? 11.5); // Tanda Tangan & Pejabat (pt)

  // 3. Pengaturan Spasi Per Bagian Mandiri (Section Spacings)
  const [lineSpacing, setLineSpacing] = useState<number>(initialLayout?.lineSpacing ?? 1.45); // Line-height
  const [spacingKopToTitle, setSpacingKopToTitle] = useState<number>(initialLayout?.spacingKopToTitle ?? 16); // Jarak Kop ke Judul (px)
  const [spacingTitleToBody, setSpacingTitleToBody] = useState<number>(initialLayout?.spacingTitleToBody ?? 10); // Jarak Judul ke Pembuka (px)
  const [spacingBodyToTable, setSpacingBodyToTable] = useState<number>(initialLayout?.spacingBodyToTable ?? 8); // Jarak Pembuka ke Rincian (px)
  const [itemSpacing, setItemSpacing] = useState<number>(initialLayout?.itemSpacing ?? 4); // Jarak Antar Poin Siswa (px)
  const [spacingTableToClosing, setSpacingTableToClosing] = useState<number>(initialLayout?.spacingTableToClosing ?? 10); // Jarak Rincian ke Keterangan / Penutup (px)
  const [spacingPeringatan, setSpacingPeringatan] = useState<number>(initialLayout?.spacingPeringatan ?? 8); // Jarak ke Paragraf Peringatan (px)
  const [ttdSpacingTop, setTtdSpacingTop] = useState<number>(initialLayout?.ttdSpacingTop ?? 22); // Jarak ke Blok Tanda Tangan (px)
  const [ttdHeight, setTtdHeight] = useState<number>(initialLayout?.ttdHeight ?? 70); // Tinggi Ruang Tanda Tangan (px)
  const [sheetPaddingMm, setSheetPaddingMm] = useState<number>(initialLayout?.sheetPaddingMm ?? 18); // Margin Tepi Kertas A4 (mm)

  // Mode Edit Bebas (Ketik Langsung di Lembar Surat)
  const [isLiveEditMode, setIsLiveEditMode] = useState<boolean>(false);
  const [resetKey, setResetKey] = useState<number>(0);
  const [isSavedToast, setIsSavedToast] = useState<boolean>(false);

  // Deteksi Seleksi Teks Mandiri di Kertas A4 (Hanya aktif untuk Admin)
  const [selectedWordText, setSelectedWordText] = useState<string>('');
  const [hasTextSelection, setHasTextSelection] = useState<boolean>(false);

  // Jika bukan Admin, pastikan tab setting mandiri & live edit otomatis dimatikan
  React.useEffect(() => {
    if (!isAdmin) {
      if (activeSettingsTab === 'layout') setActiveSettingsTab('data');
      if (isLiveEditMode) setIsLiveEditMode(false);
      setHasTextSelection(false);
      setSelectedWordText('');
    }
  }, [isAdmin, activeSettingsTab, isLiveEditMode]);

  React.useEffect(() => {
    const handleSelection = () => {
      // Pengaturan format teks kata mandiri hanya untuk Admin
      if (!isAdmin) {
        setSelectedWordText('');
        setHasTextSelection(false);
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelectedWordText('');
        setHasTextSelection(false);
        return;
      }
      const str = sel.toString().trim();
      const container = document.getElementById('surat-print-container');
      if (str && container && sel.anchorNode && container.contains(sel.anchorNode)) {
        setSelectedWordText(str.length > 25 ? str.slice(0, 25) + '…' : str);
        setHasTextSelection(true);
      } else {
        setSelectedWordText('');
        setHasTextSelection(false);
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => {
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, [isAdmin]);

  const getFontFamilyStyle = () => {
    if (selectedFont === 'Times New Roman') return "'Times New Roman', Times, serif";
    if (selectedFont === 'Arial') return "Arial, Helvetica, sans-serif";
    if (selectedFont === 'Bookman Old Style') return "'Bookman Old Style', Georgia, serif";
    return "'Calibri', 'Segoe UI', Arial, sans-serif";
  };

  // Simpan Konfigurasi Mandiri ke LocalStorage
  const saveLayoutToStorage = () => {
    try {
      const layoutData = {
        selectedFont,
        bodyFontSize,
        titleFontSize,
        nomorFontSize,
        itemFontSize,
        peringatanFontSize,
        ttdFontSize,
        lineSpacing,
        spacingKopToTitle,
        spacingTitleToBody,
        spacingBodyToTable,
        itemSpacing,
        spacingTableToClosing,
        spacingPeringatan,
        ttdSpacingTop,
        ttdHeight,
        sheetPaddingMm
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutData));
      setIsSavedToast(true);
      setTimeout(() => setIsSavedToast(false), 2500);
    } catch (e) {
      console.warn('Gagal menyimpan layout ke localStorage:', e);
    }
  };

  const handleResetToDefault = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
    setSelectedFont('Calibri');
    setBodyFontSize(11.5);
    setTitleFontSize(14);
    setNomorFontSize(11);
    setItemFontSize(11.5);
    setPeringatanFontSize(11);
    setTtdFontSize(11.5);
    setLineSpacing(1.45);
    setSpacingKopToTitle(16);
    setSpacingTitleToBody(10);
    setSpacingBodyToTable(8);
    setItemSpacing(4);
    setSpacingTableToClosing(10);
    setSpacingPeringatan(8);
    setTtdSpacingTop(22);
    setTtdHeight(70);
    setSheetPaddingMm(18);
    setResetKey(prev => prev + 1);
  };

  // Helper formatting seleksi teks saat Live Edit / Seleksi Kata aktif
  const applyFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
  };

  // Ubah ukuran font khusus pada kata/kalimat yang diseleksi (Ubah size font di kata tertentu)
  const applyFontSizeToSelection = (sizePt: number) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);

    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const el = node as HTMLElement | null;
    if (el && el.tagName === 'SPAN' && el.getAttribute('data-custom-word-style')) {
      el.style.fontSize = `${sizePt}pt`;
      return;
    }

    const span = document.createElement('span');
    span.setAttribute('data-custom-word-style', 'true');
    span.style.fontSize = `${sizePt}pt`;
    span.style.display = 'inline';

    try {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } catch (err) {
      console.warn('Gagal mengubah font size kata:', err);
    }
  };

  const stepFontSizeOnSelection = (increment: boolean) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);

    let currentPt = bodyFontSize;
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const el = node as HTMLElement | null;
    if (el && el.style && el.style.fontSize) {
      const parsed = parseFloat(el.style.fontSize);
      if (!isNaN(parsed)) currentPt = parsed;
    }

    const nextPt = increment 
      ? Math.min(32, +(currentPt + 1).toFixed(1)) 
      : Math.max(7, +(currentPt - 1).toFixed(1));

    applyFontSizeToSelection(nextPt);
  };

  // Ubah spasi huruf (kerning) kata tertentu
  const applyLetterSpacingToSelection = (spacingPx: number) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);

    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const el = node as HTMLElement | null;
    if (el && el.tagName === 'SPAN' && el.getAttribute('data-custom-word-style')) {
      el.style.letterSpacing = `${spacingPx}px`;
      return;
    }

    const span = document.createElement('span');
    span.setAttribute('data-custom-word-style', 'true');
    span.style.letterSpacing = `${spacingPx}px`;
    span.style.display = 'inline';

    try {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } catch (err) {
      console.warn('Gagal mengubah spasi huruf kata:', err);
    }
  };

  // Ubah warna kata tertentu
  const applyColorToSelection = (colorHex: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);

    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const el = node as HTMLElement | null;
    if (el && el.tagName === 'SPAN' && el.getAttribute('data-custom-word-style')) {
      el.style.color = colorHex;
      return;
    }

    const span = document.createElement('span');
    span.setAttribute('data-custom-word-style', 'true');
    span.style.color = colorHex;
    span.style.display = 'inline';

    try {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } catch (err) {
      console.warn('Gagal memberi warna kata:', err);
    }
  };

  // Sisipkan baris kosong (spasi enter tambahan) di kursor
  const insertBlankLine = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const br = document.createElement('br');
    range.insertNode(br);
    range.setStartAfter(br);
    range.setEndAfter(br);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  // Bersihkan format kustom pada kata yang diseleksi
  const clearFormattingOnSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    document.execCommand('removeFormat', false, undefined);
    const range = sel.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const el = node as HTMLElement | null;
    if (el && el.tagName === 'SPAN' && el.getAttribute('data-custom-word-style')) {
      const text = el.innerText || el.textContent || '';
      const textNode = document.createTextNode(text);
      el.parentNode?.replaceChild(textNode, el);
    }
  };

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
    const pdfFont = selectedFont === 'Times New Roman' ? 'times' : 'helvetica';

    // 1. Kop Surat
    try {
      doc.addImage(LOGO_BASE64, 'PNG', marginX, 10, 22, 22);
    } catch (err) {
      console.warn('Gagal memuat logo di PDF:', err);
    }

    if (jenisSurat === 'ket-siswa') {
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(11);
      doc.text('PEMERINTAH PROVINSI SULAWESI SELATAN', pageWidth / 2, 14, { align: 'center' });
      doc.text('DINAS PENDIDIKAN', pageWidth / 2, 19, { align: 'center' });
      doc.setFontSize(12.5);
      doc.text('UPT-SMK NEG. 1 PALOPO', pageWidth / 2, 24.5, { align: 'center' });

      doc.setFont(pdfFont, 'normal');
      doc.setFontSize(7.8);
      doc.text('Jln.K.H.M. Kasim No.10 Telp.(0471) 3200930, Kelurahan Pattene, Kota Palopo', pageWidth / 2, 29, { align: 'center' });
      doc.text('Website : http://smknegeri1palopo.sch.id Email : info@smknegeri1palopo.sch.id', pageWidth / 2, 32.5, { align: 'center' });
    } else {
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(11);
      doc.text('PEMERINTAH PROVINSI SULAWESI SELATAN', pageWidth / 2, 14, { align: 'center' });
      doc.text('DINAS PENDIDIKAN', pageWidth / 2, 19, { align: 'center' });
      doc.setFontSize(12);
      doc.text('SEKOLAH MENENGAH KEJURUAN NEGERI 1 PALOPO', pageWidth / 2, 24.5, { align: 'center' });

      doc.setFont(pdfFont, 'normal');
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
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(12);
      const titleY = 43;
      doc.text('SURAT KETERANGAN PINDAH', pageWidth / 2, titleY, { align: 'center' });
      // Title Underline
      const titleWidth = doc.getTextWidth('SURAT KETERANGAN PINDAH');
      doc.setLineWidth(0.3);
      doc.line((pageWidth - titleWidth) / 2, titleY + 0.8, (pageWidth + titleWidth) / 2, titleY + 0.8);

      doc.setFont(pdfFont, 'normal');
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
        doc.setFont(pdfFont, 'normal');
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
          if (item.isBold) doc.setFont(pdfFont, 'bold');
          doc.text(item.value || '-', valueX, currY);
          if (item.isBold) doc.setFont(pdfFont, 'normal');
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
      doc.setFont(pdfFont, 'italic');
      const warningText = 'Dengan dikeluarkannya surat keterangan ini, siswa tersebut diatas tidak diperkenankan masuk kembali. Dengan mempergunakan surat pindah tersebut.';
      const splitWarning = doc.splitTextToSize(warningText, pageWidth - (marginX * 2) - 8);
      doc.text(splitWarning, marginX + 6, currY);
      currY += splitWarning.length * 4.5 + 4;

      // Closing text
      doc.setFont(pdfFont, 'normal');
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
      doc.setFont(pdfFont, 'bold');
      doc.text(namaKepsek, ttdX, currY);
      const nameWidth = doc.getTextWidth(namaKepsek);
      doc.line(ttdX, currY + 0.6, ttdX + nameWidth, currY + 0.6);

      currY += 4.5;
      doc.setFont(pdfFont, 'normal');
      doc.text(`Pangkat : ${pangkatKepsek}`, ttdX, currY);
      currY += 4.5;
      doc.text(`NIP: ${nipKepsek}`, ttdX, currY);

      doc.save(`Surat_Keterangan_Pindah_${studentNama.replace(/\s+/g, '_')}_${studentNISN}.pdf`);
    } else {
      // SURAT KETERANGAN SISWA (SESUAI DOKUMEN RESMI)
      doc.setFont(pdfFont, 'bold');
      doc.setFontSize(13);
      const titleY = 44;
      doc.text('SURAT KETERANGAN', pageWidth / 2, titleY, { align: 'center' });
      const titleWidth = doc.getTextWidth('SURAT KETERANGAN');
      doc.setLineWidth(0.35);
      doc.line((pageWidth - titleWidth) / 2, titleY + 0.8, (pageWidth + titleWidth) / 2, titleY + 0.8);

      doc.setFont(pdfFont, 'normal');
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
        if (item.isBold) doc.setFont(pdfFont, 'bold');
        doc.text(item.value, valueX, currY);
        if (item.isBold) doc.setFont(pdfFont, 'normal');
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
      doc.setFont(pdfFont, 'bold');
      doc.text(namaKepsek, ttdX, currY);
      const nameWidth = doc.getTextWidth(namaKepsek);
      doc.setLineWidth(0.3);
      doc.line(ttdX, currY + 0.6, ttdX + nameWidth, currY + 0.6);

      currY += 4.8;
      doc.setFont(pdfFont, 'normal');
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
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          #surat-print-container, #surat-print-container * {
            visibility: visible !important;
          }
          #surat-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: ${sheetPaddingMm}mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
          {/* Sub-Navigation Tabs: Data Surat vs Spasi & Tata Letak (Hanya Admin) */}
          {isAdmin ? (
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveSettingsTab('data')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeSettingsTab === 'data'
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/25'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Data Surat</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('layout')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSettingsTab === 'layout'
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/25'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title="Khusus Administrator: Atur spasi per bagian & ukuran font surat"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Pengaturan Format</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-black uppercase tracking-wider">
                  Admin
                </span>
              </button>
            </div>
          ) : (
            <div className="bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Type className="w-4 h-4 text-indigo-600" />
                <span>Isian Data Surat Siswa</span>
              </div>
              <span className="text-[10.5px] text-slate-500 flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg font-medium">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Format Diatur Admin</span>
              </span>
            </div>
          )}

          {activeSettingsTab === 'data' ? (
            <div className="space-y-4">
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

          {/* 3. Penandatangan (Kepala Sekolah) & Pilihan Font */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-3 text-xs">
            <div className="font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Penandatangan (Kepala Sekolah)</span>
              <span className="text-[10px] text-slate-400 font-normal">Sesuai Dokumen Resmi</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-600 mb-0.5 font-bold">Nama Lengkap & Gelar:</label>
                <input
                  type="text"
                  value={namaKepsek}
                  onChange={(e) => setNamaKepsek(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-bold text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5 font-bold">Pangkat / Golongan:</label>
                <input
                  type="text"
                  value={pangkatKepsek}
                  onChange={(e) => setPangkatKepsek(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5 font-bold">NIP:</label>
                <input
                  type="text"
                  value={nipKepsek}
                  onChange={(e) => setNipKepsek(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl font-mono text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5 font-bold">Jabatan:</label>
                <input
                  type="text"
                  value={jabatanKepsek}
                  onChange={(e) => setJabatanKepsek(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5 font-bold">Unit Kerja:</label>
                <input
                  type="text"
                  value={unitKerjaKepsek}
                  onChange={(e) => setUnitKerjaKepsek(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Pilihan Jenis Font Surat (Dapat diakses oleh User dan Admin) */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <span>🔤</span> Jenis Font Dokumen:
              </label>
              <select
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value as PilihanFont)}
                className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="Calibri">Calibri (Standar Modern)</option>
                <option value="Times New Roman">Times New Roman (Klasik Kedinasan)</option>
                <option value="Arial">Arial (Tegas & Rapi)</option>
                <option value="Bookman Old Style">Bookman Old Style (Elegan Resmi)</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        /* ================= TAB 2: PENGATURAN SPASI & TATA LETAK MANDIRI ================= */
        <div className="space-y-4 animate-fadeIn">
          {/* Header & Status Card */}
          <div className="bg-gradient-to-br from-indigo-50 via-blue-50/60 to-purple-50/50 rounded-3xl border border-indigo-100 p-4 text-xs text-indigo-950 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-indigo-900">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>Pengaturan Mandiri: Spasi & Font Surat</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                Live Preview
              </span>
            </div>
            <p className="text-[11px] text-indigo-800/80 leading-relaxed">
              Sesuaikan spasi per bagian tertentu dan ukuran font mandiri agar pas sempurna di 1 lembar kertas A4 tanpa meluber ke halaman 2.
            </p>
            {isSavedToast && (
              <div className="p-2 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl font-bold text-[11px] flex items-center gap-1.5 animate-fadeIn">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pengaturan tata letak & spasi berhasil disimpan di browser!</span>
              </div>
            )}
          </div>

          {/* 1. KONTROL JENIS FONT RESMI */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-indigo-600" />
                <span>Jenis Font Resmi Seluruh Surat:</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-500 font-mono">
                {selectedFont}
              </span>
            </div>
            <select
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value as PilihanFont)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Calibri">Calibri (Standar Modern)</option>
              <option value="Times New Roman">Times New Roman (Klasik Kedinasan Resmi)</option>
              <option value="Arial">Arial (Tegas & Rapi)</option>
              <option value="Bookman Old Style">Bookman Old Style (Elegan Kedinasan)</option>
            </select>
            <p className="text-[10.5px] text-slate-500 italic">
              * Diterapkan seragam ke seluruh dokumen (Kop, Judul, Isi, 12 Poin Siswa, Peringatan, dan Tanda Tangan) agar tidak ada font yang berbeda.
            </p>
          </div>

          {/* 2. ATUR SPASI PER BAGIAN TERTENTU (SECTION SPACING) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Space className="w-3.5 h-3.5 text-indigo-600" />
                <span>Atur Spasi Per Bagian Tertentu:</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                Presisi Piksel
              </span>
            </div>

            {/* A. Jarak Kop ke Judul */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">1. Jarak Kop Surat ke Judul:</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {spacingKopToTitle} px
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="36"
                step="2"
                value={spacingKopToTitle}
                onChange={(e) => setSpacingKopToTitle(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* B. Jarak Judul ke Paragraf Pembuka */}
            <div className="space-y-1 pt-1.5 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">2. Jarak Judul ke Paragraf Pembuka:</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {spacingTitleToBody} px
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="28"
                step="2"
                value={spacingTitleToBody}
                onChange={(e) => setSpacingTitleToBody(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* C. Jarak Pembuka ke Rincian Data Siswa */}
            <div className="space-y-1 pt-1.5 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">3. Jarak Pembuka ke Rincian Siswa:</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {spacingBodyToTable} px
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="24"
                step="1"
                value={spacingBodyToTable}
                onChange={(e) => setSpacingBodyToTable(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* D. Jarak Antar Baris Rincian Data Siswa */}
            <div className="space-y-1 pt-1.5 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">4. Spasi Antar Baris Rincian Siswa:</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {itemSpacing} px
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={itemSpacing}
                onChange={(e) => setItemSpacing(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* E. Jarak Rincian Siswa ke Keterangan / Penutup */}
            <div className="space-y-1 pt-1.5 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">5. Jarak Rincian ke Paragraf Keterangan:</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {spacingTableToClosing} px
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="28"
                step="2"
                value={spacingTableToClosing}
                onChange={(e) => setSpacingTableToClosing(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* F. Jarak Paragraf Peringatan (Surat Pindah) */}
            {jenisSurat === 'pindah' && (
              <div className="space-y-1 pt-1.5 border-t border-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">6. Jarak ke Paragraf Peringatan Italic:</span>
                  <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {spacingPeringatan} px
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="24"
                  step="2"
                  value={spacingPeringatan}
                  onChange={(e) => setSpacingPeringatan(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            )}

            {/* G. Jarak Vertikal ke Tanda Tangan */}
            <div className="space-y-1 pt-1.5 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">7. Jarak Vertikal ke Tanda Tangan:</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {ttdSpacingTop} px
                </span>
              </div>
              <input
                type="range"
                min="6"
                max="60"
                step="2"
                value={ttdSpacingTop}
                onChange={(e) => setTtdSpacingTop(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* H. Tinggi Ruang Tanda Tangan */}
            <div className="space-y-1 pt-1.5 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">8. Tinggi Ruang Tanda Tangan:</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {ttdHeight} px
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="95"
                step="2"
                value={ttdHeight}
                onChange={(e) => setTtdHeight(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* I. Spasi Baris Teks (Line Height) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-bold">Spasi Antar Baris (Line Height):</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {lineSpacing}x
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1.2, 1.35, 1.45, 1.6].map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setLineSpacing(sp)}
                    className={`py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      lineSpacing === sp
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {sp}x {sp === 1.45 ? '(Std)' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* J. Margin Tepi Kertas A4 (Padding) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-bold">Margin Kertas A4 (Padding):</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {sheetPaddingMm} mm
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[14, 18, 22].map((pad) => (
                  <button
                    key={pad}
                    type="button"
                    onClick={() => setSheetPaddingMm(pad)}
                    className={`py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      sheetPaddingMm === pad
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {pad} mm {pad === 18 ? '(Std)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. ATUR UKURAN FONT BAGIAN TERTENTU (GRANULAR FONT SIZE) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-indigo-600" />
                <span>Atur Ukuran Font Bagian Tertentu:</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                Poin (pt)
              </span>
            </div>

            {/* Judul Surat */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Ukuran Judul Surat:</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {titleFontSize} pt
                </span>
              </div>
              <input
                type="range"
                min="11"
                max="18"
                step="0.5"
                value={titleFontSize}
                onChange={(e) => setTitleFontSize(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Nomor Surat */}
            <div className="space-y-1 pt-1.5 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Ukuran Nomor Surat:</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {nomorFontSize} pt
                </span>
              </div>
              <input
                type="range"
                min="9"
                max="13"
                step="0.5"
                value={nomorFontSize}
                onChange={(e) => setNomorFontSize(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Teks Isi & Paragraf */}
            <div className="space-y-1 pt-1.5 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Ukuran Teks Isi & Paragraf:</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {bodyFontSize} pt
                </span>
              </div>
              <input
                type="range"
                min="9"
                max="14"
                step="0.5"
                value={bodyFontSize}
                onChange={(e) => setBodyFontSize(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Rincian Data Siswa */}
            <div className="space-y-1 pt-1.5 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Ukuran Rincian Data Siswa:</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {itemFontSize} pt
                </span>
              </div>
              <input
                type="range"
                min="9"
                max="14"
                step="0.5"
                value={itemFontSize}
                onChange={(e) => setItemFontSize(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Paragraf Peringatan Surat Pindah */}
            {jenisSurat === 'pindah' && (
              <div className="space-y-1 pt-1.5 border-t border-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Ukuran Teks Peringatan (Italic):</span>
                  <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {peringatanFontSize} pt
                  </span>
                </div>
                <input
                  type="range"
                  min="8.5"
                  max="13"
                  step="0.5"
                  value={peringatanFontSize}
                  onChange={(e) => setPeringatanFontSize(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            )}

            {/* Tanda Tangan & Pejabat */}
            <div className="space-y-1 pt-1.5 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Ukuran Tanda Tangan & Pejabat:</span>
                <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {ttdFontSize} pt
                </span>
              </div>
              <input
                type="range"
                min="9"
                max="14"
                step="0.5"
                value={ttdFontSize}
                onChange={(e) => setTtdFontSize(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* 4. FITUR UBAH FONT SIZE & SPASI DI KATA TERTENTU (INTERACTIVE GUIDE) */}
          <div className="bg-amber-50/80 rounded-3xl border border-amber-200 p-4 space-y-3 text-xs text-amber-950">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Edit3 className="w-4 h-4 text-amber-700" />
              <span>Ubah Font & Spasi di Kata Tertentu:</span>
            </div>
            <p className="text-[11px] text-amber-900/80 leading-relaxed">
              Anda bisa mengubah ukuran font pada kata/kalimat spesifik secara bebas. Cukup <b>sorot (blok) kata</b> di kertas A4 sebelah kanan, lalu gunakan bilah alat format kata yang muncul!
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLiveEditMode(!isLiveEditMode)}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isLiveEditMode
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isLiveEditMode ? 'Mode Edit Aktif' : 'Aktifkan Ketik & Format Bebas'}</span>
              </button>
            </div>
          </div>

          {/* 5. TOMBOL SIMPAN & RESET */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={saveLayoutToStorage}
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Tata Letak Sebagai Standar</span>
            </button>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kembalikan ke Setelan Standar (Reset)</span>
            </button>
          </div>
        </div>
      )}

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
              {/* Tombol Mode Edit Teks Bebas (Khusus Admin) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsLiveEditMode(!isLiveEditMode)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    isLiveEditMode
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                  title="Khusus Administrator: Klik dan ketik kata/spasi secara bebas langsung di atas lembar kertas"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isLiveEditMode ? 'Mode Edit Aktif' : 'Ketik Bebas di Lembar'}</span>
                </button>
              )}

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

          {/* WYSIWYG Formatting Bar saat Live Edit Aktif ATAU Ada Teks yang Diseleksi (Khusus Admin) */}
          {isAdmin && (isLiveEditMode || hasTextSelection) && (
            <div className="no-print w-full mb-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50/70 border border-amber-300 rounded-2xl flex flex-col gap-2.5 shadow-md animate-fadeIn">
              {/* Row 1: Header status & selection info */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-amber-200/80">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shadow-2xs">
                    <Edit3 className="w-3.5 h-3.5 text-amber-800" />
                    <span>Format Kata Tertentu</span>
                  </span>
                  {hasTextSelection ? (
                    <span className="text-[11px] text-amber-900 font-bold bg-white/90 border border-amber-300 px-2 py-0.5 rounded-md truncate max-w-[200px] sm:max-w-xs">
                      Teks: <span className="text-indigo-700 italic">"{selectedWordText}"</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-800 italic hidden sm:inline">
                      Sorot (blok) kata pada lembar untuk mengubah ukuran & warnanya
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setResetKey(prev => prev + 1)}
                    className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Kembalikan Teks ke Aslinya"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Lembar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLiveEditMode(false);
                      setHasTextSelection(false);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    <span>Selesai</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Font Size Controls for Selected Word */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                  <Type className="w-3 h-3 text-amber-700" />
                  <span>Ukuran Kata:</span>
                </span>

                {/* Preset Chips */}
                <div className="flex items-center gap-1 flex-wrap">
                  {[8, 9, 10, 11, 12, 13, 14, 16, 18, 20].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFontSizeToSelection(pt);
                      }}
                      className="px-1.5 py-0.5 rounded-md bg-white hover:bg-amber-100 border border-amber-300 font-mono text-[10.5px] font-bold text-slate-800 cursor-pointer shadow-2xs active:scale-95 transition-all"
                      title={`Ubah ukuran kata terpilih menjadi ${pt}pt`}
                    >
                      {pt}pt
                    </button>
                  ))}
                </div>

                {/* Steppers */}
                <div className="flex items-center gap-1 ml-1">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      stepFontSizeOnSelection(false);
                    }}
                    className="w-6 h-6 rounded-md bg-white border border-amber-300 hover:bg-amber-100 flex items-center justify-center font-bold text-xs text-slate-800 cursor-pointer shadow-2xs"
                    title="Perkecil Ukuran Kata Terpilih (-1pt)"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      stepFontSizeOnSelection(true);
                    }}
                    className="w-6 h-6 rounded-md bg-white border border-amber-300 hover:bg-amber-100 flex items-center justify-center font-bold text-xs text-slate-800 cursor-pointer shadow-2xs"
                    title="Perbesar Ukuran Kata Terpilih (+1pt)"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Row 3: Styles, Kerning, Colors & Insertion */}
              <div className="flex items-center gap-3 flex-wrap text-xs pt-1 border-t border-amber-200/60">
                {/* Basic Text Formats */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }}
                    className="w-6 h-6 rounded-md bg-white border border-amber-300 hover:bg-amber-100 flex items-center justify-center font-bold text-xs text-slate-800 cursor-pointer shadow-2xs"
                    title="Tebalkan Kata (Bold)"
                  >
                    <Bold className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }}
                    className="w-6 h-6 rounded-md bg-white border border-amber-300 hover:bg-amber-100 flex items-center justify-center font-bold text-xs text-slate-800 cursor-pointer shadow-2xs"
                    title="Miringkan Kata (Italic)"
                  >
                    <Italic className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); applyFormat('underline'); }}
                    className="w-6 h-6 rounded-md bg-white border border-amber-300 hover:bg-amber-100 flex items-center justify-center font-bold text-xs text-slate-800 cursor-pointer shadow-2xs"
                    title="Garis Bawah (Underline)"
                  >
                    <Underline className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); applyFormat('strikeThrough'); }}
                    className="w-6 h-6 rounded-md bg-white border border-amber-300 hover:bg-amber-100 flex items-center justify-center font-bold text-xs text-slate-800 cursor-pointer shadow-2xs"
                    title="Coret Kata (Strikethrough)"
                  >
                    <Strikethrough className="w-3 h-3" />
                  </button>
                </div>

                <div className="h-4 w-px bg-amber-300"></div>

                {/* Spasi Huruf (Kerning) */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-amber-900">Spasi Huruf:</span>
                  {[
                    { label: 'Normal', val: 0 },
                    { label: '+1px', val: 1 },
                    { label: '+2px', val: 2 },
                    { label: '+3px', val: 3 }
                  ].map((sp) => (
                    <button
                      key={sp.val}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyLetterSpacingToSelection(sp.val);
                      }}
                      className="px-1.5 py-0.5 rounded-md bg-white hover:bg-amber-100 border border-amber-300 text-[10px] font-semibold text-slate-800 cursor-pointer shadow-2xs"
                      title={`Spasi antar huruf ${sp.label}`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-amber-300"></div>

                {/* Warna Kata */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-amber-900 flex items-center gap-0.5">
                    <Palette className="w-3 h-3 text-amber-700" />
                    <span>Warna:</span>
                  </span>
                  {[
                    { name: 'Hitam', hex: '#000000' },
                    { name: 'Biru Kedinasan', hex: '#1e3a8a' },
                    { name: 'Merah', hex: '#b91c1c' },
                    { name: 'Abu-abu', hex: '#475569' }
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyColorToSelection(c.hex);
                      }}
                      className="w-4 h-4 rounded-full border border-white shadow-xs cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: c.hex }}
                      title={`Ubah warna teks ke ${c.name}`}
                    />
                  ))}
                </div>

                <div className="h-4 w-px bg-amber-300"></div>

                {/* Quick Blank Line Insertion & Clean Format */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertBlankLine();
                    }}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-amber-100 border border-amber-300 text-[10.5px] font-bold text-slate-800 cursor-pointer shadow-2xs flex items-center gap-1"
                    title="Sisipkan baris spasi kosong (Enter) di posisi kursor"
                  >
                    <span>➕ Tambah Spasi Baris</span>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      clearFormattingOnSelection();
                    }}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-rose-50 border border-rose-300 text-[10px] font-bold text-rose-700 cursor-pointer shadow-2xs"
                    title="Hapus format kustom pada kata yang diseleksi"
                  >
                    <span>Bersihkan Format Kata</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scalable Container for A4 Sheet */}
          <div 
            className="w-full flex justify-center overflow-x-auto p-1 sm:p-2"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            {/* Real Official A4 Sheet */}
            <div 
              key={resetKey}
              id="surat-print-container"
              contentEditable={isAdmin && isLiveEditMode}
              suppressContentEditableWarning={true}
              className={`bg-white text-black shadow-2xl rounded-sm w-[210mm] min-h-[297mm] select-text relative border transition-all ${
                isAdmin && isLiveEditMode 
                  ? 'ring-4 ring-amber-400/40 border-amber-500 cursor-text' 
                  : 'border-slate-200'
              }`}
              style={{ 
                boxSizing: 'border-box', 
                fontFamily: getFontFamilyStyle(),
                fontSize: `${bodyFontSize}pt`,
                lineHeight: lineSpacing,
                padding: `${sheetPaddingMm}mm`
              }}
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
                <div className="w-full text-center text-slate-950 px-16">
                  <h3 className="text-[12.5pt] font-bold tracking-tight uppercase leading-tight">
                    PEMERINTAH PROVINSI SULAWESI SELATAN
                  </h3>
                  <h2 className="text-[13pt] font-bold tracking-tight uppercase leading-tight">
                    DINAS PENDIDIKAN
                  </h2>
                  <h1 className="text-[14pt] font-black tracking-tight uppercase leading-tight mt-0.5">
                    UPT SMK NEGERI 1 PALOPO
                  </h1>
                  <p className="text-[8.5pt] font-normal leading-tight mt-1 text-slate-900">
                    Jl. KHM. Kasim NO. 10 Kota Palopo Sulawesi Selatan
                  </p>
                  <p className="text-[8pt] font-normal leading-tight text-slate-800">
                    Website : http://www.smkn1-palopo.sch.id &nbsp;•&nbsp; E-mail: info@smknegeri1palopo.sch.id
                  </p>
                </div>
              </div>

              {/* Double Separator Line */}
              <div className="border-b-[2.5px] border-black mt-2"></div>
              <div className="border-b-[0.8px] border-black mt-[1.5px]"></div>

              {/* 2. DOKUMEN ISI */}
              {jenisSurat === 'pindah' ? (
                /* ================= SURAT KETERANGAN PINDAH ================= */
                <div 
                  className="text-black flex flex-col"
                  style={{ marginTop: `${spacingKopToTitle}px` }}
                >
                  {/* Judul & Nomor */}
                  <div className="text-center" style={{ marginBottom: `${spacingTitleToBody}px` }}>
                    <h2 
                      className="font-bold uppercase underline tracking-wider"
                      style={{ fontSize: `${titleFontSize}pt` }}
                    >
                      SURAT KETERANGAN PINDAH
                    </h2>
                    <p style={{ fontSize: `${nomorFontSize}pt`, marginTop: '3px' }}>
                      Nomor : {nomorSuratPindah}
                    </p>
                  </div>

                  {/* Paragraf Pembuka */}
                  <p 
                    className="text-justify"
                    style={{ fontSize: `${bodyFontSize}pt`, marginBottom: `${spacingBodyToTable}px` }}
                  >
                    Kepala SMK Negeri 1 Palopo dengan ini menerangkan bahwa :
                  </p>

                  {/* 12 Poin Siswa Sesuai Format Resmi */}
                  <div 
                    className="pl-2 flex flex-col"
                    style={{ 
                      gap: `${itemSpacing}px`, 
                      fontSize: `${itemFontSize}pt`,
                      marginBottom: `${spacingTableToClosing}px` 
                    }}
                  >
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
                      <span className="flex-1">{studentNISN}</span>
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
                  <p 
                    className="text-justify"
                    style={{ fontSize: `${bodyFontSize}pt`, marginBottom: `${spacingPeringatan}px` }}
                  >
                    Atas permintaan orang tua / wali, anak tersebut diatas pindah dari UPT SMK Negeri 1 Palopo ke{' '}
                    <strong className="font-bold uppercase">{sekolahTujuan}</strong>.
                  </p>

                  {/* Paragraf Peringatan / Italic Sesuai Dokumen Resmi */}
                  <p 
                    className="text-justify italic pl-8 pr-4"
                    style={{ 
                      fontSize: `${peringatanFontSize}pt`, 
                      marginBottom: `${spacingTableToClosing}px` 
                    }}
                  >
                    Dengan dikeluarkannya surat keterangan ini, siswa tersebut diatas tidak diperkenankan
                    masuk kembali. Dengan mempergunakan surat pindah tersebut.
                  </p>

                  {/* Paragraf Penutup */}
                  <p 
                    className="text-justify"
                    style={{ fontSize: `${bodyFontSize}pt` }}
                  >
                    Demikian Surat Keterangan ini kami berikan kepada yang bersangkutan untuk dipergunakan seperlunya.
                  </p>

                  {/* Tanda Tangan & Cap Resmi */}
                  <div 
                    className="flex justify-end"
                    style={{ marginTop: `${ttdSpacingTop}px` }}
                  >
                    <div 
                      className="w-64 text-left relative"
                      style={{ fontSize: `${ttdFontSize}pt` }}
                    >
                      <p>Palopo, {formatIndonesianDate(tanggalSurat)}</p>
                      <p className="font-medium">{jabatanKepsek},</p>

                      {/* Ruang Tanda Tangan Resmi (Tanpa Stempel) */}
                      <div 
                        className="my-1 relative flex items-center"
                        style={{ height: `${ttdHeight}px` }}
                      />

                      {/* Info Nama & NIP */}
                      <p 
                        className="font-bold underline"
                        style={{ fontSize: `${ttdFontSize}pt` }}
                      >
                        {namaKepsek}
                      </p>
                      <p 
                        className="text-slate-800"
                        style={{ fontSize: `${Math.max(8.5, ttdFontSize - 0.5)}pt` }}
                      >
                        Pangkat : {pangkatKepsek}
                      </p>
                      <p 
                        className="text-slate-800"
                        style={{ fontSize: `${Math.max(8.5, ttdFontSize - 0.5)}pt` }}
                      >
                        NIP: {nipKepsek}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* ================= SURAT KETERANGAN SISWA (FORMAT RESMI) ================= */
                <div 
                  className="text-black flex flex-col"
                  style={{ marginTop: `${spacingKopToTitle}px` }}
                >
                  {/* Judul & Nomor */}
                  <div className="text-center" style={{ marginBottom: `${spacingTitleToBody}px` }}>
                    <h2 
                      className="font-bold uppercase underline tracking-wider"
                      style={{ fontSize: `${titleFontSize}pt` }}
                    >
                      SURAT KETERANGAN
                    </h2>
                    <p style={{ fontSize: `${nomorFontSize}pt`, marginTop: '3px' }}>
                      Nomor : {nomorSuratKet}
                    </p>
                  </div>

                  {/* Paragraf Pembuka */}
                  <p 
                    className="text-justify"
                    style={{ fontSize: `${bodyFontSize}pt`, marginBottom: `${spacingBodyToTable}px` }}
                  >
                    Yang bertanda tangan di bawah ini :
                  </p>

                  {/* Identitas Pejabat */}
                  <div 
                    className="pl-6 flex flex-col"
                    style={{ 
                      gap: `${itemSpacing}px`, 
                      fontSize: `${itemFontSize}pt`,
                      marginBottom: `${spacingBodyToTable}px`
                    }}
                  >
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
                      <span className="flex-1">{nipKepsek}</span>
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
                  <p 
                    className="text-justify"
                    style={{ fontSize: `${bodyFontSize}pt`, marginBottom: `${spacingBodyToTable}px` }}
                  >
                    Menerangkan bahwa :
                  </p>

                  {/* Identitas Siswa */}
                  <div 
                    className="pl-6 flex flex-col"
                    style={{ 
                      gap: `${itemSpacing}px`, 
                      fontSize: `${itemFontSize}pt`,
                      marginBottom: `${spacingTableToClosing}px`
                    }}
                  >
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
                  <p 
                    className="text-justify"
                    style={{ fontSize: `${bodyFontSize}pt`, marginBottom: `${spacingTableToClosing}px` }}
                  >
                    Benar adalah siswa pada SMK Negeri 1 Palopo Tahun Pelajaran {tahunPelajaran}.
                    {keperluanSurat && keperluanSurat.trim() ? ` Surat Keterangan ini dibuat untuk keperluan ${keperluanSurat.trim()}.` : ''}
                  </p>

                  {/* Paragraf Penutup */}
                  <p 
                    className="text-justify"
                    style={{ fontSize: `${bodyFontSize}pt` }}
                  >
                    Demikian Surat Keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.
                  </p>

                  {/* Tanda Tangan & Cap Resmi */}
                  <div 
                    className="flex justify-end"
                    style={{ marginTop: `${ttdSpacingTop}px` }}
                  >
                    <div 
                      className="w-72 text-left relative"
                      style={{ fontSize: `${ttdFontSize}pt` }}
                    >
                      <p>Palopo, {formatIndonesianDate(tanggalSurat)}</p>
                      <p className="font-medium">{jabatanKepsek},</p>

                      {/* Ruang Tanda Tangan Resmi (Tanpa Stempel) */}
                      <div 
                        className="my-1 relative flex items-center"
                        style={{ height: `${ttdHeight}px` }}
                      />

                      {/* Info Nama, Pangkat, NIP */}
                      <p 
                        className="font-bold underline tracking-wide"
                        style={{ fontSize: `${ttdFontSize}pt` }}
                      >
                        {namaKepsek}
                      </p>
                      <p 
                        className="text-slate-900"
                        style={{ fontSize: `${Math.max(8.5, ttdFontSize - 0.5)}pt` }}
                      >
                        Pangkat : {pangkatKepsek.split(',')[0].trim()}
                      </p>
                      <p 
                        className="text-slate-900"
                        style={{ fontSize: `${Math.max(8.5, ttdFontSize - 0.5)}pt` }}
                      >
                        NIP. {formatNIP(nipKepsek)}
                      </p>
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
