// Colordle answer algorithm - verified against colordleanswer.today

const COLORDLE_START_DATE = new Date('2022-03-26T00:00:00Z');

interface ColorsData { colors: string[] }
interface PoolData { colors: string[]; blocklist: string[] }

export function getColordleDayNumber(date: Date): number {
  const diff = date.getTime() - COLORDLE_START_DATE.getTime();
  return Math.floor(diff / 86400000) + 1;
}

function sx(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '').trim();
}

function fx(name: string): Set<string> {
  const a = name.toLowerCase().replace(/[\s\-_]+/g, '');
  const ngrams = new Set<string>();
  for (let i = 0; i + 4 <= a.length; i++) {
    ngrams.add(a.slice(i, i + 4));
  }
  return ngrams;
}

function ux(idx: number, colorList: string[]): string {
  const sorted = [...new Set(colorList)].sort((a, b) => sx(a).localeCompare(sx(b)));
  let n = (9973 * idx + 42) >>> 0;
  n = (n + 1831565813) >>> 0;
  let e = n;
  e = Math.imul(e ^ (e >>> 15), 1 | e) >>> 0;
  e = (e ^ (e + Math.imul(e ^ (e >>> 7), 61 | e))) >>> 0;
  e = (e ^ (e >>> 14)) >>> 0;
  const r = e / 4294967296;
  return sorted[Math.floor(r * sorted.length)];
}

function bx(idx: number, poolColors: string[], blocklist: string[], prevNormalized: string[], prevColors: string[]): string | null {
  const blockSet = new Set(blocklist.map(sx));
  const available = poolColors.filter(c => !blockSet.has(sx(c)));
  if (available.length === 0) return null;

  const prevSet = new Set(prevNormalized);
  let candidates = available.filter(c => !prevSet.has(sx(c)));
  if (candidates.length === 0) {
    const recentSet = new Set(prevNormalized.slice(-60));
    candidates = available.filter(c => !recentSet.has(sx(c)));
    if (candidates.length === 0) candidates = [...available];
  }

  if (prevColors.length > 0) {
    const gramSet = new Set<string>();
    for (const c of prevColors.slice(-3)) {
      for (const g of fx(c)) gramSet.add(g);
    }
    if (gramSet.size > 0) {
      const filtered = candidates.filter(c => {
        for (const g of fx(c)) { if (gramSet.has(g)) return false; }
        return true;
      });
      if (filtered.length > 0) candidates = filtered;
    }
  }

  return ux(idx, candidates);
}

export function getColordleAnswer(dayNumber: number, allColors: string[], poolColors: string[], blocklist: string[]): string | null {
  const dayIndex = dayNumber - 500;
  if (dayIndex < 0) return null;
  const result: string[] = [];
  for (let r = 0; r <= dayIndex; r++) {
    if (r < allColors.length) {
      result.push(allColors[r]);
    } else {
      const prevNormalized = result.map(sx);
      const color = bx(r, poolColors, blocklist, prevNormalized, result);
      if (!color) return null;
      result.push(color);
    }
  }
  return result[dayIndex];
}

export async function fetchColordleData(): Promise<{ allColors: string[]; poolColors: string[]; blocklist: string[] }> {
  const [colorsRes, poolRes] = await Promise.all([
    fetch('https://colordle.ryantanen.com/colors.json'),
    fetch('https://colordle.ryantanen.com/color-pool.json'),
  ]);
  const colorsData: ColorsData = await colorsRes.json();
  const poolData: PoolData = await poolRes.json();
  return {
    allColors: colorsData.colors,
    poolColors: poolData.colors,
    blocklist: poolData.blocklist,
  };
}
