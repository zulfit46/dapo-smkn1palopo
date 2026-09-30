import { RiwayatPangkat, RiwayatKGB } from '../types';

export const INITIAL_RIWAYAT_PANGKAT: RiwayatPangkat[] = [
  {
    id: 'PANGKAT-001',
    nip: '197205121998021001',
    nama: 'H. Ridwan, S.Pd., M.Si.',
    gol: 'IV/c',
    noSk: '823.4/125/BKPSDM/2022',
    tglSk: '2022-03-15',
    tmt: '2022-04-01',
    masaKerjaThn: 24,
    masaKerjaBln: 2,
    keterangan: 'Kenaikan Pangkat Pilihan',
    createdAt: '2022-03-15'
  },
  {
    id: 'PANGKAT-002',
    nip: '196811201994121002',
    nama: 'Drs. Muhammad Arsyad, M.Pd.',
    gol: 'IV/b',
    noSk: '823.4/088/BKPSDM/2021',
    tglSk: '2021-09-10',
    tmt: '2021-10-01',
    masaKerjaThn: 26,
    masaKerjaBln: 10,
    keterangan: 'Kenaikan Pangkat Reguler',
    createdAt: '2021-09-10'
  },
  {
    id: 'PANGKAT-003',
    nip: '197504152005012008',
    nama: 'Hj. Nurhayati, S.Pd.',
    gol: 'IV/a',
    noSk: '823.3/210/BKPSDM/2020',
    tglSk: '2020-03-12',
    tmt: '2020-04-01',
    masaKerjaThn: 15,
    masaKerjaBln: 3,
    keterangan: 'Kenaikan Pangkat Pilihan Guru Madya',
    createdAt: '2020-03-12'
  },
  {
    id: 'PANGKAT-004',
    nip: '198108222008041003',
    nama: 'Baharuddin, S.T., M.Kom.',
    gol: 'III/d',
    noSk: '823.3/094/BKPSDM/2023',
    tglSk: '2023-03-20',
    tmt: '2023-04-01',
    masaKerjaThn: 14,
    masaKerjaBln: 11,
    keterangan: 'Kenaikan Pangkat Reguler',
    createdAt: '2023-03-20'
  },
  {
    id: 'PANGKAT-005',
    nip: '198503102010012015',
    nama: 'Fatmawati, S.Pd.',
    gol: 'III/c',
    noSk: '823.3/142/BKPSDM/2022',
    tglSk: '2022-09-18',
    tmt: '2022-10-01',
    masaKerjaThn: 12,
    masaKerjaBln: 8,
    keterangan: 'Kenaikan Pangkat Reguler',
    createdAt: '2022-09-18'
  },
  {
    id: 'PANGKAT-006',
    nip: '198812052015031002',
    nama: 'Ilham Jaya, S.Kom.',
    gol: 'III/b',
    noSk: '823.2/067/BKPSDM/2021',
    tglSk: '2021-03-10',
    tmt: '2021-04-01',
    masaKerjaThn: 6,
    masaKerjaBln: 1,
    keterangan: 'Kenaikan Pangkat Pertama',
    createdAt: '2021-03-10'
  },
  {
    id: 'PANGKAT-007',
    nip: '199207182020122011',
    nama: 'Siti Rahma, S.Pd.',
    gol: 'III/a',
    noSk: '813.3/021/BKPSDM/2020',
    tglSk: '2020-12-01',
    tmt: '2020-12-01',
    masaKerjaThn: 0,
    masaKerjaBln: 0,
    keterangan: 'Pengangkatan CPNS/PNS',
    createdAt: '2020-12-01'
  },
  {
    id: 'PANGKAT-008',
    nip: '197906142014061001',
    nama: 'Andi Mappatunru, S.Pd.',
    gol: 'III/c',
    noSk: '823.3/305/BKPSDM/2022',
    tglSk: '2022-03-25',
    tmt: '2022-04-01',
    masaKerjaThn: 7,
    masaKerjaBln: 9,
    keterangan: 'Kenaikan Pangkat Reguler',
    createdAt: '2022-03-25'
  }
];

export const INITIAL_RIWAYAT_KGB: RiwayatKGB[] = [
  {
    id: 'KGB-001',
    nip: '197205121998021001',
    nama: 'H. Ridwan, S.Pd., M.Si.',
    gol: 'IV/c',
    noSk: '822.4/045/Disdik/2024',
    tglSk: '2024-03-10',
    tmt: '2024-04-01',
    masaKerjaThn: 26,
    masaKerjaBln: 2,
    gajiPokok: 5352800,
    keterangan: 'KGB Periode 2024-2026',
    createdAt: '2024-03-10'
  },
  {
    id: 'KGB-002',
    nip: '196811201994121002',
    nama: 'Drs. Muhammad Arsyad, M.Pd.',
    gol: 'IV/b',
    noSk: '822.4/112/Disdik/2023',
    tglSk: '2023-09-15',
    tmt: '2023-10-01',
    masaKerjaThn: 28,
    masaKerjaBln: 10,
    gajiPokok: 5122100,
    keterangan: 'KGB Periode 2023-2025',
    createdAt: '2023-09-15'
  },
  {
    id: 'KGB-003',
    nip: '197504152005012008',
    nama: 'Hj. Nurhayati, S.Pd.',
    gol: 'IV/a',
    noSk: '822.3/089/Disdik/2024',
    tglSk: '2024-03-05',
    tmt: '2024-04-01',
    masaKerjaThn: 19,
    masaKerjaBln: 3,
    gajiPokok: 4575200,
    keterangan: 'KGB Periode 2024-2026',
    createdAt: '2024-03-05'
  },
  {
    id: 'KGB-004',
    nip: '198108222008041003',
    nama: 'Baharuddin, S.T., M.Kom.',
    gol: 'III/d',
    noSk: '822.3/056/Disdik/2023',
    tglSk: '2023-03-14',
    tmt: '2023-04-01',
    masaKerjaThn: 15,
    masaKerjaBln: 0,
    gajiPokok: 4029600,
    keterangan: 'KGB Periode 2023-2025',
    createdAt: '2023-03-14'
  },
  {
    id: 'KGB-005',
    nip: '198503102010012015',
    nama: 'Fatmawati, S.Pd.',
    gol: 'III/c',
    noSk: '822.3/178/Disdik/2024',
    tglSk: '2024-09-12',
    tmt: '2024-10-01',
    masaKerjaThn: 14,
    masaKerjaBln: 8,
    gajiPokok: 3784500,
    keterangan: 'KGB Periode 2024-2026',
    createdAt: '2024-09-12'
  },
  {
    id: 'KGB-006',
    nip: '198812052015031002',
    nama: 'Ilham Jaya, S.Kom.',
    gol: 'III/b',
    noSk: '822.2/032/Disdik/2023',
    tglSk: '2023-03-08',
    tmt: '2023-04-01',
    masaKerjaThn: 8,
    masaKerjaBln: 1,
    gajiPokok: 3261200,
    keterangan: 'KGB Periode 2023-2025',
    createdAt: '2023-03-08'
  },
  {
    id: 'KGB-007',
    nip: '199207182020122011',
    nama: 'Siti Rahma, S.Pd.',
    gol: 'III/a',
    noSk: '822.2/140/Disdik/2022',
    tglSk: '2022-11-20',
    tmt: '2022-12-01',
    masaKerjaThn: 2,
    masaKerjaBln: 0,
    gajiPokok: 2901400,
    keterangan: 'KGB Pertama',
    createdAt: '2022-11-20'
  }
];

export const DAFTAR_GOLONGAN_PNS = [
  'I/a',
  'I/b',
  'I/c',
  'I/d',
  'II/a',
  'II/b',
  'II/c',
  'II/d',
  'III/a',
  'III/b',
  'III/c',
  'III/d',
  'IV/a',
  'IV/b',
  'IV/c',
  'IV/d',
  'IV/e'
];

export const DAFTAR_GOLONGAN_PPPK = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII'
];

export const DAFTAR_GOLONGAN_PANGKAT = [
  ...DAFTAR_GOLONGAN_PNS,
  ...DAFTAR_GOLONGAN_PPPK
];
