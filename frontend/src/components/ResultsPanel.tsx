'use client';

import { SlotResult } from '@/lib/api';
import { formatDateLong } from '@/lib/dates';
import { parseISO } from 'date-fns';
import { Trophy, MapPin } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  results: SlotResult[];
  totalParticipants: number;
  onSelectSlot: (date: string, time: string) => void;
}

export function ResultsPanel({ results, totalParticipants, onSelectSlot }: Props) {
  if (results.length === 0) {
    return (
      <div className="card text-center py-16">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-gray-400">Todavía no hay votos. Compartí el link con tus amigos.</p>
      </div>
    );
  }

  const maxVotes = results[0].count;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-white">Resultados</h2>
        <span className="text-sm text-gray-400">{totalParticipants} participante{totalParticipants !== 1 ? 's' : ''}</span>
      </div>

      {results.map((slot, idx) => {
        const isBest = idx === 0;
        const pct = totalParticipants > 0 ? (slot.count / totalParticipants) * 100 : 0;
        const barPct = (slot.count / maxVotes) * 100;

        return (
          <div
            key={`${slot.date}-${slot.timeSlot}`}
            className={clsx(
              'card cursor-pointer transition-all hover:border-pitch-700',
              isBest && 'border-pitch-500 bg-pitch-500/5'
            )}
            onClick={() => onSelectSlot(slot.date, slot.timeSlot)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isBest && <Trophy className="w-4 h-4 text-yellow-400" />}
                <div>
                  <div className="font-semibold text-white capitalize">
                    {formatDateLong(parseISO(slot.date))}
                  </div>
                  <div className="text-pitch-400 text-sm font-mono">{slot.timeSlot}hs</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-white">{slot.count}</div>
                <div className="text-xs text-gray-500">{Math.round(pct)}% del grupo</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  isBest ? 'bg-pitch-400' : 'bg-gray-600'
                )}
                style={{ width: `${barPct}%` }}
              />
            </div>

            {/* Participants */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {slot.participants.map((name) => (
                <span key={name} className="badge-gray text-xs px-2 py-0.5">
                  {name}
                </span>
              ))}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSlot(slot.date, slot.timeSlot);
                }}
                className="ml-auto flex items-center gap-1 text-xs text-pitch-400 hover:text-pitch-300"
              >
                <MapPin className="w-3 h-3" />
                Ver canchas
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
