'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, EventSummary } from '@/lib/api';
import { formatDate } from '@/lib/dates';
import { parseISO } from 'date-fns';
import { Calendar, Users, MapPin, ArrowRight, ChevronRight, Plus, Trash2, BarChart2 } from 'lucide-react';
import { formatDateLong } from '@/lib/dates';

function relativeTime(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 14) return 'hace 1 semana';
  if (days < 30) return `hace ${Math.floor(days / 7)} semanas`;
  return `hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) !== 1 ? 'es' : ''}`;
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      router.push(`/events/${event.id}?new=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el evento');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('¿Eliminar este evento?')) return;
    setDeletingId(id);
    try {
      await api.deleteEvent(id);
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
    } catch {
      alert('No se pudo eliminar el evento');
    } finally {
      setDeletingId(null);
    }
  }

  const hasEvents = events.length > 0;

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="relative text-center pt-10 pb-2">
        <div className="relative inline-flex items-center justify-center mb-5">
          <div className="absolute w-14 h-14 rounded-xl border border-pitch-500/30 animate-ring-1" />
          <div className="absolute w-14 h-14 rounded-xl border border-pitch-500/20 animate-ring-2" />
          <div className="w-14 h-14 rounded-xl bg-pitch-500/10 border border-pitch-500/25 flex items-center justify-center shadow-lg shadow-pitch-500/15 relative z-10">
            <span className="text-2xl">⚽</span>
          </div>
        </div>
        <h1 className="text-2xl font-black tracking-tighter mb-6 bg-gradient-to-br from-white via-white to-pitch-300 bg-clip-text text-transparent">
          FULBO
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary text-base px-8 py-3.5"
        >
          <Plus className="w-5 h-5" />
          Crear partido
        </button>
      </div>

      {/* Features — solo cuando no hay partidos todavía */}
      {!loadingEvents && !hasEvents && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: <Calendar className="w-5 h-5" />, title: 'Elige el mejor día', desc: 'Votación por rango de fechas y horarios' },
            { icon: <Users className="w-5 h-5" />, title: 'Sin registro', desc: 'Solo ingresá tu nombre y listo' },
            { icon: <MapPin className="w-5 h-5" />, title: 'Canchas disponibles', desc: 'Integración con ATC Sports en tiempo real' },
          ].map((f) => (
            <div key={f.title} className="card flex gap-4 items-start hover:border-pitch-700/50 hover:shadow-2xl hover:shadow-pitch-500/5 transition-all group cursor-default">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-pitch-500/10 border border-pitch-500/20 flex items-center justify-center text-pitch-400 group-hover:bg-pitch-500/20 group-hover:shadow-lg group-hover:shadow-pitch-500/20 group-hover:border-pitch-500/35 transition-all">
                {f.icon}
              </div>
              <div>
                <div className="font-semibold text-white text-sm">{f.title}</div>
                <div className="text-gray-500 text-xs mt-1 leading-relaxed">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-800" />
        <span className="text-xs text-gray-600 font-medium uppercase tracking-widest">Tus partidos</span>

        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-800" />
      </div>

      {/* Existing events */}
      <div className="-mt-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-black tracking-tight text-white">Partidos</h2>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Nuevo partido
          </button>
        </div>

        {/* Modal form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />
            <div className="relative w-full max-w-md bg-gray-900/95 border border-white/[0.1] rounded-2xl p-6 shadow-2xl shadow-black/60 animate-modal-in">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-black tracking-tight text-white">Nuevo partido</h3>

                <button
                  onClick={() => setShowForm(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="label">Nombre del evento</label>
                  <input
                    autoFocus
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
                <div className="flex gap-2 pt-1">
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
            <p className="text-gray-400 mb-4">Todavía no hay partidos. ¡Creá el primero!</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Crear partido
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
                  className={`w-full card hover:border-pitch-700/60 transition-all text-left flex items-center justify-between gap-4 relative overflow-hidden ${isActive ? 'border-l-2 border-l-pitch-500' : ''}`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-pitch-400/50 to-transparent" />
                  )}
                  {/* Participant count circle */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center ${isActive ? 'bg-pitch-500/15 text-pitch-400' : 'bg-gray-800 text-gray-500'}`}>
                    <span className="text-sm font-bold leading-none">{ev._count.participants}</span>
                    <span className="text-[8px] leading-none mt-0.5 opacity-70">jug.</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-white truncate">{ev.name}</span>
                      {isActive ? (
                        <span className="badge-green text-xs flex-shrink-0">activo</span>
                      ) : (
                        <span className="badge-gray text-xs flex-shrink-0">finalizado</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex flex-col gap-0.5 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        {formatDate(start)} — {formatDate(end)}
                        <span className="text-gray-700">·</span>
                        <span className="text-gray-600">{relativeTime(ev.createdAt)}</span>
                      </span>
                      {ev.bestSlot && (
                        <span className="flex items-center gap-1 text-pitch-500">
                          <BarChart2 className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{formatDateLong(parseISO(ev.bestSlot.date))} · {ev.bestSlot.timeSlot}hs · {ev.bestSlot.count} voto{ev.bestSlot.count !== 1 ? 's' : ''}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => handleDelete(e, ev.id)}
                      disabled={deletingId === ev.id}
                      className="p-2.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Eliminar evento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
