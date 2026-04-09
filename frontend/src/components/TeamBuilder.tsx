'use client';

import { useState, useEffect } from 'react';
import { Shuffle, Pencil, Check, X, ShieldHalf } from 'lucide-react';

interface Player {
  id: string;
  name: string;
}

type TeamSide = 'dark' | 'light' | 'unassigned';

interface TeamState {
  darkName: string;
  lightName: string;
  assignments: Record<string, TeamSide>; // playerId → side
}

interface Props {
  eventId: string;
  players: Player[];
}

const STORAGE_KEY = (eventId: string) => `fulbo:teams:${eventId}`;

function loadState(eventId: string, players: Player[]): TeamState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(eventId));
    if (raw) return JSON.parse(raw) as TeamState;
  } catch { /* ignore */ }
  return {
    darkName: 'Oscuros',
    lightName: 'Claros',
    assignments: Object.fromEntries(players.map((p) => [p.id, 'unassigned'])),
  };
}

function saveState(eventId: string, state: TeamState) {
  localStorage.setItem(STORAGE_KEY(eventId), JSON.stringify(state));
}

export function TeamBuilder({ eventId, players }: Props) {
  const [state, setState] = useState<TeamState>(() => loadState(eventId, players));
  const [editingTeam, setEditingTeam] = useState<'dark' | 'light' | null>(null);
  const [editValue, setEditValue] = useState('');

  // Sync new players that aren't in assignments yet
  useEffect(() => {
    setState((prev) => {
      const assignments = { ...prev.assignments };
      let changed = false;
      for (const p of players) {
        if (!(p.id in assignments)) {
          assignments[p.id] = 'unassigned';
          changed = true;
        }
      }
      return changed ? { ...prev, assignments } : prev;
    });
  }, [players]);

  // Persist on every change
  useEffect(() => {
    saveState(eventId, state);
  }, [eventId, state]);

  function movePlayer(playerId: string, to: TeamSide) {
    setState((prev) => ({
      ...prev,
      assignments: { ...prev.assignments, [playerId]: to },
    }));
  }

  function shuffle() {
    const ids = players.map((p) => p.id).sort(() => Math.random() - 0.5);
    const half = Math.ceil(ids.length / 2);
    const assignments: Record<string, TeamSide> = {};
    ids.forEach((id, i) => {
      assignments[id] = i < half ? 'dark' : 'light';
    });
    setState((prev) => ({ ...prev, assignments }));
  }

  function reset() {
    setState((prev) => ({
      ...prev,
      assignments: Object.fromEntries(players.map((p) => [p.id, 'unassigned'])),
    }));
  }

  function startEdit(team: 'dark' | 'light') {
    setEditingTeam(team);
    setEditValue(team === 'dark' ? state.darkName : state.lightName);
  }

  function confirmEdit() {
    if (!editingTeam) return;
    setState((prev) => ({
      ...prev,
      [editingTeam === 'dark' ? 'darkName' : 'lightName']: editValue.trim() || (editingTeam === 'dark' ? 'Oscuros' : 'Claros'),
    }));
    setEditingTeam(null);
  }

  const dark = players.filter((p) => state.assignments[p.id] === 'dark');
  const light = players.filter((p) => state.assignments[p.id] === 'light');
  const unassigned = players.filter((p) => state.assignments[p.id] === 'unassigned');

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={shuffle}
          className="flex items-center gap-2 px-4 py-2 bg-pitch-600 hover:bg-pitch-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Shuffle className="w-4 h-4" />
          Mezclar aleatoriamente
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
        >
          <X className="w-4 h-4" />
          Resetear
        </button>
      </div>

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
            Sin asignar — {unassigned.length} jugador{unassigned.length !== 1 ? 'es' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                side="unassigned"
                darkName={state.darkName}
                lightName={state.lightName}
                onMove={(to) => movePlayer(p.id, to)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Teams */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TeamColumn
          side="dark"
          name={state.darkName}
          players={dark}
          otherName={state.lightName}
          editing={editingTeam === 'dark'}
          editValue={editValue}
          onEditValue={setEditValue}
          onStartEdit={() => startEdit('dark')}
          onConfirmEdit={confirmEdit}
          onCancelEdit={() => setEditingTeam(null)}
          onMove={movePlayer}
          colorClass="border-gray-600 bg-gray-900"
          badgeClass="bg-gray-700 text-gray-200"
          headerClass="text-gray-200"
        />
        <TeamColumn
          side="light"
          name={state.lightName}
          players={light}
          otherName={state.darkName}
          editing={editingTeam === 'light'}
          editValue={editValue}
          onEditValue={setEditValue}
          onStartEdit={() => startEdit('light')}
          onConfirmEdit={confirmEdit}
          onCancelEdit={() => setEditingTeam(null)}
          onMove={movePlayer}
          colorClass="border-yellow-700/40 bg-yellow-950/30"
          badgeClass="bg-yellow-600 text-yellow-100"
          headerClass="text-yellow-300"
        />
      </div>
    </div>
  );
}

// ─── Team Column ──────────────────────────────────────────────────────────────

interface TeamColumnProps {
  side: 'dark' | 'light';
  name: string;
  players: Player[];
  otherName: string;
  editing: boolean;
  editValue: string;
  onEditValue: (v: string) => void;
  onStartEdit: () => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onMove: (id: string, to: TeamSide) => void;
  colorClass: string;
  badgeClass: string;
  headerClass: string;
}

function TeamColumn({
  side, name, players, otherName, editing, editValue, onEditValue,
  onStartEdit, onConfirmEdit, onCancelEdit, onMove,
  colorClass, badgeClass, headerClass,
}: TeamColumnProps) {
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${colorClass}`}>
      {/* Team header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldHalf className={`w-4 h-4 ${headerClass}`} />
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={editValue}
                onChange={(e) => onEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onConfirmEdit(); if (e.key === 'Escape') onCancelEdit(); }}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-sm text-white w-28 focus:outline-none focus:border-pitch-500"
              />
              <button onClick={onConfirmEdit} className="text-pitch-400 hover:text-pitch-300"><Check className="w-4 h-4" /></button>
              <button onClick={onCancelEdit} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button onClick={onStartEdit} className={`font-semibold text-sm flex items-center gap-1 group ${headerClass}`}>
              {name}
              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
            </button>
          )}
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
          {players.length}
        </span>
      </div>

      {/* Players */}
      <div className="space-y-1.5 min-h-16">
        {players.length === 0 && (
          <p className="text-gray-600 text-xs text-center py-4">Sin jugadores</p>
        )}
        {players.map((p, i) => (
          <PlayerCard
            key={p.id}
            player={p}
            index={i + 1}
            side={side}
            darkName={side === 'dark' ? name : otherName}
            lightName={side === 'light' ? name : otherName}
            onMove={(to) => onMove(p.id, to)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Player Card ──────────────────────────────────────────────────────────────

interface PlayerCardProps {
  player: Player;
  side: TeamSide;
  index?: number;
  darkName: string;
  lightName: string;
  onMove: (to: TeamSide) => void;
}

function PlayerCard({ player, side, index, darkName, lightName, onMove }: PlayerCardProps) {
  const [open, setOpen] = useState(false);

  const options: { label: string; to: TeamSide }[] = [
    side !== 'dark'    && { label: `→ ${darkName}`,  to: 'dark' as TeamSide },
    side !== 'light'   && { label: `→ ${lightName}`, to: 'light' as TeamSide },
    side !== 'unassigned' && { label: '→ Sin asignar', to: 'unassigned' as TeamSide },
  ].filter(Boolean) as { label: string; to: TeamSide }[];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 border border-gray-700/50 text-sm text-white transition-colors text-left"
      >
        {index !== undefined && (
          <span className="text-xs text-gray-500 w-4 shrink-0">{index}.</span>
        )}
        <span className="truncate">{player.name}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-40">
            {options.map(({ label, to }) => (
              <button
                key={to}
                onClick={() => { onMove(to); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
