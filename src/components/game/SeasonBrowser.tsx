'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { POSITION_CATEGORY } from '@/lib/positions';
import type { Position, PositionCategory } from '@/lib/positions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = 'grid' | 'table' | 'squad' | 'history';
type EraFilter = 'all' | '1990s' | '2000s' | '2010s' | '2020s';
type SortMode = 'rating' | 'name' | 'position';

interface SeasonItem {
  id: string;
  startYear: number;
  endYear: number;
  label: string;
  matchesPerTeam: number;
  _count?: { clubSeasons: number };
}

interface ClubSeasonRow {
  id: string;
  clubId: string;
  seasonId: string;
  position: number | null;
  points: number | null;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  club: {
    id: string;
    nameRu: string;
    nameEn: string | null;
    city: string | null;
    logoUrl: string | null;
  };
}

interface SeasonDetail {
  id: string;
  startYear: number;
  endYear: number;
  label: string;
  matchesPerTeam: number;
  clubSeasons: ClubSeasonRow[];
}

interface PlayerRow {
  id: string;
  playerId: string;
  rating: number;
  mainPosition: string;
  otherPositions: string | null;
  age: number | null;
  matches: number | null;
  goals: number | null;
  assists: number | null;
  player: {
    id: string;
    lastName: string;
    firstName: string | null;
    fullName: string;
    nationality: string | null;
    birthYear: number | null;
  };
}

interface ClubSquad {
  id: string;
  clubId: string;
  seasonId: string;
  position: number | null;
  points: number | null;
  club: {
    id: string;
    nameRu: string;
    nameEn: string | null;
    city: string | null;
    logoUrl: string | null;
  };
  season: {
    id: string;
    startYear: number;
    endYear: number;
    label: string;
  };
  players: PlayerRow[];
}

interface ClubHistorySeason {
  id: string;
  clubId: string;
  seasonId: string;
  position: number | null;
  points: number | null;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  season: {
    id: string;
    startYear: number;
    endYear: number;
    label: string;
  };
}

interface ClubHistory {
  id: string;
  nameRu: string;
  nameEn: string | null;
  city: string | null;
  logoUrl: string | null;
  seasons: ClubHistorySeason[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ERA_LABELS: Record<EraFilter, string> = {
  all: 'Все',
  '1990s': '1990-е',
  '2000s': '2000-е',
  '2010s': '2010-е',
  '2020s': '2020-е',
};

const CATEGORY_LABELS: Record<PositionCategory, string> = {
  gk: 'Вратари',
  def: 'Защитники',
  mid: 'Полузащитники',
  att: 'Нападающие',
};

const CATEGORY_GRADIENT: Record<PositionCategory, string> = {
  gk: 'linear-gradient(135deg, #f97316, #ea580c)',
  def: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  mid: 'linear-gradient(135deg, #22c55e, #16a34a)',
  att: 'linear-gradient(135deg, #ef4444, #dc2626)',
};

const CATEGORY_COLOR: Record<PositionCategory, string> = {
  gk: '#f97316',
  def: '#3b82f6',
  mid: '#22c55e',
  att: '#ef4444',
};

const POSITION_LABELS: Record<string, string> = {
  'ВР': 'Вратарь',
  'ЦЗ': 'Центр. защитник',
  'ПЗ': 'Прав. защитник',
  'ЛЗ': 'Лев. защитник',
  'ПФЗ': 'Прав. фланг. защитник',
  'ЛФЗ': 'Лев. фланг. защитник',
  'ОП': 'Опор. полузащитник',
  'ЦП': 'Центр. полузащитник',
  'АП': 'Атак. полузащитник',
  'ЛП': 'Лев. полузащитник',
  'ПП': 'Прав. полузащитник',
  'ЛВ': 'Лев. вингер',
  'ПВ': 'Прав. вингер',
  'НП': 'Нападающий',
  'ЦН': 'Центр. нападающий',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEraForYear(year: number): EraFilter {
  if (year < 2000) return '1990s';
  if (year < 2010) return '2000s';
  if (year < 2020) return '2010s';
  return '2020s';
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

function getRatingColor(rating: number): string {
  if (rating >= 80) return '#fbbf24';
  if (rating >= 70) return '#22c55e';
  if (rating >= 60) return '#f97316';
  return '#94a3b8';
}

function getPositionCategory(pos: string): PositionCategory {
  return POSITION_CATEGORY[pos as Position] ?? 'mid';
}

function getGoalDiff(forG: number | null, against: number | null): string {
  if (forG === null || against === null) return '—';
  const diff = forG - against;
  return diff > 0 ? `+${diff}` : `${diff}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Season card for the grid view */
function SeasonCard({
  season,
  onClick,
}: {
  season: SeasonItem;
  onClick: () => void;
}) {
  const clubCount = season._count?.clubSeasons ?? 0;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] p-4 text-left overflow-hidden group transition-all duration-200 hover:border-[#22c55e]/40 hover:shadow-lg hover:shadow-[#22c55e]/10"
    >
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(135deg, #22c55e/5 0%, transparent 60%)',
        }}
      />
      <div className="relative z-10">
        <div className="text-lg font-black text-[#e2e8f0]">{season.label}</div>
        <div className="text-xs text-[#94a3b8] mt-1.5 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>{clubCount} клубов</span>
        </div>
        <div className="text-[10px] text-[#94a3b8]/60 mt-0.5">
          {season.matchesPerTeam} матчей
        </div>
      </div>
    </motion.button>
  );
}

/** Skeleton loader for season grid */
function SeasonGridSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] p-4 animate-pulse"
        >
          <div className="h-5 w-16 bg-[#2a2a4a] rounded mb-2" />
          <div className="h-3 w-20 bg-[#2a2a4a] rounded" />
        </div>
      ))}
    </div>
  );
}

/** Position badge for league table */
function PositionBadge({ position, total }: { position: number; total: number }) {
  if (position === 1) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-black text-sm" style={{ color: '#fbbf24' }}>{position}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#fbbf2420', color: '#fbbf24' }}>🏆</span>
      </div>
    );
  }
  if (position <= 3) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-black text-sm" style={{ color: '#94a3b8' }}>{position}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#94a3b8]/15 text-[#94a3b8]">ЛЧ</span>
      </div>
    );
  }
  if (position === 4) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-black text-sm" style={{ color: '#3b82f6' }}>{position}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#3b82f6]/15 text-[#3b82f6]">ЛЕ</span>
      </div>
    );
  }
  if (position >= total - 1) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-black text-sm" style={{ color: '#ef4444' }}>{position}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#ef4444]/15 text-[#ef4444]">↓</span>
      </div>
    );
  }
  return <span className="font-black text-sm text-[#e2e8f0]">{position}</span>;
}

/** Player card for squad view */
function PlayerCard({ player }: { player: PlayerRow }) {
  const category = getPositionCategory(player.mainPosition);
  const initials = getInitials(player.player.fullName);
  const ratingColor = getRatingColor(player.rating);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a2e]/60 border border-[#2a2a4a]/50 hover:bg-[#1a1a2e] hover:border-[#2a2a4a] transition-all duration-150"
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white shadow-md border border-white/10"
          style={{ background: CATEGORY_GRADIENT[category] }}
        >
          {initials}
        </div>
        <div
          className="absolute -bottom-1 -right-1 min-w-[20px] h-[20px] rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-[#0a0a0f] shadow-sm px-0.5"
          style={{ backgroundColor: ratingColor }}
        >
          {player.rating}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-[#e2e8f0] truncate">
          {player.player.fullName}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white"
            style={{ backgroundColor: CATEGORY_COLOR[category] }}
          >
            {POSITION_LABELS[player.mainPosition] ?? player.mainPosition}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="shrink-0 text-right">
        <div className="flex items-center gap-3 text-[11px] text-[#94a3b8]">
          <div className="text-center">
            <div className="font-bold text-[#e2e8f0]">{player.matches ?? '—'}</div>
            <div className="text-[8px] text-[#94a3b8]/60">И</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-[#e2e8f0]">{player.goals ?? '—'}</div>
            <div className="text-[8px] text-[#94a3b8]/60">Г</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-[#e2e8f0]">{player.assists ?? '—'}</div>
            <div className="text-[8px] text-[#94a3b8]/60">П</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SeasonBrowser() {
  // --- View state ---
  const [view, setView] = useState<ViewMode>('grid');
  const [eraFilter, setEraFilter] = useState<EraFilter>('all');

  // --- Data state ---
  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [seasonDetail, setSeasonDetail] = useState<SeasonDetail | null>(null);
  const [clubSquad, setClubSquad] = useState<ClubSquad | null>(null);
  const [clubHistory, setClubHistory] = useState<ClubHistory | null>(null);

  // --- Loading state ---
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [loadingSquad, setLoadingSquad] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- Error state ---
  const [error, setError] = useState<string | null>(null);

  // --- Squad view state ---
  const [squadSearch, setSquadSearch] = useState('');
  const [squadSort, setSquadSort] = useState<SortMode>('rating');

  // --- Navigation history ---
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [selectedClubSeasonId, setSelectedClubSeasonId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch seasons on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function fetchSeasons() {
      setLoadingSeasons(true);
      setError(null);
      try {
        const res = await fetch('/api/seasons');
        if (!res.ok) throw new Error('Ошибка загрузки сезонов');
        const data: SeasonItem[] = await res.json();
        if (!cancelled) setSeasons(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        if (!cancelled) setLoadingSeasons(false);
      }
    }
    fetchSeasons();
    return () => { cancelled = true; };
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch season detail (league table)
  // ---------------------------------------------------------------------------
  const fetchSeasonDetail = async (seasonId: string) => {
    setLoadingTable(true);
    setError(null);
    try {
      const res = await fetch(`/api/seasons/${seasonId}`);
      if (!res.ok) throw new Error('Ошибка загрузки таблицы');
      const data: SeasonDetail = await res.json();
      setSeasonDetail(data);
      setSelectedSeasonId(seasonId);
      setView('table');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoadingTable(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Fetch club squad
  // ---------------------------------------------------------------------------
  const fetchClubSquad = async (clubSeasonId: string) => {
    setLoadingSquad(true);
    setError(null);
    try {
      const res = await fetch(`/api/club-seasons/${clubSeasonId}/players`);
      if (!res.ok) throw new Error('Ошибка загрузки состава');
      const data: ClubSquad = await res.json();
      setClubSquad(data);
      setSelectedClubSeasonId(clubSeasonId);
      setView('squad');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoadingSquad(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Fetch club history
  // ---------------------------------------------------------------------------
  const fetchClubHistory = async (clubId: string) => {
    setLoadingHistory(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}/history`);
      if (!res.ok) throw new Error('Ошибка загрузки истории');
      const data: ClubHistory = await res.json();
      setClubHistory(data);
      setView('history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoadingHistory(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const goBackToGrid = () => {
    setView('grid');
    setSeasonDetail(null);
    setSelectedSeasonId(null);
    setError(null);
  };

  const goBackToTable = () => {
    setView('table');
    setClubSquad(null);
    setSelectedClubSeasonId(null);
    setError(null);
  };

  const goBackToSquad = () => {
    setView('squad');
    setClubHistory(null);
    setError(null);
  };

  // ---------------------------------------------------------------------------
  // Filtered seasons
  // ---------------------------------------------------------------------------
  const filteredSeasons = useMemo(() => {
    if (eraFilter === 'all') return seasons;
    return seasons.filter((s) => getEraForYear(s.startYear) === eraFilter);
  }, [seasons, eraFilter]);

  // ---------------------------------------------------------------------------
  // Squad: grouped & sorted players
  // ---------------------------------------------------------------------------
  const processedPlayers = useMemo(() => {
    if (!clubSquad) return { gk: [], def: [], mid: [], att: [] } as Record<PositionCategory, PlayerRow[]>;

    let players = [...clubSquad.players];

    // Search
    if (squadSearch.trim()) {
      const q = squadSearch.toLowerCase();
      players = players.filter((p) => p.player.fullName.toLowerCase().includes(q));
    }

    // Sort
    players.sort((a, b) => {
      switch (squadSort) {
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.player.lastName.localeCompare(b.player.lastName, 'ru');
        case 'position': {
          const catOrder: Record<PositionCategory, number> = { gk: 0, def: 1, mid: 2, att: 3 };
          const catA = catOrder[getPositionCategory(a.mainPosition)];
          const catB = catOrder[getPositionCategory(b.mainPosition)];
          if (catA !== catB) return catA - catB;
          return b.rating - a.rating;
        }
        default:
          return 0;
      }
    });

    // Group by category
    const grouped: Record<PositionCategory, PlayerRow[]> = { gk: [], def: [], mid: [], att: [] };
    for (const p of players) {
      const cat = getPositionCategory(p.mainPosition);
      grouped[cat].push(p);
    }
    return grouped;
  }, [clubSquad, squadSearch, squadSort]);

  // Average rating
  const avgRating = useMemo(() => {
    if (!clubSquad || clubSquad.players.length === 0) return 0;
    const total = clubSquad.players.reduce((sum, p) => sum + p.rating, 0);
    return Math.round((total / clubSquad.players.length) * 10) / 10;
  }, [clubSquad]);

  // ---------------------------------------------------------------------------
  // Render: Season Grid View
  // ---------------------------------------------------------------------------
  const renderGrid = () => (
    <motion.div
      key="grid"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Title */}
      <div className="mb-5">
        <h2 className="text-xl font-black text-[#e2e8f0] flex items-center gap-2">
          <span>📅</span>
          <span>Сезоны РПЛ</span>
        </h2>
        <p className="text-sm text-[#94a3b8] mt-1">
          {seasons.length} сезонов · 1992–2026
        </p>
      </div>

      {/* Era filter pills */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {(Object.entries(ERA_LABELS) as [EraFilter, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setEraFilter(key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
              eraFilter === key
                ? 'bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/20'
                : 'bg-[#1a1a2e] text-[#94a3b8] hover:text-[#e2e8f0] border border-[#2a2a4a]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loadingSeasons && <SeasonGridSkeleton />}

      {/* Error */}
      {error && !loadingSeasons && (
        <div className="text-center py-8">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-sm text-[#ef4444]">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] text-xs font-bold text-[#e2e8f0] hover:border-[#22c55e]/30 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {/* Empty */}
      {!loadingSeasons && !error && filteredSeasons.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm text-[#94a3b8]">Сезоны не найдены</p>
          <p className="text-xs text-[#94a3b8]/60 mt-1">Выберите другую эпоху</p>
        </div>
      )}

      {/* Season grid */}
      {!loadingSeasons && !error && filteredSeasons.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {filteredSeasons.map((season) => (
            <SeasonCard
              key={season.id}
              season={season}
              onClick={() => fetchSeasonDetail(season.id)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );

  // ---------------------------------------------------------------------------
  // Render: League Table View
  // ---------------------------------------------------------------------------
  const renderTable = () => {
    if (loadingTable) {
      return (
        <motion.div
          key="table-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div className="h-8 w-32 bg-[#2a2a4a] rounded-lg animate-pulse" />
          <div className="rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border-b border-[#2a2a4a]/50 animate-pulse">
                <div className="w-6 h-6 bg-[#2a2a4a] rounded" />
                <div className="flex-1 h-4 bg-[#2a2a4a] rounded" />
                <div className="w-8 h-4 bg-[#2a2a4a] rounded" />
              </div>
            ))}
          </div>
        </motion.div>
      );
    }

    if (!seasonDetail) return null;

    const totalClubs = seasonDetail.clubSeasons.length;

    return (
      <motion.div
        key="table"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Back button */}
        <button
          onClick={goBackToGrid}
          className="flex items-center gap-1.5 text-sm text-[#94a3b8] hover:text-[#22c55e] transition-colors mb-4 group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          <span>Сезоны</span>
        </button>

        {/* Season header */}
        <div className="mb-5">
          <h2 className="text-xl font-black text-[#e2e8f0]">
            {seasonDetail.label}
          </h2>
          <p className="text-sm text-[#94a3b8] mt-1">
            {seasonDetail.matchesPerTeam} матчей · {totalClubs} клубов
          </p>
        </div>

        {/* Table */}
        <div className="rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[40px_1fr_36px_36px_36px_36px_56px_40px] sm:grid-cols-[44px_1fr_44px_44px_44px_44px_70px_48px] items-center px-3 py-2.5 bg-[#0a0a0f]/50 border-b border-[#2a2a4a] text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">
            <span>#</span>
            <span>Клуб</span>
            <span className="text-center">И</span>
            <span className="text-center">В</span>
            <span className="text-center">Н</span>
            <span className="text-center">П</span>
            <span className="text-center">Мячи</span>
            <span className="text-center">О</span>
          </div>

          {/* Table body */}
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            {seasonDetail.clubSeasons.map((cs, idx) => {
              const pos = cs.position ?? idx + 1;
              const isEven = idx % 2 === 1;
              const goalDiff = getGoalDiff(cs.goalsFor, cs.goalsAgainst);

              return (
                <motion.button
                  key={cs.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.6), duration: 0.2 }}
                  onClick={() => fetchClubSquad(cs.id)}
                  className="w-full grid grid-cols-[40px_1fr_36px_36px_36px_36px_56px_40px] sm:grid-cols-[44px_1fr_44px_44px_44px_44px_70px_48px] items-center px-3 py-2.5 border-b border-[#2a2a4a]/30 hover:bg-[#22c55e]/5 transition-colors cursor-pointer group"
                  style={{
                    backgroundColor: isEven ? 'rgba(26,26,46,0.4)' : 'transparent',
                  }}
                >
                  {/* Position */}
                  <div>
                    <PositionBadge position={pos} total={totalClubs} />
                  </div>

                  {/* Club name */}
                  <div className="flex items-center gap-2 min-w-0">
                    {cs.club.logoUrl ? (
                      <img
                        src={cs.club.logoUrl}
                        alt={cs.club.nameRu}
                        className="w-5 h-5 rounded object-contain shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-[#2a2a4a] flex items-center justify-center text-[8px] font-bold text-[#94a3b8] shrink-0">
                        {cs.club.nameRu.slice(0, 2)}
                      </div>
                    )}
                    <span className="text-sm font-medium text-[#e2e8f0] truncate group-hover:text-[#22c55e] transition-colors">
                      {cs.club.nameRu}
                    </span>
                  </div>

                  {/* Played */}
                  <span className="text-sm text-[#94a3b8] text-center">{cs.played ?? '—'}</span>

                  {/* Won */}
                  <span className="text-sm text-[#e2e8f0] text-center font-medium">{cs.won ?? '—'}</span>

                  {/* Drawn */}
                  <span className="text-sm text-[#94a3b8] text-center">{cs.drawn ?? '—'}</span>

                  {/* Lost */}
                  <span className="text-sm text-[#94a3b8] text-center">{cs.lost ?? '—'}</span>

                  {/* Goals */}
                  <span className="text-[11px] text-[#94a3b8] text-center">
                    {cs.goalsFor ?? '—'}-{cs.goalsAgainst ?? '—'}
                    <span className="ml-1 text-[9px]" style={{ color: goalDiff.startsWith('+') ? '#22c55e' : goalDiff.startsWith('-') ? '#ef4444' : '#94a3b8' }}>
                      {goalDiff !== '—' ? goalDiff : ''}
                    </span>
                  </span>

                  {/* Points */}
                  <span className="text-sm font-black text-[#e2e8f0] text-center">{cs.points ?? '—'}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-3 px-1">
          <div className="flex items-center gap-1 text-[9px]">
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: '#fbbf2420', color: '#fbbf24' }}>🏆</span>
            <span className="text-[#94a3b8]">Чемпион</span>
          </div>
          <div className="flex items-center gap-1 text-[9px]">
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#94a3b8]/15 text-[#94a3b8]">ЛЧ</span>
            <span className="text-[#94a3b8]">Лига чемпионов</span>
          </div>
          <div className="flex items-center gap-1 text-[9px]">
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#3b82f6]/15 text-[#3b82f6]">ЛЕ</span>
            <span className="text-[#94a3b8]">Лига Европы</span>
          </div>
          <div className="flex items-center gap-1 text-[9px]">
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#ef4444]/15 text-[#ef4444]">↓</span>
            <span className="text-[#94a3b8]">Выбытие</span>
          </div>
        </div>
      </motion.div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Club Squad View
  // ---------------------------------------------------------------------------
  const renderSquad = () => {
    if (loadingSquad) {
      return (
        <motion.div
          key="squad-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div className="h-8 w-48 bg-[#2a2a4a] rounded-lg animate-pulse" />
          <div className="rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-[#2a2a4a] rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-[#2a2a4a] rounded mb-1" />
                  <div className="h-3 w-20 bg-[#2a2a4a] rounded" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      );
    }

    if (!clubSquad) return null;

    const categories: PositionCategory[] = ['gk', 'def', 'mid', 'att'];

    return (
      <motion.div
        key="squad"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Back button */}
        <button
          onClick={goBackToTable}
          className="flex items-center gap-1.5 text-sm text-[#94a3b8] hover:text-[#22c55e] transition-colors mb-4 group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          <span>Таблица</span>
        </button>

        {/* Club header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-[#e2e8f0] truncate">
              {clubSquad.club.nameRu}
            </h2>
            {clubSquad.club.city && (
              <p className="text-sm text-[#94a3b8] mt-0.5">{clubSquad.club.city}</p>
            )}
            <p className="text-xs text-[#94a3b8]/60 mt-0.5">{clubSquad.season.label}</p>
          </div>
          {/* Average rating badge */}
          <div className="shrink-0 px-3 py-1.5 rounded-xl bg-[#1a1a2e] border border-[#fbbf24]/20 shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⭐</span>
              <span className="text-xs text-[#94a3b8]">Ср. рейтинг:</span>
              <span className="text-sm font-black" style={{ color: getRatingColor(avgRating) }}>
                {avgRating}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Sort controls */}
        <div className="space-y-2 mb-4">
          {/* View History button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => fetchClubHistory(clubSquad.club.id)}
            className="w-full py-2.5 rounded-xl bg-[#1a1a2e] border border-[#22c55e]/20 text-sm font-bold text-[#22c55e] hover:bg-[#22c55e]/10 hover:border-[#22c55e]/30 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            История клуба
          </motion.button>
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={squadSearch}
              onChange={(e) => setSquadSearch(e.target.value)}
              placeholder="Поиск игрока..."
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] text-sm text-[#e2e8f0] placeholder:text-[#94a3b8]/50 focus:border-[#22c55e]/40 focus:outline-none transition-colors"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#94a3b8] mr-1">Сортировка:</span>
            {([
              { mode: 'rating' as SortMode, label: 'Рейтинг' },
              { mode: 'name' as SortMode, label: 'Имя' },
              { mode: 'position' as SortMode, label: 'Позиция' },
            ]).map((s) => (
              <button
                key={s.mode}
                onClick={() => setSquadSort(s.mode)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-200 ${
                  squadSort === s.mode
                    ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'
                    : 'text-[#94a3b8] hover:text-[#e2e8f0] border border-transparent'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Players grouped by category */}
        <div className="space-y-4">
          {categories.map((cat) => {
            const players = processedPlayers[cat];
            if (players.length === 0) return null;

            return (
              <div key={cat}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLOR[cat] }}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: CATEGORY_COLOR[cat] }}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span className="text-[10px] text-[#94a3b8]/60">({players.length})</span>
                </div>

                {/* Player cards */}
                <div className="space-y-1.5">
                  {players.map((player) => (
                    <PlayerCard key={player.id} player={player} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty search result */}
        {squadSearch.trim() && Object.values(processedPlayers).every((p) => p.length === 0) && (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-sm text-[#94a3b8]">Игроки не найдены</p>
            <p className="text-xs text-[#94a3b8]/60 mt-1">Попробуйте другой запрос</p>
          </div>
        )}
      </motion.div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Club History View
  // ---------------------------------------------------------------------------
  const renderHistory = () => {
    if (loadingHistory) {
      return (
        <motion.div
          key="history-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div className="h-8 w-48 bg-[#2a2a4a] rounded-lg animate-pulse" />
          <div className="rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-[#2a2a4a] rounded" />
                <div className="flex-1 h-4 bg-[#2a2a4a] rounded" />
              </div>
            ))}
          </div>
        </motion.div>
      );
    }

    if (!clubHistory) return null;

    const s = clubHistory.seasons;
    const titles = s.filter(cs => cs.position === 1).length;
    const totalSeasons = s.length;
    const avgPosition = s.length > 0
      ? (s.reduce((sum, cs) => sum + (cs.position ?? 0), 0) / s.length).toFixed(1)
      : '—';
    const bestPosition = s.length > 0
      ? Math.min(...s.map(cs => cs.position ?? 99))
      : '—';
    const totalPoints = s.reduce((sum, cs) => sum + (cs.points ?? 0), 0);

    return (
      <motion.div
        key="history"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Back button */}
        <button
          onClick={goBackToSquad}
          className="flex items-center gap-1.5 text-sm text-[#94a3b8] hover:text-[#22c55e] transition-colors mb-4 group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          <span>Состав</span>
        </button>

        {/* Club header */}
        <div className="mb-5">
          <h2 className="text-xl font-black text-[#e2e8f0]">
            {clubHistory.nameRu}
          </h2>
          {clubHistory.city && (
            <p className="text-sm text-[#94a3b8] mt-0.5">{clubHistory.city}</p>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <div className="rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] p-3 text-center">
            <div className="text-2xl font-black text-[#fbbf24]">{titles}</div>
            <div className="text-[10px] text-[#94a3b8] mt-0.5">🏆 Титулов</div>
          </div>
          <div className="rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] p-3 text-center">
            <div className="text-2xl font-black text-[#e2e8f0]">{totalSeasons}</div>
            <div className="text-[10px] text-[#94a3b8] mt-0.5">Сезонов</div>
          </div>
          <div className="rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] p-3 text-center">
            <div className="text-2xl font-black text-[#22c55e]">{bestPosition}</div>
            <div className="text-[10px] text-[#94a3b8] mt-0.5">Лучшее место</div>
          </div>
          <div className="rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] p-3 text-center">
            <div className="text-2xl font-black text-[#3b82f6]">{avgPosition}</div>
            <div className="text-[10px] text-[#94a3b8] mt-0.5">Ср. позиция</div>
          </div>
        </div>

        {/* Position chart (simple bar visualization) */}
        <div className="rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] p-4 mb-5">
          <div className="text-xs font-bold text-[#94a3b8] mb-3">ПОЗИЦИИ ПО СЕЗОНАМ</div>
          <div className="flex items-end gap-1 h-32 overflow-x-auto pb-1">
            {s.map((cs) => {
              const pos = cs.position ?? 16;
              const height = Math.max(8, ((16 - pos + 1) / 16) * 100);
              const color = pos === 1 ? '#fbbf24' : pos <= 3 ? '#94a3b8' : pos <= 4 ? '#3b82f6' : pos >= 14 ? '#ef4444' : '#22c55e';
              return (
                <div key={cs.id} className="flex flex-col items-center gap-0.5 min-w-[28px]" title={`${cs.season.label}: ${pos}-е место, ${cs.points ?? '—'} очков`}>
                  <span className="text-[8px] font-bold text-[#94a3b8]">{pos}</span>
                  <div
                    className="w-full rounded-t-sm transition-all duration-300"
                    style={{ height: `${height}%`, backgroundColor: color, minHeight: 4 }}
                  />
                  <span className="text-[7px] text-[#94a3b8]/60 whitespace-nowrap">{cs.season.label.slice(-2)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Season-by-season table */}
        <div className="rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] overflow-hidden">
          <div className="grid grid-cols-[1fr_36px_36px_36px_36px_56px_40px] items-center px-3 py-2.5 bg-[#0a0a0f]/50 border-b border-[#2a2a4a] text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">
            <span>Сезон</span>
            <span className="text-center">И</span>
            <span className="text-center">В</span>
            <span className="text-center">Н</span>
            <span className="text-center">П</span>
            <span className="text-center">Мячи</span>
            <span className="text-center">О</span>
          </div>
          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
            {s.map((cs, idx) => {
              const pos = cs.position ?? idx + 1;
              const isEven = idx % 2 === 1;
              const goalDiff = getGoalDiff(cs.goalsFor, cs.goalsAgainst);
              const posColor = pos === 1 ? '#fbbf24' : pos <= 3 ? '#94a3b8' : pos === 4 ? '#3b82f6' : pos >= 14 ? '#ef4444' : '#e2e8f0';

              return (
                <motion.button
                  key={cs.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.4), duration: 0.15 }}
                  onClick={() => fetchClubSquad(cs.id)}
                  className="w-full grid grid-cols-[1fr_36px_36px_36px_36px_56px_40px] items-center px-3 py-2 border-b border-[#2a2a4a]/30 hover:bg-[#22c55e]/5 transition-colors cursor-pointer"
                  style={{ backgroundColor: isEven ? 'rgba(26,26,46,0.4)' : 'transparent' }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-black shrink-0" style={{ color: posColor }}>{pos}.</span>
                    <span className="text-sm font-medium text-[#e2e8f0] truncate">{cs.season.label}</span>
                  </div>
                  <span className="text-xs text-[#94a3b8] text-center">{cs.played ?? '—'}</span>
                  <span className="text-xs text-[#e2e8f0] text-center font-medium">{cs.won ?? '—'}</span>
                  <span className="text-xs text-[#94a3b8] text-center">{cs.drawn ?? '—'}</span>
                  <span className="text-xs text-[#94a3b8] text-center">{cs.lost ?? '—'}</span>
                  <span className="text-[10px] text-[#94a3b8] text-center">
                    {cs.goalsFor ?? '—'}-{cs.goalsAgainst ?? '—'}
                    <span className="ml-0.5 text-[8px]" style={{ color: goalDiff.startsWith('+') ? '#22c55e' : goalDiff.startsWith('-') ? '#ef4444' : '#94a3b8' }}>
                      {goalDiff !== '—' ? goalDiff : ''}
                    </span>
                  </span>
                  <span className="text-xs font-black text-[#e2e8f0] text-center">{cs.points ?? '—'}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 p-3 rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] flex items-center justify-between">
          <span className="text-xs text-[#94a3b8]">Всего очков за все сезоны:</span>
          <span className="text-sm font-black text-[#22c55e]">{totalPoints}</span>
        </div>
      </motion.div>
    );
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full max-w-2xl mx-auto pb-6">
      {/* Global error bar */}
      {error && view !== 'grid' && (
        <div className="mb-4 p-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#ef4444] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
          <span className="text-xs text-[#ef4444]">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-[#ef4444]/60 hover:text-[#ef4444] transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Views */}
      {view === 'grid' && renderGrid()}
      {view === 'table' && renderTable()}
      {view === 'squad' && renderSquad()}
      {view === 'history' && renderHistory()}
    </div>
  );
}
