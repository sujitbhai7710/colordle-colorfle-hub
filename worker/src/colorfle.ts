// Colorfle answer algorithm - exact port using npm seedrandom (ARC4/RC4-based)
// This matches the game's client-side seeded PRNG exactly
//
// IMPORTANT: The Colorfle game uses LOCAL browser time for all computations.
// Since our server runs in UTC, we use IST (Asia/Kolkata) as the reference timezone
// to match the primary audience. The game itself has no server-side enforcement -
// different timezones can see different daily puzzles.
//
// The game uses seedrandom v3.0.5 (ARC4 algorithm), NOT alea.

import seedrandom from 'seedrandom';

// Colorfle epoch: April 25, 2022 at 5:00 PM (in the reference timezone)
// In IST: April 25, 2022 at 5:00 PM IST = April 25 11:30 AM UTC
const COLORFLE_EPOCH_IST = new Date('2022-04-25T17:00:00+05:30');

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

// Get the IST date components for a given date
function getISTDateParts(d: Date): { year: number; month: number; day: number; hour: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const year = parseInt(parts.find(p => p.type === 'year')!.value);
  const month = parseInt(parts.find(p => p.type === 'month')!.value);
  const day = parseInt(parts.find(p => p.type === 'day')!.value);
  const hour = parseInt(parts.find(p => p.type === 'hour')!.value);
  return { year, month, day, hour };
}

// Compute day number based on IST timezone
// The game uses: days since epoch (Apr 25 2022, 5PM local) with DST adjustment
export function getColorfleDayNumber(date: Date): number {
  const istParts = getISTDateParts(date);
  // Create a Date object representing the current IST time
  // We use a simplified approach: compare against the epoch in IST
  const nowIST = new Date(`${istParts.year}-${String(istParts.month).padStart(2,'0')}-${String(istParts.day).padStart(2,'0')}T${String(istParts.hour).padStart(2,'0')}:00:00+05:30`);
  const diffMs = nowIST.getTime() - COLORFLE_EPOCH_IST.getTime();
  return Math.floor(diffMs / 86400000);
}

// Compute the answer for a given mode and date string
// The game uses seed format: "{mode} {day} {month} {year}"
// where month is 0-indexed (Jan=0, Feb=1, ..., Dec=11)
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

// Get the next puzzle date in IST (5PM boundary)
// If it's before 5PM IST, the next puzzle is today at 5PM
// If it's after 5PM IST, the next puzzle is tomorrow at 5PM
function getNextPuzzleDateIST(date: Date): { day: number; month: number; year: number } {
  const istParts = getISTDateParts(date);
  let day = istParts.day;
  let month = istParts.month - 1; // Convert to 0-indexed for the seed
  let year = istParts.year;

  // If past 5PM IST, the "next puzzle" is for tomorrow
  if (istParts.hour >= 17) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextParts = getISTDateParts(nextDate);
    day = nextParts.day;
    month = nextParts.month - 1;
    year = nextParts.year;
  }

  return { day, month, year };
}

export function getColorfleAnswer(date: Date): ColorfleAnswer {
  const dayNumber = getColorfleDayNumber(date);
  const nextPuzzle = getNextPuzzleDateIST(date);

  // Seed format exactly matching the game: "{mode} {day} {month} {year}"
  // Note: month is 0-indexed (the game uses getMonth() which is 0-indexed)
  const dateStr = `${nextPuzzle.day} ${nextPuzzle.month} ${nextPuzzle.year}`;

  // Normal mode: 3 blocks, seed mode = 0
  const normal = computeAnswer(0, dateStr, 3);
  // Hard mode: 4 blocks, seed mode = 1
  const hard = computeAnswer(1, dateStr, 4);

  const normalNames = normal.map(c => COLORFLE_COLOR_NAMES[c] || c);
  const hardNames = hard.map(c => COLORFLE_COLOR_NAMES[c] || c);

  return { normal, hard, normalNames, hardNames, dayNumber };
}
