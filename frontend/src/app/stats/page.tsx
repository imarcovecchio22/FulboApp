'use client';

import { useState, useRef } from 'react';
import { Upload, Video, Zap, BarChart2, Target, CheckCircle2, XCircle, Loader2, Trophy, Star } from 'lucide-react';
import { getPlayerColor, getInitials } from '@/lib/playerColors';
import clsx from 'clsx';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_MATCH = {
  date: 'Viernes 18 de Abril',
  duration: '48 min',
  score: '3 - 2',
  teams: ['Equipo A', 'Equipo B'],
};

const MOCK_STATS = [
  { name: 'Ignacio',  goals: 2, assists: 1, passesOk: 34, passesFail: 8,  shots: 4, team: 0 },
  { name: 'Martín',   goals: 1, assists: 3, passesOk: 28, passesFail: 5,  shots: 2, team: 0 },
  { name: 'Lucas',    goals: 0, assists: 1, passesOk: 41, passesFail: 12, shots: 1, team: 0 },
  { name: 'Rodrigo',  goals: 0, assists: 2, passesOk: 22, passesFail: 9,  shots: 3, team: 1 },
  { name: 'Emilio',   goals: 1, assists: 0, passesOk: 18, passesFail: 6,  shots: 5, team: 1 },
  { name: 'Federico', goals: 1, assists: 1, passesOk: 29, passesFail: 7,  shots: 3, team: 1 },
];

type UploadState = 'idle' | 'selected' | 'uploading' | 'processing' | 'done';

// ─── Stat bar ─────────────────────────────────────────────────────────────────

function StatBar({ label, value, max, color = 'bg-pitch-500' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="text-white font-semibold">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({ player, rank }: { player: typeof MOCK_STATS[0]; rank: number }) {
  const passAcc = Math.round((player.passesOk / (player.passesOk + player.passesFail)) * 100);
  const maxPasses = Math.max(...MOCK_STATS.map((p) => p.passesOk + p.passesFail));
  const totalPasses = player.passesOk + player.passesFail;

  return (
    <div className="card hover:border-white/[0.12] transition-all group">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-shrink-0">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: getPlayerColor(player.name) }}
          >
            {getInitials(player.name)}
          </span>
          {rank === 0 && (
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
              <Star className="w-2.5 h-2.5 fill-white text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm truncate">{player.name}</div>
          <div className={clsx(
            'text-[10px] font-semibold uppercase tracking-wider',
            player.team === 0 ? 'text-pitch-400' : 'text-blue-400'
          )}>
            {player.team === 0 ? MOCK_MATCH.teams[0] : MOCK_MATCH.teams[1]}
          </div>
        </div>
        {/* MVP badge */}
        {rank === 0 && (
          <span className="text-[10px] font-bold bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded-full">
            MVP
          </span>
        )}
      </div>

      {/* Quick stats pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg px-2.5 py-1.5 text-xs">
          <span className="text-gray-500">Goles</span>
          <span className="text-white font-bold ml-1">{player.goals}</span>
        </div>
        <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg px-2.5 py-1.5 text-xs">
          <span className="text-gray-500">Asist.</span>
          <span className="text-white font-bold ml-1">{player.assists}</span>
        </div>
        <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg px-2.5 py-1.5 text-xs">
          <span className="text-gray-500">Remates</span>
          <span className="text-white font-bold ml-1">{player.shots}</span>
        </div>
        <div className={clsx(
          'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs ml-auto',
          passAcc >= 80 ? 'bg-pitch-500/15 border border-pitch-500/20' : 'bg-gray-800/60'
        )}>
          <Target className={clsx('w-3 h-3', passAcc >= 80 ? 'text-pitch-400' : 'text-gray-500')} />
          <span className={clsx('font-bold', passAcc >= 80 ? 'text-pitch-300' : 'text-white')}>{passAcc}%</span>
        </div>
      </div>

      {/* Pass bars */}
      <div className="space-y-2.5">
        <StatBar label="Pases completados" value={player.passesOk} max={maxPasses} color="bg-pitch-500" />
        <StatBar label="Pases errados" value={player.passesFail} max={maxPasses} color="bg-red-500/60" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [showMock, setShowMock] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith('video/')) return;
    setFileName(file.name);
    setUploadState('selected');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function simulateUpload() {
    setUploadState('uploading');
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setUploadState('processing');
          setTimeout(() => {
            setUploadState('done');
            setShowMock(true);
          }, 3000);
          return 100;
        }
        return p + 8;
      });
    }, 150);
  }

  const sortedStats = [...MOCK_STATS].sort((a, b) =>
    (b.goals * 3 + b.assists * 2 + b.passesOk) - (a.goals * 3 + a.assists * 2 + a.passesOk)
  );

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                <Zap className="w-3 h-3" />
                Beta · En desarrollo
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter bg-gradient-to-br from-white via-white to-purple-300 bg-clip-text text-transparent mb-2">
              Estadísticas con IA
            </h1>
            <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
              Subí el video de tu partido y nuestra IA analiza automáticamente las estadísticas de cada jugador — goles, asistencias, pases, precisión y más.
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: <Upload className="w-5 h-5" />, step: '01', title: 'Subís el video', desc: 'Cualquier formato, desde el celu o una cámara fija' },
          { icon: <Zap className="w-5 h-5" />, step: '02', title: 'La IA analiza', desc: 'Detecta jugadores, pelota y eventos automáticamente' },
          { icon: <BarChart2 className="w-5 h-5" />, step: '03', title: 'Ves las stats', desc: 'Goles, asistencias, pases, precisión — por jugador' },
        ].map((item) => (
          <div key={item.step} className="card flex gap-4 items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              {item.icon}
            </div>
            <div>
              <div className="text-[10px] text-gray-700 font-bold uppercase tracking-widest mb-0.5">{item.step}</div>
              <div className="font-semibold text-white text-sm">{item.title}</div>
              <div className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload card */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-4 h-4 text-purple-400" />
          <h2 className="font-bold text-white text-base">Subir partido</h2>
        </div>

        {uploadState === 'idle' || uploadState === 'selected' ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
              uploadState === 'selected'
                ? 'border-purple-500/50 bg-purple-500/5'
                : 'border-gray-700/60 hover:border-purple-500/40 hover:bg-purple-500/5'
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {uploadState === 'selected' ? (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{fileName}</div>
                  <div className="text-gray-500 text-xs mt-1">Listo para analizar</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-800/80 border border-gray-700/60 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Arrastrá o hacé click para subir</div>
                  <div className="text-gray-600 text-xs mt-1">MP4, MOV, AVI — hasta 4GB</div>
                </div>
              </div>
            )}
          </div>
        ) : uploadState === 'uploading' ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-300 font-medium">Subiendo video...</span>
                  <span className="text-purple-400 font-bold">{progress}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-600 text-center">{fileName}</div>
          </div>
        ) : uploadState === 'processing' ? (
          <div className="py-8 text-center space-y-4">
            <div className="relative inline-flex">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Zap className="w-7 h-7 text-purple-400" />
              </div>
              <div className="absolute inset-0 rounded-2xl border border-purple-400/30 animate-ping" />
            </div>
            <div>
              <div className="text-white font-bold">Analizando partido...</div>
              <div className="text-gray-500 text-sm mt-1">Detectando jugadores, pelota y eventos</div>
            </div>
            <div className="flex justify-center gap-6 text-xs text-gray-600">
              {['Detección de jugadores', 'Tracking de pelota', 'Extracción de eventos'].map((step, i) => (
                <span key={step} className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-purple-500" style={{ animationDelay: `${i * 0.3}s` }} />
                  {step}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-pitch-500/15 border border-pitch-500/25 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-pitch-400" />
            </div>
            <div>
              <div className="text-white font-bold">¡Análisis completo!</div>
              <div className="text-gray-500 text-sm mt-1">Las estadísticas ya están disponibles abajo</div>
            </div>
          </div>
        )}

        {uploadState === 'selected' && (
          <button
            onClick={simulateUpload}
            className="btn-primary w-full mt-4 justify-center"
            style={{ background: 'linear-gradient(to bottom, #a855f7, #7c3aed)' }}
          >
            <Zap className="w-4 h-4" />
            Analizar partido
          </button>
        )}
      </div>

      {/* Stats preview */}
      {showMock && (
        <div className="space-y-4 animate-fade-in">
          {/* Match summary */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              {uploadState === 'done' ? 'Estadísticas del partido' : 'Ejemplo de análisis'}
            </h2>
            {uploadState !== 'done' && (
              <span className="text-xs text-gray-600 bg-gray-800/60 border border-gray-700/40 rounded-full px-3 py-1">
                Datos de ejemplo
              </span>
            )}
          </div>

          {/* Match header card */}
          <div className="card bg-gradient-to-br from-gray-900 to-gray-900/50 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{MOCK_MATCH.teams[0]}</div>
                <div className="text-4xl font-black text-white">{MOCK_MATCH.score.split(' - ')[0]}</div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-gray-700 font-bold text-sm">—</div>
                <div className="text-xs text-gray-600 mt-1">{MOCK_MATCH.duration}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{MOCK_MATCH.teams[1]}</div>
                <div className="text-4xl font-black text-white">{MOCK_MATCH.score.split(' - ')[1]}</div>
              </div>
            </div>
            <div className="sm:border-l sm:border-gray-800 sm:pl-4 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                {MOCK_MATCH.date}
              </div>
            </div>
          </div>

          {/* Player cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedStats.map((player, idx) => (
              <PlayerCard key={player.name} player={player} rank={idx} />
            ))}
          </div>

          {/* Coming soon footer */}
          {uploadState !== 'done' && (
            <div className="card border-purple-500/15 bg-purple-500/5 text-center py-6">
              <div className="text-2xl mb-2">🚀</div>
              <div className="text-white font-semibold mb-1">Próximamente disponible</div>
              <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
                Estamos entrenando los modelos de IA. Pronto podrás subir tus propios partidos y ver estas estadísticas en tiempo real.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
