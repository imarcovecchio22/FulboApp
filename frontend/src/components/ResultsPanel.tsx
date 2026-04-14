'use client';

import { useState } from 'react';
import { SlotResult, BookingConfirmation } from '@/lib/api';
import { formatDateLong } from '@/lib/dates';
import { parseISO } from 'date-fns';
import { Trophy, MapPin, CheckCircle2, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  results: SlotResult[];
  totalParticipants: number;
  onSelectSlot: (date: string, time: string) => void;
  booking: BookingConfirmation | null;
  participantName: string | null;
  onBookingConfirmed: (data: {
    venueName: string;
    date: string;
    timeSlot: string;
    price?: string;
    confirmedBy: string;
  }) => Promise<void>;
}

export function ResultsPanel({
  results,
  totalParticipants,
  onSelectSlot,
  booking,
  participantName,
  onBookingConfirmed,
}: Props) {
  const [confirmingSlot, setConfirmingSlot] = useState<{ date: string; timeSlot: string } | null>(null);
  const [formVenue, setFormVenue] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formName, setFormName] = useState(participantName ?? '');
  const [submitting, setSubmitting] = useState(false);

  function openForm(date: string, timeSlot: string) {
    setConfirmingSlot({ date, timeSlot });
    setFormVenue('');
    setFormPrice('');
    setFormName(participantName ?? '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmingSlot || !formVenue.trim() || !formName.trim()) return;
    setSubmitting(true);
    try {
      await onBookingConfirmed({
        venueName: formVenue.trim(),
        date: confirmingSlot.date,
        timeSlot: confirmingSlot.timeSlot,
        price: formPrice.trim() || undefined,
        confirmedBy: formName.trim(),
      });
      setConfirmingSlot(null);
    } finally {
      setSubmitting(false);
    }
  }

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

      {/* Confirmed booking banner */}
      {booking && (
        <div className="card border-green-600/50 bg-green-950/30 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Reserva confirmada
          </div>
          <div className="text-white font-bold">{booking.venueName}</div>
          <div className="text-gray-300 text-sm capitalize">
            {formatDateLong(parseISO(booking.date))} · {booking.timeSlot}hs
            {booking.price && <span className="ml-2 text-green-400 font-semibold">{booking.price}</span>}
          </div>
          <div className="text-gray-500 text-xs">Confirmado por {booking.confirmedBy}</div>
        </div>
      )}

      {results.map((slot, idx) => {
        const isConfirmed = booking?.date === slot.date && booking?.timeSlot === slot.timeSlot;
        // Si hay reserva confirmada, solo resaltar ese slot; si no, resaltar el más votado
        const isBest = !booking && idx === 0;
        const isConfirming = confirmingSlot?.date === slot.date && confirmingSlot?.timeSlot === slot.timeSlot;
        const pct = totalParticipants > 0 ? (slot.count / totalParticipants) * 100 : 0;
        const barPct = (slot.count / maxVotes) * 100;

        return (
          <div
            key={`${slot.date}-${slot.timeSlot}`}
            className={clsx(
              'card transition-all',
              isConfirmed
                ? 'border-green-600/50 bg-green-950/20'
                : isBest
                  ? 'border-pitch-500 bg-pitch-500/5 hover:border-pitch-700 cursor-pointer'
                  : 'hover:border-pitch-700 cursor-pointer'
            )}
            onClick={() => !isConfirming && !isConfirmed && onSelectSlot(slot.date, slot.timeSlot)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isConfirmed
                  ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                  : isBest && <Trophy className="w-4 h-4 text-yellow-400" />
                }
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
                  isConfirmed ? 'bg-green-500' : isBest ? 'bg-pitch-400' : 'bg-gray-600'
                )}
                style={{ width: `${barPct}%` }}
              />
            </div>

            {/* Participants */}
            <div className="flex flex-wrap gap-1.5 items-center mb-3">
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

            {/* Confirm booking inline form */}
            {isConfirming ? (
              <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                className="border-t border-gray-700 pt-3 space-y-2"
              >
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Confirmar reserva</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    autoFocus
                    required
                    placeholder="Nombre de la cancha *"
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pitch-500"
                  />
                  <input
                    placeholder="Precio (ej: $8.000)"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pitch-500"
                  />
                </div>
                <input
                  required
                  placeholder="¿Quién reservó? *"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pitch-500"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={submitting || !formVenue.trim() || !formName.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Guardar reserva
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setConfirmingSlot(null); }}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="border-t border-gray-800 pt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); openForm(slot.date, slot.timeSlot); }}
                  className={clsx(
                    'flex items-center gap-1.5 text-xs font-medium transition-colors',
                    isConfirmed
                      ? 'text-green-500 hover:text-green-400'
                      : 'text-gray-500 hover:text-gray-300'
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isConfirmed ? 'Actualizar reserva' : 'Confirmar reserva en esta fecha'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
