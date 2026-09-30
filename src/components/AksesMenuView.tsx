import React, { useState, useMemo } from 'react';
import { 
  KeyRound, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  Users, 
  Lock, 
  Unlock, 
  Check, 
  X, 
  RefreshCw, 
  Edit3, 
  Save, 
  CheckSquare, 
  Square, 
  Layers, 
  Sparkles, 
  Info, 
  Copy, 
  CheckCheck, 
  FileSpreadsheet, 
  SlidersHorizontal,
  ChevronRight,
  Shield,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GTKData, AppConfig, AppTheme, ActiveTab, WaliKelas } from '../types';
import { DAFTAR_AKSES_MENU, extractRawAksesMenu, parseAksesMenuString, MenuItemDefinition } from '../data/menuList';
import { isUserRole, isAdminRole, getWaliKelasForUser } from '../utils/authUtils';
import { safeSetItem } from '../utils/storage';
import { updateGTKAksesMenuDirectly } from '../services/sheetsSync';

interface AksesMenuViewProps {
  gtkList: GTKData[];
  currentUser?: GTKData | null;
  waliKelasList?: WaliKelas[];
  appConfig?: AppConfig;
  theme?: AppTheme;
  onUpdateGTK?: (updatedGTK: GTKData) => void;
  onBatchUpdateGTK?: (updatedList: GTKData[]) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// Preset Definisi Menu
interface AccessPreset {
  id: string;
  name: string;
  desc: string;
  color: string;
  tabs: ActiveTab[];
}

const ACCESS_PRESETS: AccessPreset[] = [
  {
    id: 'full',
    name: 'Akses Penuh (Semua Menu)',
    desc: 'Buka semua 11 modul aplikasi',
    color: 'emerald',
    tabs: [
      'dashboard',
      'biodata',
      'absen-pd',
      'registrasi',
      'data-periodik',
      'absen',
      'gtk-biodata',
      'gtk-pangkat',
      'gtk-kgb',
      'akses-menu',
      'rekap-pd',
      'rekap-gtk'
    ]
  },
  {
    id: 'guru_standar',
    name: 'Standar Guru Pengajar',
    desc: 'Dashboard, Biodata Siswa, Absen PD & Rekap Siswa',
    color: 'blue',
    tabs: ['dashboard', 'biodata', 'absen-pd', 'rekap-pd']
  },
  {
    id: 'wali_kelas',
    name: 'Wali Kelas Lengkap',
    desc: 'Semua modul Peserta Didik (termasuk Verval & Periodik)',
    color: 'indigo',
    tabs: ['dashboard', 'biodata', 'absen-pd', 'registrasi', 'data-periodik', 'absen', 'rekap-pd']
  },
  {
    id: 'tata_usaha',
    name: 'Tata Usaha / Kepegawaian',
    desc: 'Modul GTK, Pangkat, KGB, dan Rekapitulasi GTK',
    color: 'purple',
    tabs: ['dashboard', 'gtk-biodata', 'gtk-pangkat', 'gtk-kgb', 'rekap-gtk']
  },
  {
    id: 'absen_only',
    name: 'Hanya Presensi & Biodata',
    desc: 'Dashboard, Biodata Siswa, dan Absen PD',
    color: 'amber',
    tabs: ['dashboard', 'biodata', 'absen-pd']
  }
];

export const AksesMenuView: React.FC<AksesMenuViewProps> = ({
  gtkList = [],
  currentUser,
  waliKelasList = [],
  appConfig,
  theme = 'aurora-glass',
  onUpdateGTK,
  onBatchUpdateGTK,
  onRefresh,
  isRefreshing = false
}) => {
  const isGlass = theme === 'aurora-glass';
  const isAdmin = !isUserRole(currentUser);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');
  const [filterAccess, setFilterAccess] = useState<'ALL' | 'CUSTOM' | 'DEFAULT'>('ALL');
  const [filterJenisPtk, setFilterJenisPtk] = useState<string>('ALL');

  // Selected GTKs for Bulk Action
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State for Individual Edit
  const [editingGTK, setEditingGTK] = useState<GTKData | null>(null);
  const editingWaliObj = editingGTK ? getWaliKelasForUser(editingGTK, waliKelasList) : null;
  const isEditingWali = Boolean(editingWaliObj);
  const [modalRole, setModalRole] = useState<'admin' | 'user'>('user');
  const [modalSelectedTabs, setModalSelectedTabs] = useState<Set<ActiveTab>>(new Set());
  const [isDefaultAccess, setIsDefaultAccess] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [applyToAllGTK, setApplyToAllGTK] = useState(false);
  const [alsoApplyRoleToAll, setAlsoApplyRoleToAll] = useState(false);

  // Modal State for Bulk Apply
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkPreset, setBulkPreset] = useState<string>('guru_standar');
  const [isBulking, setIsBulking] = useState(false);

  // Unique Jenis PTK for filter
  const jenisPtkOptions = useMemo(() => {
    const set = new Set<string>();
    gtkList.forEach(g => {
      if (g.jenisPtk) set.add(g.jenisPtk.trim());
    });
    return Array.from(set).sort();
  }, [gtkList]);

  // Filtered GTK List
  const filteredGTKList = useMemo(() => {
    return gtkList.filter(gtk => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = 
        !q ||
        (gtk.nama && gtk.nama.toLowerCase().includes(q)) ||
        (gtk.nip && gtk.nip.toLowerCase().includes(q)) ||
        (gtk.nuptk && gtk.nuptk.toLowerCase().includes(q)) ||
        (gtk.jenisPtk && gtk.jenisPtk.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // Filter Role
      const roleStr = String(gtk.status_login || gtk.statusLogin || 'user').toLowerCase().trim();
      const isGtkAdmin = roleStr === 'admin';
      if (filterRole === 'ADMIN' && !isGtkAdmin) return false;
      if (filterRole === 'USER' && isGtkAdmin) return false;

      // Filter Access Type
      const rawAkses = extractRawAksesMenu(gtk);
      const hasCustomAccess = parseAksesMenuString(rawAkses) !== null;
      if (filterAccess === 'CUSTOM' && !hasCustomAccess) return false;
      if (filterAccess === 'DEFAULT' && hasCustomAccess) return false;

      // Filter Jenis PTK
      if (filterJenisPtk !== 'ALL' && gtk.jenisPtk !== filterJenisPtk) return false;

      return true;
    });
  }, [gtkList, searchTerm, filterRole, filterAccess, filterJenisPtk]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = gtkList.length;
    let customCount = 0;
    let adminCount = 0;
    gtkList.forEach(g => {
      const raw = extractRawAksesMenu(g);
      if (parseAksesMenuString(raw) !== null) customCount++;
      if (isAdminRole(g)) adminCount++;
    });
    return {
      total,
      customCount,
      defaultCount: total - customCount,
      adminCount,
      nonAdminCount: Math.max(0, total - adminCount)
    };
  }, [gtkList]);

  // Open Edit Modal
  const handleOpenEdit = (gtk: GTKData) => {
    setEditingGTK(gtk);
    const r = String(gtk.status_login || gtk.statusLogin || 'user').toLowerCase().trim();
    setModalRole(r === 'admin' ? 'admin' : 'user');

    const rawAkses = extractRawAksesMenu(gtk);
    const parsed = parseAksesMenuString(rawAkses);

    if (parsed === null) {
      setIsDefaultAccess(true);
      // If default, pre-fill with all tabs or standard based on role
      const allTabs = new Set<ActiveTab>(DAFTAR_AKSES_MENU.map(m => m.tab));
      setModalSelectedTabs(allTabs);
    } else {
      setIsDefaultAccess(false);
      setModalSelectedTabs(new Set(parsed));
    }
    setSaveSuccessMsg(null);
    setCopiedCode(false);
    setApplyToAllGTK(false);
    setAlsoApplyRoleToAll(false);
  };

  // Toggle Tab in Modal
  const handleToggleTab = (tab: ActiveTab) => {
    setIsDefaultAccess(false);
    setModalSelectedTabs(prev => {
      const next = new Set(prev);
      if (next.has(tab)) {
        next.delete(tab);
      } else {
        next.add(tab);
      }
      return next;
    });
  };

  // Apply Preset in Modal
  const handleApplyPresetInModal = (preset: AccessPreset) => {
    setIsDefaultAccess(false);
    setModalSelectedTabs(new Set(preset.tabs));
  };

  // Reset to Default Access (Clear Column)
  const handleResetToDefaultInModal = () => {
    setIsDefaultAccess(true);
    const allTabs = new Set<ActiveTab>(DAFTAR_AKSES_MENU.map(m => m.tab));
    setModalSelectedTabs(allTabs);
  };

  // Generate Akses Menu String for Sheets
  const generatedAksesString = useMemo(() => {
    if (isDefaultAccess) return '';
    // Collect official codes from DAFTAR_AKSES_MENU matching the selected tabs
    const codes: string[] = [];
    DAFTAR_AKSES_MENU.forEach(menu => {
      if (modalSelectedTabs.has(menu.tab)) {
        codes.push(menu.kode);
      }
    });
    return codes.join(' ');
  }, [isDefaultAccess, modalSelectedTabs]);

  // Copy Generated Code to Clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedAksesString || '- (Default)');
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  // Save Akses Menu: either for single GTK or for all GTK
  const handleSave = async (forceApplyAll = false) => {
    if (!editingGTK) return;
    const isApplyingToAll = forceApplyAll || applyToAllGTK;

    setIsSaving(true);
    setSaveSuccessMsg(null);

    const aksesValue = isDefaultAccess ? '' : generatedAksesString;
    const roleValue = modalRole;

    try {
      if (isApplyingToAll) {
        // Prepare batch updates for all GTKs (DIKECUALIKAN ADMIN)
        const updates: any[] = [];
        const updatedGTKList: GTKData[] = [];
        let affectedCount = 0;
        let excludedAdminCount = 0;

        gtkList.forEach(g => {
          const isTarget = (g.nip && editingGTK.nip && g.nip === editingGTK.nip) ||
                           (g.id && editingGTK.id && g.id === editingGTK.id) ||
                           (g.nama && editingGTK.nama && g.nama === editingGTK.nama);

          const isGtkAdmin = isAdminRole(g);

          // DIKECUALIKAN ADMIN:
          // Akun GTK dengan role Admin (selain akun target yang sedang diedit di modal)
          // TIDAK diubah sama sekali hak akses maupun role-nya demi keamanan.
          if (isGtkAdmin && !isTarget) {
            excludedAdminCount++;
            updatedGTKList.push(g);
            return;
          }

          affectedCount++;
          const effectiveRole = (alsoApplyRoleToAll || isTarget)
            ? roleValue
            : String(g.status_login || g.statusLogin || 'user');

          const updated: GTKData = {
            ...g,
            akses_menu: aksesValue,
            aksesMenu: aksesValue,
            status_menu: aksesValue,
            statusMenu: aksesValue,
            hak_akses: aksesValue,
            hakAkses: aksesValue,
            status_login: effectiveRole,
            statusLogin: effectiveRole
          };
          updatedGTKList.push(updated);
          updates.push({
            nip: g.nip,
            nuptk: g.nuptk,
            nama: g.nama,
            id: g.id,
            akses_menu: aksesValue,
            status_login: effectiveRole
          });
        });

        // 1. Send to Express Server
        try {
          await fetch('/api/gtk/batch-akses-menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates })
          });
        } catch (err) {
          console.warn('Backend sync warning:', err);
        }

        // 2. Direct to Google Apps Script Web App if configured
        if (appConfig?.webAppUrl) {
          try {
            const payload = {
              action: 'syncAll',
              target: 'gtk',
              gtk: updatedGTKList
            };
            await fetch(appConfig.webAppUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify(payload),
              mode: 'no-cors'
            });
          } catch (syncErr) {
            console.warn('Apps Script sync warning:', syncErr);
          }
        }

        // 3. Update React parent state & localStorage
        if (onBatchUpdateGTK) {
          onBatchUpdateGTK(updatedGTKList);
        }

        setSaveSuccessMsg(
          `Berhasil menerapkan hak akses ke ${affectedCount} GTK! (${excludedAdminCount} akun Admin dikecualikan & tetap aman)`
        );
        setTimeout(() => {
          setEditingGTK(null);
          setSaveSuccessMsg(null);
          setApplyToAllGTK(false);
          setAlsoApplyRoleToAll(false);
        }, 1300);

      } else {
        // Single GTK save
        const updatedGTK: GTKData = {
          ...editingGTK,
          akses_menu: aksesValue,
          aksesMenu: aksesValue,
          status_menu: aksesValue,
          statusMenu: aksesValue,
          hak_akses: aksesValue,
          hakAkses: aksesValue,
          status_login: roleValue,
          statusLogin: roleValue
        };

        // 1. Send to Express Server
        try {
          await fetch('/api/gtk/akses-menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nip: updatedGTK.nip,
              nuptk: updatedGTK.nuptk,
              nama: updatedGTK.nama,
              id: updatedGTK.id,
              akses_menu: aksesValue,
              status_login: roleValue
            })
          });
        } catch (err) {
          console.warn('Backend sync warning:', err);
        }

        // 2. Direct to Google Apps Script Web App if configured
        if (appConfig?.webAppUrl) {
          await updateGTKAksesMenuDirectly(appConfig.webAppUrl, updatedGTK);
        }

        // 3. Update React parent state & localStorage
        if (onUpdateGTK) {
          onUpdateGTK(updatedGTK);
        }

        setSaveSuccessMsg(`Hak akses untuk ${updatedGTK.nama} berhasil disimpan!`);
        setTimeout(() => {
          setEditingGTK(null);
          setSaveSuccessMsg(null);
          setApplyToAllGTK(false);
          setAlsoApplyRoleToAll(false);
        }, 1200);
      }
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    if (selectedIds.length === filteredGTKList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredGTKList.map(g => g.id || g.nip || g.nama));
    }
  };

  const handleToggleSelectId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Apply Bulk Preset
  const handleApplyBulk = async () => {
    if (selectedIds.length === 0) return;
    setIsBulking(true);

    const targetPreset = ACCESS_PRESETS.find(p => p.id === bulkPreset);
    let aksesValue = '';
    if (bulkPreset === 'clear') {
      aksesValue = '';
    } else if (targetPreset) {
      const selectedTabsSet = new Set(targetPreset.tabs);
      const codes: string[] = [];
      DAFTAR_AKSES_MENU.forEach(menu => {
        if (selectedTabsSet.has(menu.tab)) {
          codes.push(menu.kode);
        }
      });
      aksesValue = codes.join(' ');
    }

    const updates: any[] = [];
    const updatedGTKList: GTKData[] = [];

    gtkList.forEach(g => {
      const gId = g.id || g.nip || g.nama;
      if (selectedIds.includes(gId)) {
        const updated: GTKData = {
          ...g,
          akses_menu: aksesValue,
          aksesMenu: aksesValue,
          status_menu: aksesValue,
          statusMenu: aksesValue,
          hak_akses: aksesValue,
          hakAkses: aksesValue
        };
        updatedGTKList.push(updated);
        updates.push({
          nip: g.nip,
          nuptk: g.nuptk,
          nama: g.nama,
          id: g.id,
          akses_menu: aksesValue
        });
      }
    });

    try {
      // 1. Post to Express Server
      try {
        await fetch('/api/gtk/batch-akses-menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        });
      } catch (err) {
        console.warn('Batch update Express warning:', err);
      }

      // 2. Direct to Google Apps Script Web App
      if (appConfig?.webAppUrl) {
        try {
          const payload = {
            action: 'syncAll',
            target: 'gtk',
            gtk: gtkList.map(g => {
              const matched = updatedGTKList.find(u => u.id === g.id || u.nip === g.nip);
              return matched || g;
            })
          };
          await fetch(appConfig.webAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
            mode: 'no-cors'
          });
        } catch {}
      }

      // 3. Update Parent State
      if (onBatchUpdateGTK) {
        onBatchUpdateGTK(updatedGTKList);
      }

      setSelectedIds([]);
      setIsBulkModalOpen(false);
      alert(`Berhasil memperbarui hak akses untuk ${updatedGTKList.length} akun GTK.`);
    } catch (err: any) {
      alert(`Gagal menerapkan pembaruan massal: ${err.message || 'Error'}`);
    } finally {
      setIsBulking(false);
    }
  };

  // Export Table to Excel
  const handleExportExcel = () => {
    const rows = filteredGTKList.map((g, idx) => {
      const raw = extractRawAksesMenu(g);
      const parsed = parseAksesMenuString(raw);
      const statusAkses = parsed === null ? 'Default / Penuh' : `${parsed.size} Menu Dibatasi`;
      const menuListStr = parsed === null ? 'Semua Menu' : Array.from(parsed).join(', ');

      return {
        'No': idx + 1,
        'Nama GTK': g.nama || '',
        'NIP': g.nip || '-',
        'NUPTK': g.nuptk || '-',
        'Jenis PTK': g.jenisPtk || '-',
        'Status Kepegawaian': g.statusKepegawaian || '-',
        'Role Login': (g.status_login || 'user').toUpperCase(),
        'Status Akses': statusAkses,
        'Kolom akses_menu (Sheet)': raw || '(Kosong)',
        'Menu Diizinkan': menuListStr
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hak Akses Menu GTK');
    XLSX.writeFile(workbook, `Daftar_Hak_Akses_Menu_GTK_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Group DAFTAR_AKSES_MENU by category
  const categorizedMenus: { category: string; menus: MenuItemDefinition[] }[] = useMemo(() => {
    const categories = ['Dashboard', 'Peserta Didik', 'GTK', 'Rekapitulasi'];
    return categories.map(cat => ({
      category: cat,
      menus: DAFTAR_AKSES_MENU.filter(m => m.kategori === cat)
    }));
  }, []);

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <div className={`p-4 rounded-xl border transition-all ${
        isGlass
          ? 'bg-purple-950/40 backdrop-blur-md border-purple-500/20 text-purple-100'
          : 'bg-white border-slate-200 shadow-2xs'
      }`}>
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama GTK, NIP, atau jenis PTK..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-medium border transition-all focus:outline-hidden ${
                isGlass
                  ? 'bg-white/10 border-purple-400/30 text-white placeholder:text-purple-300/50 focus:border-amber-400'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white'
              }`}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Selects & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Akses */}
            <select
              value={filterAccess}
              onChange={(e) => setFilterAccess(e.target.value as any)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer focus:outline-hidden ${
                isGlass
                  ? 'bg-purple-900/60 border-purple-400/30 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-700'
              }`}
            >
              <option value="ALL">Semua Akses</option>
              <option value="CUSTOM">Akses Dibatasi (Khusus)</option>
              <option value="DEFAULT">Akses Penuh / Default</option>
            </select>

            {/* Filter Role */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer focus:outline-hidden ${
                isGlass
                  ? 'bg-purple-900/60 border-purple-400/30 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-700'
              }`}
            >
              <option value="ALL">Semua Role</option>
              <option value="ADMIN">Administrator</option>
              <option value="USER">User (Guru/Staf)</option>
            </select>

            {/* Filter Jenis PTK */}
            {jenisPtkOptions.length > 0 && (
              <select
                value={filterJenisPtk}
                onChange={(e) => setFilterJenisPtk(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer focus:outline-hidden max-w-[180px] truncate ${
                  isGlass
                    ? 'bg-purple-900/60 border-purple-400/30 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-700'
                }`}
              >
                <option value="ALL">Semua Jenis PTK</option>
                {jenisPtkOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}

            {/* Refresh Sheet Button */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isGlass
                    ? 'bg-purple-900/50 hover:bg-purple-800/60 border-purple-400/40 text-purple-100'
                    : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs'
                }`}
                title="Muat Ulang Data GTK dari Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
                <span>{isRefreshing ? 'Menyinkronkan...' : 'Refresh Sheet'}</span>
              </button>
            )}

            {/* Ekspor Excel Button 
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl border border-emerald-600 shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="Ekspor data GTK ke file Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </button>*/}
          </div>
        </div>
      </div>

      {/* 3. GTK List Table - Clean Grid Style */}
      <div className="overflow-x-auto relative w-full bg-white rounded-xl border border-slate-200 shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
              <th className="py-2.5 px-3 text-center w-12 border-r border-slate-300">No</th>
              <th className="py-2.5 px-4 min-w-[200px] border-r border-slate-300 font-semibold">Nama</th>
              <th className="py-2.5 px-4 min-w-[280px] border-r border-slate-300 font-semibold">Hak Akses Menu</th>
              <th className="py-2.5 px-3 text-center w-28 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
            {filteredGTKList.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-500">
                  <div className="max-w-xs mx-auto space-y-2">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
                    <p className="font-semibold text-slate-700">Tidak ada data GTK yang sesuai pencarian.</p>
                    <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau reset filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredGTKList.map((gtk, idx) => {
                const gId = gtk.id || gtk.nip || gtk.nama;
                const rawAkses = extractRawAksesMenu(gtk);
                const parsedSet = parseAksesMenuString(rawAkses);
                const isCustom = parsedSet !== null;
                const gtkWali = getWaliKelasForUser(gtk, waliKelasList);

                return (
                  <tr 
                    key={`gtk-row-${gId || 'id'}-${idx}`}
                    className="hover:bg-slate-50 transition-colors border-b border-slate-200"
                  >
                    {/* No */}
                    <td className="py-2.5 px-3 text-center text-slate-500 font-medium border-r border-slate-200">
                      {idx + 1}
                    </td>

                    {/* Nama */}
                    <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200">
                      {gtk.nama}
                    </td>

                    {/* Hak Akses Menu */}
                    <td className="py-2.5 px-4 font-medium text-slate-800 border-r border-slate-200">
                      {isCustom ? (
                        <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                          {Array.from(parsedSet).map(tab => {
                            const menuDef = DAFTAR_AKSES_MENU.find(m => m.tab === tab);
                            return (
                              <span
                                key={tab}
                                className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700"
                              >
                                {menuDef?.nama || tab}
                              </span>
                            );
                          })}
                          {gtkWali && !parsedSet.has('absen') && (
                            <span
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700"
                              title="Menu Verval PD otomatis aktif karena pengguna adalah Wali Kelas"
                            >
                              Verval PD (Wali Kelas)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-medium text-slate-800">
                          Akses Penuh / Default
                        </span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(gtk)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition-colors cursor-pointer text-xs"
                        title="Atur Akses"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Atur Akses</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. MODAL DIALOG: ATUR AKSES MENU PER GTK */}
      {editingGTK && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-8 transition-all ${
            isGlass
              ? 'bg-gradient-to-b from-[#250d4f] via-[#200a45] to-[#160630] border-purple-500/40 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-start justify-between ${
              isGlass ? 'border-purple-500/30 bg-purple-900/30' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">
                    Pengaturan Hak Akses: {editingGTK.nama}
                  </h3>
                  <p className={`text-xs mt-0.5 ${isGlass ? 'text-purple-300' : 'text-slate-500'}`}>
                    NIP: {editingGTK.nip || '-'} • {editingGTK.jenisPtk || 'GTK'}
                    {isEditingWali && (
                      <span className="ml-2 font-semibold text-amber-300">
                        • Wali Kelas {editingWaliObj?.kelas}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingGTK(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
              {/* Notification Banner */}
              {saveSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Category Checkboxes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                    isGlass ? 'text-purple-300/70' : 'text-slate-500'
                  }`}>
                    Daftar Menu & Modul Yang Diizinkan
                  </span>
                  <div className="flex items-center gap-2.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDefaultAccess(false);
                        const allTabs = new Set<ActiveTab>(DAFTAR_AKSES_MENU.map(m => m.tab));
                        setModalSelectedTabs(allTabs);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleResetToDefaultInModal}
                      className="text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Kosongkan (Default)
                    </button>
                  </div>
                </div>

                {categorizedMenus.map(({ category: catName, menus }) => {
                  const allCatSelected = menus.every(m => modalSelectedTabs.has(m.tab));
                  const someCatSelected = menus.some(m => modalSelectedTabs.has(m.tab));

                  const toggleAllInCat = () => {
                    setIsDefaultAccess(false);
                    setModalSelectedTabs(prev => {
                      const next = new Set(prev);
                      if (allCatSelected) {
                        menus.forEach(m => next.delete(m.tab));
                      } else {
                        menus.forEach(m => next.add(m.tab));
                      }
                      return next;
                    });
                  };

                  return (
                    <div 
                      key={catName}
                      className={`p-4 rounded-xl border ${
                        isGlass ? 'bg-white/5 border-purple-500/20' : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-amber-400" />
                          <span className="font-bold text-xs">{catName}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            isGlass ? 'bg-purple-900/40 text-purple-300' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {menus.filter(m => modalSelectedTabs.has(m.tab)).length}/{menus.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={toggleAllInCat}
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        >
                          {allCatSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {menus.map((m) => {
                          const isChecked = modalSelectedTabs.has(m.tab);
                          return (
                            <label
                              key={m.id}
                              className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                                isChecked
                                  ? isGlass
                                    ? 'bg-amber-500/20 border-amber-400/40 text-white'
                                    : 'bg-indigo-50 border-indigo-300 text-indigo-950'
                                  : isGlass
                                    ? 'bg-black/20 border-transparent hover:border-white/20 text-purple-200/80'
                                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleTab(m.tab)}
                                className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs block leading-tight">{m.nama}</span>
                                    {m.tab === 'absen' && isEditingWali && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                                        Wali Kelas: Akses Otomatis
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-mono opacity-60 truncate">{m.kode}</span>
                                </div>
                                {m.tab === 'absen' && isEditingWali ? (
                                  <p className={`text-[10px] mt-0.5 ${
                                    isGlass ? 'text-indigo-300 font-medium' : 'text-indigo-600 font-medium'
                                  }`}>
                                    🛡️ Sebagai Wali Kelas {editingWaliObj?.kelas ? `(${editingWaliObj.kelas})` : ''}, GTK ini selalu diizinkan mengakses menu Verval PD meskipun opsi ini tidak dicentang.
                                  </p>
                                ) : (
                                  <p className={`text-[10px] mt-0.5 line-clamp-1 ${
                                    isGlass ? 'text-purple-300/70' : 'text-slate-500'
                                  }`}>
                                    {m.deskripsi}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Code Preview Box */}
              <div className={`p-4 rounded-xl border ${
                isGlass ? 'bg-black/30 border-purple-500/30' : 'bg-slate-100 border-slate-300'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold">
                      Format Teks Kolom 'akses_menu' di Spreadsheet:
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Teks</span>
                      </>
                    )}
                  </button>
                </div>
                <div className={`p-2.5 rounded-lg font-mono text-[11px] break-all select-all ${
                  isGlass ? 'bg-black/40 text-amber-300 border border-white/10' : 'bg-white text-slate-800 border border-slate-300'
                }`}>
                  {isDefaultAccess ? (
                    <span className="text-slate-400 italic">(Kosong - Menggunakan Hak Akses Penuh / Sesuai Role)</span>
                  ) : generatedAksesString ? (
                    generatedAksesString
                  ) : (
                    <span className="text-rose-400 italic">(Tidak ada menu yang dipilih - Semua menu terkunci)</span>
                  )}
                </div>
              </div>

              {/* 6. PILIHAN ATUR UNTUK SEMUA GTK (DIKECUALIKAN ADMIN) */}
              <div className={`p-4 rounded-xl border transition-all ${
                applyToAllGTK
                  ? isGlass
                    ? 'bg-amber-500/15 border-amber-400/50 shadow-lg shadow-amber-500/10'
                    : 'bg-amber-50 border-amber-300 shadow-sm'
                  : isGlass
                    ? 'bg-white/5 border-purple-500/20 hover:border-purple-400/40'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}>
                <label className="flex items-start sm:items-center justify-between gap-3 cursor-pointer select-none">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                      applyToAllGTK
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                        : isGlass
                          ? 'bg-purple-900/40 text-purple-300'
                          : 'bg-slate-200 text-slate-600'
                    }`}>
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm">
                          Atur juga pengaturan menu ini untuk SEMUA GTK
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <Shield className="w-3 h-3 text-emerald-300" />
                          Dikecualikan Admin
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          applyToAllGTK
                            ? 'bg-amber-500 text-white shadow-xs'
                            : isGlass
                              ? 'bg-purple-800/60 text-purple-200'
                              : 'bg-slate-200 text-slate-700'
                        }`}>
                          {metrics.nonAdminCount} GTK Non-Admin
                        </span>
                      </div>
                      <p className={`text-[11px] mt-1 leading-relaxed ${
                        isGlass ? 'text-purple-200/80' : 'text-slate-600'
                      }`}>
                        Terapkan konfigurasi daftar menu yang dipilih ke seluruh <strong>{metrics.nonAdminCount} akun GTK Non-Admin</strong> di Spreadsheet. Sebanyak <strong>{metrics.adminCount} akun Admin</strong> otomatis dikecualikan agar hak akses administrator tetap terjaga aman.
                      </p>
                    </div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-1 sm:mt-0">
                    <input
                      type="checkbox"
                      checked={applyToAllGTK}
                      onChange={(e) => setApplyToAllGTK(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                      applyToAllGTK
                        ? 'bg-amber-500'
                        : isGlass ? 'bg-white/20' : 'bg-slate-300'
                    }`}></div>
                  </div>
                </label>

                {/* Pengaturan Tambahan Saat Apply to All Aktif */}
                {applyToAllGTK && (
                  <div className={`mt-3.5 pt-3.5 border-t space-y-2.5 animate-in fade-in duration-200 ${
                    isGlass ? 'border-amber-400/20 text-amber-100' : 'border-amber-200 text-amber-950'
                  }`}>
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <Shield className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>Proteksi Akun Administrator Aktif:</span>
                    </div>
                    <div className={`p-2.5 rounded-lg text-[11px] leading-relaxed ${
                      isGlass ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    }`}>
                      🛡️ Pengaturan massal ini hanya memperbarui <strong>{metrics.nonAdminCount} akun GTK Non-Admin</strong> di sheet <code>gtk</code>. Seluruh <strong>{metrics.adminCount} akun berstatus Admin</strong> dikecualikan secara ketat agar hak akses penuhnya tidak terhapus atau berubah.
                    </div>

                    <label className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                      isGlass ? 'hover:bg-white/5' : 'hover:bg-amber-100/60'
                    }`}>
                      <input
                        type="checkbox"
                        checked={alsoApplyRoleToAll}
                        onChange={(e) => setAlsoApplyRoleToAll(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                      />
                      <span className="text-xs font-medium">
                        Samakan juga status login ({modalRole.toUpperCase()}) untuk semua GTK Non-Admin
                      </span>
                    </label>
                    {!alsoApplyRoleToAll && (
                      <p className={`text-[10px] italic pl-1 ${isGlass ? 'text-purple-300/70' : 'text-slate-500'}`}>
                        *Status login masing-masing akun akan tetap dipertahankan, hanya hak izin menu yang disamakan.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-4 sm:p-5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isGlass ? 'border-purple-500/30 bg-purple-950/40' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
                {applyToAllGTK ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-400" />
                    Target: Seluruh {metrics.nonAdminCount} GTK Non-Admin ({metrics.adminCount} Admin Dikecualikan)
                  </span>
                ) : (
                  <span>
                    Target: <strong className={isGlass ? 'text-white' : 'text-slate-800'}>{editingGTK.nama}</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 justify-end flex-wrap w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setEditingGTK(null)}
                  disabled={isSaving}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isGlass
                      ? 'border-purple-400/30 text-purple-200 hover:bg-white/10'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Batal
                </button>

                {!applyToAllGTK && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Apakah Anda yakin ingin menerapkan izin menu ini langsung ke SEMUA (${metrics.nonAdminCount}) GTK Non-Admin?\n\n(Catatan: ${metrics.adminCount} akun Admin akan dikecualikan secara otomatis demi keamanan).`)) {
                        handleSave(true);
                      }
                    }}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                      isGlass
                        ? 'border-amber-400/40 text-amber-300 hover:bg-amber-500/10'
                        : 'border-amber-400 text-amber-800 hover:bg-amber-50 bg-white'
                    }`}
                    title="Terapkan konfigurasi menu ini langsung ke seluruh akun GTK non-admin"
                  >
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Terapkan ke Semua Non-Admin ({metrics.nonAdminCount})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
                    applyToAllGTK
                      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/30'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan ke Sheet...</span>
                    </>
                  ) : applyToAllGTK ? (
                    <>
                      <Users className="w-3.5 h-3.5" />
                      <span>Simpan untuk Semua Non-Admin ({metrics.nonAdminCount})</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Hak Akses</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL DIALOG: ATUR AKSES MASSAL (BULK) */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
            isGlass
              ? 'bg-[#250d4f] border-purple-500/40 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${
              isGlass ? 'border-purple-500/30 bg-purple-900/30' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">
                  Atur Akses Massal ({selectedIds.length} GTK)
                </h3>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className={`text-xs ${isGlass ? 'text-purple-200' : 'text-slate-600'}`}>
                Pilih paket hak akses yang ingin diterapkan secara bersamaan ke <strong>{selectedIds.length}</strong> akun GTK yang dipilih:
              </p>

              <div className="space-y-2">
                {ACCESS_PRESETS.map(preset => (
                  <label
                    key={preset.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      bulkPreset === preset.id
                        ? isGlass
                          ? 'bg-amber-500/20 border-amber-400 text-white'
                          : 'bg-indigo-50 border-indigo-500 text-indigo-950'
                        : isGlass
                          ? 'bg-white/5 border-purple-500/20 text-purple-200'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bulkPreset"
                      value={preset.id}
                      checked={bulkPreset === preset.id}
                      onChange={(e) => setBulkPreset(e.target.value)}
                      className="text-amber-500 focus:ring-amber-400"
                    />
                    <div>
                      <span className="font-bold text-xs block">{preset.name}</span>
                      <span className={`text-[10px] ${isGlass ? 'text-purple-300/70' : 'text-slate-500'}`}>
                        {preset.desc}
                      </span>
                    </div>
                  </label>
                ))}

                <label
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    bulkPreset === 'clear'
                      ? 'bg-rose-500/20 border-rose-400 text-white'
                      : isGlass
                        ? 'bg-white/5 border-purple-500/20 text-purple-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulkPreset"
                    value="clear"
                    checked={bulkPreset === 'clear'}
                    onChange={(e) => setBulkPreset(e.target.value)}
                    className="text-rose-500 focus:ring-rose-400"
                  />
                  <div>
                    <span className="font-bold text-xs block">Reset ke Default / Kosongkan</span>
                    <span className={`text-[10px] ${isGlass ? 'text-purple-300/70' : 'text-slate-500'}`}>
                      Hapus batasan kolom akses_menu untuk semua akun terpilih
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className={`p-4 border-t flex items-center justify-end gap-2.5 ${
              isGlass ? 'border-purple-500/30 bg-purple-950/40' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                disabled={isBulking}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 hover:bg-white/10"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyBulk}
                disabled={isBulking}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isBulking ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menerapkan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Terapkan Massal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
