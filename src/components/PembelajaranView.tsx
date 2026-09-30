import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Search, 
  RefreshCw, 
  SlidersHorizontal, 
  Check, 
  X, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Users, 
  Clock, 
  AlertCircle
} from 'lucide-react';
import { PembelajaranData, GTKData, AppTheme, AppConfig } from '../types';
import { 
  ALL_PEMBELAJARAN_HEADERS, 
  getPembelajaranVisibleHeaders, 
  savePembelajaranVisibleHeaders,
  PembelajaranHeaderDefinition 
} from '../data/pembelajaranHeaders';
import { isAdminRole, isUserRole, normalizeNip } from '../utils/authUtils';
import { formatToDDMMYYYY } from '../utils/dateUtils';

interface PembelajaranViewProps {
  pembelajaranList: PembelajaranData[];
  gtkList?: GTKData[];
  currentUser?: GTKData | null;
  theme?: AppTheme;
  appConfig?: AppConfig;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const PembelajaranView: React.FC<PembelajaranViewProps> = ({
  pembelajaranList = [],
  gtkList = [],
  currentUser,
  theme = 'aurora-glass',
  onRefresh,
  isRefreshing = false
}) => {
  const isUser = isUserRole(currentUser);
  const isAdmin = !currentUser || isAdminRole(currentUser);
  const isGlass = theme === 'aurora-glass';

  // Resolve logged-in GTK's name in Pembelajaran data
  const loggedInGtkName = useMemo(() => {
    if (!currentUser || !isUserRole(currentUser)) return null;

    const userNuptk = normalizeNip(currentUser.nuptk);
    const userNama = (currentUser.nama || '').trim();

    // 1. Match by NUPTK in pembelajaranList
    if (userNuptk) {
      const matchByNuptk = pembelajaranList.find(
        item => item.nuptk && normalizeNip(item.nuptk) === userNuptk
      );
      if (matchByNuptk && matchByNuptk.namaPtk && matchByNuptk.namaPtk.trim()) {
        return matchByNuptk.namaPtk.trim();
      }
    }

    // Helper for cleaning academic titles & symbols
    const cleanPersonName = (n: string) =>
      n.toLowerCase()
        .replace(/,\s*(s\.?pd|s\.?kom|m\.?pd|s\.?e|s\.?t|s\.?ag|m\.?si|drs\.?|dr\.?|h\.?|hj\.?|gr\.?|s\.?sos|m\.?kom|m\.?ti)/gi, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const cleanedUserNama = cleanPersonName(userNama);

    // 2. Match by exact name in pembelajaranList
    if (userNama) {
      const matchExact = pembelajaranList.find(
        item => item.namaPtk && item.namaPtk.trim().toLowerCase() === userNama.toLowerCase()
      );
      if (matchExact && matchExact.namaPtk && matchExact.namaPtk.trim()) {
        return matchExact.namaPtk.trim();
      }

      // 3. Match by cleaned name
      if (cleanedUserNama) {
        const matchClean = pembelajaranList.find(item => {
          if (!item.namaPtk) return false;
          const cleanedItem = cleanPersonName(item.namaPtk);
          return cleanedItem && (
            cleanedItem === cleanedUserNama ||
            cleanedItem.includes(cleanedUserNama) ||
            cleanedUserNama.includes(cleanedItem)
          );
        });
        if (matchClean && matchClean.namaPtk && matchClean.namaPtk.trim()) {
          return matchClean.namaPtk.trim();
        }
      }
    }

    return userNama || null;
  }, [currentUser, pembelajaranList]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterNamaPtk, setFilterNamaPtk] = useState(''); // State khusus filter GTK
  const [filterRombel, setFilterRombel] = useState('Semua');
  const [filterKepegawaian, setFilterKepegawaian] = useState('Semua');
  
  // Auto-filter when logged in as user
  const userIdentifier = currentUser ? (currentUser.nip || currentUser.nama || '') : '';
  const lastFilteredUserRef = useRef<string>('');

  useEffect(() => {
    if (isUser && loggedInGtkName && lastFilteredUserRef.current !== userIdentifier) {
      setFilterNamaPtk(loggedInGtkName);
      setSearchTerm(loggedInGtkName);
      lastFilteredUserRef.current = userIdentifier;
    } else if (!isUser) {
      lastFilteredUserRef.current = '';
    }
  }, [isUser, loggedInGtkName, userIdentifier]);

  // Header Visibility State (Managed by Admin)
  const [visibleHeaderKeys, setVisibleHeaderKeys] = useState<string[]>(() => getPembelajaranVisibleHeaders());
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [tempVisibleKeys, setTempVisibleKeys] = useState<string[]>(visibleHeaderKeys);
  const [notification, setNotification] = useState<string | null>(null);

  // Autocomplete/Suggestion States
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Listen to cross-component header updates
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setVisibleHeaderKeys(e.detail);
      }
    };
    window.addEventListener('pembelajaran_headers_updated', handleUpdate);
    return () => window.removeEventListener('pembelajaran_headers_updated', handleUpdate);
  }, []);

  // Quick stats map per GTK name in pembelajaran data
  const ptkStatsMap = useMemo(() => {
    const map = new Map<string, { count: number; jjm: number }>();
    pembelajaranList.forEach(item => {
      if (item.namaPtk && item.namaPtk.trim()) {
        const key = item.namaPtk.trim().toLowerCase();
        const existing = map.get(key) || { count: 0, jjm: 0 };
        existing.count += 1;
        existing.jjm += Number(item.jjm) || 0;
        map.set(key, existing);
      }
    });
    return map;
  }, [pembelajaranList]);

  // Extract unique GTK names for suggestions from both pembelajaran and GTK data
  const gtkNames = useMemo(() => {
    const set = new Set<string>();
    pembelajaranList.forEach(item => {
      if (item.namaPtk && item.namaPtk.trim()) {
        set.add(item.namaPtk.trim());
      }
    });
    if (gtkList && Array.isArray(gtkList)) {
      gtkList.forEach(g => {
        if (g.nama && g.nama.trim()) {
          set.add(g.nama.trim());
        }
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
  }, [pembelajaranList, gtkList]);

  // Filter suggestions when searchTerm changes (min 2 characters for responsive feel)
  useEffect(() => {
    const query = searchTerm.trim().toLowerCase();
    if (query.length >= 2 && !filterNamaPtk) {
      const filtered = gtkNames.filter(name => 
        name.toLowerCase().includes(query)
      );
      setSuggestions(filtered.slice(0, 15));
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  }, [searchTerm, gtkNames, filterNamaPtk]);

  // Close suggestions when clicking outside the container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  // Handle suggestion click -> LANGSUNG FILTER TABEL
  const handleSuggestionClick = (name: string) => {
    const cleanName = name.trim();
    setSearchTerm(cleanName);
    setFilterNamaPtk(cleanName); // Aktifkan filter khusus GTK
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  // Keyboard navigation for search & suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSuggestionClick(suggestions[highlightedIndex]);
      } else if (suggestions.length > 0) {
        handleSuggestionClick(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Handle input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    // Jika user mengetik atau menghapus, hilangkan filter ketat GTK agar kembali interaktif
    if (filterNamaPtk && val !== filterNamaPtk) {
      setFilterNamaPtk('');
    }
  };

  const rombelOptions = useMemo(() => {
    const set = new Set<string>();
    const listToExtract = isUser
      ? pembelajaranList.filter(item => {
          const userNuptk = normalizeNip(currentUser?.nuptk);
          const userNama = (loggedInGtkName || currentUser?.nama || '').trim().toLowerCase();
          const itemNuptk = normalizeNip(item.nuptk);
          const itemNama = (item.namaPtk || '').trim().toLowerCase();
          if (userNuptk && itemNuptk && userNuptk === itemNuptk) return true;
          if (userNama && (itemNama === userNama || itemNama.includes(userNama) || userNama.includes(itemNama))) return true;
          return false;
        })
      : pembelajaranList;

    listToExtract.forEach(item => {
      if (item.namaRombel) set.add(String(item.namaRombel).trim());
    });
    return Array.from(set).sort();
  }, [pembelajaranList, isUser, currentUser, loggedInGtkName]);

  const kepegawaianOptions = useMemo(() => {
    const set = new Set<string>();
    pembelajaranList.forEach(item => {
      if (item.kepegawaian) set.add(String(item.kepegawaian).trim());
    });
    return Array.from(set).sort();
  }, [pembelajaranList]);

  // Filtered dataset (DIPERBARUI: Strict user role filter & search filter)
  const filteredList = useMemo(() => {
    // 1. STRICT USER ROLE FILTER: Ketika login sebagai user biasa, HANYA tampilkan data milik GTK tersebut
    if (isUser) {
      const userNuptk = normalizeNip(currentUser?.nuptk);
      const userNama = (loggedInGtkName || currentUser?.nama || '').trim().toLowerCase();

      return pembelajaranList.filter(item => {
        const itemNuptk = normalizeNip(item.nuptk);
        const itemNama = (item.namaPtk || '').trim().toLowerCase();

        let matchesUser = false;
        if (userNuptk && itemNuptk && userNuptk === itemNuptk) {
          matchesUser = true;
        } else if (userNama) {
          if (itemNama === userNama) {
            matchesUser = true;
          } else if (itemNama.includes(userNama) || userNama.includes(itemNama)) {
            matchesUser = true;
          }
        }

        if (!matchesUser) return false;

        // Filter Rombel
        if (filterRombel !== 'Semua' && String(item.namaRombel).trim() !== filterRombel) {
          return false;
        }

        return true;
      });
    }

    // 2. ADMIN / GUEST FILTER
    // Cek apakah ada record dengan nama PTK yang persis sama
    const hasExactPtkMatch = filterNamaPtk
      ? pembelajaranList.some(
          item => item.namaPtk && item.namaPtk.trim().toLowerCase() === filterNamaPtk.trim().toLowerCase()
        )
      : false;

    return pembelajaranList.filter(item => {
      // 1. STRICT GTK FILTER (Ketika nama GTK dipilih dari suggestion)
      if (filterNamaPtk) {
        const itemPtk = (item.namaPtk || '').trim().toLowerCase();
        const targetPtk = filterNamaPtk.trim().toLowerCase();
        if (hasExactPtkMatch) {
          if (itemPtk !== targetPtk) return false;
        } else {
          // Fallback cerdas jika ada perbedaan gelar akademik antara master GTK dan data pembelajaran
          if (!itemPtk.includes(targetPtk) && !targetPtk.includes(itemPtk)) {
            return false;
          }
        }
      } 
      // 2. GLOBAL SEARCH (Jika user mengetik manual di input pencarian)
      else if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const match = 
          (item.namaPtk && String(item.namaPtk).toLowerCase().includes(q)) ||
          (item.namaMatpel && String(item.namaMatpel).toLowerCase().includes(q)) ||
          (item.namaRombel && String(item.namaRombel).toLowerCase().includes(q)) ||
          (item.nuptk && String(item.nuptk).includes(q)) ||
          (item.kodeMatpel && String(item.kodeMatpel).toLowerCase().includes(q)) ||
          (item.skMengajar && String(item.skMengajar).toLowerCase().includes(q)) ||
          (item.programKeahlian && String(item.programKeahlian).toLowerCase().includes(q));
        if (!match) return false;
      }

      // Filter Rombel
      if (filterRombel !== 'Semua' && String(item.namaRombel).trim() !== filterRombel) {
        return false;
      }

      // Filter Kepegawaian
      if (filterKepegawaian !== 'Semua' && String(item.kepegawaian).trim() !== filterKepegawaian) {
        return false;
      }

      return true;
    });
  }, [pembelajaranList, searchTerm, filterNamaPtk, filterRombel, filterKepegawaian, isUser, currentUser, loggedInGtkName]);

  // Statistics
  const totalJJM = useMemo(() => {
    return filteredList.reduce((acc, curr) => acc + (Number(curr.jjm) || 0), 0);
  }, [filteredList]);

  // Active columns based on Admin visibleHeaderKeys
  const activeColumns = useMemo(() => {
    const keySet = new Set(visibleHeaderKeys);
    return ALL_PEMBELAJARAN_HEADERS.filter(h => keySet.has(h.key));
  }, [visibleHeaderKeys]);

  // Open modal handler
  const handleOpenHeaderModal = () => {
    setTempVisibleKeys([...visibleHeaderKeys]);
    setIsHeaderModalOpen(true);
  };

  const handleToggleHeaderKey = (key: string) => {
    setTempVisibleKeys(prev => {
      if (prev.includes(key)) {
        if (prev.length <= 1) {
          showNotification('Minimal satu kolom harus tetap ditampilkan');
          return prev;
        }
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const handleSelectAllHeaders = () => {
    setTempVisibleKeys(ALL_PEMBELAJARAN_HEADERS.map(h => h.key));
  };

  const handleResetDefaultHeaders = () => {
    setTempVisibleKeys(ALL_PEMBELAJARAN_HEADERS.filter(h => h.defaultVisible).map(h => h.key));
  };

  const handleSaveHeaders = () => {
    if (!isAdmin) {
      showNotification('Hanya Administrator yang dapat mengubah visibilitas kolom.');
      setIsHeaderModalOpen(false);
      return;
    }
    savePembelajaranVisibleHeaders(tempVisibleKeys);
    setVisibleHeaderKeys(tempVisibleKeys);
    setIsHeaderModalOpen(false);
    showNotification('Konfigurasi header kolom berhasil disimpan.');
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const renderCellValue = (item: PembelajaranData, col: PembelajaranHeaderDefinition, index: number) => {
    switch (col.key) {
      case 'no': return index + 1;
      case 'jenisRombel': return item.jenisRombel || '-';
      case 'tingkat': return item.tingkat || '-';
      case 'namaRombel': return item.namaRombel || '-';
      case 'kurikulum': return item.kurikulum || '-';
      case 'programKeahlian': return item.programKeahlian || '-';
      case 'namaPtk': return item.namaPtk || '-';
      case 'nuptk': return item.nuptk || '-';
      case 'ptkInduk': return item.ptkInduk || '-';
      case 'kepegawaian': return item.kepegawaian || '-';
      case 'namaMatpel': return item.namaMatpel || '-';
      case 'kodeMatpel': return item.kodeMatpel || '-';
      case 'jjm': return item.jjm !== undefined && item.jjm !== '' ? item.jjm : '0';
      case 'jmlSiswa': return item.jmlSiswa !== undefined && item.jmlSiswa !== '' ? item.jmlSiswa : '0';
      case 'tglSkMengajar': return item.tglSkMengajar ? formatToDDMMYYYY(item.tglSkMengajar) : '-';
      case 'skMengajar': return item.skMengajar || '-';
      case 'statusDiKurikulum': return item.statusDiKurikulum || '-';
      default: return item[col.key] || '-';
    }
  };

  // Fungsi Reset Lengkap
  const handleResetAll = () => {
    if (isUser && loggedInGtkName) {
      setSearchTerm(loggedInGtkName);
      setFilterNamaPtk(loggedInGtkName);
    } else {
      setSearchTerm('');
      setFilterNamaPtk('');
    }
    setFilterRombel('Semua');
    setFilterKepegawaian('Semua');
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isGlass ? 'bg-white/80 border-purple-200/50 shadow-sm backdrop-blur-sm' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Pembagian Tugas Mengajar</h2>
          </div>

          {!isUser && (
            <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
              <button
                onClick={handleOpenHeaderModal}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  isAdmin ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>Atur Kolom</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-200/70 text-indigo-800 font-bold">
                  {activeColumns.length}/{ALL_PEMBELAJARAN_HEADERS.length}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
        isGlass ? 'bg-white/80 border-slate-200' : 'bg-white border-slate-200'
      }`}>
        {/* Search Input dengan Suggestions & Strict Filter */}
        <div ref={searchContainerRef} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={isUser ? (loggedInGtkName || currentUser?.nama || 'Nama Guru') : "Ketik nama GTK, matpel, rombel, SK..."}
            value={isUser ? (loggedInGtkName || currentUser?.nama || '') : searchTerm}
            onChange={isUser ? undefined : handleSearchChange}
            onKeyDown={isUser ? undefined : handleKeyDown}
            onFocus={() => {
              if (!isUser && searchTerm.trim().length >= 2 && !filterNamaPtk) {
                setShowSuggestions(true);
              }
            }}
            disabled={isUser}
            className={`w-full pl-9 pr-8 py-2 text-xs rounded-lg border transition-all ${
              isUser
                ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed select-none'
                : filterNamaPtk 
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 font-medium text-slate-900 focus:outline-none' 
                  : 'border-slate-300 focus:ring-blue-500 focus:outline-none bg-white text-slate-900'
            }`}
            title={isUser ? "Pencarian dinonaktifkan: Anda hanya dapat melihat data jadwal penugasan Anda sendiri" : undefined}
          />
          {!isUser && (searchTerm || filterNamaPtk) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterNamaPtk('');
                setShowSuggestions(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              title="Hapus pencarian / filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          
          {/* Suggestions Dropdown (Hanya untuk Admin / Guest) */}
          {!isUser && showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 text-[11px] font-semibold text-slate-600 bg-slate-50 sticky top-0 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-blue-700">
                  <Users className="w-3.5 h-3.5" />
                  <span>{suggestions.length} Nama GTK Ditemukan</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">Klik untuk filter</span>
              </div>
              <div className="py-1">
                {suggestions.map((name, index) => {
                  const stats = ptkStatsMap.get(name.toLowerCase());
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <button
                      key={index}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSuggestionClick(name);
                      }}
                      onClick={() => handleSuggestionClick(name)}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isHighlighted 
                          ? 'bg-blue-100 text-blue-900 font-medium' 
                          : 'hover:bg-blue-50/80 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className={`w-3.5 h-3.5 shrink-0 ${isHighlighted ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="truncate">{name}</span>
                      </div>
                      {stats ? (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-200/80">
                          {stats.count} rombel • {stats.jjm} jam
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] text-slate-500 italic">
                          Master GTK
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* No Results Message */}
          {!isUser && showSuggestions && searchTerm.trim().length >= 2 && suggestions.length === 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-center animate-in fade-in duration-100">
              <div className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span>Tidak ada nama GTK yang cocok</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-medium shrink-0">Rombel:</span>
            <select value={filterRombel} onChange={(e) => setFilterRombel(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px] truncate">
              <option value="Semua">Semua Rombel</option>
              {rombelOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {((!isUser && (searchTerm || filterNamaPtk || filterRombel !== 'Semua')) || (isUser && filterRombel !== 'Semua')) && (
            <button
              onClick={handleResetAll}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1 cursor-pointer transition-colors"
              title={isUser ? "Reset Filter Rombel" : "Reset Semua Filter"}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* DATA TABLE */}
      <div className={`rounded-xl border overflow-hidden shadow-xs transition-colors ${
        isGlass ? 'bg-white border-slate-200' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                {activeColumns.map((col) => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.minWidth ? `${col.minWidth}px` : undefined }}
                    className={`px-3 py-3 border-r border-slate-200 last:border-r-0 whitespace-nowrap ${
                      col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.sheetHeader}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
              {isRefreshing && filteredList.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-spin" />
                    <p className="font-semibold text-slate-700">Sedang memuat data pembelajaran...</p>
                    <p className="text-xs text-slate-400 mt-1">Mengambil data penugasan dari Google Sheets</p>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length} className="px-4 py-12 text-center text-slate-500">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-slate-700">Tidak ada data pembelajaran ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isUser ? `Tidak ada jadwal penugasan mengajar yang tercatat untuk akun Anda (${currentUser?.nama || ''})` : (filterNamaPtk ? `Tidak ada data penugasan untuk GTK: ${filterNamaPtk}` : 'Coba ubah kata kunci pencarian atau filter yang dipilih')}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-slate-50/80 transition-colors">
                    {activeColumns.map((col) => {
                      const val = renderCellValue(item, col, index);
                      return (
                        <td
                          key={col.key}
                          className={`px-3 py-2.5 border-r border-slate-200 last:border-r-0 whitespace-nowrap text-slate-700 ${
                            col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
            {filteredList.length > 0 && (
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-semibold text-xs text-slate-800">
                <tr>
                  {activeColumns.map((col, idx) => {
                    const jjmIdx = activeColumns.findIndex(c => c.key === 'jjm');
                    if (col.key === 'jjm') {
                      return (
                        <td
                          key={col.key}
                          className="px-3 py-2.5 border-r border-slate-200 last:border-r-0 text-center font-extrabold text-amber-950 bg-amber-100/90 text-xs"
                          title="Jumlah Jam Mengajar (JJM)"
                        >
                          {totalJJM}
                        </td>
                      );
                    }
                    if (jjmIdx !== -1 && idx === jjmIdx - 1) {
                      return (
                        <td
                          key={col.key}
                          className="px-3 py-2.5 border-r border-slate-200 last:border-r-0 text-right font-bold text-slate-800 uppercase tracking-wider text-[11px]"
                        >
                          Jumlah JJM:
                        </td>
                      );
                    }
                    if (jjmIdx === -1 && idx === 0) {
                      return (
                        <td
                          key={col.key}
                          className="px-3 py-2.5 border-r border-slate-200 last:border-r-0 text-left font-bold text-slate-800"
                        >
                          Jumlah JJM: <span className="text-amber-800 font-extrabold">{totalJJM} Jam</span>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={col.key}
                        className="px-3 py-2.5 border-r border-slate-200 last:border-r-0"
                      />
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              Menampilkan <span className="font-semibold text-slate-700">{filteredList.length}</span> dari{' '}
              <span className="font-semibold text-slate-700">{pembelajaranList.length}</span> data penugasan
              ({activeColumns.length} kolom aktif)
            </div>
            <div className="h-4 w-px bg-slate-300 hidden sm:block" />
            <div className="flex items-center gap-1.5 font-medium text-slate-700 bg-amber-50 border border-amber-200/90 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-slate-600">Jumlah JJM:</span>
              <span className="font-bold text-amber-900 text-xs">{totalJJM} Jam</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400">Sumber Data: Dapodik</div>
        </div>
      </div>

      {/* ADMIN HEADER CONFIGURATION MODAL (Sama seperti sebelumnya, dipersingkat untuk fokus pada perubahan utama) */}
      {isHeaderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    Pengaturan Visibilitas Header Kolom
                    {isAdmin && <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold uppercase tracking-wider border border-indigo-200">Admin</span>}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAdmin ? 'Pilih kolom mana saja yang ingin ditampilkan atau disembunyikan' : 'Daftar kolom dikonfigurasi oleh Administrator'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsHeaderModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {!isAdmin && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Perubahan visibilitas kolom hanya dapat disimpan secara permanen oleh Administrator.</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
                <div className="text-xs font-semibold text-slate-700">{tempVisibleKeys.length} dari {ALL_PEMBELAJARAN_HEADERS.length} kolom dipilih</div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleSelectAllHeaders} className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-md border border-indigo-200 cursor-pointer transition-colors">Pilih Semua</button>
                    <button type="button" onClick={handleResetDefaultHeaders} className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer transition-colors">Reset Default</button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ALL_PEMBELAJARAN_HEADERS.map((col, idx) => {
                  const isChecked = tempVisibleKeys.includes(col.key);
                  return (
                    <label key={col.key} className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${isChecked ? 'bg-indigo-50/50 border-indigo-200 text-slate-900' : 'bg-white border-slate-200 text-slate-500 opacity-60 hover:opacity-100'}`}
                      onClick={(e) => { if (!isAdmin) { e.preventDefault(); return; } }}
                    >
                      <input type="checkbox" checked={isChecked} disabled={!isAdmin} onChange={() => handleToggleHeaderKey(col.key)} className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-800">{idx + 1}. {col.sheetHeader}</span>
                          {isChecked ? <Eye className="w-3.5 h-3.5 text-indigo-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{col.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button type="button" onClick={() => setIsHeaderModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 border border-slate-300 transition-colors cursor-pointer">Batal</button>
              {isAdmin ? (
                <button type="button" onClick={handleSaveHeaders} className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Simpan Pengaturan</span>
                </button>
              ) : (
                <button type="button" onClick={() => setIsHeaderModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white shadow-xs cursor-pointer">Tutup</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};