'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, EventSummary } from '@/lib/api';
import { formatDate } from '@/lib/dates';
import { parseISO } from 'date-fns';
import { Calendar, Users, MapPin, ArrowRight, ChevronRight, Plus } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });

  // Events list
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    api.listEvents()
      .then(setEvents)
      .catch(() => {/* non-critical */})
      .finally(() => setLoadingEvents(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const event = await api.createEvent(form);
      router.push(`/events/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el evento');
    } finally {
      setLoading(false);
    }
  }

  const hasEvents = events.length > 0;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center pt-6 pb-2">
        <div className="text-6xl mb-4">⚽</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          Coordiná el partido
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Creá un evento, compartí el link, todos votan disponibilidad y el sistema elige el mejor horario.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Calendar className="w-5 h-5" />, title: 'Elige el mejor día', desc: 'Votación por rango de fechas y horarios' },
          { icon: <Users className="w-5 h-5" />, title: 'Sin registro', desc: 'Solo ingresá tu nombre y listo' },
          { icon: <MapPin className="w-5 h-5" />, title: 'Canchas disponibles', desc: 'Integración con ATC Sports en tiempo real' },
        ].map((f) => (
          <div key={f.title} className="card flex gap-4 items-start">
            <div className="text-pitch-400 mt-0.5">{f.icon}</div>
            <div>
              <div className="font-semibold text-white text-sm">{f.title}</div>
              <div className="text-gray-400 text-xs mt-1">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Existing events */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Eventos</h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Nuevo evento
          </button>
        </div>

        {/* Create form (collapsible) */}
        {showForm && (
          <div className="card mb-4">
            <h3 className="text-lg font-bold text-white mb-4">Crear nuevo evento</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Nombre del evento</label>
                <input
                  className="input"
                  placeholder="Fútbol viernes con los del trabajo"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Desde</label>
                  <input
                    type="date"
                    className="input"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Hasta</label>
                  <input
                    type="date"
                    className="input"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Creando...' : 'Crear evento'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Events list */}
        {loadingEvents ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-800 rounded w-1/3" />
                  <div className="h-3 bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasEvents ? (
          <div className="card text-center py-14">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-gray-400 mb-4">Todavía no hay eventos. ¡Creá el primero!</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Crear evento
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((ev) => {
              const start = parseISO(ev.startDate);
              const end = parseISO(ev.endDate);
              const isActive = new Date() <= end;

              return (
                <button
                  key={ev.id}
                  onClick={() => router.push(`/events/${ev.id}`)}
                  className="w-full card hover:border-pitch-700 transition-all text-left flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white truncate">{ev.name}</span>
                      {isActive ? (
                        <span className="badge-green text-xs flex-shrink-0">activo</span>
                      ) : (
                        <span className="badge-gray text-xs flex-shrink-0">finalizado</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(start)} — {formatDate(end)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {ev._count.participants} participante{ev._count.participants !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
