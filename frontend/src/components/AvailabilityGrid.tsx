'use client';

import { useEffect, useState, useCallback } from 'react';
import { Event, SlotResult, api } from '@/lib/api';
import { getDaysInRange, formatDate, toDateString, TIME_SLOTS } from '@/lib/dates';
import clsx from 'clsx';
import { Save } from 'lucide-react';

interface Props {
  event: Event;
  participantId: string;
  results: SlotResult[];
  onSaved: () => void;
}

type SelectionKey = string; // "YYYY-MM-DD|HH:mm"

function makeKey(date: string, slot: string): SelectionKey {
  return `${date}|${slot}`;
}

export function AvailabilityGrid({ event, participantId, results, onSaved }: Props) {
  const days = getDaysInRange(event.startDate, event.endDate);

  // Load existing selections for this participant
  const existingKeys = new Set(
    event.availabilities
      .filter((a) => a.participantId === participantId)
      .map((a) => makeKey(a.date.split('T')[0], a.timeSlot))
  );

  const [selected, setSelected] = useState<Set<SelectionKey>>(existingKeys);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');

  // Build a vote count map for heat map coloring
  const voteMap = new Map<SelectionKey, number>();
  const maxVotes = Math.max(1, ...results.map((r) => r.count));
  for (const r of results) {
    voteMap.set(makeKey(r.date, r.timeSlot), r.count);
  }

  function toggle(key: SelectionKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    setSaved(false);
  }

  function handleMouseDown(key: SelectionKey) {
    setIsDragging(true);
    setDragMode(selected.has(key) ? 'deselect' : 'select');
    toggle(key);
  }

  function handleMouseEnter(key: SelectionKey) {
    if (!isDragging) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (dragMode === 'select') {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
    setSaved(false);
  }

  useEffect(() => {
    const up = () => setIsDragging(false);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const slots = Array.from(selected).map((key) => {
        const [date, timeSlot] = key.split('|');
        return { date, timeSlot };
      });

      await api.saveAvailability({ participantId, eventId: event.id, slots });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  function heatColor(votes: number): string {
    if (votes === 0) return '';
    const intensity = votes / maxVotes;
    if (intensity >= 0.8) return 'ring-2 ring-pitch-400';
    if (intensity >= 0.5) return 'ring-1 ring-pitch-600';
    return 'ring-1 ring-pitch-800';
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">Mi disponibilidad</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Hacé clic o arrastrá para seleccionar / deseleccionar horarios
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-3 h-3 rounded bg-pitch-500 inline-block" />
            Mis votos
            <span className="w-3 h-3 rounded bg-gray-700 inline-block" />
            Sin votar
          </div>
        </div>
      </div>

      {/* Grid - scrollable on mobile */}
      <div className="overflow-x-auto">
        <div
          className="min-w-max select-none"
          onMouseLeave={() => setIsDragging(false)}
        >
          {/* Header row: dates */}
          <div className="flex">
            <div className="w-16 flex-shrink-0" />
            {days.map((day) => (
              <div
                key={toDateString(day)}
                className="w-24 text-center text-xs font-medium text-gray-400 pb-2 px-1"
              >
                {formatDate(day)}
              </div>
            ))}
          </div>

          {/* Rows: time slots */}
          {TIME_SLOTS.map((slot) => (
            <div key={slot} className="flex items-center mb-1">
              <div className="w-16 flex-shrink-0 text-xs text-gray-500 font-mono pr-2 text-right">
                {slot}
              </div>
              {days.map((day) => {
                const dateStr = toDateString(day);
                const key = makeKey(dateStr, slot);
                const isSelected = selected.has(key);
                const votes = voteMap.get(key) ?? 0;

                return (
                  <div key={key} className="w-24 px-1">
                    <div
                      className={clsx(
                        'slot-cell h-10 rounded-lg flex items-center justify-center text-xs font-medium',
                        heatColor(votes),
                        isSelected
                          ? 'bg-pitch-500 text-white'
                          : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                      )}
                      onMouseDown={() => handleMouseDown(key)}
                      onMouseEnter={() => handleMouseEnter(key)}
                    >
                      {votes > 0 && !isSelected && (
                        <span className="text-gray-400">{votes}</span>
                      )}
                      {isSelected && <span>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
        <div className="text-sm text-gray-400">
          {selected.size} horario{selected.size !== 1 ? 's' : ''} seleccionado{selected.size !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-red-400 text-sm">{error}</span>}
          {saved && <span className="text-pitch-400 text-sm">✓ Guardado</span>}
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar disponibilidad'}
          </button>
        </div>
      </div>
    </div>
  );
}
