// SINGLE SOURCE OF BRAND TRUTH.
// Per-farm branches override ONLY this file (+ swapped image assets).
// main = Upande master: black / white / gold, florist-editorial.

export const brand = {
  name: 'Upande',
  tagline: 'Fresh from the farm',
  palette: {
    ink:       '#0f0f0f',
    paper:     '#faf9f6',
    surface:   '#ffffff',
    gold:      '#c8a24c',
    goldSoft:  '#f3ebd7',
    line:      '#e7e3d9',
    muted:     '#6f6c64',
  },
  hero: {
    eyebrow: 'UPANDE FLOWERS',
    title: 'Blooms, cut to order.',
    subtitle: 'Farm-fresh roses and seasonal stems, shipped the day they are picked.',
  },
};

const CSS_VARS = {
  ink: '--ink', paper: '--paper', surface: '--surface',
  gold: '--gold', goldSoft: '--gold-soft', line: '--line', muted: '--muted',
};

export function applyBrand(b = brand) {
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(CSS_VARS)) {
    if (b.palette[key]) root.style.setProperty(cssVar, b.palette[key]);
  }
  if (b.name) document.title = `${b.name} · Fresh Flowers`;
}
