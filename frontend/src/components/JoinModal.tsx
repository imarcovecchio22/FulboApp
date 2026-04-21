'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { X } from 'lucide-react';

interface Props {
  eventId: string;
  onJoined: (participantId: string, name: string) => void;
  onClose: () => void;
}

export function JoinModal({ eventId, onJoined, onClose }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const participant = await api.joinEvent(eventId, name.trim());
      onJoined(participant.id, participant.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al unirse');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pitch-500/10 border border-pitch-500/20 mb-4 shadow-lg shadow-pitch-500/10">
            <span className="text-2xl">⚽</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">Unirte al partido</h2>
          <p className="text-gray-500 text-sm mt-1">Ingresá tu nombre para votar tu disponibilidad</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="label">Tu nombre</label>
            <input
              className="input"
              placeholder="Juan García"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading || !name.trim()} className="btn-primary w-full">
            {loading ? 'Uniéndome...' : 'Unirme'}
          </button>
        </form>
      </div>
    </div>
  );
}
