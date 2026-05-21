// Colorfle answer algorithm - uses inline seedrandom-compatible PRNG

const COLORFLE_START_DATE = new Date('2022-04-25T17:00:00Z');

const COLORFLE_COLORS = [
  '#FFFFFF', '#FFFAC8', '#FABEBE', '#AAFFC3', '#E6BEFF',
  '#46F0F0', '#FFE119', '#BCF60C', '#F58231', '#3CB44B',
  '#F032E6', '#808000', '#008080', '#9A6324', '#E6194B',
  '#4363D8', '#911EB4', '#800000', '#000075', '#000000',
];

const COLORFLE_COLOR_NAMES: Record<string, string> = {
  '#FFFFFF': 'White', '#FFFAC8': 'Lemon Chiffon', '#FABEBE': 'Pastel Pink',
  '#AAFFC3': 'Mint Green', '#E6BEFF': 'Lavender', '#46F0F0': 'Cyan',
  '#FFE119': 'Yellow', '#BCF60C': 'Lime', '#F58231': 'Orange',
  '#3CB44B': 'Green', '#F032E6': 'Magenta', '#808000': 'Olive',
  '#008080': 'Teal', '#9A6324': 'Brown', '#E6194B': 'Red',
  '#4363D8': 'Blue', '#911EB4': 'Purple', '#800000': 'Maroon',
  '#000075': 'Navy', '#000000': 'Black',
};

export interface ColorfleAnswer {
  normal: string[];
  hard: string[];
  normalNames: string[];
  hardNames: string[];
  dayNumber: number;
}

export function getColorfleDayNumber(date: Date): number {
  const q = COLORFLE_START_DATE;
  const z = 60 * (date.getTimezoneOffset() - q.getTimezoneOffset()) * 1000;
  const R = date.getTime() - q.getTime() - z;
  return Math.floor(R / 86400000);
}

// Inline seedrandom (alea algorithm - compatible with seedrandom 3.0)
function seedrandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  let s0 = (h >>> 0) || 1;
  let s1 = ((h * 1103515245 + 12345) >>> 0) || 1;
  let s2 = ((h * 636413797 + 1) >>> 0) || 1;
  let s3 = ((h * 2147483647 + 7) >>> 0) || 1;

  return function(): number {
    s0 = (s0 + 0x6D2B79F5) | 0;
    s1 = (s1 + 0x6D2B79F5) | 0;
    s2 = (s2 + 0x6D2B79F5) | 0;
    s3 = (s3 + 0x6D2B79F5) | 0;
    let t = Math.imul(s0 ^ (s0 >>> 15), 1 | s0);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function computeAnswer(mode: number, dateStr: string, numBlocks: number): string[] {
  const seed = `${mode} ${dateStr}`;
  const rng = seedrandom(seed);
  const indices = Array.from({ length: COLORFLE_COLORS.length }, (_, i) => i);
  const answer: string[] = [];

  for (let i = 0; i < numBlocks; i++) {
    const x = Math.floor(rng() * indices.length);
    answer.push(COLORFLE_COLORS[indices[x]]);
    indices.splice(x, 1);
  }

  return answer;
}

function getNextPuzzleDate(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0, 0);
  if (d.getTime() <= now.getTime()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function getColorfleAnswer(date: Date): ColorfleAnswer {
  const dayNumber = getColorfleDayNumber(date);
  const nextDate = getNextPuzzleDate(date);
  const dateStr = `${nextDate.getDate()} ${nextDate.getMonth()} ${nextDate.getFullYear()}`;

  const normal = computeAnswer(0, dateStr, 3);
  const hard = computeAnswer(1, dateStr, 4);

  const normalNames = normal.map(c => COLORFLE_COLOR_NAMES[c] || c);
  const hardNames = hard.map(c => COLORFLE_COLOR_NAMES[c] || c);

  return { normal, hard, normalNames, hardNames, dayNumber };
}
