import { Jurusan } from '../types';

export const INITIAL_JURUSAN_LIST: Jurusan[] = [
  {
    kode: "ULP",
    programKeahlian: "Usaha Layanan Pariwisata",
    konsentrasiKeahlian: "Usaha Layanan Wisata"
  },
  {
    kode: "TJKT",
    programKeahlian: "Teknik Jaringan Komputer dan Telekomunikasi",
    konsentrasiKeahlian: "Teknik Komputer dan Jaringan"
  },
  {
    kode: "Kuliner",
    programKeahlian: "Kuliner",
    konsentrasiKeahlian: "Kuliner"
  },
  {
    kode: "AKL",
    programKeahlian: "Akuntansi dan Keuangan Lembaga",
    konsentrasiKeahlian: "Akuntansi"
  },
  {
    kode: "PMS",
    programKeahlian: "Pemasaran",
    konsentrasiKeahlian: "Bisnis Retail"
  },
  {
    kode: "MPLB",
    programKeahlian: "Manajemen Perkantoran dan Layanan Bisnis",
    konsentrasiKeahlian: "Manajemen Perkantoran"
  }
];

/**
 * Mencocokkan nama kelas (misal "10 AKL 1", "11 Kuliner 2", "12 TJKT 3") dengan data Jurusan
 */
export function getJurusanByKelas(
  kelasName: string,
  jurusanList: Jurusan[] = INITIAL_JURUSAN_LIST
): Jurusan | undefined {
  if (!kelasName) return undefined;
  const cleanKelas = kelasName.trim().toUpperCase();

  // Urutkan dari kode terpanjang terlebih dahulu agar tidak salah tumpang tindih
  const sorted = [...jurusanList].sort((a, b) => b.kode.length - a.kode.length);

  // 1. Coba token / word boundary match
  const foundToken = sorted.find((j) => {
    const kUpper = j.kode.trim().toUpperCase();
    if (!kUpper) return false;
    const regex = new RegExp(`(^|\\s|[-_])${kUpper}(\\s|[-_]|\\d|$)`, 'i');
    return regex.test(cleanKelas);
  });

  if (foundToken) return foundToken;

  // 2. Fallback substring match
  return sorted.find((j) => {
    const kUpper = j.kode.trim().toUpperCase();
    return kUpper ? cleanKelas.includes(kUpper) : false;
  });
}
