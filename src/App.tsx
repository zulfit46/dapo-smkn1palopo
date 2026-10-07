/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, AttendanceRecord, AppConfig, ActiveTab, WaliKelas, Jurusan, GTKData, AppTheme, PembelajaranData, normalizeStudent } from './types';
import { INITIAL_STUDENTS, INITIAL_ATTENDANCE } from './data/initialData';
import { INITIAL_WALI_KELAS, INITIAL_WALI_KELAS_LIST } from './data/initialWaliKelas';
import { INITIAL_JURUSAN_LIST } from './data/initialJurusan';
import { INITIAL_GTK_LIST } from './data/initialGTK';
import { INITIAL_PEMBELAJARAN_LIST } from './data/initialPembelajaran';
import { fetchStudentsDirectly, syncVervalDirectly, saveStudentDirectly, fetchGTKDirectly, fetchPembelajaranDirectly } from './services/sheetsSync';
import { safeGetItem, safeSetItem } from './utils/storage';
import { isUserRole } from './utils/authUtils';
import { DAPO1_BASE64 } from './assets/dapo1Base64';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { BiodataView } from './components/BiodataView';
import { AbsenPDView } from './components/AbsenPDView';
import { RegistrasiView } from './components/RegistrasiView';
import { DataPeriodikView } from './components/DataPeriodikView';
import { AbsenView } from './components/AbsenView';
import { MutasiView } from './components/MutasiView';
import { SuratView } from './components/SuratView';
import { GTKBiodataView } from './components/GTKBiodataView';
import { GTKPangkatView } from './components/GTKPangkatView';
import { GTKKGBView } from './components/GTKKGBView';
import { PembelajaranView } from './components/PembelajaranView';
import { RekapPDView } from './components/RekapPDView';
import { RekapGTKView } from './components/RekapGTKView';
import { AksesMenuView } from './components/AksesMenuView';
import { CodeGsModal } from './components/CodeGsModal';
import { StudentFormModal } from './components/StudentFormModal';
import { StudentDetailModal } from './components/StudentDetailModal';
import { DaftarMenuModal } from './components/DaftarMenuModal';
import { LoginView } from './components/LoginView';
import { isTabPermitted, getFirstPermittedTab } from './data/menuList';
import { 
  getGTKAllowedDownloadHeaders, 
  fetchGTKAllowedDownloadHeadersFromServer 
} from './data/gtkDownloadColumns';

export default function App() {
  const [students, setStudents] = useState<Student[]>(() => {
    const cached = safeGetItem<Student[]>('dapodik_cached_students', INITIAL_STUDENTS);
    if (Array.isArray(cached) && cached.length > 0) {
      return cached.map((s) => {
        const init = INITIAL_STUDENTS.find((it) => it.id === s.id || it.nipd === s.nipd);
        const normalized = normalizeStudent(s);
        return {
          ...normalized,
          pekerjaanAyah: normalized.pekerjaanAyah || init?.pekerjaanAyah || '',
          pekerjaanIbu: normalized.pekerjaanIbu || init?.pekerjaanIbu || '',
        };
      });
    }
    return INITIAL_STUDENTS.map(normalizeStudent);
  });

  const [gtkList, setGtkList] = useState<GTKData[]>(() => {
    return safeGetItem<GTKData[]>('dapodik_cached_gtk', INITIAL_GTK_LIST);
  });

  const [pembelajaranList, setPembelajaranList] = useState<PembelajaranData[]>(() => {
    const cached = safeGetItem<PembelajaranData[]>('dapodik_cached_pembelajaran', []);
    if (Array.isArray(cached) && cached.length > 0) {
      const isDummy = cached.some(item => item.id === 'PEMB-001' && item.namaPtk?.includes('Hasnah'));
      if (!isDummy) return cached;
    }
    return [];
  });

  const [currentUser, setCurrentUser] = useState<GTKData | null>(() => {
    return safeGetItem<GTKData | null>('dapodik_authenticated_gtk', null);
  });

  const handleLogin = (gtk: GTKData) => {
    setCurrentUser(gtk);
    const initialTab = getFirstPermittedTab(gtk, waliKelasList);
    setActiveTab(initialTab);
    safeSetItem('dapodik_authenticated_gtk', gtk);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    setAuthenticatedWali(null);
    safeSetItem('dapodik_authenticated_gtk', null);
    try {
      localStorage.removeItem('dapodik_authenticated_gtk');
    } catch {}
  };

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    return safeGetItem<AttendanceRecord[]>('dapodik_cached_attendance', INITIAL_ATTENDANCE);
  });

  const [waliKelasMap, setWaliKelasMap] = useState<Record<string, string>>(INITIAL_WALI_KELAS);
  const [waliKelasList, setWaliKelasList] = useState<WaliKelas[]>(INITIAL_WALI_KELAS_LIST);
  const [jurusanList, setJurusanList] = useState<Jurusan[]>(INITIAL_JURUSAN_LIST);
  const [authenticatedWali, setAuthenticatedWali] = useState<WaliKelas | null>(() => {
    try {
      const saved = sessionStorage.getItem('verval_wali_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleSetAuthenticatedWali = (wali: WaliKelas | null) => {
    setAuthenticatedWali(wali);
    try {
      if (wali) {
        sessionStorage.setItem('verval_wali_auth', JSON.stringify(wali));
      } else {
        sessionStorage.removeItem('verval_wali_auth');
      }
    } catch {}
  };

  const [appConfig, setAppConfig] = useState<AppConfig>(() => {
    return safeGetItem<AppConfig>('dapodik_app_config', {
      spreadsheetId: '1t_i5_kMDb00AT2uL0Km49_37CHJB2RWUv3tZjVgLlAk',
      sheetName: 'data',
      webAppUrl: 'https://script.google.com/macros/s/AKfycbxwfqpqePmp5mtpzeJSTHpiz0PxyqSbOA3hWw1Zy8Iofvi1lMIWxYeMllDNlmP-8RI/exec',
      autoSync: false,
      lastSyncedAt: null
    });
  });

  const [allowedGtkHeaders, setAllowedGtkHeaders] = useState<string[]>(() => getGTKAllowedDownloadHeaders());

  // Pastikan logo favicon di tab browser selalu menggunakan logo yang sama dengan di sidebar
  useEffect(() => {
    const faviconUrl = DAPO1_BASE64 || '/dapo-1.png';
    const link = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    link.href = faviconUrl;
    if (!document.head.contains(link)) {
      document.head.appendChild(link);
    }
  }, []);

  // Sinkronisasi allowed GTK download headers dari server terpusat & Google Apps Script
  useEffect(() => {
    fetchGTKAllowedDownloadHeadersFromServer(appConfig.webAppUrl).then((headers) => {
      if (headers && headers.length > 0) {
        setAllowedGtkHeaders(headers);
      }
    });

    const handleCustomUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setAllowedGtkHeaders(e.detail);
      }
    };

    window.addEventListener('gtk_download_headers_updated', handleCustomUpdate);
    return () => {
      window.removeEventListener('gtk_download_headers_updated', handleCustomUpdate);
    };
  }, [currentUser, appConfig.webAppUrl]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [theme, setTheme] = useState<AppTheme>(() => {
    return safeGetItem<AppTheme>('dapodik_app_theme', 'aurora-glass');
  });

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'aurora-glass' ? 'classic' : 'aurora-glass';
      safeSetItem('dapodik_app_theme', next);
      return next;
    });
  };
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCodeGsModalOpen, setIsCodeGsModalOpen] = useState(false);
  const [isDaftarMenuModalOpen, setIsDaftarMenuModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Otomatis redirect jika activeTab saat ini tidak diizinkan untuk akun login
  useEffect(() => {
    if (!isTabPermitted(activeTab, currentUser, waliKelasList)) {
      const allowed = getFirstPermittedTab(currentUser, waliKelasList);
      setActiveTab(allowed);
    }
  }, [activeTab, currentUser, waliKelasList]);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch initial config and students from server or direct Google Sheets (for Vercel / static hosting)
  const fetchStudentsData = async (force = false) => {
    setIsRefreshing(true);

    // Fetch Pembelajaran concurrently in background so it's ready immediately
    const fetchPembPromise = fetchPembelajaranDirectly(appConfig, force)
      .then(pembData => {
        if (pembData && pembData.length > 0) {
          const isDummy = pembData.some(item => item.id === 'PEMB-001' && item.namaPtk?.includes('Hasnah'));
          if (!isDummy) {
            setPembelajaranList(pembData);
            safeSetItem('dapodik_cached_pembelajaran', pembData);
          }
        }
      })
      .catch(err => {
        console.warn('Gagal memuat pembelajaran:', err);
      });

    try {
      // 1. Try fetching config from server
      try {
        const configRes = await fetch('/api/config');
        if (configRes.ok) {
          const conf = await configRes.json();
          setAppConfig(conf);
          safeSetItem('dapodik_app_config', conf);
        }
      } catch {}

      // 2. Try fetching students from server
      let loadedFromExpress = false;
      try {
        const studentRes = await fetch(`/api/students${force ? '?force=true' : ''}`);
        if (studentRes.ok) {
          const result = await studentRes.json();
          if (result && result.status === 'success' && Array.isArray(result.data) && result.data.length > 0) {
            const normalized = result.data.map(normalizeStudent);
            setStudents(normalized);
            loadedFromExpress = true;
            safeSetItem('dapodik_cached_students', normalized);
          }
        }
      } catch (err) {
        console.warn('Express server unavailable (e.g. on Vercel static deployment), falling back to client-side Google Sheets fetch:', err);
      }

      // If Express server was not available or didn't return data (e.g. on Vercel static deployment)
      if (!loadedFromExpress) {
        const directData = await fetchStudentsDirectly(appConfig);
        if (directData && directData.length > 0) {
          const normalized = directData.map(normalizeStudent);
          setStudents(normalized);
          safeSetItem('dapodik_cached_students', normalized);
          setAppConfig(prev => ({ ...prev, lastSyncedAt: new Date().toISOString() }));
        }
      }

      // 3. Get Attendance
      try {
        const attRes = await fetch('/api/attendance');
        if (attRes.ok) {
          const attResult = await attRes.json();
          if (attResult && attResult.status === 'success' && Array.isArray(attResult.data)) {
            setAttendance(attResult.data);
            safeSetItem('dapodik_cached_attendance', attResult.data);
          }
        }
      } catch {}

      // 4. Get Wali Kelas
      try {
        const wkRes = await fetch('/api/walikelas');
        if (wkRes.ok) {
          const wkResult = await wkRes.json();
          if (wkResult && wkResult.status === 'success') {
            if (wkResult.data && Object.keys(wkResult.data).length > 0) {
              setWaliKelasMap(wkResult.data);
            }
            if (Array.isArray(wkResult.list) && wkResult.list.length > 0) {
              setWaliKelasList(wkResult.list);
            }
          }
        }
      } catch {}

      // 5. Get Jurusan
      try {
        const jurRes = await fetch('/api/jurusan');
        if (jurRes.ok) {
          const jurResult = await jurRes.json();
          if (jurResult && jurResult.status === 'success' && Array.isArray(jurResult.data) && jurResult.data.length > 0) {
            setJurusanList(jurResult.data);
          }
        }
      } catch {}

      // 6. Get GTK
      try {
        let loadedGTKFromExpress = false;
        let freshGTKList: GTKData[] = [];
        try {
          const gtkRes = await fetch(force ? '/api/gtk?force=true' : '/api/gtk');
          if (gtkRes.ok) {
            const gtkResult = await gtkRes.json();
            if (gtkResult && gtkResult.status === 'success' && Array.isArray(gtkResult.data) && gtkResult.data.length > 0) {
              setGtkList(gtkResult.data);
              freshGTKList = gtkResult.data;
              loadedGTKFromExpress = true;
              safeSetItem('dapodik_cached_gtk', gtkResult.data);
            }
          }
        } catch {}

        if (!loadedGTKFromExpress) {
          const directGTK = await fetchGTKDirectly(appConfig);
          if (directGTK && directGTK.length > 0) {
            setGtkList(directGTK);
            freshGTKList = directGTK;
          }
        }

        // Sinkronkan objek akun GTK login dengan data baris terbaru di sheet 'gtk'
        if (freshGTKList.length > 0) {
          setCurrentUser(prevUser => {
            if (!prevUser) return null;
            const pNip = (prevUser.nip || '').replace(/[\s.-]/g, '').trim();
            const pNuptk = (prevUser.nuptk || '').replace(/[\s.-]/g, '').trim();
            const pNama = (prevUser.nama || '').trim().toLowerCase();
            const pId = (prevUser.id || '').trim().toLowerCase();

            const matched = freshGTKList.find(g => {
              const gNip = (g.nip || '').replace(/[\s.-]/g, '').trim();
              const gNuptk = (g.nuptk || '').replace(/[\s.-]/g, '').trim();
              const gNama = (g.nama || '').trim().toLowerCase();
              const gId = (g.id || '').trim().toLowerCase();

              return (
                (pNip && gNip === pNip) ||
                (pNuptk && gNuptk === pNuptk) ||
                (pId && gId === pId) ||
                (pNama && gNama === pNama)
              );
            });

            if (matched) {
              safeSetItem('dapodik_authenticated_gtk', matched);
              return matched;
            }
            return prevUser;
          });
        }
      } catch {}

      // 7. Get Pembelajaran (await parallel fetch)
      try {
        await fetchPembPromise;
      } catch {}
    } catch (error) {
      console.warn('Fetch data encountered an error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudentsData();
  }, []);

  // Save student (Add / Edit)
  const handleSaveStudent = async (studentData: Partial<Student>) => {
    if (editingStudent) {
      // Update
      const idToUpdate = editingStudent.id || editingStudent.nipd;
      setStudents(prev => {
        const updated = prev.map(s => (s.id === idToUpdate || s.nipd === idToUpdate) ? normalizeStudent({ ...s, ...studentData }) : s);
        safeSetItem('dapodik_cached_students', updated);
        return updated;
      });

      try {
        const res = await fetch(`/api/students/${idToUpdate}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentData)
        });
        if (!res.ok && appConfig.webAppUrl) {
          saveStudentDirectly(appConfig.webAppUrl, { ...editingStudent, ...studentData }, true);
        }
      } catch {
        if (appConfig.webAppUrl) {
          saveStudentDirectly(appConfig.webAppUrl, { ...editingStudent, ...studentData }, true);
        }
      }
    } else {
      // Add new
      const newStudent: Student = normalizeStudent({
        id: `STU-${String(students.length + 1).padStart(3, '0')}`,
        nama: studentData.nama || 'Siswa Baru',
        kelas: studentData.kelas || 'X IPA 1',
        nipd: studentData.nipd || `2223${Math.floor(1000 + Math.random() * 9000)}`,
        nisn: studentData.nisn || `006${Math.floor(1000000 + Math.random() * 9000000)}`,
        jk: studentData.jk || 'L',
        tempatLahir: studentData.tempatLahir || 'Jakarta',
        tanggalLahir: studentData.tanggalLahir || '2007-01-01',
        agama: studentData.agama || 'Islam',
        alamat: studentData.alamat || '',
        ayah: studentData.ayah || '',
        ibu: studentData.ibu || '',
        ...studentData
      });

      setStudents(prev => {
        const updated = [newStudent, ...prev];
        safeSetItem('dapodik_cached_students', updated);
        return updated;
      });

      try {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentData)
        });
        if (!res.ok && appConfig.webAppUrl) {
          saveStudentDirectly(appConfig.webAppUrl, newStudent, false);
        }
      } catch {
        if (appConfig.webAppUrl) {
          saveStudentDirectly(appConfig.webAppUrl, newStudent, false);
        }
      }
    }
  };

  // Delete student (Confirmed via DeleteConfirmationModal)
  const handleDeleteStudent = async (id: string) => {
    const studentToDelete = students.find(s => s.id === id || s.nipd === id || s.nisn === id);
    setStudents(prev => {
      const updated = prev.filter(s => s.id !== id && s.nipd !== id && s.nisn !== id);
      safeSetItem('dapodik_cached_students', updated);
      return updated;
    });

    try {
      await fetch(`/api/students/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Gagal menghapus di server:', err);
    }

    if (appConfig.webAppUrl && studentToDelete) {
      try {
        await fetch(appConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'delete',
            target: 'data',
            student: studentToDelete
          }),
          mode: 'no-cors'
        });
      } catch (err) {
        console.warn('Gagal menghapus di Google Sheets:', err);
      }
    }
  };

  // Save Verval PD (Status, Keterangan, Timestamp, & Verval Oleh)
  const handleSaveVerval = async (updates: { 
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
  }[]) => {
    if (!updates || updates.length === 0) return null;

    // Update local React state and local storage immediately
    setStudents(prev => {
      const updated = prev.map(s => {
        const match = updates.find(u =>
          (u.nisn && s.nisn && u.nisn === s.nisn) ||
          (u.nipd && s.nipd && u.nipd === s.nipd) ||
          (u.studentId && s.id && u.studentId === s.id) ||
          (u.id && s.id && u.id === s.id) ||
          (u.nama && s.nama && u.nama.trim().toLowerCase() === s.nama.trim().toLowerCase())
        );
        if (match) {
          return { 
            ...s, 
            status: match.status, 
            ket: match.ket,
            timestamp: match.timestamp || s.timestamp,
            vervalOleh: match.vervalOleh || (s as any).vervalOleh,
            verval_oleh: match.verval_oleh || match.vervalOleh || (s as any).verval_oleh
          };
        }
        return s;
      });
      safeSetItem('dapodik_cached_students', updated);
      return updated;
    });

    try {
      const res = await fetch('/api/students/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      const data = await res.json().catch(() => null);
      if ((!res.ok || (data && data.gasError)) && appConfig.webAppUrl) {
        syncVervalDirectly(appConfig.webAppUrl, updates);
      }
      return data;
    } catch {
      if (appConfig.webAppUrl) {
        syncVervalDirectly(appConfig.webAppUrl, updates);
      }
      return null;
    }
  };

  // Save Web App URL
  const handleSaveWebAppUrl = async (url: string) => {
    const updatedConfig = { ...appConfig, webAppUrl: url };
    setAppConfig(updatedConfig);
    safeSetItem('dapodik_app_config', updatedConfig);

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webAppUrl: url })
      });
      if (res.ok) {
        const result = await res.json();
        setAppConfig(result.config);
      }
    } catch {}

    fetchStudentsData(true);
  };

  // Handle GTK update (e.g. Akses Menu or Role)
  const handleUpdateGTK = (updatedGTK: GTKData) => {
    setGtkList(prev => {
      const next = prev.map(g => {
        const isMatch = (g.nip && updatedGTK.nip && g.nip === updatedGTK.nip) ||
                        (g.id && updatedGTK.id && g.id === updatedGTK.id) ||
                        (g.nama && updatedGTK.nama && g.nama === updatedGTK.nama);
        return isMatch ? updatedGTK : g;
      });
      safeSetItem('dapodik_cached_gtk', next);
      return next;
    });

    // If current logged in user was modified, update currentUser state so sidebar/permissions reflect immediately!
    if (currentUser) {
      const isCurrent = (currentUser.nip && updatedGTK.nip && currentUser.nip === updatedGTK.nip) ||
                        (currentUser.id && updatedGTK.id && currentUser.id === updatedGTK.id) ||
                        (currentUser.nama && updatedGTK.nama && currentUser.nama === updatedGTK.nama);
      if (isCurrent) {
        setCurrentUser(updatedGTK);
        safeSetItem('dapodik_authenticated_gtk', updatedGTK);
      }
    }
  };

  // Handle Batch GTK updates
  const handleBatchUpdateGTK = (updatedList: GTKData[]) => {
    setGtkList(prev => {
      const next = prev.map(g => {
        const match = updatedList.find(u => 
          (u.nip && g.nip && u.nip === g.nip) ||
          (u.id && g.id && u.id === g.id) ||
          (u.nama && g.nama && u.nama === g.nama)
        );
        return match || g;
      });
      safeSetItem('dapodik_cached_gtk', next);
      return next;
    });

    if (currentUser) {
      const matchedCurrent = updatedList.find(u => 
        (u.nip && currentUser.nip && u.nip === currentUser.nip) ||
        (u.id && currentUser.id && u.id === currentUser.id) ||
        (u.nama && currentUser.nama && u.nama === currentUser.nama)
      );
      if (matchedCurrent) {
        setCurrentUser(matchedCurrent);
        safeSetItem('dapodik_authenticated_gtk', matchedCurrent);
      }
    }
  };

  // If not logged in with GTK NIP, show Login page
  if (!currentUser) {
    return <LoginView gtkList={gtkList} onLogin={handleLogin} />;
  }

  return (
    <div className={`min-h-screen font-sans flex flex-col lg:flex-row antialiased transition-colors duration-300 ${
      theme === 'aurora-glass'
        ? 'bg-gradient-to-br from-slate-100 via-purple-50/30 to-blue-50/20 text-slate-900'
        : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCodeGsModal={() => setIsCodeGsModalOpen(true)}
        onOpenDaftarMenuModal={() => setIsDaftarMenuModalOpen(true)}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isGoogleSheetsConnected={Boolean(appConfig.webAppUrl)}
        currentUser={currentUser}
        waliKelasList={waliKelasList}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0 min-h-screen">
        <Header
          activeTab={activeTab}
          onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)}
          onOpenCodeGsModal={() => setIsCodeGsModalOpen(true)}
          onRefreshData={() => fetchStudentsData(true)}
          isRefreshing={isRefreshing}
          isGoogleSheetsConnected={Boolean(appConfig.webAppUrl)}
          currentUser={currentUser}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        <main className="flex-1 p-4 lg:p-8 w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              students={students}
              onNavigateTab={(tab) => {
                if (isTabPermitted(tab, currentUser, waliKelasList)) {
                  setActiveTab(tab);
                }
              }}
              onOpenCodeGsModal={() => setIsCodeGsModalOpen(true)}
              theme={theme}
              onAddStudent={() => {
                setEditingStudent(null);
                setIsFormModalOpen(true);
              }}
            />
          )}

          {activeTab === 'biodata' && (
            <BiodataView
              students={students}
              waliKelasMap={waliKelasMap}
              waliKelasList={waliKelasList}
              jurusanList={jurusanList}
              webAppUrl={appConfig.webAppUrl}
              currentUser={currentUser}
              allowedGtkHeaders={allowedGtkHeaders}
              onUpdateAllowedGtkHeaders={setAllowedGtkHeaders}
              onAddStudent={() => {
                setEditingStudent(null);
                setIsFormModalOpen(true);
              }}
              onEditStudent={(s) => {
                setEditingStudent(s);
                setIsFormModalOpen(true);
              }}
              onDeleteStudent={handleDeleteStudent}
              onViewStudent={(s) => {
                setViewingStudent(s);
                setIsDetailModalOpen(true);
              }}
              onRefresh={() => fetchStudentsData(true)}
              isRefreshing={isRefreshing}
            />
          )}

          {activeTab === 'absen-pd' && (
            <AbsenPDView
              students={students}
              waliKelasList={waliKelasList}
              jurusanList={jurusanList}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'registrasi' && <RegistrasiView students={students} />}

          {activeTab === 'data-periodik' && <DataPeriodikView students={students} />}

          {activeTab === 'absen' && (
            <AbsenView
              students={students}
              waliKelasList={waliKelasList}
              authenticatedWali={authenticatedWali}
              currentUser={currentUser}
              appConfig={appConfig}
              onAuthenticateWali={handleSetAuthenticatedWali}
              onSaveVerval={handleSaveVerval}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'mutasi' && (
            <MutasiView
              students={students}
              waliKelasList={waliKelasList}
              theme={theme}
              currentUser={currentUser}
              appConfig={appConfig}
              onAddStudentToActive={(newStudent) => {
                const vervalUser = newStudent.verval_oleh || currentUser?.nama || (currentUser as any)?.nama_lengkap || currentUser?.id || 'Admin';
                const studentWithVerval = {
                  ...newStudent,
                  verval_oleh: vervalUser,
                  vervalOleh: vervalUser
                };
                setStudents(prev => [studentWithVerval, ...prev]);
                safeSetItem('dapodik_cached_students', [studentWithVerval, ...students]);
              }}
              onUpdateStudentStatus={async (nisn, nipd, nama, status, ket, verval_oleh) => {
                const vervalUser = verval_oleh || currentUser?.nama || (currentUser as any)?.nama_lengkap || currentUser?.id || 'Admin';
                await handleSaveVerval([{
                  id: nisn || nipd || nama,
                  studentId: nisn || nipd || nama,
                  nisn,
                  nipd,
                  nama,
                  status,
                  ket,
                  verval_oleh: vervalUser,
                  vervalOleh: vervalUser
                }]);
              }}
            />
          )}

          {(activeTab === 'surat' || activeTab === 'surat-pindah' || activeTab === 'surat-ket-siswa') && (
            <SuratView
              students={students}
              currentUser={currentUser}
              waliKelasList={waliKelasList}
              jurusanList={jurusanList}
            />
          )}

          {(activeTab === 'gtk' || activeTab === 'gtk-biodata') && (
            <GTKBiodataView 
              gtkList={gtkList} 
              pembelajaranList={pembelajaranList}
              currentUser={currentUser} 
              onNavigateTab={(tab) => {
                if (isTabPermitted(tab, currentUser, waliKelasList)) {
                  setActiveTab(tab);
                }
              }}
            />
          )}

          {activeTab === 'gtk-pangkat' && (
            <GTKPangkatView gtkList={gtkList} appConfig={appConfig} currentUser={currentUser} />
          )}

          {activeTab === 'gtk-kgb' && (
            <GTKKGBView gtkList={gtkList} appConfig={appConfig} currentUser={currentUser} />
          )}

          {(activeTab === 'gtk-pembelajaran' || activeTab === 'pembelajaran') && (
            <PembelajaranView
              pembelajaranList={pembelajaranList}
              gtkList={gtkList}
              currentUser={currentUser}
              theme={theme}
              appConfig={appConfig}
              onRefresh={() => fetchStudentsData(true)}
              isRefreshing={isRefreshing}
            />
          )}

          {activeTab === 'akses-menu' && (
            <AksesMenuView
              gtkList={gtkList}
              currentUser={currentUser}
              waliKelasList={waliKelasList}
              appConfig={appConfig}
              theme={theme}
              onUpdateGTK={handleUpdateGTK}
              onBatchUpdateGTK={handleBatchUpdateGTK}
              onRefresh={() => fetchStudentsData(true)}
              isRefreshing={isRefreshing}
            />
          )}

          {(activeTab === 'rekap' || activeTab === 'rekap-pd') && (
            <RekapPDView students={students} jurusanList={jurusanList} />
          )}

          {activeTab === 'rekap-gtk' && (
            <RekapGTKView gtkList={gtkList} />
          )}
        </main>
      </div>

      {/* Modals */}
      {!isUserRole(currentUser) && (
        <>
          <CodeGsModal
            isOpen={isCodeGsModalOpen}
            onClose={() => setIsCodeGsModalOpen(false)}
            webAppUrl={appConfig.webAppUrl}
            onSaveWebAppUrl={handleSaveWebAppUrl}
          />
          <DaftarMenuModal
            isOpen={isDaftarMenuModalOpen}
            onClose={() => setIsDaftarMenuModalOpen(false)}
          />
        </>
      )}

      <StudentFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveStudent}
        initialData={editingStudent}
      />

      <StudentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        student={viewingStudent}
        currentUser={currentUser}
        onEdit={(s) => {
          setEditingStudent(s);
          setIsFormModalOpen(true);
        }}
      />
    </div>
  );
}
