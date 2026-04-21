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
import { Users, BarChart2, MapPin, ShieldHalf, Trophy } from 'lucide-react';
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
  const [showWelcome, setShowWelcome] = useState(false);

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

  // Dynamic browser tab title
  useEffect(() => {
    if (event) {
      document.title = `${event.name} · FULBO`;
      return () => { document.title = 'FULBO'; };
    }
  }, [event]);

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

  // Show welcome toast for newly created events
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') !== '1') return;
    setShowWelcome(true);
    const t = setTimeout(() => setShowWelcome(false), 4500);
    return () => clearTimeout(t);
  }, []);

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
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-24 bg-gray-800 rounded-full" />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-9 bg-gray-800 rounded-xl w-56" />
            <div className="h-4 bg-gray-800 rounded w-72" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 bg-gray-800 rounded-xl w-36" />
            <div className="h-10 bg-gray-800 rounded-xl w-36" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-7 bg-gray-800 rounded-full w-28" />
          <div className="h-7 bg-gray-800 rounded-full w-52" />
        </div>
        <div className="h-12 bg-gray-800 rounded-xl w-72" />
        <div className="card space-y-4">
          <div className="h-5 bg-gray-800 rounded w-44" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-800 rounded-lg" />
            ))}
          </div>
          <div className="h-10 bg-gray-800 rounded-xl w-48 ml-auto" />
        </div>
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
      {/* Welcome toast for newly created events */}
      {showWelcome && (
        <div className="fixed bottom-6 left-1/2 z-50 animate-toast-in pointer-events-none">
          <div className="flex items-center gap-3 bg-gray-900/95 border border-pitch-500/30 rounded-2xl px-5 py-4 shadow-2xl shadow-black/60 backdrop-blur-md">
            <div className="w-10 h-10 rounded-xl bg-pitch-500/15 border border-pitch-500/25 flex items-center justify-center text-xl flex-shrink-0">
              ⚽
            </div>
            <div>
              <div className="text-white font-bold text-sm">¡Partido creado!</div>
              <div className="text-pitch-400 text-xs mt-0.5">Compartí el link con tus amigos</div>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <a href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors group">
        <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
        <span>Inicio</span>
        <span className="text-gray-700">/</span>
        <span className="text-gray-400 truncate max-w-[200px]">{event.name}</span>
      </a>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
            {event.name}
          </h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">
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

      {/* Invite banner — for users without a stored participant */}
      {!participantId && (
        <div className="card border-pitch-500/20 bg-gradient-to-br from-pitch-500/8 via-pitch-500/4 to-transparent flex items-center gap-4 animate-fade-in">
          <div className="text-2xl flex-shrink-0">👋</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-sm">¡Te invitaron al partido!</div>
            <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">Anotate y marcá cuándo podés para que el grupo encuentre el mejor día</p>
          </div>
          <button
            onClick={() => setTab('vote')}
            className="btn-primary text-xs px-3 py-2 whitespace-nowrap flex-shrink-0"
          >
            Anotarme
          </button>
        </div>
      )}

      {/* Stats chips */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-gray-800/80 border border-gray-700/50 rounded-full px-3 py-1.5 text-xs font-medium text-gray-300">
          <Users className="w-3.5 h-3.5" />
          {event.participants.length} jugador{event.participants.length !== 1 ? 'es' : ''}
        </div>
        {bestSlot && (
          <div className="flex items-center gap-1.5 bg-pitch-500/10 border border-pitch-500/30 rounded-full px-3 py-1.5 text-xs font-semibold text-pitch-300">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            Mejor: {formatDateLong(parseISO(bestSlot.date))} · {bestSlot.timeSlot}hs · {bestSlot.count} votos
          </div>
        )}
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="overflow-x-auto scrollbar-none -mx-4 sm:mx-0">
      <div className="flex gap-1 bg-gray-900/75 backdrop-blur-sm border border-white/[0.06] rounded-xl p-1 w-max mx-4 sm:mx-0">
        {(
          [
            { key: 'vote', label: 'Disponibilidad', icon: <Users className="w-4 h-4" /> },
            { key: 'results', label: 'Resultados', icon: <BarChart2 className="w-4 h-4" /> },
            { key: 'fields', label: 'Canchas', icon: <MapPin className="w-4 h-4" /> },
            ...(event.participants.length >= MIN_PLAYERS_FOR_TEAMS
              ? [{ key: 'teams' as Tab, label: 'Equipos', icon: <ShieldHalf className="w-4 h-4" /> }]
              : []),
          ] as { key: Tab; label: string; icon: React.ReactNode }[]
        ).map(({ key, label, icon }) => {
          const showDot =
            (key === 'results' && results.length > 0 && tab !== 'results') ||
            (key === 'fields' && booking !== null && tab !== 'fields');
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === key
                  ? 'bg-pitch-500 text-white shadow-lg shadow-pitch-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {icon}
              <span>{label}</span>
              {showDot && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-pitch-400" />
              )}
            </button>
          );
        })}
      </div>
      </div>

      {/* Tab content */}
      {tab === 'vote' && (
        <div key="vote" className="animate-tab-in">
          {!participantId ? (
            <div className="card relative py-12 text-center">
              {/* Ambient glow */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pitch-500/8 rounded-full blur-[70px]" />
              </div>
              <div className="relative">
                {/* Icon with ring animation */}
                <div className="relative inline-flex items-center justify-center mb-5">
                  <div className="absolute w-16 h-16 rounded-2xl border border-pitch-500/25 animate-ring-1" />
                  <div className="absolute w-16 h-16 rounded-2xl border border-pitch-500/15 animate-ring-2" />
                  <div className="w-16 h-16 rounded-2xl bg-pitch-500/10 border border-pitch-500/20 flex items-center justify-center text-3xl shadow-lg shadow-pitch-500/10 relative z-10">
                    ⚽
                  </div>
                </div>
                <h3 className="text-white font-bold text-xl mb-2">¿Quién sos?</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
                  Ingresá tu nombre para marcar tus horarios y ayudar al grupo a encontrar el mejor día para jugar
                </p>
                <div className="flex justify-center">
                  <ParticipantSelector
                    eventId={id}
                    participants={event.participants}
                    currentParticipantId={null}
                    currentParticipantName={null}
                    onSelect={handleSelectParticipant}
                  />
                </div>
                {event.participants.length > 0 && (
                  <p className="text-gray-700 text-xs mt-4">
                    {event.participants.length} jugador{event.participants.length !== 1 ? 'es' : ''} ya votaron
                  </p>
                )}
              </div>
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
        <div key="results" className="animate-tab-in">
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
        </div>
      )}

      {tab === 'fields' && (
        <div key="fields" className="animate-tab-in">
          <FieldsList
            initialDate={selectedSlot?.date ?? bestSlot?.date}
            initialTime={selectedSlot?.time ?? bestSlot?.timeSlot}
            results={results}
            onSelectSlot={(date, time) => setSelectedSlot({ date, time })}
          />
        </div>
      )}

      {tab === 'teams' && (
        <div key="teams" className="animate-tab-in">
          <TeamBuilder
            eventId={id}
            players={teamPlayers}
            confirmedSlot={booking ? { date: booking.date, timeSlot: booking.timeSlot, venueName: booking.venueName } : null}
          />
        </div>
      )}
    </div>
  );
}
