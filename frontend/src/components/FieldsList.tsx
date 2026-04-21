'use client';

import { useEffect, useState } from 'react';
import { FieldAvailability, SlotResult, api } from '@/lib/api';
import { TIME_SLOTS, formatDateLong } from '@/lib/dates';
import { parseISO } from 'date-fns';
import { MapPin, Clock, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  initialDate?: string;
  initialTime?: string;
  results: SlotResult[];
  onSelectSlot?: (date: string, time: string) => void;
}

export function FieldsList({ initialDate, initialTime, results }: Props) {
  const [date, setDate] = useState(initialDate ?? '');
  const [time, setTime] = useState(initialTime ?? TIME_SLOTS[0]);
  const [data, setData] = useState<FieldAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetchFields(d: string, t: string) {
    if (!d || !t) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.getFields(d, t);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar canchas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialDate) setDate(initialDate);
    if (initialTime) setTime(initialTime);
  }, [initialDate, initialTime]);

  useEffect(() => {
    if (date && time) fetchFields(date, time);
  }, [date, time]); // eslint-disable-line react-hooks/exhaustive-deps

  const topDates = Array.from(new Set(results.slice(0, 5).map((r) => r.date)));

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">Canchas disponibles (ATC Sports)</h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="label">Fecha</label>
            <select
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            >
              <option value="">Seleccioná una fecha</option>
              {topDates.length > 0 ? (
                <optgroup label="Más votadas">
                  {topDates.map((d) => (
                    <option key={d} value={d}>
                      {formatDateLong(parseISO(d))} ({results.find((r) => r.date === d)?.count ?? 0} votos)
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <option value={date} disabled>
                {date || 'Sin fecha seleccionada'}
              </option>
            </select>
          </div>
          <div className="sm:w-40">
            <label className="label">Horario</label>
            <select
              className="input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            >
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}hs
                </option>
              ))}
            </select>
          </div>
          <div className="sm:self-end">
            <button
              onClick={() => fetchFields(date, time)}
              disabled={loading || !date}
              className="btn-secondary w-full sm:w-auto"
            >
              <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>
      </div>

      {/* Source indicator */}
      {data && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Fuente:</span>
          <span
            className={clsx(
              'badge',
              data.source === 'api' && 'badge-green',
              data.source === 'scraper' && 'badge-yellow',
              data.source === 'mock' && 'badge-gray'
            )}
          >
            {data.source === 'api' && '🟢 API en tiempo real'}
            {data.source === 'scraper' && '🟡 Scraping'}
            {data.source === 'mock' && '⚪ Datos de ejemplo'}
          </span>
          <span>· Actualizado {new Date(data.fetchedAt).toLocaleTimeString('es-AR')}</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="card flex items-center gap-3 border-red-500/30 bg-red-500/5">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-800 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Venues list */}
      {!loading && data && (
        <>
          {data.venues.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-3xl mb-3">🏟️</div>
              <p className="text-gray-400">No hay canchas disponibles para ese horario</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.venues.map((venue) => {
                const slots = venue.availableSlots?.filter((s) => s.available !== false) ?? [];
                const minPrice = slots.find((s) => s.price)?.price;
                const venueUrl = venue.permalink
                  ? `https://atcsports.io/venues/${venue.permalink}`
                  : undefined;

                return (
                  <div key={venue.id} className="card hover:border-pitch-600/50 hover:shadow-lg hover:shadow-pitch-500/8 transition-all group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        {venueUrl ? (
                          <a
                            href={venueUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-white hover:text-pitch-300 transition-colors text-base"
                          >
                            {venue.name}
                            <span className="ml-1 text-gray-500 text-xs font-normal group-hover:text-pitch-400 transition-colors">↗</span>
                          </a>
                        ) : (
                          <h3 className="font-bold text-white text-base">{venue.name}</h3>
                        )}
                        <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {venue.location}
                          {venue.address && <span className="text-gray-600">· {venue.address}</span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-pitch-500/15 border border-pitch-500/30 flex items-center justify-center ml-2">
                        <CheckCircle className="w-4 h-4 text-pitch-400" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {slots.map((slot) => {
                        const bookingUrl = venue.permalink
                          ? `https://atcsports.io/venues/${venue.permalink}?date=${slot.date}&time=${slot.startTime}`
                          : undefined;
                        const slotEl = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pitch-900/50 border border-pitch-800/60 text-xs text-pitch-300 hover:bg-pitch-700/50 hover:border-pitch-600/60 hover:text-pitch-200 transition-all font-medium">
                            <Clock className="w-3 h-3" />
                            {slot.startTime}
                          </span>
                        );
                        return bookingUrl ? (
                          <a key={slot.startTime} href={bookingUrl} target="_blank" rel="noopener noreferrer">
                            {slotEl}
                          </a>
                        ) : (
                          <span key={slot.startTime}>{slotEl}</span>
                        );
                      })}
                    </div>

                    {minPrice && (
                      <div className="mt-3 pt-3 border-t border-white/[0.05] flex justify-between items-center">
                        <span className="text-xs text-gray-600">desde</span>
                        <span className="text-pitch-300 text-base font-bold tracking-tight">{minPrice}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && !data && !error && (
        <div className="card text-center py-12">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-gray-400">Seleccioná una fecha y horario para buscar canchas</p>
        </div>
      )}
    </div>
  );
}
