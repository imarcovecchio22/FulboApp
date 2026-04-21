'use client';

import { useState, useEffect } from 'react';
import { Participant, api } from '@/lib/api';
import { Plus, ChevronDown, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { getPlayerColor, getInitials } from '@/lib/playerColors';

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Lock body scroll when sheet is open on mobile
  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, isMobile]);

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

  const panelContent = (
    <>
      {/* Handle bar (mobile only) */}
      {isMobile && (
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-700" />
        </div>
      )}

      {/* Header (mobile only) */}
      {isMobile && (
        <div className="flex items-center justify-between px-4 py-2 mb-1">
          <span className="text-sm font-semibold text-white">Seleccionar jugador</span>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Existing participants */}
      {participants.length > 0 && (
        <div className="p-2">
          <div className="text-[10px] text-gray-600 px-2 py-1.5 font-semibold uppercase tracking-widest">
            Participantes
          </div>
          {participants.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p.id, p.name); setOpen(false); }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-gray-800/70 transition-colors text-left group"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ backgroundColor: getPlayerColor(p.name) }}
                >
                  {getInitials(p.name)}
                </span>
                <span className="text-sm text-gray-200 group-hover:text-white transition-colors">{p.name}</span>
              </div>
              {p.id === currentParticipantId && (
                <Check className="w-3.5 h-3.5 text-pitch-400" />
              )}
            </button>
          ))}
        </div>
      )}

      {participants.length > 0 && (
        <div className="h-px bg-white/[0.06] mx-2" />
      )}

      {/* Add new participant */}
      <div className="p-2">
        <div className="text-[10px] text-gray-600 px-2 py-1.5 font-semibold uppercase tracking-widest">
          Nuevo participante
        </div>
        <form onSubmit={handleAdd} className="px-1 pb-1 space-y-2">
          <input
            className="input text-sm py-2"
            placeholder="Nombre..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          {error && <p className="text-red-400 text-xs px-1">{error}</p>}
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

      {/* Safe area spacing on mobile */}
      {isMobile && <div className="h-4" />}
    </>
  );

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all',
          currentParticipantId
            ? 'bg-gray-800/60 border-white/[0.08] text-white hover:bg-gray-700/60 backdrop-blur-sm'
            : 'btn-primary'
        )}
      >
        {currentParticipantId && currentParticipantName ? (
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[9px] flex-shrink-0"
            style={{ backgroundColor: getPlayerColor(currentParticipantName) }}
          >
            {getInitials(currentParticipantName)}
          </span>
        ) : null}
        {currentParticipantId ? currentParticipantName : 'Seleccionar participante'}
        <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform text-gray-400', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className={clsx(
              'fixed inset-0 z-30',
              isMobile ? 'bg-black/60 backdrop-blur-sm' : ''
            )}
            onClick={() => setOpen(false)}
          />

          {isMobile ? (
            /* Bottom sheet */
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-white/[0.08] rounded-t-2xl shadow-2xl shadow-black/60 animate-sheet-in">
              {panelContent}
            </div>
          ) : (
            /* Desktop dropdown */
            <div className="absolute right-0 mt-2 w-64 bg-gray-900/95 border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60 z-40 overflow-hidden backdrop-blur-md animate-modal-in">
              {panelContent}
            </div>
          )}
        </>
      )}
    </div>
  );
}
