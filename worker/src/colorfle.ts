// Colorfle answer algorithm - exact port using npm seedrandom (alea algorithm)
// This matches the game's client-side seeded PRNG exactly

import seedrandom from 'seedrandom';

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

// Compute the answer for a given mode and date string
// The game uses seed format: "{mode} {day} {month} {year}"
// where mode is 0 for normal, 1 for hard
function computeAnswer(mode: number, dateStr: string, numBlocks: number): string[] {
  const seed = `${mode} ${dateStr}`;
  const rng = seedrandom(seed);
  // Use sequential indices [0,1,2,...,19] exactly like the game
  const indices = Array.from({ length: COLORFLE_COLORS.length }, (_, i) => i);
  const answer: string[] = [];

  for (let i = 0; i < numBlocks; i++) {
    const x = Math.floor(rng() * indices.length);
    answer.push(COLORFLE_COLORS[indices[x]]);
    indices.splice(x, 1);
  }

  return answer;
}

// Get the next puzzle date (5PM local time boundary)
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
  // Seed format exactly matching the game: "day month year"
  const dateStr = `${nextDate.getDate()} ${nextDate.getMonth()} ${nextDate.getFullYear()}`;

  // Normal mode: 3 blocks, seed mode = 0
  const normal = computeAnswer(0, dateStr, 3);
  // Hard mode: 4 blocks, seed mode = 1
  const hard = computeAnswer(1, dateStr, 4);

  const normalNames = normal.map(c => COLORFLE_COLOR_NAMES[c] || c);
  const hardNames = hard.map(c => COLORFLE_COLOR_NAMES[c] || c);

  return { normal, hard, normalNames, hardNames, dayNumber };
}
