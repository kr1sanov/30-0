import { AVATARS } from '@/lib/profileCatalog';

const palettes: Record<string, [string, string]> = {
  ball: ['#00c896', '#0d5447'], cup: ['#eab308', '#73460d'], glove: ['#60a5fa', '#173865'],
  boots: ['#f97316', '#7c2d12'], stadium: ['#22c55e', '#14532d'], whistle: ['#a78bfa', '#4c1d95'],
  medal: ['#fbbf24', '#78350f'], eagle: ['#93c5fd', '#1e40af'], lion: ['#f59e0b', '#92400e'],
  rocket: ['#fb7185', '#881337'], crown: ['#fde047', '#854d0e'], fire: ['#f97316', '#991b1b'],
  diamond: ['#7dd3fc', '#0e7490'],
};

/** Small football crest, with a distinct colour pairing for each avatar. */
export default function FootballAvatar({ avatar = 'ball', size = 56 }: { avatar?: string; size?: number }) {
  const [top, bottom] = palettes[avatar] ?? palettes.ball;
  const emoji = AVATARS.find(item => item.key === avatar)?.emoji ?? '⚽';
  return <span aria-label={AVATARS.find(item => item.key === avatar)?.ru ?? 'Мяч'} role="img" style={{ width: size, height: size, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', borderRadius: '50%', border: `2px solid ${top}`, background: `linear-gradient(145deg, ${top} 0%, ${bottom} 52%, #071016 100%)`, boxShadow: `0 0 ${Math.round(size / 5)}px ${top}44` }}>
    <span aria-hidden="true" style={{ position: 'absolute', width: '70%', height: '75%', top: '12%', border: '1px solid #ffffff75', borderRadius: '45% 45% 55% 55%', transform: 'rotate(-8deg)', background: '#ffffff15' }}/>
    <span aria-hidden="true" style={{ position: 'relative', fontSize: size * .47, lineHeight: 1, filter: 'drop-shadow(0 2px 3px #000b)' }}>{emoji}</span>
  </span>;
}
