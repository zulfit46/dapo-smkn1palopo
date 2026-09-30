import { GTKData, WaliKelas } from '../types';

/**
 * Utility functions for GTK authentication and role-based filtering
 */

export const normalizeNip = (nip?: string | null): string => {
  if (!nip) return '';
  return String(nip).replace(/[\s.-]/g, '').trim();
};

export const isSameNip = (nipA?: string | null, nipB?: string | null): boolean => {
  const cleanA = normalizeNip(nipA);
  const cleanB = normalizeNip(nipB);
  return Boolean(cleanA && cleanB && cleanA === cleanB);
};

export const getGtkLoginRole = (gtk?: GTKData | null): string => {
  if (!gtk) return '';
  const rawRole = (
    gtk.status_login ?? 
    gtk.statusLogin ?? 
    gtk.statuslogin ?? 
    gtk['status_login'] ?? 
    gtk['statuslogin'] ?? 
    ''
  ).toString().trim().toLowerCase();

  return rawRole;
};

/**
 * Check if the authenticated GTK has 'user' login status.
 * When role is 'user', the system strictly filters data to only show
 * records matching their NIP.
 */
export const isUserRole = (gtk?: GTKData | null): boolean => {
  return getGtkLoginRole(gtk) === 'user';
};

/**
 * Check if the GTK has 'admin' login status.
 */
export const isAdminRole = (gtk?: GTKData | null): boolean => {
  return getGtkLoginRole(gtk) === 'admin';
};

/**
 * Utility to find the WaliKelas assignment for a given GTK user.
 * Matches by NIP, NUPTK, or checks tugasTambahan (e.g. "Wali Kelas 10 AKL 1").
 */
export const getWaliKelasForUser = (
  currentUser?: GTKData | null,
  waliKelasList?: WaliKelas[]
): WaliKelas | null => {
  if (!currentUser) return null;

  const userNip = normalizeNip(currentUser.nip);
  const userNuptk = normalizeNip(currentUser.nuptk);
  const userNama = (currentUser.nama || '').trim().toLowerCase();

  // 1. Check against waliKelasList
  if (waliKelasList && waliKelasList.length > 0) {
    // Check by normalized NIP
    if (userNip) {
      const foundByNip = waliKelasList.find((w) => {
        const wNip = normalizeNip(w.nip);
        return Boolean(wNip && wNip === userNip);
      });
      if (foundByNip) return foundByNip;
    }

    // Check by normalized NUPTK
    if (userNuptk) {
      const foundByNuptk = waliKelasList.find((w) => {
        const wNip = normalizeNip(w.nip);
        return Boolean(wNip && wNip === userNuptk);
      });
      if (foundByNuptk) return foundByNuptk;
    }

    // Check by normalized Name (strip academic titles & punctuation)
    if (userNama) {
      const cleanPersonName = (n: string) =>
        n.toLowerCase()
          .replace(/,\s*(s\.?pd|s\.?kom|m\.?pd|s\.?e|s\.?t|s\.?ag|m\.?si|drs\.?|dr\.?|h\.?|hj\.?)/gi, '')
          .replace(/[^a-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const cleanedUserNama = cleanPersonName(userNama);

      const foundByName = waliKelasList.find((w) => {
        const wName = (w.nama || '').trim();
        if (!wName) return false;
        const cleanedWName = cleanPersonName(wName);
        if (!cleanedWName || !cleanedUserNama) return false;
        return (
          cleanedWName === cleanedUserNama ||
          cleanedWName.includes(cleanedUserNama) ||
          cleanedUserNama.includes(cleanedWName)
        );
      });
      if (foundByName) return foundByName;
    }
  }

  // 2. Fallback: Parse from currentUser.tugasTambahan if it mentions "Wali Kelas <Kelas>"
  const tugas = (currentUser.tugasTambahan || '').trim();
  if (tugas && tugas.toLowerCase().includes('wali kelas')) {
    const match = tugas.match(/wali\s*kelas\s*(.+)/i);
    const kelasName = match ? match[1].trim() : '';
    if (kelasName) {
      if (waliKelasList && waliKelasList.length > 0) {
        const found = waliKelasList.find(
          (w) => w.kelas.trim().toLowerCase() === kelasName.toLowerCase()
        );
        if (found) return found;
      }
      return {
        kelas: kelasName,
        nama: currentUser.nama || '',
        nip: currentUser.nip || '',
      };
    }
  }

  return null;
};

/**
 * Check if the user is assigned as a Wali Kelas
 */
export const isUserWaliKelas = (
  currentUser?: GTKData | null,
  waliKelasList?: WaliKelas[]
): boolean => {
  return Boolean(getWaliKelasForUser(currentUser, waliKelasList));
};

/**
 * Check if a record (GTK, Pangkat, KGB) belongs to the currently logged in user
 */
export const isOwnerOfRecord = (
  recordNip?: string | null,
  recordNama?: string | null,
  currentUser?: GTKData | null
): boolean => {
  if (!currentUser) return true;
  if (!isUserRole(currentUser)) return true; // Non-user roles (e.g. admin) can access all records

  const userNip = normalizeNip(currentUser.nip);
  const recNip = normalizeNip(recordNip);

  // Primary check: exact NIP match
  if (userNip && recNip && userNip === recNip) {
    return true;
  }

  // Secondary check: NUPTK match if record has nuptk
  if (currentUser.nuptk && recNip && normalizeNip(currentUser.nuptk) === recNip) {
    return true;
  }

  // Tertiary fallback: Name match (trimmed, case-insensitive)
  if (recordNama && currentUser.nama && recordNama.trim().toLowerCase() === currentUser.nama.trim().toLowerCase()) {
    return true;
  }

  return false;
};
