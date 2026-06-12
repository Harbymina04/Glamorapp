// Utilidades de geolocalización del storefront (lado cliente).
// La ubicación del visitante vive solo en su navegador (localStorage) y
// únicamente viaja como parámetro de consulta — el servidor no la almacena.

const LOC_KEY = 'glamor-loc';

export interface ClientLocation {
  lat: number;
  lng: number;
}

export function getSavedLocation(): ClientLocation | null {
  try {
    const raw = localStorage.getItem(LOC_KEY);
    if (!raw) return null;
    const { lat, lng } = JSON.parse(raw);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

export function saveLocation(loc: ClientLocation): void {
  try { localStorage.setItem(LOC_KEY, JSON.stringify(loc)); } catch { /* ignore */ }
}

export function clearSavedLocation(): void {
  try { localStorage.removeItem(LOC_KEY); } catch { /* ignore */ }
}

/** Pide la ubicación al navegador (promesa; rechaza si el usuario niega). */
export function requestLocation(): Promise<ClientLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('geolocation-unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveLocation(loc);
        resolve(loc);
      },
      () => reject(new Error('geolocation-denied')),
      { timeout: 8000, maximumAge: 300000 },
    );
  });
}

/** Distancia en km entre dos coordenadas (Haversine) — espejo del backend. */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
