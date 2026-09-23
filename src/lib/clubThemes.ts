import type { CSSProperties } from 'react';

export interface ClubTheme {
  primary: string;
  secondary: string;
  accent: string;
  onPrimary: string;
  surface: string;
  glow: string;
}

export const DEFAULT_CLUB_THEME: ClubTheme = {
  primary: '#00C896',
  secondary: '#0F766E',
  accent: '#5EEAD4',
  onPrimary: '#07110E',
  surface: '#0D1A17',
  glow: 'rgba(0, 200, 150, 0.28)',
};

const CLUB_THEMES: Record<string, ClubTheme> = {
  'Алания': { primary: '#F4C542', secondary: '#C1272D', accent: '#FFF0A6', onPrimary: '#241C02', surface: '#211B0D', glow: 'rgba(244, 197, 66, 0.28)' },
  'Амкар': { primary: '#E11D48', secondary: '#111827', accent: '#FDA4AF', onPrimary: '#FFFFFF', surface: '#211015', glow: 'rgba(225, 29, 72, 0.28)' },
  'Ахмат': { primary: '#16A34A', secondary: '#FFFFFF', accent: '#86EFAC', onPrimary: '#FFFFFF', surface: '#0D1D13', glow: 'rgba(22, 163, 74, 0.28)' },
  'Динамо Москва': { primary: '#2563EB', secondary: '#FFFFFF', accent: '#93C5FD', onPrimary: '#FFFFFF', surface: '#0C1629', glow: 'rgba(37, 99, 235, 0.3)' },
  'Зенит': { primary: '#00AEEF', secondary: '#FFFFFF', accent: '#7DD3FC', onPrimary: '#031923', surface: '#071B25', glow: 'rgba(0, 174, 239, 0.3)' },
  'Краснодар': { primary: '#22C55E', secondary: '#111827', accent: '#86EFAC', onPrimary: '#06160B', surface: '#0C1E12', glow: 'rgba(34, 197, 94, 0.28)' },
  'Крылья Советов': { primary: '#38BDF8', secondary: '#1D4ED8', accent: '#BAE6FD', onPrimary: '#06202B', surface: '#0A1820', glow: 'rgba(56, 189, 248, 0.28)' },
  'Кубань': { primary: '#FACC15', secondary: '#15803D', accent: '#FEF08A', onPrimary: '#211B02', surface: '#201B08', glow: 'rgba(250, 204, 21, 0.28)' },
  'Локомотив Москва': { primary: '#16A34A', secondary: '#DC2626', accent: '#86EFAC', onPrimary: '#FFFFFF', surface: '#0C1C12', glow: 'rgba(22, 163, 74, 0.28)' },
  'Ростов': { primary: '#FACC15', secondary: '#2563EB', accent: '#FEF08A', onPrimary: '#211B02', surface: '#201B08', glow: 'rgba(250, 204, 21, 0.28)' },
  'Рубин Казань': { primary: '#A61B2B', secondary: '#14532D', accent: '#FDA4AF', onPrimary: '#FFFFFF', surface: '#211014', glow: 'rgba(166, 27, 43, 0.3)' },
  'Спартак Москва': { primary: '#E31E24', secondary: '#FFFFFF', accent: '#FDA4AF', onPrimary: '#FFFFFF', surface: '#230E10', glow: 'rgba(227, 30, 36, 0.3)' },
  'Торпедо Москва': { primary: '#F8FAFC', secondary: '#111827', accent: '#CBD5E1', onPrimary: '#111827', surface: '#17191D', glow: 'rgba(248, 250, 252, 0.2)' },
  'Урал': { primary: '#F97316', secondary: '#111827', accent: '#FDBA74', onPrimary: '#1F0D02', surface: '#21140B', glow: 'rgba(249, 115, 22, 0.3)' },
  'ЦСКА Москва': { primary: '#DC2626', secondary: '#1D4ED8', accent: '#FCA5A5', onPrimary: '#FFFFFF', surface: '#210F12', glow: 'rgba(220, 38, 38, 0.3)' },
};

export function getClubTheme(clubName?: string): ClubTheme {
  if (!clubName) return DEFAULT_CLUB_THEME;
  return CLUB_THEMES[clubName] ?? DEFAULT_CLUB_THEME;
}

export type ClubThemeStyle = CSSProperties & Record<`--${string}`, string>;

export function clubThemeStyle(clubName?: string): ClubThemeStyle {
  const theme = getClubTheme(clubName);
  return {
    '--club-primary': theme.primary,
    '--club-secondary': theme.secondary,
    '--club-accent': theme.accent,
    '--club-on-primary': theme.onPrimary,
    '--club-surface': theme.surface,
    '--club-glow': theme.glow,
    '--primary': theme.primary,
    '--primary-foreground': theme.onPrimary,
    '--ring': theme.primary,
  };
}
