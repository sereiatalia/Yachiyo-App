export const YACHIYO_THEME = {
  pink: '#FFC6DB',
  blush: '#FFE5EE',
  pearl: '#FFF7FA',
  rose: '#FF78B9',
  ink: '#8B6F7D',
  dark: '#34343D',
  separators: '୨୧ ─────────────── ୨୧'
};

export const RARITY_ACCENTS = {
  common: { accent: '#DDE7F0', glow: 'rgba(255,255,255,0.48)' },
  uncommon: { accent: '#7DDCFF', glow: 'rgba(125,220,255,0.45)' },
  rare: { accent: '#75A7FF', glow: 'rgba(117,167,255,0.48)' },
  epic: { accent: '#D3A8FF', glow: 'rgba(211,168,255,0.50)' },
  legendary: { accent: '#FFB4D5', glow: 'rgba(255,180,213,0.52)' },
  mythic: { accent: '#FFB05C', glow: 'rgba(255,176,92,0.52)' },
  ancient: { accent: '#E7C77B', glow: 'rgba(231,199,123,0.52)' },
  celestial: { accent: '#FFF0B0', glow: 'rgba(255,240,176,0.58)' },
  secret: { accent: '#B7C9FF', glow: 'rgba(183,201,255,0.55)' },
  tsukuyomi: { accent: '#FF9ABF', glow: 'rgba(255,154,191,0.58)' }
};

export function rarityAccent(rarity) {
  return RARITY_ACCENTS[rarity] ?? RARITY_ACCENTS.common;
}
