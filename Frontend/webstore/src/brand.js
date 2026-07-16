// SINGLE SOURCE OF BRAND TRUTH.
// Per-farm branches override ONLY this file (+ swapped image assets).
// main = Upande master: black / white / gold, florist-editorial.

export const brand = {
  name: 'Upande',
  tagline: 'Fresh from the farm',
  palette: {
    ink:       '#0f0f0f',
    // Bare "R,G,B" companions to ink/paper, consumed as rgba(var(--ink-rgb),X)
    // wherever the nav/hero/badges need a translucent ink or paper overlay —
    // CSS custom properties can't be decomposed into channels at parse time,
    // so a hex-only token can't feed an rgba() alpha blend. Keep these in
    // lockstep with `ink`/`paper` above on any per-farm reskin.
    inkRgb:    '15,15,15',
    paper:     '#faf9f6',
    paperRgb:  '250,249,246',
    surface:   '#ffffff',
    gold:      '#c8a24c',
    goldSoft:  '#f3ebd7',
    line:      '#e7e3d9',
    muted:     '#6f6c64',
    // Status colors (stock / add-to-cart feedback) — not part of the farm
    // reskin's editorial palette, but tokenized so hex isn't duplicated in CSS.
    good:      '#276a35',
    goodSoft:  '#e9f3ea',
    bad:       '#9c3b3b',
    badSoft:   '#f6e6e6',
  },
  hero: {
    eyebrow: 'UPANDE FLOWERS',
    title: 'Blooms, cut to order.',
    subtitle: 'Farm-fresh roses and seasonal stems, shipped the day they are picked.',
  },
};

const CSS_VARS = {
  ink: '--ink', inkRgb: '--ink-rgb', paper: '--paper', paperRgb: '--paper-rgb', surface: '--surface',
  gold: '--gold', goldSoft: '--gold-soft', line: '--line', muted: '--muted',
  good: '--good', goodSoft: '--good-soft', bad: '--bad', badSoft: '--bad-soft',
};

export function applyBrand(b = brand) {
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(CSS_VARS)) {
    if (b.palette[key]) root.style.setProperty(cssVar, b.palette[key]);
  }
  if (b.name) document.title = `${b.name} · Fresh Flowers`;
}
