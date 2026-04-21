const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  participants: Participant[];
  availabilities: Availability[];
}

export interface EventSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  _count: { participants: number };
  bestSlot: { date: string; timeSlot: string; count: number } | null;
}

export interface Participant {
  id: string;
  name: string;
  eventId: string;
}

export interface Availability {
  id: string;
  participantId: string;
  eventId: string;
  date: string;
  timeSlot: string;
  participant: Participant;
}

export interface SlotResult {
  date: string;
  timeSlot: string;
  count: number;
  participants: string[];
}

export interface EventResults {
  eventId: string;
  results: SlotResult[];
}

export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  price?: string;
}

export interface Venue {
  id: string;
  name: string;
  location: string;
  address?: string;
  imageUrl?: string;
  permalink?: string;
  availableSlots?: TimeSlot[];
}

export interface FieldAvailability {
  venues: Venue[];
  fetchedAt: string;
  source: 'api' | 'scraper' | 'mock';
}

export interface BookingConfirmation {
  id: string;
  eventId: string;
  venueName: string;
  date: string;       // YYYY-MM-DD
  timeSlot: string;   // HH:mm
  price?: string | null;
  confirmedBy: string;
  confirmedAt: string;
}

// ─── Event endpoints ──────────────────────────────────────────────────────────

export const api = {
  listEvents: () => request<EventSummary[]>('/events'),

  createEvent: (data: { name: string; startDate: string; endDate: string }) =>
    request<Event>('/events', { method: 'POST', body: JSON.stringify(data) }),

  getEvent: (id: string) => request<Event>(`/events/${id}`),

  deleteEvent: (id: string) =>
    request<void>(`/events/${id}`, { method: 'DELETE' }),

  joinEvent: (eventId: string, name: string) =>
    request<Participant>(`/events/${eventId}/join`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  saveAvailability: (data: {
    participantId: string;
    eventId: string;
    slots: { date: string; timeSlot: string }[];
  }) =>
    request<{ saved: number }>('/availability', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getResults: (eventId: string) =>
    request<EventResults>(`/events/${eventId}/results`),

  getFields: (date: string, time: string) =>
    request<FieldAvailability>(`/fields?date=${date}&time=${time}`),

  getBooking: (eventId: string) =>
    request<BookingConfirmation | null>(`/events/${eventId}/booking`),

  setBooking: (eventId: string, data: {
    venueName: string;
    date: string;
    timeSlot: string;
    price?: string;
    confirmedBy: string;
  }) =>
    request<BookingConfirmation>(`/events/${eventId}/booking`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
