'use client';

import { useState, useEffect } from 'react';
import { Shuffle, Pencil, Check, X, ShieldHalf, Share2, CheckCircle2 } from 'lucide-react';
import { getPlayerColor, getInitials } from '@/lib/playerColors';
import { formatDateLong } from '@/lib/dates';
import { parseISO } from 'date-fns';

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
  confirmedSlot?: { date: string; timeSlot: string; venueName: string } | null;
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

export function TeamBuilder({ eventId, players, confirmedSlot }: Props) {
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

  function shareWhatsApp() {
    const lines = [
      '⚽ *Equipos del partido*',
      '',
      `🔵 *${state.darkName}*`,
      ...dark.map((p, i) => `  ${i + 1}. ${p.name}`),
      '',
      `🟡 *${state.lightName}*`,
      ...light.map((p, i) => `  ${i + 1}. ${p.name}`),
    ];
    if (unassigned.length) {
      lines.push('', `⚪ Sin asignar: ${unassigned.map((p) => p.name).join(', ')}`);
    }
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  return (
    <div className="space-y-4">
      {/* Confirmed slot context */}
      {confirmedSlot && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-green-600/40 bg-green-950/20 text-sm">
          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-green-400 font-semibold">{confirmedSlot.venueName}</span>
            <span className="text-gray-400"> · </span>
            <span className="text-gray-300 capitalize">
              {formatDateLong(parseISO(confirmedSlot.date))} {confirmedSlot.timeSlot}hs
            </span>
            <p className="text-gray-500 text-xs mt-0.5">
              Solo se muestran los {players.length} jugador{players.length !== 1 ? 'es' : ''} disponibles en ese horario
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={shuffle} className="btn-primary">
          <Shuffle className="w-4 h-4" />
          Mezclar aleatoriamente
        </button>
        <button onClick={reset} className="btn-secondary">
          <X className="w-4 h-4" />
          Resetear
        </button>
        {(dark.length > 0 || light.length > 0) && (
          <button
            onClick={shareWhatsApp}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] transition-all"
          >
            <Share2 className="w-4 h-4" />
            Compartir por WhatsApp
          </button>
        )}
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
          colorClass="border-gray-500/20 bg-gray-800/30"
          badgeClass="bg-gray-700/80 text-gray-200 border border-gray-600/40"
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
          colorClass="border-amber-500/25 bg-amber-900/10"
          badgeClass="bg-amber-500/15 text-amber-300 border border-amber-500/30"
          headerClass="text-amber-300"
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
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/60 border border-white/[0.06] text-sm text-white transition-all text-left group"
      >
        {index !== undefined && (
          <span className="text-xs text-gray-600 w-4 shrink-0 font-mono">{index}.</span>
        )}
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
          style={{ backgroundColor: getPlayerColor(player.name) }}
        >
          {getInitials(player.name)}
        </span>
        <span className="truncate text-gray-200 group-hover:text-white transition-colors">{player.name}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-gray-900/95 border border-white/[0.1] rounded-xl shadow-2xl shadow-black/60 overflow-hidden min-w-44 backdrop-blur-md animate-modal-in">
            {options.map(({ label, to }) => (
              <button
                key={to}
                onClick={() => { onMove(to); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800/70 hover:text-white transition-colors"
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
