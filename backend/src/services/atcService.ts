/**
 * ATC Sports / AlquilaTuCancha — Field Availability Service
 *
 * API descubierta por reverse engineering:
 *   Auth:       Firebase idToken → POST atcsports.io/api/v2/accounts/login → v2Token
 *   Endpoint:   GET alquilatucancha.com/api/v3/availability/sportclubs/{id}?date=YYYY-MM-DD
 *   Auth header: Authorization: Bearer {v2Token}
 *
 * Respuesta:
 *   { id, name, logo_url, location: {name, lat, lng}, available_courts: [
 *       { id, name, sport_ids, available_slots: [{ start, duration, price: {cents} }] }
 *   ]}
 *
 * Estrategia:
 * 1. API directa con lista de venues CABA conocidos + v2Token
 * 2. Mock data de CABA como fallback
 */

import axios from 'axios';
import { getCache, setCache } from '../lib/cache';
import { getV2Token } from './atcAuth';
import logger from '../lib/logger';

export interface Venue {
  id: string;
  name: string;
  location: string;
  address?: string;
  imageUrl?: string;
  availableSlots?: TimeSlot[];
}

export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  price?: string;
}

export interface FieldAvailability {
  venues: Venue[];
  fetchedAt: string;
  source: 'api' | 'scraper' | 'mock';
}

// ─── Known venues with Fútbol 5 (sport_id "2") ──────────────────────────────
// IDs descubiertos via API alquilatucancha.com/api/v3/availability/sportclubs

const CABA_FUTBOL_VENUES = [
  // Zona norte — Belgrano / Núñez / Saavedra / Villa Urquiza / Vicente López
  { id: '766',  name: 'La Canchita',             address: 'Av. Olazábal 1784',        neighborhood: 'Belgrano' },
  { id: '110',  name: 'La Terraza',               address: 'Av. Cabildo 3432',         neighborhood: 'Belgrano' },
  { id: '183',  name: 'El Poli de Cramer',        address: 'Av. Crámer 3249',          neighborhood: 'Belgrano' },
  { id: '94',   name: 'Distrito Fútbol',          address: 'Jose Hernandez 1310',      neighborhood: 'Belgrano' },
  { id: '2218', name: 'La Terraza Fútbol 5',      address: 'Blanco Encalada 1422',     neighborhood: 'Coghlan' },
  { id: '89',   name: 'Grün FC',                  address: 'Padre Canavery 1351',      neighborhood: 'Saavedra' },
  { id: '46',   name: 'Las Palmeras',             address: 'E. Holmberg 3430',         neighborhood: 'Saavedra' },
  { id: '1325', name: 'Club Río de la Plata',     address: 'Ibera 5257',               neighborhood: 'Villa Urquiza' },
  { id: '486',  name: 'Solanas Fútbol',           address: 'Av. Francisco Beiró 2835', neighborhood: 'Villa Urquiza' },
  { id: '2054', name: 'Estación Futbol',          address: 'Rosetti 6240',             neighborhood: 'Villa Urquiza' },
  { id: '1686', name: 'Sucre Fútbol',             address: 'Sucre 300',                neighborhood: 'Núñez' },
  { id: '91',   name: 'Banco Fútbol',             address: 'Zufriategui 1251',         neighborhood: 'Vicente López' },
  // Zona centro/sur (venues originales)
  { id: '103',  name: 'El Anden',                 address: 'Yerbal 1201',              neighborhood: 'Caballito' },
  { id: '732',  name: 'Distrito Fútbol - Constitución', address: 'Salta 1727',         neighborhood: 'Constitución' },
  { id: '866',  name: 'El Predio Ciudad',         address: 'Arregui 2540',             neighborhood: 'Villa Crespo' },
] as const;

const ATC_API_BASE = 'https://alquilatucancha.com';
const FUTBOL5_SPORT_ID = '2';

// ─── Strategy 1: Direct API ───────────────────────────────────────────────────

async function fetchViaApi(date: string, time: string): Promise<Venue[] | null> {
  const token = await getV2Token();
  if (!token) {
    logger.debug('ATC: no v2 token, skipping API call');
    return null;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
    Origin: 'https://atcsports.io',
    Referer: 'https://atcsports.io/',
  };

  const results = await Promise.allSettled(
    CABA_FUTBOL_VENUES.map((venue) => fetchVenueAvailability(venue, date, time, headers))
  );

  const venues = results
    .filter((r): r is PromiseFulfilledResult<Venue | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((v): v is Venue => v !== null);

  if (!venues.length) {
    logger.warn('ATC API: no venues returned, token may be invalid');
    return null;
  }

  logger.info(`ATC API: ${venues.length} venues with real data`);
  return venues;
}

async function fetchVenueAvailability(
  venue: { id: string; name: string; address: string; neighborhood: string },
  date: string,
  time: string,
  headers: Record<string, string>
): Promise<Venue | null> {
  try {
    const res = await axios.get(
      `${ATC_API_BASE}/api/v3/availability/sportclubs/${venue.id}`,
      { params: { date }, headers, timeout: 12_000 }
    );

    const data = res.data as VenueAvailabilityDTO;

    // Filter courts with Fútbol 5 (sport_id "2")
    const futbol5Courts = (data.available_courts ?? []).filter((c) =>
      Array.isArray(c.sport_ids) && c.sport_ids.includes(FUTBOL5_SPORT_ID)
    );

    if (!futbol5Courts.length) {
      logger.debug(`ATC: venue ${venue.name} has no Fútbol 5 courts on ${date}`);
      return null;
    }

    // Extract all available slots from 18:00 onwards.
    // IMPORTANT: parse hour directly from the ISO string to avoid UTC conversion.
    // slot.start format: "2026-04-12T22:00-03:00" → hour = "22"
    const matchingSlots: TimeSlot[] = [];

    for (const court of futbol5Courts) {
      for (const slot of court.available_slots ?? []) {
        // Extract HH:MM directly from the ISO string (index 11-15), ignoring timezone
        const timePart = slot.start.substring(11, 16); // e.g. "22:00"
        const slotHour = parseInt(timePart.substring(0, 2), 10);
        if (slotHour < 18) continue;

        const startTime = timePart;
        const endTime = addMinutes(startTime, slot.duration ?? 60);
        const price = slot.price?.cents ? formatPrice(slot.price.cents) : undefined;

        // Avoid duplicating the same time slot across courts
        const exists = matchingSlots.some((s) => s.startTime === startTime);
        if (!exists) {
          matchingSlots.push({ date, startTime, endTime, available: true, price });
        }
      }
    }

    // If no evening slots available, don't show this venue
    if (!matchingSlots.length) {
      logger.debug(`ATC: venue ${venue.name} has no evening slots on ${date}`);
      return null;
    }

    matchingSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const apiAddress = data.location?.name;

    return {
      id: data.id || venue.id,
      name: data.name || venue.name,
      location: venue.neighborhood,
      address: apiAddress || venue.address,
      imageUrl: data.logo_url || undefined,
      availableSlots: matchingSlots,
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      logger.warn(`ATC: venue ${venue.id} error ${err.response?.status}: ${err.message}`);
    } else {
      logger.warn(`ATC: venue ${venue.id} error:`, err instanceof Error ? err.message : err);
    }
    return null;
  }
}

// ─── Strategy 2: Mock data (CABA) ────────────────────────────────────────────

function getMockVenues(date: string, time: string): Venue[] {
  logger.info('ATC: using mock data — configure auth for real data (see README)');
  return [
    { id: 'm1', name: 'Complejo El Trébol',             location: 'Palermo',    address: 'Av. del Libertador 3500', availableSlots: [slot(date, time, true,  '$8.000')] },
    { id: 'm2', name: 'Centro Deportivo La Boca',        location: 'La Boca',    address: 'Brandsen 805',            availableSlots: [slot(date, time, true,  '$7.500')] },
    { id: 'm3', name: 'Canchas Belgrano Sport Club',     location: 'Belgrano',   address: 'Monroe 3450',             availableSlots: [slot(date, time, false, '$9.000')] },
    { id: 'm4', name: 'Club Atlético Nación',            location: 'Flores',     address: 'Av. Rivadavia 6800',      availableSlots: [slot(date, time, true,  '$6.500')] },
    { id: 'm5', name: 'Complejo Deportivo Almagro',      location: 'Almagro',    address: 'Medrano 650',             availableSlots: [slot(date, time, true,  '$7.000')] },
    { id: 'm6', name: 'Sportway Caballito',              location: 'Caballito',  address: 'Av. Pedro Goyena 902',    availableSlots: [slot(date, time, true,  '$8.500')] },
  ];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getFieldAvailability(date: string, time: string): Promise<FieldAvailability> {
  const cacheKey = `atc:${date}:${time}`;
  const cached = getCache<FieldAvailability>(cacheKey);
  if (cached) return cached;

  let venues: Venue[] | null = null;
  let source: FieldAvailability['source'] = 'mock';

  venues = await fetchViaApi(date, time);
  if (venues?.length) {
    source = 'api';
  } else {
    venues = getMockVenues(date, time);
    source = 'mock';
  }

  const result: FieldAvailability = { venues, fetchedAt: new Date().toISOString(), source };
  setCache(cacheKey, result);
  return result;
}

// ─── DTO types ────────────────────────────────────────────────────────────────

interface VenueAvailabilityDTO {
  id?: string;
  name?: string;
  logo_url?: string;
  location?: { name?: string; lat?: number; lng?: number };
  available_courts?: CourtDTO[];
}

interface CourtDTO {
  id?: string;
  name?: string;
  sport_ids?: string[];
  available_slots?: SlotDTO[];
}

interface SlotDTO {
  start: string; // ISO 8601 with TZ, e.g. "2026-04-12T20:00-03:00"
  duration?: number; // minutes
  price?: { cents: number; currency: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slot(date: string, time: string, available: boolean, price?: string): TimeSlot {
  return { date, startTime: time, endTime: addHour(time), available, price };
}

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function formatPrice(cents: number): string {
  const pesos = Math.round(cents / 100);
  return `$${pesos.toLocaleString('es-AR')}`;
}
