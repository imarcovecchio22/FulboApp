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

                return (
                  <div key={venue.id} className="card hover:border-pitch-700 transition-all">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="font-semibold text-white">{venue.name}</h3>
                        <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {venue.location}
                        </div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-pitch-400 flex-shrink-0" />
                    </div>

                    {venue.address && (
                      <p className="text-xs text-gray-500 mb-3">{venue.address}</p>
                    )}

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {slots.map((slot) => (
                        <span
                          key={slot.startTime}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-200"
                        >
                          <Clock className="w-3 h-3 text-gray-500" />
                          {slot.startTime}
                        </span>
                      ))}
                    </div>

                    {minPrice && (
                      <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center">
                        <span className="text-xs text-gray-500">desde</span>
                        <span className="text-pitch-400 text-sm font-semibold">{minPrice}</span>
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
