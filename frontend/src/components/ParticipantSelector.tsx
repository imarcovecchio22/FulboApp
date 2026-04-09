'use client';

import { useState } from 'react';
import { Participant, api } from '@/lib/api';
import { UserCircle, Plus, ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  eventId: string;
  participants: Participant[];
  currentParticipantId: string | null;
  currentParticipantName: string | null;
  onSelect: (id: string, name: string) => void;
}

export function ParticipantSelector({
  eventId,
  participants,
  currentParticipantId,
  currentParticipantName,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    try {
      const p = await api.joinEvent(eventId, newName.trim());
      onSelect(p.id, p.name);
      setNewName('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all',
          currentParticipantId
            ? 'bg-pitch-500/10 border-pitch-500/30 text-pitch-400 hover:bg-pitch-500/20'
            : 'btn-primary'
        )}
      >
        <UserCircle className="w-4 h-4" />
        {currentParticipantId ? currentParticipantName : 'Seleccionar participante'}
        <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-2xl shadow-xl z-20 overflow-hidden">
            {/* Existing participants */}
            {participants.length > 0 && (
              <div className="p-2">
                <div className="text-xs text-gray-500 px-2 py-1 font-medium uppercase tracking-wide">
                  Participantes del evento
                </div>
                {participants.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelect(p.id, p.name);
                      setOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors text-left"
                  >
                    <span className="text-sm text-white">{p.name}</span>
                    {p.id === currentParticipantId && (
                      <Check className="w-4 h-4 text-pitch-400" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Divider */}
            {participants.length > 0 && (
              <div className="border-t border-gray-800 mx-2" />
            )}

            {/* Add new participant */}
            <div className="p-2">
              <div className="text-xs text-gray-500 px-2 py-1 font-medium uppercase tracking-wide">
                Agregar participante
              </div>
              <form onSubmit={handleAdd} className="px-2 pb-1 space-y-2">
                <input
                  className="input text-sm py-2"
                  placeholder="Nombre..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={adding || !newName.trim()}
                  className="btn-primary w-full text-sm py-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {adding ? 'Agregando...' : 'Agregar y seleccionar'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
