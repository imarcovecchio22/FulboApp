'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api, Event, SlotResult, BookingConfirmation } from '@/lib/api';
import { AvailabilityGrid } from '@/components/AvailabilityGrid';
import { ResultsPanel } from '@/components/ResultsPanel';
import { FieldsList } from '@/components/FieldsList';
import { ParticipantSelector } from '@/components/ParticipantSelector';
import { ShareButton } from '@/components/ShareButton';
import { formatDateLong } from '@/lib/dates';
import { parseISO } from 'date-fns';
import { Users, BarChart2, MapPin, ShieldHalf } from 'lucide-react';
import { TeamBuilder } from '@/components/TeamBuilder';

const MIN_PLAYERS_FOR_TEAMS = 10;

type Tab = 'vote' | 'results' | 'fields' | 'teams';

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Participante activo (puede cambiar en cualquier momento)
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(null);

  // UI state
  const [tab, setTab] = useState<Tab>('vote');
  const [results, setResults] = useState<SlotResult[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [booking, setBooking] = useState<BookingConfirmation | null>(null);

  const loadEvent = useCallback(async () => {
    try {
      const ev = await api.getEvent(id);
      setEvent(ev);
    } catch {
      setError('No se encontró el evento');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadResults = useCallback(async () => {
    try {
      const r = await api.getResults(id);
      setResults(r.results);
    } catch {
      // non-critical
    }
  }, [id]);

  const loadBooking = useCallback(async () => {
    try {
      const b = await api.getBooking(id);
      setBooking(b);
    } catch {
      // non-critical
    }
  }, [id]);

  useEffect(() => {
    loadEvent();
    loadResults();
    loadBooking();

    // Restaurar último participante usado para este evento
    const storedId = localStorage.getItem(`fulbo:participant:${id}`);
    const storedName = localStorage.getItem(`fulbo:name:${id}`);
    if (storedId && storedName) {
      setParticipantId(storedId);
      setParticipantName(storedName);
    }
  }, [id, loadEvent, loadResults, loadBooking]);

  // Poll resultados cada 30s
  useEffect(() => {
    const interval = setInterval(loadResults, 30_000);
    return () => clearInterval(interval);
  }, [loadResults]);

  function handleSelectParticipant(pid: string, name: string) {
    setParticipantId(pid);
    setParticipantName(name);
    // Guardar el último seleccionado para la próxima visita
    localStorage.setItem(`fulbo:participant:${id}`, pid);
    localStorage.setItem(`fulbo:name:${id}`, name);
    // Recargar el evento para tener los datos frescos del nuevo participante
    loadEvent();
  }

  function handleVoteSaved() {
    loadResults();
  }

  async function handleBookingConfirmed(data: {
    venueName: string;
    date: string;
    timeSlot: string;
    price?: string;
    confirmedBy: string;
  }) {
    const b = await api.setBooking(id, data);
    setBooking(b);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-400">Cargando evento...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="card text-center py-16">
        <div className="text-4xl mb-4">😕</div>
        <div className="text-gray-400">{error || 'Evento no encontrado'}</div>
        <a href="/" className="btn-primary mt-4 inline-flex">Volver al inicio</a>
      </div>
    );
  }

  const bestSlot = results[0] ?? null;

  // Jugadores disponibles en el slot confirmado (para armado de equipos)
  const teamPlayers = booking
    ? event.participants.filter((p) =>
        event.availabilities.some(
          (a) =>
            a.participantId === p.id &&
            a.date.substring(0, 10) === booking.date &&
            a.timeSlot === booking.timeSlot
        )
      )
    : event.participants;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{event.name}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {formatDateLong(parseISO(event.startDate))} — {formatDateLong(parseISO(event.endDate))}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <ShareButton eventId={id} />
          <ParticipantSelector
            eventId={id}
            participants={event.participants}
            currentParticipantId={participantId}
            currentParticipantName={participantName}
            onSelect={handleSelectParticipant}
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          {event.participants.length} participante{event.participants.length !== 1 ? 's' : ''}
        </span>
        {bestSlot && (
          <span className="flex items-center gap-1.5 text-pitch-400">
            <BarChart2 className="w-4 h-4" />
            Mejor opción: {bestSlot.date} {bestSlot.timeSlot} ({bestSlot.count} votos)
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {(
          [
            { key: 'vote', label: 'Disponibilidad', icon: <Users className="w-4 h-4" /> },
            { key: 'results', label: 'Resultados', icon: <BarChart2 className="w-4 h-4" /> },
            { key: 'fields', label: 'Canchas', icon: <MapPin className="w-4 h-4" /> },
            ...(event.participants.length >= MIN_PLAYERS_FOR_TEAMS
              ? [{ key: 'teams' as Tab, label: 'Equipos', icon: <ShieldHalf className="w-4 h-4" /> }]
              : []),
          ] as { key: Tab; label: string; icon: React.ReactNode }[]
        ).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-pitch-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'vote' && (
        <div>
          {!participantId ? (
            <div className="card text-center py-10">
              <p className="text-gray-400 mb-1">Seleccioná o agregá un participante para votar</p>
              <p className="text-gray-600 text-sm mb-4">
                Usá el selector arriba a la derecha → podés votar como vos o cargar la disponibilidad de un amigo
              </p>
              <ParticipantSelector
                eventId={id}
                participants={event.participants}
                currentParticipantId={null}
                currentParticipantName={null}
                onSelect={handleSelectParticipant}
              />
            </div>
          ) : (
            <AvailabilityGrid
              event={event}
              participantId={participantId}
              results={results}
              onSaved={handleVoteSaved}
            />
          )}
        </div>
      )}

      {tab === 'results' && (
        <ResultsPanel
          results={results}
          totalParticipants={event.participants.length}
          onSelectSlot={(date, time) => {
            setSelectedSlot({ date, time });
            setTab('fields');
          }}
          booking={booking}
          participantName={participantName}
          onBookingConfirmed={handleBookingConfirmed}
        />
      )}

      {tab === 'fields' && (
        <FieldsList
          initialDate={selectedSlot?.date ?? bestSlot?.date}
          initialTime={selectedSlot?.time ?? bestSlot?.timeSlot}
          results={results}
          onSelectSlot={(date, time) => setSelectedSlot({ date, time })}
        />
      )}

      {tab === 'teams' && (
        <TeamBuilder
          eventId={id}
          players={teamPlayers}
          confirmedSlot={booking ? { date: booking.date, timeSlot: booking.timeSlot, venueName: booking.venueName } : null}
        />
      )}
    </div>
  );
}
