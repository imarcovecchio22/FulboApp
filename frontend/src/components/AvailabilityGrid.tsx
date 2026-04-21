'use client';

import { useEffect, useState } from 'react';
import { Event, SlotResult, api } from '@/lib/api';
import { getDaysInRange, toDateString, TIME_SLOTS } from '@/lib/dates';
import clsx from 'clsx';
import { Save, CheckCircle2, Star } from 'lucide-react';

interface Props {
  event: Event;
  participantId: string;
  results: SlotResult[];
  onSaved: () => void;
}

type SelectionKey = string; // "YYYY-MM-DD|HH:mm"

const DAY_ABBREVS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function makeKey(date: string, slot: string): SelectionKey {
  return `${date}|${slot}`;
}

export function AvailabilityGrid({ event, participantId, results, onSaved }: Props) {
  const days = getDaysInRange(event.startDate, event.endDate);
  const todayStr = toDateString(new Date());

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

  // Vote count heatmap + "todos disponibles"
  const voteMap = new Map<SelectionKey, number>();
  const maxVotes = Math.max(1, ...results.map((r) => r.count));
  for (const r of results) {
    voteMap.set(makeKey(r.date, r.timeSlot), r.count);
  }

  // Total unique voters across all slots
  const allVoters = new Set<string>();
  for (const r of results) {
    for (const name of r.participants) allVoters.add(name);
  }
  const totalVoters = allVoters.size;

  function vibrate() {
    navigator.vibrate?.(8);
  }

  function toggle(key: SelectionKey) {
    vibrate();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
    vibrate();
    setSelected((prev) => {
      const next = new Set(prev);
      if (dragMode === 'select') next.add(key);
      else next.delete(key);
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

  function heatColor(votes: number, allAvailable: boolean): string {
    if (allAvailable && totalVoters >= 2) {
      return 'bg-amber-500/30 border border-amber-400/50 text-amber-200 shadow-sm shadow-amber-500/20';
    }
    const intensity = votes / maxVotes;
    if (intensity >= 0.8) return 'bg-pitch-500/60 border border-pitch-400/50 text-white';
    if (intensity >= 0.55) return 'bg-pitch-600/40 border border-pitch-500/35 text-pitch-100';
    if (intensity >= 0.3) return 'bg-pitch-700/30 border border-pitch-600/25 text-pitch-300';
    return 'bg-pitch-900/40 border border-pitch-800/20 text-pitch-400';
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Mi disponibilidad</h2>
          <p className="text-xs text-gray-500 mt-0.5">Tocá o arrastrá para marcar tus horarios</p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-pitch-500 inline-block" />
            Mis votos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-pitch-900/40 border border-pitch-800/30 inline-block" />
            Otros votan
          </span>
          {totalVoters >= 2 && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <Star className="w-3 h-3 fill-amber-400" />
              Todos pueden
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-gray-800/40 border border-gray-700/20 inline-block" />
            Libre
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto scrollbar-none -mx-6 px-6">
        <div
          className="min-w-max select-none"
          onMouseLeave={() => setIsDragging(false)}
        >
          {/* Day headers */}
          <div className="flex mb-2">
            <div className="w-10 flex-shrink-0" />
            {days.map((day) => {
              const dateStr = toDateString(day);
              const isToday = dateStr === todayStr;
              return (
                <div key={dateStr} className="w-14 flex flex-col items-center gap-1 px-0.5">
                  <span className={clsx(
                    'text-[9px] font-bold uppercase tracking-widest',
                    isToday ? 'text-pitch-400' : 'text-gray-600'
                  )}>
                    {DAY_ABBREVS[day.getDay()]}
                  </span>
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                    isToday
                      ? 'bg-pitch-500 text-white shadow-md shadow-pitch-500/40'
                      : 'text-gray-400'
                  )}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time rows */}
          {TIME_SLOTS.map((slot, slotIdx) => (
            <div key={slot} className="flex items-center gap-0 mb-1">
              {/* Time label */}
              <div className="w-10 flex-shrink-0 flex items-center justify-end pr-2">
                <span className="text-[11px] text-gray-600 font-mono tabular-nums">{slot}</span>
              </div>

              {/* Cells */}
              {days.map((day) => {
                const dateStr = toDateString(day);
                const key = makeKey(dateStr, slot);
                const isSelected = selected.has(key);
                const votes = voteMap.get(key) ?? 0;
                const isToday = dateStr === todayStr;
                const allAvailable = totalVoters >= 2 && votes === totalVoters;

                return (
                  <div key={key} className="w-14 px-0.5">
                    <div
                      className={clsx(
                        'slot-cell h-11 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-100',
                        !isSelected && votes === 0 && isToday && 'ring-1 ring-pitch-500/10',
                        isSelected
                          ? 'bg-pitch-500 border border-pitch-400/60 text-white shadow-lg shadow-pitch-500/30 scale-[1.04]'
                          : votes > 0
                            ? heatColor(votes, allAvailable)
                            : 'bg-gray-800/30 border border-gray-700/15 text-transparent hover:bg-gray-700/40 hover:border-gray-600/25'
                      )}
                      onMouseDown={() => handleMouseDown(key)}
                      onMouseEnter={() => handleMouseEnter(key)}
                      onTouchStart={(e) => { e.preventDefault(); toggle(key); }}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : allAvailable ? (
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ) : votes > 0 ? (
                        <span>{votes}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-5 pt-4 border-t border-white/[0.06] gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-500">
            {selected.size > 0
              ? <><span className="text-white font-semibold">{selected.size}</span> horario{selected.size !== 1 ? 's' : ''} seleccionado{selected.size !== 1 ? 's' : ''}</>
              : 'Ningún horario seleccionado'
            }
          </span>
          {error && <span className="text-red-400 text-sm animate-fade-in">{error}</span>}
          {saved && (
            <span className="flex items-center gap-1.5 text-pitch-400 text-sm font-medium animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Guardado
            </span>
          )}
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full sm:w-auto justify-center">
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
