import { Student, AppConfig, GTKData, RiwayatPangkat, RiwayatKGB, MutasiMasukItem, MutasiKeluarItem, PembelajaranData, normalizeStudent } from '../types';
import { SPREADSHEET_ID, SHEET_NAME, SHEET_NAME_GTK, SHEET_NAME_NAIKPANGKAT, SHEET_NAME_KGB, SHEET_NAME_MUTASI_MASUK, SHEET_NAME_MUTASI_KELUAR, SHEET_NAME_PEMBELAJARAN, DRIVE_FOLDER_ID_MUTASI_KELUAR } from '../data/codeGsScript';
import { INITIAL_PEMBELAJARAN_LIST } from '../data/initialPembelajaran';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { formatToDDMMYYYY, parseToYYYYMMDD } from '../utils/dateUtils';

export { formatToDDMMYYYY, parseToYYYYMMDD, DRIVE_FOLDER_ID_MUTASI_KELUAR };

const LOCAL_STORAGE_STUDENTS_KEY = 'dapodik_cached_students';
const LOCAL_STORAGE_GTK_KEY = 'dapodik_cached_gtk';
const LOCAL_STORAGE_PANGKAT_KEY = 'smkn1_riwayat_pangkat_data';
const LOCAL_STORAGE_KGB_KEY = 'smkn1_riwayat_kgb_data';
const LOCAL_STORAGE_MUTASI_MASUK_KEY = 'dapodik_cached_mutasi_masuk';
const LOCAL_STORAGE_MUTASI_KELUAR_KEY = 'dapodik_cached_mutasi_keluar';
const LOCAL_STORAGE_PEMBELAJARAN_KEY = 'dapodik_cached_pembelajaran';
const LOCAL_STORAGE_CONFIG_KEY = 'dapodik_app_config';

/**
 * Fetch students directly from Google Sheets GViz API or Google Apps Script Web App.
 * This ensures the app works seamlessly even when deployed as a static frontend on Vercel/GitHub Pages.
 */
export async function fetchStudentsDirectly(config: AppConfig): Promise<Student[] | null> {
  const ssId = config.spreadsheetId || SPREADSHEET_ID;
  const sheet = config.sheetName || SHEET_NAME;

  // 1. Try Google Sheets GViz API (Fast, direct read from public/accessible spreadsheet)
  if (ssId) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${ssId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}&_t=${Date.now()}`;
      const res = await fetch(gvizUrl, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const text = await res.text();
        const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          const rawRows = parsed.table?.rows || [];

          if (rawRows.length > 1) {
            const headerRow = rawRows[0].c.map((cell: any) => cell && cell.v !== null ? String(cell.v).trim() : '');
            const parsedStudents: Student[] = [];
            const idSet = new Set<string>();

            for (let i = 1; i < rawRows.length; i++) {
              const row = rawRows[i].c;
              if (!row) continue;
              const obj: any = { rowIndex: i + 1 };

              headerRow.forEach((header: string, colIdx: number) => {
                if (!header) return;
                const cell = row[colIdx];
                let strVal = '';
                if (cell && cell.v !== null && cell.v !== undefined) {
                  if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
                    strVal = cell.f || cell.v;
                  } else {
                    strVal = String(cell.v).trim();
                  }
                }
                obj[header] = strVal;
                const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                obj[hClean] = strVal;

                if (hClean === 'nama') obj.nama = strVal;
                if (hClean === 'nisn') obj.nisn = strVal;
                if (hClean === 'nipd') obj.nipd = strVal;
                if (hClean === 'jk') obj.jk = strVal;
                if (hClean === 'rombel' || hClean === 'kelas') obj.kelas = strVal;
                if (hClean === 'status') obj.status = strVal;
                if (hClean === 'ket' || hClean === 'keterangan') obj.ket = strVal;
                if (hClean === 'tlahir' || hClean === 'tempatlahir') obj.tempatLahir = strVal;
                if (hClean === 'tgllahir' || hClean === 'tanggallahir') obj.tanggalLahir = parseToYYYYMMDD(strVal);
                if (hClean === 'agama') obj.agama = strVal;
                if (hClean === 'alamat') obj.alamat = strVal;
                if (hClean === 'namaayah' || hClean === 'ayah' || hClean === 'nmayah') {
                  obj.ayah = strVal;
                  obj.nama_ayah = strVal;
                }
                if (hClean === 'pekerjaanayah' || hClean === 'pkrjayah' || hClean === 'pekayah' || hClean === 'kerjaayah' || hClean === 'kerja_ayah') {
                  obj.pekerjaanAyah = strVal;
                  obj.kerja_ayah = strVal;
                }
                if (hClean === 'namaibu' || hClean === 'ibu' || hClean === 'nmibu') {
                  obj.ibu = strVal;
                  obj.nama_ibu = strVal;
                }
                if (hClean === 'pekerjaanibu' || hClean === 'pkrjibu' || hClean === 'pekibu' || hClean === 'kerjaibu' || hClean === 'kerja_ibu') {
                  obj.pekerjaanIbu = strVal;
                  obj.kerja_ibu = strVal;
                }
                if (hClean === 'hp' || hClean === 'telepon' || hClean === 'nohp') obj.noHp = strVal;
                if (hClean === 'email') obj.email = strVal;
                if (hClean === 'sekolahasal') obj.sekolahAsal = strVal;
                if (hClean === 'tinggibadan') obj.tinggiBadan = strVal;
                if (hClean === 'beratbadan') obj.beratBadan = strVal;
                if (hClean === 'jaraksekolah') obj.jarakSekolah = strVal;
                if (hClean === 'jumsaudara' || hClean === 'jumlahsaudara') obj.jumlahSaudara = strVal;
                if (hClean === 'timestamp' || hClean === 'waktu' || hClean === 'tglverval') obj.timestamp = strVal;
                if (hClean === 'vervaloleh' || hClean === 'petugasverval' || hClean === 'petugas' || hClean === 'walikelas' || hClean === 'verifikator') {
                  obj.vervalOleh = strVal;
                  obj.verval_oleh = strVal;
                }
              });

              let baseId = obj.nipd || obj.nisn || `STU-${i}`;
              if (idSet.has(baseId)) {
                baseId = `${baseId}-${i}`;
              }
              idSet.add(baseId);
              obj.id = baseId;

              parsedStudents.push(normalizeStudent(obj));
            }

            if (parsedStudents.length > 0) {
              safeSetItem(LOCAL_STORAGE_STUDENTS_KEY, parsedStudents);
              return parsedStudents;
            }
          }
        }
      }
    } catch (gvizError) {
      console.warn('GViz client fetch failed, trying Web App URL...', gvizError);
    }
  }

  // 2. Try Google Apps Script Web App
  if (config.webAppUrl) {
    try {
      const response = await fetch(config.webAppUrl, { signal: AbortSignal.timeout(20000) });
      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData && remoteData.status === 'success' && Array.isArray(remoteData.data)) {
          const normalized = remoteData.data.map((s: any) => normalizeStudent(s));
          safeSetItem(LOCAL_STORAGE_STUDENTS_KEY, normalized);
          return normalized;
        }
      }
    } catch (webAppError) {
      console.warn('Web App fetch failed:', webAppError);
    }
  }

  // 3. Fallback to cached data if available
  const cached = safeGetItem<Student[] | null>(LOCAL_STORAGE_STUDENTS_KEY, null);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached.map(normalizeStudent);
  }

  return null;
}

/**
 * Send batch update (Verval PD) to Google Apps Script Web App
 */
export async function syncVervalDirectly(
  webAppUrl: string,
  updates: { 
    id: string; 
    studentId?: string; 
    nisn?: string; 
    nipd?: string; 
    status: string; 
    ket: string; 
    nama?: string;
    timestamp?: string;
    vervalOleh?: string;
    verval_oleh?: string;
  }[]
): Promise<boolean> {
  if (!webAppUrl) return false;
  try {
    const payload = {
      action: 'batch_update',
      updates: updates.map(u => ({
        id: u.nama ? u.nama.trim() : u.id,
        studentId: u.studentId || u.id,
        nisn: u.nisn || '',
        nipd: u.nipd || '',
        nama: u.nama || '',
        status: u.status,
        ket: u.ket !== undefined ? u.ket : '',
        timestamp: u.timestamp || '',
        vervalOleh: u.vervalOleh || (u as any).verval_oleh || '',
        verval_oleh: u.verval_oleh || u.vervalOleh || ''
      }))
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors' // Google Apps Script redirects require text/plain with no-cors or standard POST
    });
    return true;
  } catch (err) {
    console.warn('Direct Google Apps Script sync failed:', err);
    return false;
  }
}

/**
 * Send student save (create / update) directly to Google Apps Script Web App
 */
export async function saveStudentDirectly(
  webAppUrl: string,
  studentData: Partial<Student>,
  isUpdate: boolean
): Promise<boolean> {
  if (!webAppUrl) return false;
  try {
    const normalized = normalizeStudent(studentData);
    const payload = {
      action: isUpdate ? 'update' : 'create',
      student: normalized,
      data: normalized,
      id: studentData.id || studentData.nipd || studentData.nisn
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
    return true;
  } catch (err) {
    console.warn('Direct Google Apps Script save failed:', err);
    return false;
  }
}

/**
 * Send full student dataset to Google Apps Script Web App (Import/Sync All)
 */
/**
 * Fetch GTK directly from Google Sheets GViz API or Google Apps Script Web App (?sheet=gtk).
 */
export async function fetchGTKDirectly(config: AppConfig): Promise<GTKData[] | null> {
  const ssId = config.spreadsheetId || SPREADSHEET_ID;
  const sheet = SHEET_NAME_GTK || 'gtk';

  // 1. Try Google Sheets GViz API
  if (ssId) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${ssId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}&_t=${Date.now()}`;
      const res = await fetch(gvizUrl, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const text = await res.text();
        const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          const rawRows = parsed.table?.rows || [];

          if (rawRows.length > 1) {
            const headerRow = rawRows[0].c.map((cell: any) => cell && cell.v !== null ? String(cell.v).trim() : '');
            const parsedGTK: GTKData[] = [];

            for (let i = 1; i < rawRows.length; i++) {
              const row = rawRows[i].c;
              if (!row) continue;
              const obj: any = { rowIndex: i + 1 };

              headerRow.forEach((header: string, colIdx: number) => {
                if (!header) return;
                const cell = row[colIdx];
                let strVal = '';
                if (cell && cell.v !== null && cell.v !== undefined) {
                  if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
                    strVal = cell.f || cell.v;
                  } else {
                    strVal = String(cell.v).trim();
                  }
                }
                obj[header] = strVal;
                const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                obj[hClean] = strVal;

                if (hClean === 'no') obj.no = strVal;
                if (hClean === 'nama') obj.nama = strVal;
                if (hClean === 'nuptk') obj.nuptk = strVal;
                if (hClean === 'jk') obj.jk = strVal;
                if (hClean === 'tempatlahir' || hClean === 'tlahir') obj.tempatLahir = strVal;
                if (hClean === 'tanggallahir' || hClean === 'tgllahir') obj.tanggalLahir = parseToYYYYMMDD(strVal);
                if (hClean === 'nip') obj.nip = strVal;
                if (hClean === 'statuskepegawaian') obj.statusKepegawaian = strVal;
                if (hClean === 'jenisptk') obj.jenisPtk = strVal;
                if (hClean === 'jenjang') obj.jenjang = strVal;
                if (hClean === 'tugastambahan') obj.tugasTambahan = strVal;
                if (hClean === 'jabatanptk' || hClean === 'jabatan') {
                  obj.jabatanPtk = strVal;
                  obj.jabatan_ptk = strVal;
                }
                if (hClean === 'agama') obj.agama = strVal;
                if (hClean === 'alamatjalan' || hClean === 'alamat') obj.alamatJalan = strVal;
                if (hClean === 'rt') obj.rt = strVal;
                if (hClean === 'rw') obj.rw = strVal;
                if (hClean === 'namadusun' || hClean === 'dusun') obj.namaDusun = strVal;
                if (hClean === 'desakelurahan' || hClean === 'kelurahan' || hClean === 'desa') obj.desaKelurahan = strVal;
                if (hClean === 'kecamatan') obj.kecamatan = strVal;
                if (hClean === 'kodepos') obj.kodePos = strVal;
                if (hClean === 'telepon') obj.telepon = strVal;
                if (hClean === 'hp' || hClean === 'nohp') obj.hp = strVal;
                if (hClean === 'email') obj.email = strVal;
                if (hClean === 'tugastambahan') obj.tugasTambahan = strVal;
                if (hClean === 'skcpns') obj.skCpns = strVal;
                if (hClean === 'tanggalcpns') obj.tanggalCpns = parseToYYYYMMDD(strVal);
                if (hClean === 'skpengangkatan') obj.skPengangkatan = strVal;
                if (hClean === 'tmtpengangkatan') obj.tmtPengangkatan = parseToYYYYMMDD(strVal);
                if (hClean === 'lembagapengangkatan') obj.lembagaPengangkatan = strVal;
                if (hClean === 'pangkatgolongan' || hClean === 'golongan') obj.pangkatGolongan = strVal;
                if (hClean === 'sumbergaji') obj.sumberGaji = strVal;
                if (hClean === 'namaibukandung' || hClean === 'namaibu') obj.namaIbuKandung = strVal;
                if (hClean === 'statusperkawinan') obj.statusPerkawinan = strVal;
                if (hClean === 'namasuamiistri') obj.namaSuamiIstri = strVal;
                if (hClean === 'nipsuamiistri') obj.nipSuamiIstri = strVal;
                if (hClean === 'pekerjaansuamiistri') obj.pekerjaanSuamiIstri = strVal;
                if (hClean === 'tmtpns') obj.tmtPns = parseToYYYYMMDD(strVal);
                if (hClean === 'sudahlisensikepalasekolah') obj.sudahLisensiKepalaSekolah = strVal;
                if (hClean === 'pernahdiklatkepengawasan') obj.pernahDiklatKepengawasan = strVal;
                if (hClean === 'keahlianbraille') obj.keahlianBraille = strVal;
                if (hClean === 'keahlianbahasaisyarat') obj.keahlianBahasaIsyarat = strVal;
                if (hClean === 'npwp') obj.npwp = strVal;
                if (hClean === 'namawajibpajak') obj.namaWajibPajak = strVal;
                if (hClean === 'kewarganegaraan') obj.kewarganegaraan = strVal;
                if (hClean === 'bank') obj.bank = strVal;
                if (hClean === 'nomorrekeningbank' || hClean === 'norek') obj.nomorRekeningBank = strVal;
                if (hClean === 'rekeningatasnama' || hClean === 'reknama') obj.rekeningAtasNama = strVal;
                if (hClean === 'nik') obj.nik = strVal;
                if (hClean === 'nokk') obj.noKk = strVal;
                if (hClean === 'karpeg') obj.karpeg = strVal;
                if (hClean === 'kariskarsu') obj.karisKarsu = strVal;
                if (hClean === 'lintang') obj.lintang = strVal;
                if (hClean === 'bujur') obj.bujur = strVal;
                if (hClean === 'nuks') obj.nuks = strVal;
                if (hClean === 'statuslogin' || hClean === 'status_login' || hClean === 'role') {
                  obj.status_login = strVal;
                  obj.statusLogin = strVal;
                }
                if (
                  hClean === 'aksesmenu' ||
                  hClean === 'akses_menu' ||
                  hClean === 'statusmenu' ||
                  hClean === 'status_menu' ||
                  hClean === 'hakakses' ||
                  hClean === 'hak_akses' ||
                  hClean === 'menuakses' ||
                  hClean === 'menu_akses' ||
                  hClean === 'izinmenu' ||
                  hClean === 'izin_menu' ||
                  hClean === 'akses' ||
                  hClean === 'menu'
                ) {
                  obj.akses_menu = strVal;
                  obj.aksesMenu = strVal;
                  obj.status_menu = strVal;
                  obj.statusMenu = strVal;
                  obj.hak_akses = strVal;
                  obj.hakAkses = strVal;
                }
              });

              let baseId = obj.nip && obj.nip !== '-' ? obj.nip : (obj.nuptk && obj.nuptk !== '-' ? obj.nuptk : `GTK-${i}`);
              obj.id = baseId;

              if (obj.nama) {
                parsedGTK.push(obj as GTKData);
              }
            }

            // Fetch and enrich with sheet 'ptk' data matched by NUPTK
            if (parsedGTK.length > 0) {
              try {
                const ptkGvizUrl = `https://docs.google.com/spreadsheets/d/${ssId}/gviz/tq?tqx=out:json&sheet=ptk&_t=${Date.now()}`;
                const ptkRes = await fetch(ptkGvizUrl, { signal: AbortSignal.timeout(10000) });
                if (ptkRes.ok) {
                  const ptkText = await ptkRes.text();
                  const ptkJsonText = ptkText.substring(ptkText.indexOf('{'), ptkText.lastIndexOf('}') + 1);
                  if (ptkJsonText) {
                    const parsedPtk = JSON.parse(ptkJsonText);
                    const ptkRows = parsedPtk.table?.rows || [];
                    if (ptkRows.length > 1) {
                      const ptkHeaders = ptkRows[0].c.map((cell: any) => cell && cell.v !== null ? String(cell.v).trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '');
                      const nuptkCol = ptkHeaders.indexOf('nuptk');
                      const jenjangCol = ptkHeaders.indexOf('jenjang');
                      const tugasCol = ptkHeaders.indexOf('tugastambahan');
                      const jabCol = ptkHeaders.indexOf('jabatanptk') >= 0 ? ptkHeaders.indexOf('jabatanptk') : ptkHeaders.indexOf('jabatan');

                      if (nuptkCol >= 0) {
                        const ptkMap = new Map<string, any>();
                        for (let r = 1; r < ptkRows.length; r++) {
                          const rCells = ptkRows[r].c;
                          if (!rCells) continue;
                          const rawNuptk = rCells[nuptkCol] && rCells[nuptkCol].v !== null ? String(rCells[nuptkCol].v).replace(/[^a-zA-Z0-9]/g, '').trim() : '';
                          if (rawNuptk) {
                            ptkMap.set(rawNuptk, {
                              jenjang: jenjangCol >= 0 && rCells[jenjangCol] && rCells[jenjangCol].v !== null ? String(rCells[jenjangCol].v).trim() : '',
                              tugasTambahan: tugasCol >= 0 && rCells[tugasCol] && rCells[tugasCol].v !== null ? String(rCells[tugasCol].v).trim() : '',
                              jabatanPtk: jabCol >= 0 && rCells[jabCol] && rCells[jabCol].v !== null ? String(rCells[jabCol].v).trim() : ''
                            });
                          }
                        }

                        if (ptkMap.size > 0) {
                          parsedGTK.forEach((gtk) => {
                            const gNuptk = String(gtk.nuptk || '').replace(/[^a-zA-Z0-9]/g, '').trim();
                            if (gNuptk && ptkMap.has(gNuptk)) {
                              const ptkInfo = ptkMap.get(gNuptk);
                              if (ptkInfo.jenjang) gtk.jenjang = ptkInfo.jenjang;
                              if (ptkInfo.tugasTambahan) gtk.tugasTambahan = ptkInfo.tugasTambahan;
                              if (ptkInfo.jabatanPtk) {
                                gtk.jabatanPtk = ptkInfo.jabatanPtk;
                                gtk.jabatan_ptk = ptkInfo.jabatanPtk;
                              }
                            }
                          });
                        }
                      }
                    }
                  }
                }
              } catch {}

              safeSetItem(LOCAL_STORAGE_GTK_KEY, parsedGTK);
              return parsedGTK;
            }
          }
        }
      }
    } catch (err) {
      console.warn('GViz GTK fetch failed:', err);
    }
  }

  // 2. Try Google Apps Script Web App (?sheet=gtk)
  if (config.webAppUrl) {
    try {
      const url = config.webAppUrl + (config.webAppUrl.includes('?') ? '&' : '?') + 'sheet=gtk&_t=' + Date.now();
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData && remoteData.status === 'success' && Array.isArray(remoteData.data) && remoteData.data.length > 0) {
          safeSetItem(LOCAL_STORAGE_GTK_KEY, remoteData.data);
          return remoteData.data;
        }
      }
    } catch (err) {
      console.warn('Web App GTK fetch failed:', err);
    }
  }

  // 3. Fallback to cached data
  const cached = safeGetItem<GTKData[] | null>(LOCAL_STORAGE_GTK_KEY, null);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached;
  }

  return null;
}

/**
 * Fetch Riwayat Pangkat directly from Google Sheets (sheet: pangkat or naikpangkat)
 */
export async function fetchPangkatDirectly(config: AppConfig): Promise<RiwayatPangkat[] | null> {
  const ssId = config.spreadsheetId || SPREADSHEET_ID;

  // 1. First try Google Apps Script Web App (?sheet=pangkat or ?sheet=naikpangkat) - Most accurate, preserves text dates and values
  if (config.webAppUrl) {
    const sheetParams = ['naikpangkat', 'pangkat'];
    for (const sp of sheetParams) {
      try {
        const url = config.webAppUrl + (config.webAppUrl.includes('?') ? '&' : '?') + 'sheet=' + sp;
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (response.ok) {
          const remoteData = await response.json();
          if (remoteData && remoteData.status === 'success' && Array.isArray(remoteData.data) && remoteData.data.length > 0) {
            const uniqueMap = new Map<string, RiwayatPangkat>();
            remoteData.data.forEach((item: any, idx: number) => {
              const nip = (item.nip || '').trim();
              const noSkKey = (item.noSk || item.no_sk || item.nosk || '').trim();
              const golKey = (item.gol || item.golongan || '').trim();
              const tmtKey = (item.tmt || '').trim();
              const isPlaceholder = !noSkKey || noSkKey === '-' || noSkKey === '0';
              const key = nip
                ? `${nip}_${isPlaceholder ? 'nosk' : noSkKey}_${golKey}_${tmtKey || `idx-${idx}`}`
                : `idx-${idx}`;
              const formattedItem: RiwayatPangkat = {
                id: item.id || `PANGKAT-${item.nip ? item.nip + '-' : ''}${idx + 1}`,
                no: item.no || idx + 1,
                nip: item.nip || '',
                nama: item.nama || '',
                gol: item.gol || item.golongan || '',
                noSk: item.noSk || item.no_sk || item.nosk || '',
                tglSk: item.tglSk || item.tgl_sk || item.tglsk || '',
                tmt: item.tmt || '',
                masaKerjaThn: Number(item.masaKerjaThn !== undefined ? item.masaKerjaThn : (item.masa_kerja_thn || item.masakerjathn || 0)),
                masaKerjaBln: Number(item.masaKerjaBln !== undefined ? item.masaKerjaBln : (item.masa_kerja_bln || item.masakerjabln || 0)),
                timestamp: item.timestamp || '',
                status: item.status || 'Aktif',
                keterangan: item.keterangan || ''
              };
              uniqueMap.set(key, formattedItem);
            });
            const cleanList = Array.from(uniqueMap.values());
            safeSetItem(LOCAL_STORAGE_PANGKAT_KEY, cleanList);
            return cleanList;
          }
        }
      } catch (err) {
        // try next
      }
    }
  }

  // 2. Fallback to Google Sheets GViz API with candidate sheet names
  if (ssId) {
    const candidates = ['pangkat', 'naikpangkat', 'naik_pangkat'];
    for (const sheet of candidates) {
      try {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${ssId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}&_t=${Date.now()}`;
        const res = await fetch(gvizUrl, { signal: AbortSignal.timeout(15000) });
        if (res.ok) {
          const text = await res.text();
          const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            const rawRows = parsed.table?.rows || [];
            const cols = parsed.table?.cols || [];
            if (rawRows.length === 0) continue;

            let headerRow: string[] = [];
            let startIdx = 0;

            const hasColLabels = cols.some((c: any) => c.label && c.label.trim() !== '');
            if (hasColLabels) {
              headerRow = cols.map((c: any) => (c.label || '').trim());
              startIdx = 0;
            } else {
              headerRow = rawRows[0]?.c?.map((cell: any) => cell && cell.v !== null ? String(cell.v).trim() : '') || [];
              startIdx = 1;
            }

            // Safety check: if sheet is student data fallback, skip
            const headerRowStr = headerRow.join(' ').toLowerCase();
            if ((headerRowStr.includes('nipd') || headerRowStr.includes('nisn') || headerRowStr.includes('rombel')) && !headerRowStr.includes('gol') && !headerRowStr.includes('sk')) {
              continue;
            }

            const uniqueMap = new Map<string, RiwayatPangkat>();

            for (let i = startIdx; i < rawRows.length; i++) {
              const row = rawRows[i]?.c;
              if (!row) continue;
              const obj: any = { rowIndex: i + 1 };

              headerRow.forEach((header: string, colIdx: number) => {
                if (!header) return;
                const cell = row[colIdx];
                let strVal = '';
                if (cell && cell.v !== null && cell.v !== undefined) {
                  if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
                    if (cell.f) {
                      strVal = cell.f;
                    } else {
                      const match = cell.v.match(/Date\((\d+),(\d+),(\d+)\)/);
                      if (match) {
                        const y = match[1];
                        const m = String(Number(match[2]) + 1).padStart(2, '0');
                        const d = String(match[3]).padStart(2, '0');
                        strVal = `${y}-${m}-${d}`;
                      } else {
                        strVal = cell.v;
                      }
                    }
                  } else {
                    strVal = cell.f || String(cell.v).trim();
                  }
                }
                obj[header] = strVal;
                const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                obj[hClean] = strVal;

                if (hClean === 'no') obj.no = strVal;
                if (hClean === 'nip') obj.nip = strVal;
                if (hClean === 'nama') obj.nama = strVal;
                if (hClean === 'gol' || hClean === 'golongan') obj.gol = strVal;
                if (hClean === 'nosk') obj.noSk = strVal;
                if (hClean === 'tglsk') obj.tglSk = parseToYYYYMMDD(strVal);
                if (hClean === 'tmt') obj.tmt = parseToYYYYMMDD(strVal);
                if (hClean === 'masakerjathn' || hClean === 'masakerjatahun') obj.masaKerjaThn = Number(strVal) || 0;
                if (hClean === 'masakerjabln' || hClean === 'masakerjabulan') obj.masaKerjaBln = Number(strVal) || 0;
                if (hClean === 'timestamp') obj.timestamp = strVal;
                if (hClean === 'status') obj.status = strVal;
              });

              obj.id = `PANGKAT-${obj.nip ? obj.nip + '-' : ''}${i}`;
              if (obj.nama && obj.nama.toLowerCase() !== 'nama' && (obj.nip || obj.gol || obj.noSk)) {
                const nip = (obj.nip || '').trim();
                const noSkKey = (obj.noSk || '').trim();
                const golKey = (obj.gol || '').trim();
                const tmtKey = (obj.tmt || '').trim();
                const isPlaceholder = !noSkKey || noSkKey === '-' || noSkKey === '0';
                const key = nip
                  ? `${nip}_${isPlaceholder ? 'nosk' : noSkKey}_${golKey}_${tmtKey || obj.id}`
                  : obj.id;
                uniqueMap.set(key, obj as RiwayatPangkat);
              }
            }

            const parsedList = Array.from(uniqueMap.values());
            if (parsedList.length > 0) {
              safeSetItem(LOCAL_STORAGE_PANGKAT_KEY, parsedList);
              return parsedList;
            }
          }
        }
      } catch (err) {
        // try next candidate
      }
    }
  }

  // 3. Fallback to cached data
  const cached = safeGetItem<RiwayatPangkat[] | null>(LOCAL_STORAGE_PANGKAT_KEY, null);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached;
  }

  return null;
}

/**
 * Save single Riwayat Pangkat directly to Google Apps Script Web App
 */
export async function savePangkatDirectly(
  webAppUrl: string,
  pangkatData: Partial<RiwayatPangkat>,
  isUpdate: boolean
): Promise<{ success: boolean; message?: string }> {
  if (!webAppUrl) return { success: false, message: 'URL Web App belum dikonfigurasi' };
  try {
    const formattedTglSk = formatToDDMMYYYY(pangkatData.tglSk || '');
    const formattedTmt = formatToDDMMYYYY(pangkatData.tmt || '');
    const payload = {
      action: isUpdate ? 'updatePangkat' : 'createPangkat',
      target: 'naikpangkat',
      item: {
        no: pangkatData.no || '',
        nip: pangkatData.nip || '',
        nama: pangkatData.nama || '',
        gol: pangkatData.gol || '',
        noSk: pangkatData.noSk || '',
        no_sk: pangkatData.noSk || '',
        tglSk: formattedTglSk,
        tgl_sk: formattedTglSk,
        tmt: formattedTmt,
        masaKerjaThn: pangkatData.masaKerjaThn || 0,
        masa_kerja_thn: pangkatData.masaKerjaThn || 0,
        masaKerjaBln: pangkatData.masaKerjaBln || 0,
        masa_kerja_bln: pangkatData.masaKerjaBln || 0,
        timestamp: pangkatData.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: pangkatData.status || 'Aktif'
      }
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
      signal: AbortSignal.timeout(6000)
    });
    return { success: true, message: 'Data riwayat kepangkatan berhasil dikirim ke Google Sheets (sheet: naikpangkat)' };
  } catch (err: any) {
    console.warn('Direct Google Apps Script save pangkat failed:', err);
    return { success: false, message: err?.message || 'Gagal mengirim data ke Google Sheets' };
  }
}

/**
 * Sync all Riwayat Pangkat directly to Google Apps Script Web App
 */
export async function syncAllPangkatDirectly(
  webAppUrl: string,
  items: RiwayatPangkat[]
): Promise<boolean> {
  if (!webAppUrl || !items.length) return false;
  try {
    const payload = {
      action: 'syncAll',
      target: 'naikpangkat',
      items: items.map((p, idx) => {
        const formattedTglSk = formatToDDMMYYYY(p.tglSk || '');
        const formattedTmt = formatToDDMMYYYY(p.tmt || '');
        return {
          no: p.no || idx + 1,
          nip: p.nip || '',
          nama: p.nama || '',
          gol: p.gol || '',
          noSk: p.noSk || '',
          no_sk: p.noSk || '',
          tglSk: formattedTglSk,
          tgl_sk: formattedTglSk,
          tmt: formattedTmt,
          masaKerjaThn: p.masaKerjaThn || 0,
          masa_kerja_thn: p.masaKerjaThn || 0,
          masaKerjaBln: p.masaKerjaBln || 0,
          masa_kerja_bln: p.masaKerjaBln || 0,
          timestamp: p.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
          status: p.status || 'Aktif'
        };
      })
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
      signal: AbortSignal.timeout(8000)
    });
    return true;
  } catch (err) {
    console.warn('Direct Google Apps Script syncAll pangkat failed:', err);
    return false;
  }
}

/**
 * Fetch Riwayat KGB directly from Google Sheets (sheet: kgb) or Apps Script Web App (?sheet=kgb).
 */
export async function fetchKGBDirectly(config: AppConfig): Promise<RiwayatKGB[] | null> {
  const ssId = config.spreadsheetId || SPREADSHEET_ID;

  // 1. First try Google Apps Script Web App (?sheet=kgb) - Most accurate, preserves text dates and values
  if (config.webAppUrl) {
    try {
      const url = config.webAppUrl + (config.webAppUrl.includes('?') ? '&' : '?') + 'sheet=kgb';
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData && remoteData.status === 'success' && Array.isArray(remoteData.data) && remoteData.data.length > 0) {
          const uniqueMap = new Map<string, RiwayatKGB>();
          remoteData.data.forEach((item: any, idx: number) => {
            const nip = (item.nip || '').trim();
            const noSkKey = (item.noSk || item.no_sk || item.nosk || '').trim();
            const tmtKey = (item.tmt || item.TMT_kgb || item.tmt_kgb || item.tmtkgb || '').trim();
            const isPlaceholder = !noSkKey || noSkKey === '-' || noSkKey === '0';
            const key = nip
              ? `${nip}_${isPlaceholder ? 'nosk' : noSkKey}_${tmtKey || `idx-${idx}`}`
              : `idx-${idx}`;
            const formattedItem: RiwayatKGB = {
              id: item.id || `KGB-${item.nip ? item.nip + '-' : ''}${idx + 1}`,
              no: item.no || idx + 1,
              nip: item.nip || '',
              nama: item.nama || '',
              gol: item.gol || item.golongan || '',
              noSk: item.noSk || item.no_sk || item.nosk || '',
              tglSk: item.tglSk || item.tgl_sk || item.tglsk || '',
              tmt: item.tmt || item.TMT_kgb || item.tmt_kgb || item.tmtkgb || '',
              masaKerjaThn: Number(item.masaKerjaThn !== undefined ? item.masaKerjaThn : (item.masa_kerja_tahun || item.masakerjatahun || 0)),
              masaKerjaBln: Number(item.masaKerjaBln !== undefined ? item.masaKerjaBln : (item.masa_kerja_bln || item.masakerjabln || 0)),
              gajiPokok: Number(item.gajiPokok !== undefined ? item.gajiPokok : (item.gaji_pokok || item.gajipokok || 0)),
              timestamp: item.timestamp || '',
              status: item.status || 'Aktif',
              keterangan: item.keterangan || ''
            };
            uniqueMap.set(key, formattedItem);
          });
          const cleanList = Array.from(uniqueMap.values());
          safeSetItem(LOCAL_STORAGE_KGB_KEY, cleanList);
          return cleanList;
        }
      }
    } catch (err) {
      console.warn('Web App KGB fetch warning, falling back to GViz:', err);
    }
  }

  // 2. Fallback to Google Sheets GViz API with candidate sheet names
  if (ssId) {
    const candidates = ['kgb', 'riwayat_kgb', 'gaji_berkala', 'gajiberkala'];
    for (const sheet of candidates) {
      try {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${ssId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}&_t=${Date.now()}`;
        const res = await fetch(gvizUrl, { signal: AbortSignal.timeout(15000) });
        if (res.ok) {
          const text = await res.text();
          const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            const rawRows = parsed.table?.rows || [];
            const cols = parsed.table?.cols || [];
            if (rawRows.length === 0) continue;

            let headerRow: string[] = [];
            let startIdx = 0;

            const hasColLabels = cols.some((c: any) => c.label && c.label.trim() !== '');
            if (hasColLabels) {
              headerRow = cols.map((c: any) => (c.label || '').trim());
              startIdx = 0;
            } else {
              headerRow = rawRows[0]?.c?.map((cell: any) => cell && cell.v !== null ? String(cell.v).trim() : '') || [];
              startIdx = 1;
            }

            // Safety check: if sheet is student data fallback, skip
            const headerRowStr = headerRow.join(' ').toLowerCase();
            if ((headerRowStr.includes('nipd') || headerRowStr.includes('nisn') || headerRowStr.includes('rombel')) && !headerRowStr.includes('gol') && !headerRowStr.includes('sk') && !headerRowStr.includes('gaji')) {
              continue;
            }

            const uniqueMap = new Map<string, RiwayatKGB>();

            for (let i = startIdx; i < rawRows.length; i++) {
              const row = rawRows[i]?.c;
              if (!row) continue;
              const obj: any = { rowIndex: i + 1 };

              headerRow.forEach((header: string, colIdx: number) => {
                if (!header) return;
                const cell = row[colIdx];
                let strVal = '';
                if (cell && cell.v !== null && cell.v !== undefined) {
                  if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
                    if (cell.f) {
                      strVal = cell.f;
                    } else {
                      const match = cell.v.match(/Date\((\d+),(\d+),(\d+)\)/);
                      if (match) {
                        const y = match[1];
                        const m = String(Number(match[2]) + 1).padStart(2, '0');
                        const d = String(match[3]).padStart(2, '0');
                        strVal = `${y}-${m}-${d}`;
                      } else {
                        strVal = cell.v;
                      }
                    }
                  } else {
                    strVal = cell.f || String(cell.v).trim();
                  }
                }
                obj[header] = strVal;
                const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                obj[hClean] = strVal;

                if (hClean === 'no') obj.no = strVal;
                if (hClean === 'nip') obj.nip = strVal;
                if (hClean === 'nama') obj.nama = strVal;
                if (hClean === 'gol' || hClean === 'golongan') obj.gol = strVal;
                if (hClean === 'nosk') obj.noSk = strVal;
                if (hClean === 'tglsk') obj.tglSk = parseToYYYYMMDD(strVal);
                if (hClean === 'tmtkgb' || hClean === 'tmt') obj.tmt = parseToYYYYMMDD(strVal);
                if (hClean === 'masakerjatahun' || hClean === 'masakerjathn') obj.masaKerjaThn = Number(strVal) || 0;
                if (hClean === 'masakerjabln' || hClean === 'masakerjabulan') obj.masaKerjaBln = Number(strVal) || 0;
                if (hClean === 'gajipokok' || hClean === 'gaji') {
                  const cleanNum = String(strVal).replace(/[^0-9]/g, '');
                  obj.gajiPokok = Number(cleanNum) || 0;
                }
                if (hClean === 'timestamp') obj.timestamp = strVal;
                if (hClean === 'status') obj.status = strVal;
              });

              obj.id = `KGB-${obj.nip ? obj.nip + '-' : ''}${i}`;
              if (obj.nama && obj.nama.toLowerCase() !== 'nama' && (obj.nip || obj.gol || obj.noSk || obj.gajiPokok)) {
                const nip = (obj.nip || '').trim();
                const noSkKey = (obj.noSk || '').trim();
                const tmtKey = (obj.tmt || '').trim();
                const isPlaceholder = !noSkKey || noSkKey === '-' || noSkKey === '0';
                const key = nip
                  ? `${nip}_${isPlaceholder ? 'nosk' : noSkKey}_${tmtKey || obj.id}`
                  : obj.id;
                uniqueMap.set(key, obj as RiwayatKGB);
              }
            }

            const parsedList = Array.from(uniqueMap.values());
            if (parsedList.length > 0) {
              safeSetItem(LOCAL_STORAGE_KGB_KEY, parsedList);
              return parsedList;
            }
          }
        }
      } catch (err) {
        // try next candidate
      }
    }
  }

  // 3. Fallback to cached data
  const cached = safeGetItem<RiwayatKGB[] | null>(LOCAL_STORAGE_KGB_KEY, null);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached;
  }

  return null;
}

/**
 * Save single Riwayat KGB directly to Google Apps Script Web App
 */
export async function saveKGBDirectly(
  webAppUrl: string,
  kgbData: Partial<RiwayatKGB>,
  isUpdate: boolean
): Promise<{ success: boolean; message?: string }> {
  if (!webAppUrl) return { success: false, message: 'URL Web App belum dikonfigurasi' };
  try {
    const formattedTglSk = formatToDDMMYYYY(kgbData.tglSk || '');
    const formattedTmt = formatToDDMMYYYY(kgbData.tmt || '');
    const payload = {
      action: isUpdate ? 'updateKGB' : 'createKGB',
      target: 'kgb',
      item: {
        no: kgbData.no || '',
        nip: kgbData.nip || '',
        nama: kgbData.nama || '',
        gol: kgbData.gol || '',
        noSk: kgbData.noSk || '',
        no_sk: kgbData.noSk || '',
        tglSk: formattedTglSk,
        tgl_sk: formattedTglSk,
        tmt: formattedTmt,
        TMT_kgb: formattedTmt,
        tmt_kgb: formattedTmt,
        masaKerjaThn: kgbData.masaKerjaThn || 0,
        masa_kerja_tahun: kgbData.masaKerjaThn || 0,
        masaKerjaBln: kgbData.masaKerjaBln || 0,
        masa_kerja_bln: kgbData.masaKerjaBln || 0,
        gajiPokok: kgbData.gajiPokok || 0,
        gaji_pokok: kgbData.gajiPokok || 0,
        timestamp: kgbData.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: kgbData.status || 'Aktif'
      }
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
      signal: AbortSignal.timeout(6000)
    });
    return { success: true, message: 'Data riwayat KGB berhasil dikirim ke Google Sheets (sheet: kgb)' };
  } catch (err: any) {
    console.warn('Direct Google Apps Script save KGB failed:', err);
    return { success: false, message: err?.message || 'Gagal mengirim data ke Google Sheets' };
  }
}

/**
 * Sync all Riwayat KGB directly to Google Apps Script Web App
 */
export async function syncAllKGBDirectly(
  webAppUrl: string,
  items: RiwayatKGB[]
): Promise<boolean> {
  if (!webAppUrl || !items.length) return false;
  try {
    const payload = {
      action: 'syncAll',
      target: 'kgb',
      items: items.map((k, idx) => {
        const formattedTglSk = formatToDDMMYYYY(k.tglSk || '');
        const formattedTmt = formatToDDMMYYYY(k.tmt || '');
        return {
          no: k.no || idx + 1,
          nip: k.nip || '',
          nama: k.nama || '',
          gol: k.gol || '',
          noSk: k.noSk || '',
          no_sk: k.noSk || '',
          tglSk: formattedTglSk,
          tgl_sk: formattedTglSk,
          tmt: formattedTmt,
          TMT_kgb: formattedTmt,
          tmt_kgb: formattedTmt,
          masaKerjaThn: k.masaKerjaThn || 0,
          masa_kerja_tahun: k.masaKerjaThn || 0,
          masaKerjaBln: k.masaKerjaBln || 0,
          masa_kerja_bln: k.masaKerjaBln || 0,
          gajiPokok: k.gajiPokok || 0,
          gaji_pokok: k.gajiPokok || 0,
          timestamp: k.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
          status: k.status || 'Aktif'
        };
      })
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
      signal: AbortSignal.timeout(8000)
    });
    return true;
  } catch (err) {
    console.warn('Direct Google Apps Script syncAll KGB failed:', err);
    return false;
  }
}

/**
 * Delete a Riwayat KGB row directly via Google Apps Script Web App
 */
export async function deleteKGBDirectly(
  webAppUrl: string,
  item: { nip?: string; noSk?: string; tmt?: string }
): Promise<boolean> {
  if (!webAppUrl) return false;
  try {
    const payload = {
      action: 'delete',
      target: 'kgb',
      item: {
        nip: item.nip || '',
        noSk: item.noSk || '',
        no_sk: item.noSk || '',
        tmt: formatToDDMMYYYY(item.tmt || '')
      }
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
    return true;
  } catch (err) {
    console.warn('Direct Google Apps Script delete KGB failed:', err);
    return false;
  }
}

/**
 * Delete a Riwayat Pangkat row directly via Google Apps Script Web App
 */
export async function deletePangkatDirectly(
  webAppUrl: string,
  item: { nip?: string; noSk?: string; tmt?: string }
): Promise<boolean> {
  if (!webAppUrl) return false;
  try {
    const payload = {
      action: 'delete',
      target: 'naikpangkat',
      item: {
        nip: item.nip || '',
        noSk: item.noSk || '',
        no_sk: item.noSk || '',
        tmt: formatToDDMMYYYY(item.tmt || '')
      }
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
    return true;
  } catch (err) {
    console.warn('Direct Google Apps Script delete Pangkat failed:', err);
    return false;
  }
}

/**
 * Update GTK akses menu and role directly via Google Apps Script Web App
 */
export async function updateGTKAksesMenuDirectly(
  webAppUrl: string,
  gtk: Partial<GTKData>
): Promise<boolean> {
  if (!webAppUrl) return false;
  try {
    const payload = {
      action: 'update',
      target: 'gtk',
      gtk: {
        ...gtk,
        akses_menu: gtk.akses_menu || '',
        status_login: gtk.status_login || 'user'
      }
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
    return true;
  } catch (err) {
    console.warn('Direct Google Apps Script update GTK akses menu failed:', err);
    return false;
  }
}

/**
 * Fetch Mutasi Masuk directly from Google Sheets (sheet: mutasi_masuk) or Apps Script Web App (?sheet=mutasi_masuk).
 * Headers: No, NISN, Nama_Siswa, Provinsi, Kab_kota, Kecamatan, Nama_Sekolah, Rombel_Tujuan, Status, Timestamp
 */
export async function fetchMutasiMasukDirectly(config: AppConfig): Promise<MutasiMasukItem[] | null> {
  const ssId = config.spreadsheetId || SPREADSHEET_ID;

  // 1. Try Google Apps Script Web App (?sheet=mutasi_masuk)
  if (config.webAppUrl) {
    try {
      const url = config.webAppUrl + (config.webAppUrl.includes('?') ? '&' : '?') + 'sheet=mutasi_masuk';
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData && remoteData.status === 'success' && Array.isArray(remoteData.data) && remoteData.data.length > 0) {
          const list: MutasiMasukItem[] = remoteData.data.map((item: any, idx: number) => {
            const rawStatus = String(item.status || item.Status || '').trim().toLowerCase();
            const cleanStatus: 'Pending' | 'Diterima' = rawStatus === 'diterima' ? 'Diterima' : 'Pending';
            return {
              id: item.id || (item.nisn ? `MUT-IN-${item.nisn}` : `MUT-IN-${idx + 1}`),
              no: item.no || item.No || (idx + 1),
              nisn: String(item.nisn || item.NISN || '').trim(),
              nama: String(item.nama || item.Nama_Siswa || item.nama_siswa || '').trim(),
              provinsiNama: String(item.provinsiNama || item.Provinsi || item.provinsi || '').trim(),
              kabKotaNama: String(item.kabKotaNama || item.Kab_kota || item.kab_kota || item.kabupaten || '').trim(),
              kecamatanNama: String(item.kecamatanNama || item.Kecamatan || item.kecamatan || '').trim(),
              sekolahAsal: String(item.sekolahAsal || item.Nama_Sekolah || item.nama_sekolah || item.sekolahasal || '').trim(),
              rombelTujuan: String(item.rombelTujuan || item.Rombel_Tujuan || item.rombel_tujuan || '').trim(),
              status: cleanStatus,
              timestamp: String(item.timestamp || item.Timestamp || '').trim(),
              tanggalPengajuan: String(item.tanggalPengajuan || item.timestamp || '').split(' ')[0],
              rowIndex: item.rowIndex || idx + 2
            };
          });
          safeSetItem(LOCAL_STORAGE_MUTASI_MASUK_KEY, list);
          return list;
        }
      }
    } catch (err) {
      console.warn('Web App Mutasi Masuk fetch warning, falling back to GViz:', err);
    }
  }

  // 2. Fallback to Google Sheets GViz API with sheet 'mutasi_masuk'
  if (ssId) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${ssId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME_MUTASI_MASUK)}&_t=${Date.now()}`;
      const res = await fetch(gvizUrl, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const text = await res.text();
        const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          const rawRows = parsed.table?.rows || [];
          const cols = parsed.table?.cols || [];
          if (rawRows.length > 0) {
            let headerRow: string[] = [];
            let startIdx = 0;

            const hasColLabels = cols.some((c: any) => c.label && c.label.trim() !== '');
            if (hasColLabels) {
              headerRow = cols.map((c: any) => (c.label || '').trim());
              startIdx = 0;
            } else {
              headerRow = rawRows[0]?.c?.map((cell: any) => cell && cell.v !== null ? String(cell.v).trim() : '') || [];
              startIdx = 1;
            }

            const list: MutasiMasukItem[] = [];

            for (let i = startIdx; i < rawRows.length; i++) {
              const row = rawRows[i]?.c;
              if (!row) continue;
              const obj: any = { rowIndex: i + 1 };

              headerRow.forEach((header: string, colIdx: number) => {
                if (!header) return;
                const cell = row[colIdx];
                const strVal = cell && cell.v !== null && cell.v !== undefined ? String(cell.v).trim() : (cell && cell.f ? String(cell.f).trim() : '');
                obj[header] = strVal;
                const hClean = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                obj[hClean] = strVal;

                if (hClean === 'no') obj.no = Number(strVal) || i;
                if (hClean === 'nisn') obj.nisn = strVal;
                if (hClean === 'namasiswa' || hClean === 'nama') obj.nama = strVal;
                if (hClean === 'provinsi') obj.provinsiNama = strVal;
                if (hClean === 'kabkota' || hClean === 'kabupatenkota') obj.kabKotaNama = strVal;
                if (hClean === 'kecamatan') obj.kecamatanNama = strVal;
                if (hClean === 'namasekolah' || hClean === 'sekolahasal') obj.sekolahAsal = strVal;
                if (hClean === 'rombeltujuan' || hClean === 'rombel') obj.rombelTujuan = strVal;
                if (hClean === 'status') {
                  obj.status = strVal.toLowerCase() === 'diterima' ? 'Diterima' : 'Pending';
                }
                if (hClean === 'timestamp') obj.timestamp = strVal;
                if (hClean === 'tglmasuk' || hClean === 'tanggalmasuk') obj.tglMasuk = strVal;
              });

              // If row has minimal data (nisn or nama)
              if (obj.nisn || obj.nama) {
                const cleanStatus: 'Pending' | 'Diterima' = obj.status === 'Diterima' ? 'Diterima' : 'Pending';
                const dateOnlyText = formatToDDMMYYYY(obj.tglMasuk || obj.timestamp || '');
                list.push({
                  id: obj.nisn ? `MUT-IN-${obj.nisn}` : `MUT-IN-${i}`,
                  no: obj.no || i,
                  nisn: obj.nisn || '',
                  nama: obj.nama || '',
                  provinsiNama: obj.provinsiNama || '',
                  kabKotaNama: obj.kabKotaNama || '',
                  kecamatanNama: obj.kecamatanNama || '',
                  sekolahAsal: obj.sekolahAsal || '',
                  rombelTujuan: obj.rombelTujuan || '',
                  status: cleanStatus,
                  timestamp: obj.timestamp || '',
                  tglMasuk: dateOnlyText,
                  tanggalPengajuan: dateOnlyText,
                  rowIndex: i + 1
                });
              }
            }

            if (list.length > 0) {
              safeSetItem(LOCAL_STORAGE_MUTASI_MASUK_KEY, list);
              return list;
            }
          }
        }
      }
    } catch (err) {
      console.warn('GViz mutasi_masuk fetch failed:', err);
    }
  }

  // 3. Fallback to cached data
  const cached = safeGetItem<MutasiMasukItem[] | null>(LOCAL_STORAGE_MUTASI_MASUK_KEY, null);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached;
  }

  return null;
}

/**
 * Save single Mutasi Masuk directly to Google Apps Script Web App
 */
export async function saveMutasiMasukDirectly(
  webAppUrl: string,
  item: Partial<MutasiMasukItem>,
  isUpdate: boolean
): Promise<{ success: boolean; message?: string }> {
  const rawTs = item.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19);
  const dateOnlyText = formatToDDMMYYYY(item.tglMasuk || rawTs);

  const formattedItem = {
    no: item.no || '',
    nisn: item.nisn || '',
    nama: item.nama || '',
    nama_siswa: item.nama || '',
    provinsi: item.provinsiNama || '',
    kab_kota: item.kabKotaNama || '',
    kecamatan: item.kecamatanNama || '',
    nama_sekolah: item.sekolahAsal || '',
    sekolah_asal: item.sekolahAsal || '',
    rombel_tujuan: item.rombelTujuan || '',
    status: item.status === 'Diterima' ? 'Diterima' : 'Pending',
    timestamp: rawTs,
    tgl_masuk: dateOnlyText,
    tglmasuk: dateOnlyText,
    tanggal_masuk: dateOnlyText
  };

  // 1. Try server proxy /api/mutasi/masuk
  try {
    const sRes = await fetch('/api/mutasi/masuk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: formattedItem, isUpdate }),
      signal: AbortSignal.timeout(20000)
    });
    if (sRes.ok) {
      const sJson = await sRes.json();
      return { success: true, message: sJson.message || 'Data mutasi masuk berhasil disimpan ke Google Sheets (sheet: mutasi_masuk)' };
    }
  } catch (proxyErr) {
    console.warn('Proxy /api/mutasi/masuk error, falling back to direct Web App call:', proxyErr);
  }

  // 2. Direct Web App URL
  if (!webAppUrl) return { success: false, message: 'URL Web App belum dikonfigurasi' };
  try {
    const payload = {
      action: isUpdate ? 'updateMutasiMasuk' : 'createMutasiMasuk',
      target: 'mutasi_masuk',
      item: formattedItem
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
      signal: AbortSignal.timeout(6000)
    });
    return { success: true, message: 'Data mutasi masuk berhasil dikirim ke Google Sheets (sheet: mutasi_masuk)' };
  } catch (err: any) {
    console.warn('Direct Google Apps Script save mutasi masuk failed:', err);
    return { success: false, message: err?.message || 'Gagal mengirim data ke Google Sheets' };
  }
}

/**
 * Delete a Mutasi Masuk row directly via Google Apps Script Web App
 */
export async function deleteMutasiMasukDirectly(
  webAppUrl: string,
  item: { nisn?: string }
): Promise<boolean> {
  if (!webAppUrl) return false;
  try {
    const payload = {
      action: 'deleteMutasiMasuk',
      target: 'mutasi_masuk',
      item: {
        nisn: item.nisn || ''
      }
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
    return true;
  } catch (err) {
    console.warn('Direct Google Apps Script delete mutasi masuk failed:', err);
    return false;
  }
}

/**
 * Sync all Mutasi Masuk directly to Google Apps Script Web App
 */
export async function syncAllMutasiMasukDirectly(
  webAppUrl: string,
  items: MutasiMasukItem[]
): Promise<boolean> {
  if (!webAppUrl || !items.length) return false;
  try {
    const payload = {
      action: 'syncAllMutasiMasuk',
      target: 'mutasi_masuk',
      items: items.map((m, idx) => ({
        no: m.no || idx + 1,
        nisn: m.nisn || '',
        nama: m.nama || '',
        nama_siswa: m.nama || '',
        provinsi: m.provinsiNama || '',
        kab_kota: m.kabKotaNama || '',
        kecamatan: m.kecamatanNama || '',
        nama_sekolah: m.sekolahAsal || '',
        rombel_tujuan: m.rombelTujuan || '',
        status: m.status === 'Diterima' ? 'Diterima' : 'Pending',
        timestamp: m.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
        tgl_masuk: formatToDDMMYYYY(m.tglMasuk || m.timestamp || ''),
        tglmasuk: formatToDDMMYYYY(m.tglMasuk || m.timestamp || ''),
        tanggal_masuk: formatToDDMMYYYY(m.tglMasuk || m.timestamp || '')
      }))
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
      signal: AbortSignal.timeout(8000)
    });
    return true;
  } catch (err) {
    console.warn('Direct Google Apps Script syncAll mutasi masuk failed:', err);
    return false;
  }
}

/**
 * Fetch Mutasi Keluar directly from Google Sheets (sheet: mutasi_keluar) or Apps Script Web App (?sheet=mutasi_keluar).
 * Headers: No, NIPD, NISN, Nama, Tempat_Lahir, tgl_Lahir, Rombel, Ket_Mutasi, Pindah_Ke, tgl_mutasi, alasan_mutasi, upload_berkas, Status, Timestamp
 */
export async function fetchMutasiKeluarDirectly(config: AppConfig): Promise<MutasiKeluarItem[] | null> {
  const ssId = config.spreadsheetId || SPREADSHEET_ID;

  // 1. Try Google Apps Script Web App (?sheet=mutasi_keluar)
  if (config.webAppUrl) {
    try {
      const url = config.webAppUrl + (config.webAppUrl.includes('?') ? '&' : '?') + 'sheet=mutasi_keluar';
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData && remoteData.status === 'success' && Array.isArray(remoteData.data) && remoteData.data.length > 0) {
          const list: MutasiKeluarItem[] = remoteData.data.map((item: any, idx: number) => {
            return {
              id: item.id || (item.nisn ? `MUT-OUT-${item.nisn}` : (item.nipd ? `MUT-OUT-${item.nipd}` : `MUT-OUT-${idx + 1}`)),
              no: item.no || item.No || (idx + 1),
              nipd: String(item.nipd || item.NIPD || '').trim(),
              nisn: String(item.nisn || item.NISN || '').trim(),
              nama: String(item.nama || item.Nama || '').trim(),
              tempatLahir: String(item.tempatLahir || item.Tempat_Lahir || item.tempat_lahir || '').trim(),
              tglLahir: formatToDDMMYYYY(item.tglLahir || item.tgl_Lahir || item.tgl_lahir || ''),
              rombel: String(item.rombel || item.Rombel || item.kelas || '').trim(),
              ketMutasi: String(item.ketMutasi || item.Ket_Mutasi || item.ket_mutasi || '').trim(),
              pindahKe: String(item.pindahKe || item.Pindah_Ke || item.pindah_ke || '').trim(),
              tglMutasi: formatToDDMMYYYY(item.tglMutasi || item.tgl_mutasi || ''),
              alasanMutasi: String(item.alasanMutasi || item.alasan_mutasi || '').trim(),
              uploadBerkas: String(item.uploadBerkas || item.upload_berkas || '').trim(),
              status: String(item.status || item.Status || 'Selesai').trim(),
              timestamp: String(item.timestamp || item.Timestamp || '').trim(),
              rowIndex: item.rowIndex || idx + 2
            };
          });
          safeSetItem(LOCAL_STORAGE_MUTASI_KELUAR_KEY, list);
          return list;
        }
      }
    } catch (err) {
      console.warn('Web App Mutasi Keluar fetch warning, falling back to GViz:', err);
    }
  }

  // 2. Fallback to Google Sheets GViz API with sheet 'mutasi_keluar'
  if (ssId) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${ssId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME_MUTASI_KELUAR)}&_t=${Date.now()}`;
      const res = await fetch(gvizUrl, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const text = await res.text();
        const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          const rawRows = parsed.table?.rows || [];
          const cols = parsed.table?.cols || [];
          if (rawRows.length > 0) {
            let headerRow: string[] = [];
            let startIdx = 0;

            const hasColLabels = cols.some((c: any) => c.label && c.label.trim() !== '');
            if (hasColLabels) {
              headerRow = cols.map((c: any) => (c.label || '').trim());
              startIdx = 0;
            } else {
              headerRow = rawRows[0]?.c?.map((cell: any) => cell && cell.v !== null ? String(cell.v).trim() : '') || [];
              startIdx = 1;
            }

            const list: MutasiKeluarItem[] = [];

            for (let i = startIdx; i < rawRows.length; i++) {
              const row = rawRows[i]?.c;
              if (!row) continue;
              const obj: any = { rowIndex: i + 1 };

              headerRow.forEach((header: string, colIdx: number) => {
                if (!header) return;
                const cell = row[colIdx];
                const strVal = cell && cell.v !== null && cell.v !== undefined ? String(cell.v).trim() : (cell && cell.f ? String(cell.f).trim() : '');
                const hClean = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                obj[hClean] = strVal;

                if (hClean === 'no') obj.no = Number(strVal) || i;
                if (hClean === 'nipd') obj.nipd = strVal;
                if (hClean === 'nisn') obj.nisn = strVal;
                if (hClean === 'nama') obj.nama = strVal;
                if (hClean === 'tempatlahir') obj.tempatLahir = strVal;
                if (hClean === 'tgllahir') obj.tglLahir = formatToDDMMYYYY(strVal);
                if (hClean === 'rombel' || hClean === 'kelas') obj.rombel = strVal;
                if (hClean === 'ketmutasi') obj.ketMutasi = strVal;
                if (hClean === 'pindahke') obj.pindahKe = strVal;
                if (hClean === 'tglmutasi') obj.tglMutasi = formatToDDMMYYYY(strVal);
                if (hClean === 'alasanmutasi' || hClean === 'alasan') obj.alasanMutasi = strVal;
                if (hClean === 'uploadberkas' || hClean === 'berkas') obj.uploadBerkas = strVal;
                if (hClean === 'status') obj.status = strVal;
                if (hClean === 'timestamp') obj.timestamp = strVal;
              });

              if (obj.nisn || obj.nama || obj.nipd) {
                list.push({
                  id: obj.nisn ? `MUT-OUT-${obj.nisn}` : (obj.nipd ? `MUT-OUT-${obj.nipd}` : `MUT-OUT-${i}`),
                  no: obj.no || i,
                  nipd: obj.nipd || '',
                  nisn: obj.nisn || '',
                  nama: obj.nama || '',
                  tempatLahir: obj.tempatLahir || '',
                  tglLahir: obj.tglLahir || '',
                  rombel: obj.rombel || '',
                  ketMutasi: obj.ketMutasi || '',
                  pindahKe: obj.pindahKe || '',
                  tglMutasi: obj.tglMutasi || '',
                  alasanMutasi: obj.alasanMutasi || '',
                  uploadBerkas: obj.uploadBerkas || '',
                  status: obj.status || 'Selesai',
                  timestamp: obj.timestamp || '',
                  rowIndex: i + 1
                });
              }
            }

            if (list.length > 0) {
              safeSetItem(LOCAL_STORAGE_MUTASI_KELUAR_KEY, list);
              return list;
            }
          }
        }
      }
    } catch (err) {
      console.warn('GViz mutasi_keluar fetch failed:', err);
    }
  }

  // 3. Fallback to cached data
  const cached = safeGetItem<MutasiKeluarItem[] | null>(LOCAL_STORAGE_MUTASI_KELUAR_KEY, null);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached;
  }

  return null;
}

/**
 * Save single Mutasi Keluar directly to Google Apps Script Web App or via Express server proxy
 */
export async function saveMutasiKeluarDirectly(
  webAppUrl: string,
  item: Partial<MutasiKeluarItem>,
  isUpdate: boolean
): Promise<{ success: boolean; message?: string }> {
  const rawTs = item.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19);
  const dateTglLahir = formatToDDMMYYYY(item.tglLahir || '');
  const dateTglMutasi = formatToDDMMYYYY(item.tglMutasi || rawTs);

  const formattedItem = {
    no: item.no || '',
    nipd: item.nipd || '',
    nisn: item.nisn || '',
    nama: item.nama || '',
    tempat_lahir: item.tempatLahir || '',
    tgl_lahir: dateTglLahir,
    rombel: item.rombel || '',
    ket_mutasi: item.ketMutasi || '',
    pindah_ke: item.pindahKe || '',
    tgl_mutasi: dateTglMutasi,
    alasan_mutasi: item.alasanMutasi || '',
    upload_berkas: item.uploadBerkas || '',
    status: item.status || 'Selesai',
    timestamp: rawTs
  };

  // 1. Try server proxy /api/mutasi/keluar
  try {
    const sRes = await fetch('/api/mutasi/keluar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: formattedItem, isUpdate }),
      signal: AbortSignal.timeout(20000)
    });
    if (sRes.ok) {
      const sJson = await sRes.json();
      return { success: true, message: sJson.message || 'Data mutasi keluar berhasil disimpan ke Google Sheets (sheet: mutasi_keluar)' };
    }
  } catch (proxyErr) {
    console.warn('Proxy /api/mutasi/keluar error, falling back to direct Web App call:', proxyErr);
  }

  // 2. Direct Web App URL
  if (!webAppUrl) return { success: false, message: 'URL Web App belum dikonfigurasi' };
  try {
    const payload = {
      action: isUpdate ? 'updateMutasiKeluar' : 'createMutasiKeluar',
      target: 'mutasi_keluar',
      item: formattedItem
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
      signal: AbortSignal.timeout(8000)
    });
    return { success: true, message: 'Data mutasi keluar berhasil dikirim ke Google Sheets (sheet: mutasi_keluar)' };
  } catch (err: any) {
    console.warn('Direct Google Apps Script save mutasi keluar failed:', err);
    return { success: false, message: err?.message || 'Gagal mengirim data ke Google Sheets' };
  }
}

/**
 * Delete a Mutasi Keluar row directly via backend API and Google Apps Script Web App
 * Termasuk menghapus berkas terkait di Google Drive jika ada
 */
export async function deleteMutasiKeluarDirectly(
  webAppUrl: string,
  item: { nisn?: string; nipd?: string; uploadBerkas?: string; nama?: string }
): Promise<boolean> {
  // 1. Coba melalui backend API terlebih dahulu
  try {
    const res = await fetch('/api/mutasi/keluar/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item }),
      signal: AbortSignal.timeout(35000)
    });
    if (res.ok) {
      return true;
    }
  } catch (backendErr) {
    console.warn('Hapus via backend /api/mutasi/keluar/delete gagal, mencoba fallback langsung:', backendErr);
  }

  // 2. Fallback langsung ke Google Apps Script Web App jika backend tidak tersedia
  if (!webAppUrl) return false;
  try {
    const payload = {
      action: 'deleteMutasiKeluar',
      target: 'mutasi_keluar',
      item: {
        nisn: item.nisn || '',
        nipd: item.nipd || '',
        uploadBerkas: item.uploadBerkas || '',
        nama: item.nama || ''
      }
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
    return true;
  } catch (err) {
    console.warn('Direct Google Apps Script delete mutasi keluar failed:', err);
    return false;
  }
}

/**
 * Delete multiple Mutasi Keluar rows and their associated files in Google Drive
 */
export async function deleteMultipleMutasiKeluarDirectly(
  webAppUrl: string,
  items: Array<{ nisn?: string; nipd?: string; uploadBerkas?: string; nama?: string }>
): Promise<{ success: boolean; message: string }> {
  if (!items || items.length === 0) {
    return { success: true, message: 'Tidak ada data yang dipilih' };
  }

  // 1. Coba lewat backend API
  try {
    const res = await fetch('/api/mutasi/keluar/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
      signal: AbortSignal.timeout(45000)
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || `Berhasil menghapus ${items.length} data dan berkas` };
    }
  } catch (backendErr) {
    console.warn('Batch delete via backend gagal, mencoba fallback langsung:', backendErr);
  }

  // 2. Fallback langsung ke Google Apps Script
  if (webAppUrl) {
    try {
      const payload = {
        action: 'deleteMultipleMutasiKeluar',
        target: 'mutasi_keluar',
        items: items.map(it => ({
          nisn: it.nisn || '',
          nipd: it.nipd || '',
          uploadBerkas: it.uploadBerkas || '',
          nama: it.nama || ''
        }))
      };
      await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });
      return { success: true, message: `Permintaan hapus ${items.length} data dan berkas telah dikirim` };
    } catch (gasErr: any) {
      return { success: false, message: gasErr?.message || 'Gagal menghapus data di Google Sheets' };
    }
  }

  return { success: false, message: 'Web App URL belum dikonfigurasi' };
}

/**
 * Hapus satu berkas di Google Drive berdasarkan URL atau File ID
 */
export async function deleteMutasiBerkasFromDrive(
  fileUrlOrId: string,
  webAppUrl?: string
): Promise<{ success: boolean; message?: string }> {
  if (!fileUrlOrId) return { success: true };

  // 1. Coba via backend
  try {
    const res = await fetch('/api/mutasi/delete-berkas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl: fileUrlOrId }),
      signal: AbortSignal.timeout(25000)
    });
    if (res.ok) {
      return { success: true };
    }
  } catch (e) {
    console.warn('Hapus berkas via server gagal:', e);
  }

  // 2. Fallback via GAS
  if (webAppUrl) {
    try {
      await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteBerkasMutasi',
          fileUrl: fileUrlOrId
        }),
        mode: 'no-cors'
      });
      return { success: true };
    } catch (eGas) {
      console.warn('Hapus berkas via direct GAS gagal:', eGas);
    }
  }

  return { success: false, message: 'Gagal menghapus berkas di Google Drive' };
}

/**
 * Sync all Mutasi Keluar directly to Google Apps Script Web App
 */
export async function syncAllMutasiKeluarDirectly(
  webAppUrl: string,
  items: MutasiKeluarItem[]
): Promise<boolean> {
  if (!webAppUrl || !items.length) return false;
  try {
    const payload = {
      action: 'syncAllMutasiKeluar',
      target: 'mutasi_keluar',
      items: items.map((m, idx) => ({
        no: m.no || idx + 1,
        nipd: m.nipd || '',
        nisn: m.nisn || '',
        nama: m.nama || '',
        tempat_lahir: m.tempatLahir || '',
        tgl_lahir: formatToDDMMYYYY(m.tglLahir || ''),
        rombel: m.rombel || '',
        ket_mutasi: m.ketMutasi || '',
        pindah_ke: m.pindahKe || '',
        tgl_mutasi: formatToDDMMYYYY(m.tglMutasi || m.timestamp || ''),
        alasan_mutasi: m.alasanMutasi || '',
        upload_berkas: m.uploadBerkas || '',
        status: m.status || 'Selesai',
        timestamp: m.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19)
      }))
    };
    await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
      signal: AbortSignal.timeout(8000)
    });
    return true;
  } catch (err) {
    console.warn('Direct Google Apps Script syncAll mutasi keluar failed:', err);
    return false;
  }
}

/**
 * Format nama file mutasi keluar: nisn_nama.ext (contoh: 0106762079_ABDUL_RIFAI.pdf)
 */
export function generateMutasiBerkasFileName(nisn: string, nama: string, originalFileName?: string): string {
  const cleanNisn = (nisn || '').trim();
  const cleanNama = (nama || '').trim().toUpperCase().replace(/[\s\W]+/g, '_');

  let ext = 'pdf';
  if (originalFileName && originalFileName.includes('.')) {
    ext = originalFileName.split('.').pop()?.toLowerCase() || 'pdf';
  }

  if (cleanNisn && cleanNama) {
    return `${cleanNisn}_${cleanNama}.${ext}`;
  } else if (cleanNisn) {
    return `${cleanNisn}_BERKAS.${ext}`;
  } else if (cleanNama) {
    return `${cleanNama}_BERKAS.${ext}`;
  }
  return `BERKAS_${Date.now()}.${ext}`;
}

/**
 * Upload berkas mutasi keluar ke Google Drive folder 1sGqbpA6uctgvOmYUwyxNP8pC5ORZUy56
 * dengan format nama file nisn_nama (contoh: 0106762079_ABDUL_RIFAI)
 */
export async function uploadMutasiBerkasToDrive(
  file: File,
  nisn: string,
  nama: string,
  webAppUrl?: string,
  oldFileUrl?: string
): Promise<{ success: boolean; fileUrl?: string; fileName?: string; fileId?: string; message?: string; code?: string }> {
  const targetFileName = generateMutasiBerkasFileName(nisn, nama, file.name);

  // Convert File to base64
  let base64Data: string;
  try {
    base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal membaca berkas file lokal: ' + (err?.message || 'Error tidak diketahui')
    };
  }

  const isStaticHost = typeof window !== 'undefined' && (
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('netlify.app') ||
    window.location.hostname.includes('github.io') ||
    window.location.hostname.includes('pages.dev')
  );

  // 1. Prioritize Express Server API (/api/mutasi/upload-berkas) ONLY if not on a static hosting environment
  let backendErrorMessage = '';
  let backendErrorCode = '';

  if (!isStaticHost) {
    try {
      const res = await fetch('/api/mutasi/upload-berkas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          fileName: targetFileName,
          mimeType: file.type || 'application/pdf',
          folderId: DRIVE_FOLDER_ID_MUTASI_KELUAR,
          nisn,
          nama,
          oldFileUrl: oldFileUrl || ''
        }),
        signal: AbortSignal.timeout(65000)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.fileUrl) {
          return {
            success: true,
            fileUrl: data.fileUrl,
            fileName: data.fileName || targetFileName,
            fileId: data.fileId,
            message: data.message || 'Berkas berhasil diupload ke Google Drive'
          };
        } else {
          throw new Error(data.message || 'Respon server gagal');
        }
      } else if (res.status === 404 || res.status === 405) {
        // HTTP 404 or 405 means static host or backend route not implemented; seamlessly fallback to direct GAS
        console.warn(`Backend API returned HTTP ${res.status} (likely static host/Vercel). Falling back directly to Google Apps Script...`);
      } else {
        const errData = await res.json().catch(() => null);
        backendErrorCode = errData?.code || '';
        backendErrorMessage = errData?.message || '';
        if (backendErrorCode === 'NEED_DRIVE_PERMISSION') {
          return {
            success: false,
            code: 'NEED_DRIVE_PERMISSION',
            message: backendErrorMessage || 'Izin Google Drive belum diaktifkan.'
          };
        }
      }
    } catch (backendErr: any) {
      console.warn('Upload via Express server failed or offline, checking direct Google Apps Script fallback...', backendErr);
    }
  }

  // 2. Direct Web App URL fallback (standard for Vercel / static deploy)
  const targetGasUrl = webAppUrl || 'https://script.google.com/macros/s/AKfycbxwfqpqePmp5mtpzeJSTHpiz0PxyqSbOA3hWw1Zy8Iofvi1lMIWxYeMllDNlmP-8RI/exec';
  if (targetGasUrl) {
    try {
      const gasPayload = {
        action: 'uploadBerkasMutasi',
        target: 'mutasi_keluar',
        folderId: DRIVE_FOLDER_ID_MUTASI_KELUAR,
        fileName: targetFileName,
        mimeType: file.type || 'application/pdf',
        base64Data,
        oldFileUrl: oldFileUrl || ''
      };

      const res = await fetch(targetGasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(gasPayload),
        signal: AbortSignal.timeout(65000)
      });

      if (res.ok) {
        const text = await res.text();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }

        if (parsed && parsed.status === 'success' && parsed.fileUrl) {
          return {
            success: true,
            fileUrl: parsed.fileUrl,
            fileName: parsed.fileName || targetFileName,
            fileId: parsed.fileId,
            message: 'Berkas berhasil diupload langsung ke Google Drive'
          };
        } else if (parsed && parsed.message) {
          const isPermission = String(parsed.message).toLowerCase().includes('permission') ||
            String(parsed.message).toLowerCase().includes('izin') ||
            String(parsed.message).toLowerCase().includes('driveapp');
          return {
            success: false,
            code: isPermission ? 'NEED_DRIVE_PERMISSION' : 'ERROR',
            message: parsed.message
          };
        }
      }
    } catch (gasErr: any) {
      console.warn('Direct Google Apps Script upload failed:', gasErr);
      return {
        success: false,
        message: 'Gagal mengunggah berkas ke Google Drive: ' + (gasErr?.message || 'Koneksi terputus')
      };
    }
  }

  return {
    success: false,
    message: backendErrorMessage || ('Gagal mengunggah berkas ke Google Drive folder ID: ' + DRIVE_FOLDER_ID_MUTASI_KELUAR + '. Pastikan koneksi internet aktif dan Web App URL telah diset.')
  };
}

/**
 * Fetch Pembelajaran from Google Sheets (sheet: pembelajaran) or Express backend
 */
export async function fetchPembelajaranDirectly(config: AppConfig, force: boolean = false): Promise<PembelajaranData[]> {
  // 1. Try Express backend if available
  try {
    const res = await fetch(`/api/pembelajaran${force ? '?force=true' : ''}`, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const json = await res.json();
      if (json && json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        safeSetItem(LOCAL_STORAGE_PEMBELAJARAN_KEY, json.data);
        return json.data;
      }
    }
  } catch {}

  // 2. Direct read from Google Sheets GViz API
  const ssId = config.spreadsheetId || SPREADSHEET_ID;
  if (ssId) {
    const candidates = [SHEET_NAME_PEMBELAJARAN || 'pembelajaran', 'Pembelajaran', 'PEMBELAJARAN'];
    for (const sheetName of candidates) {
      try {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${ssId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&_t=${Date.now()}`;
        const res = await fetch(gvizUrl, { signal: AbortSignal.timeout(12000) });
        if (res.ok) {
          const text = await res.text();
          const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            const rawRows = parsed.table?.rows || [];
            const cols = parsed.table?.cols || [];
            if (rawRows.length === 0) continue;

            let headerRow: string[] = [];
            let startIdx = 0;

            const hasColLabels = cols.some((c: any) => c.label && c.label.trim() !== '');
            if (hasColLabels) {
              headerRow = cols.map((c: any) => (c.label || '').trim());
              startIdx = 0;
            } else {
              headerRow = rawRows[0]?.c?.map((cell: any) => cell && cell.v !== null ? String(cell.v).trim() : '') || [];
              startIdx = 1;
            }

            // Safety check
            const headerRowStr = headerRow.join(' ').toLowerCase();
            if (headerRowStr.includes('nisn') && headerRowStr.includes('nipd') && !headerRowStr.includes('matpel') && !headerRowStr.includes('pembelajaran')) {
              continue; // Avoid wrong student sheet fallback
            }

            const parsedList: PembelajaranData[] = [];

            for (let i = startIdx; i < rawRows.length; i++) {
              const row = rawRows[i]?.c;
              if (!row) continue;
              const obj: any = { rowIndex: i + 1 };

              headerRow.forEach((header: string, colIdx: number) => {
                if (!header) return;
                const cell = row[colIdx];
                let strVal = '';
                if (cell && cell.v !== null && cell.v !== undefined) {
                  if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
                    if (cell.f) {
                      strVal = cell.f;
                    } else {
                      const match = cell.v.match(/Date\((\d+),(\d+),(\d+)\)/);
                      if (match) {
                        const y = match[1];
                        const m = String(Number(match[2]) + 1).padStart(2, '0');
                        const d = String(match[3]).padStart(2, '0');
                        strVal = `${y}-${m}-${d}`;
                      } else {
                        strVal = cell.v;
                      }
                    }
                  } else {
                    strVal = cell.f || String(cell.v).trim();
                  }
                }
                obj[header] = strVal;
                const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');

                if (hClean === 'no') obj.no = strVal;
                if (hClean === 'jenisrombel' || hClean === 'rombeljenis') obj.jenisRombel = strVal;
                if (hClean === 'tingkat' || hClean === 'kelas') obj.tingkat = strVal;
                if (hClean === 'namarombel' || hClean === 'rombel') obj.namaRombel = strVal;
                if (hClean === 'kurikulum') obj.kurikulum = strVal;
                if (hClean === 'programkompetensikeahlian' || hClean === 'programkeahlian' || hClean === 'kompetensikeahlian' || hClean === 'jurusan') {
                  obj.programKeahlian = strVal;
                }
                if (hClean === 'namaptk' || hClean === 'namaguru' || hClean === 'ptk' || (hClean === 'nama' && !obj.namaPtk)) {
                  obj.namaPtk = strVal;
                }
                if (hClean === 'nuptk') obj.nuptk = strVal;
                if (hClean === 'ptkinduk' || hClean === 'induk') obj.ptkInduk = strVal;
                if (hClean === 'kepegawaian' || hClean === 'statuskepegawaian') obj.kepegawaian = strVal;
                if (hClean === 'namamatpel' || hClean === 'matpel' || hClean === 'matapelajaran' || hClean === 'mapel') {
                  obj.namaMatpel = strVal;
                }
                if (hClean === 'kodematpel' || hClean === 'kodemapel') obj.kodeMatpel = strVal;
                if (hClean === 'jjm' || hClean === 'jammengajar') obj.jjm = strVal;
                if (hClean === 'jmlsiswa' || hClean === 'jumlahsiswa' || hClean === 'siswa') obj.jmlSiswa = strVal;
                if (hClean === 'tglskmengajar' || hClean === 'tglsk') obj.tglSkMengajar = parseToYYYYMMDD(strVal);
                if (hClean === 'skmengajar' || hClean === 'nosk' || hClean === 'noskmengajar') obj.skMengajar = strVal;
                if (hClean === 'statusdikurikulum' || hClean === 'statuskurikulum') obj.statusDiKurikulum = strVal;
              });

              if (obj.namaPtk || obj.namaMatpel || obj.namaRombel) {
                obj.id = `PEMB-${obj.nuptk ? obj.nuptk + '-' : ''}${i}`;
                parsedList.push(obj as PembelajaranData);
              }
            }

            if (parsedList.length > 0) {
              safeSetItem(LOCAL_STORAGE_PEMBELAJARAN_KEY, parsedList);
              return parsedList;
            }
          }
        }
      } catch (err) {
        // try next candidate
      }
    }
  }

  // 3. Fallback to cached data (filter out dummy seed data)
  const cached = safeGetItem<PembelajaranData[] | null>(LOCAL_STORAGE_PEMBELAJARAN_KEY, null);
  if (Array.isArray(cached) && cached.length > 0) {
    const isDummy = cached.some(item => item.id === 'PEMB-001' && item.namaPtk?.includes('Hasnah'));
    if (!isDummy) return cached;
  }

  // 4. Return empty array instead of dummy data
  return [];
}





