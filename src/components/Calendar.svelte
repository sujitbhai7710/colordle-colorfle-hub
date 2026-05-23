<script lang="ts">
  interface DayAnswer {
    date: string;
    day_number?: number;
    color_name?: string;
    color_hex?: string;
    normal_answer?: string;
    hard_answer?: string;
    normal_names?: string;
    hard_names?: string;
  }

  interface Props {
    game: 'colordle' | 'colorfle';
  }

  let { game }: Props = $props();

  let currentMonth = $state(new Date().getMonth());
  let currentYear = $state(new Date().getFullYear());
  let selectedDate = $state<string | null>(null);
  let selectedAnswer = $state<DayAnswer | null>(null);
  let loading = $state(false);
  let answers = $state<Record<string, DayAnswer>>({});
  let monthData = $state<DayAnswer[]>([]);
  let monthLoading = $state(false);
  let archiveMode = $state<'normal' | 'hard'>('normal');

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const COLOR_NAMES: Record<string, string> = {
    '#FFFFFF': 'White', '#FFFAC8': 'Lemon', '#FABEBE': 'Pink',
    '#AAFFC3': 'Mint', '#E6BEFF': 'Lavender', '#46F0F0': 'Cyan',
    '#FFE119': 'Yellow', '#BCF60C': 'Lime', '#F58231': 'Orange',
    '#3CB44B': 'Green', '#F032E6': 'Magenta', '#808000': 'Olive',
    '#008080': 'Teal', '#9A6324': 'Brown', '#E6194B': 'Red',
    '#4363D8': 'Blue', '#911EB4': 'Purple', '#800000': 'Maroon',
    '#000075': 'Navy', '#000000': 'Black',
  };

  const NORMAL_WEIGHTS = [50, 34, 16];
  const HARD_WEIGHTS = [40, 30, 20, 10];

  function blendColors(colors: string[], weights: number[]): string {
    if (!colors.length) return '#888';
    const w = weights.length === colors.length ? weights : colors.map(() => 1 / colors.length);
    const totalWeight = w.reduce((a, b) => a + b, 0);
    let r = 0, g = 0, b = 0;
    colors.forEach((c, i) => {
      const hex = c.replace('#', '');
      const cr = parseInt(hex.substring(0, 2), 16);
      const cg = parseInt(hex.substring(2, 4), 16);
      const cb = parseInt(hex.substring(4, 6), 16);
      const wt = w[i] / totalWeight;
      r += cr * wt;
      g += cg * wt;
      b += cb * wt;
    });
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
  }

  function formatDate(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function isToday(y: number, m: number, d: number): boolean {
    const t = new Date();
    return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
  }

  function isFuture(y: number, m: number, d: number): boolean {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return new Date(y, m, d) > t;
  }

  function isBeforeStart(y: number, m: number, d: number): boolean {
    const start = game === 'colordle' ? new Date('2022-03-26') : new Date('2022-04-25');
    return new Date(y, m, d) < start;
  }

  async function loadMonthData() {
    monthLoading = true;
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const from = formatDate(currentYear, currentMonth, 1);
    const to = formatDate(currentYear, currentMonth, daysInMonth);

    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/api/${game}/range?from=${from}&to=${to}`);
      if (res.ok) {
        const data: DayAnswer[] = await res.json();
        monthData = data;
        data.forEach(item => {
          answers[item.date] = item;
        });
      }
    } catch (e) {
      console.error(e);
    }
    monthLoading = false;
  }

  async function selectDate(y: number, m: number, d: number) {
    const dateStr = formatDate(y, m, d);
    if (isFuture(y, m, d) || isBeforeStart(y, m, d)) return;

    if (selectedDate === dateStr) {
      selectedDate = null;
      selectedAnswer = null;
      return;
    }

    selectedDate = dateStr;

    if (answers[dateStr]) {
      selectedAnswer = answers[dateStr];
      return;
    }

    loading = true;
    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/api/${game}/date/${dateStr}`);
      if (res.ok) {
        selectedAnswer = await res.json();
        answers[dateStr] = selectedAnswer!;
      }
    } catch (e) {
      console.error(e);
    }
    loading = false;
  }

  function prevMonth() {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
    selectedDate = null;
    selectedAnswer = null;
    loadMonthData();
  }

  function nextMonth() {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
    selectedDate = null;
    selectedAnswer = null;
    loadMonthData();
  }

  let calendarDays = $derived.by(() => {
    const days: { day: number; month: number; year: number }[] = [];
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const prevMonthDays = getDaysInMonth(
      currentMonth === 0 ? currentYear - 1 : currentYear,
      currentMonth === 0 ? 11 : currentMonth - 1
    );

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: currentMonth === 0 ? 11 : currentMonth - 1,
        year: currentMonth === 0 ? currentYear - 1 : currentYear,
      });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month: currentMonth, year: currentYear });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: currentMonth === 11 ? 0 : currentMonth + 1,
        year: currentMonth === 11 ? currentYear + 1 : currentYear,
      });
    }
    return days;
  });

  function getAnswerForDate(dateStr: string): DayAnswer | undefined {
    return answers[dateStr];
  }

  let normalColors = $derived(
    game === 'colorfle' && selectedAnswer?.normal_answer
      ? JSON.parse(selectedAnswer.normal_answer)
      : []
  );

  let hardColors = $derived(
    game === 'colorfle' && selectedAnswer?.hard_answer
      ? JSON.parse(selectedAnswer.hard_answer)
      : []
  );

  let normalNames = $derived(
    game === 'colorfle' && selectedAnswer?.normal_names
      ? JSON.parse(selectedAnswer.normal_names)
      : []
  );

  let hardNames = $derived(
    game === 'colorfle' && selectedAnswer?.hard_names
      ? JSON.parse(selectedAnswer.hard_names)
      : []
  );

  let currentColors = $derived(
    archiveMode === 'normal' ? normalColors : hardColors
  );

  let currentNames = $derived(
    archiveMode === 'normal' ? normalNames : hardNames
  );

  let currentWeights = $derived(
    archiveMode === 'normal' ? NORMAL_WEIGHTS : HARD_WEIGHTS
  );

  let currentBlended = $derived(
    currentColors.length > 0 ? blendColors(currentColors, currentWeights) : ''
  );

  $effect(() => {
    loadMonthData();
  });
</script>

<div class="archive-wrapper">
  <!-- Calendar -->
  <div class="calendar card">
    <div class="calendar-header">
      <button class="nav-btn" onclick={prevMonth} aria-label="Previous month">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="month-selector">
        <h3 class="month-title">{monthNames[currentMonth]} {currentYear}</h3>
      </div>
      <button class="nav-btn" onclick={nextMonth} aria-label="Next month">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>

    <div class="calendar-grid">
      {#each dayNames as day}
        <div class="day-name">{day}</div>
      {/each}
      {#each calendarDays as d}
        {@const dateStr = formatDate(d.year, d.month, d.day)}
        {@const isCurrentMonth = d.month === currentMonth && d.year === currentYear}
        {@const today = isToday(d.year, d.month, d.day)}
        {@const future = isFuture(d.year, d.month, d.day)}
        {@const before = isBeforeStart(d.year, d.month, d.day)}
        {@const selected = selectedDate === dateStr}
        {@const answer = getAnswerForDate(dateStr)}
        <button
          class="day-cell"
          class:other-month={!isCurrentMonth}
          class:today
          class:future
          class:before
          class:selected
          onclick={() => isCurrentMonth && !future && !before && selectDate(d.year, d.month, d.day)}
          disabled={!isCurrentMonth || future || before}
          aria-label="{monthNames[d.month]} {d.day}, {d.year}"
        >
          <span class="day-number">{d.day}</span>
          {#if answer && isCurrentMonth}
            <span class="day-indicator" style="background: {game === 'colordle' ? (answer.color_hex || '#888') : (JSON.parse(answer.normal_answer || '[]')[0] || '#888')};"></span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- Inline Answer Panel -->
  <div class="answer-section">
    {#if selectedDate}
      <div class="answer-panel card" key={selectedDate}>
        {#if loading}
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading answer...</p>
          </div>
        {:else if selectedAnswer}
          {#if game === 'colordle'}
            <div class="answer-content colordle-answer">
              <div class="answer-meta">
                <span class="answer-date">{selectedDate}</span>
                <span class="answer-day">Day #{selectedAnswer.day_number}</span>
              </div>
              <div class="answer-swatch-row">
                <div
                  class="answer-swatch"
                  style="background: {selectedAnswer.color_hex || '#888'}; --swatch-color: {selectedAnswer.color_hex || '#888'};"
                >
                  <div class="swatch-reflection"></div>
                </div>
                <div class="answer-details">
                  <h4 class="answer-color-name">{selectedAnswer.color_name}</h4>
                  <span class="answer-hex">{selectedAnswer.color_hex}</span>
                </div>
              </div>
            </div>
          {:else}
            <div class="answer-content colorfle-answer">
              <div class="answer-meta">
                <span class="answer-date">{selectedDate}</span>
                <span class="answer-day">Day #{selectedAnswer.day_number}</span>
              </div>

              <!-- Mode toggle for colorfle -->
              <div class="answer-mode-toggle">
                <button
                  class="amode-btn"
                  class:active={archiveMode === 'normal'}
                  onclick={() => archiveMode = 'normal'}
                >Normal</button>
                <button
                  class="amode-btn"
                  class:active={archiveMode === 'hard'}
                  onclick={() => archiveMode = 'hard'}
                >Hard</button>
              </div>

              <!-- Color blocks visual -->
              {#if currentColors.length > 0}
                <div class="colorfle-blocks">
                  {#each currentColors as color, i}
                    <div class="colorfle-block-item">
                      <div class="colorfle-block-swatch" style="background: {color};">
                        <div class="block-reflection"></div>
                      </div>
                      <span class="colorfle-block-name">{currentNames[i] || COLOR_NAMES[color] || color}</span>
                      <span class="colorfle-block-weight">{currentWeights[i]}%</span>
                    </div>
                  {/each}
                </div>

                <!-- Blend result -->
                {#if currentBlended}
                  <div class="colorfle-blend">
                    <div class="blend-formula-row">
                      {#each currentColors as color, i}
                        <div class="formula-chip">
                          <span class="chip-dot" style="background: {color};"></span>
                          <span class="chip-name">{currentNames[i] || COLOR_NAMES[color] || color}</span>
                          <span class="chip-pct">{currentWeights[i]}%</span>
                        </div>
                        {#if i < currentColors.length - 1}
                          <span class="formula-plus">+</span>
                        {/if}
                      {/each}
                      <span class="formula-eq">=</span>
                    </div>
                    <div class="blend-result-row">
                      <div class="colorfle-blend-swatch" style="background: {currentBlended};">
                        <div class="block-reflection"></div>
                      </div>
                      <span class="blend-result-label">Mixed Result</span>
                    </div>
                  </div>
                {/if}
              {/if}
            </div>
          {/if}
        {:else}
          <div class="no-answer">
            <div class="no-answer-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <p>No answer available for this date</p>
          </div>
        {/if}
      </div>
    {:else}
      <div class="answer-panel hint-panel card">
        <div class="hint-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <p class="hint-text">Select a date on the calendar to view the answer</p>
        <p class="hint-sub">Dates with answers have a small color indicator</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .archive-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    align-items: start;
  }

  /* ── Calendar ── */
  .calendar {
    padding: 28px;
    background: var(--bg-card, #FFFFFF);
    border: 1px solid var(--border-color, #E2E5EF);
    border-radius: var(--radius-xl, 20px);
    box-shadow: var(--shadow-sm, 0 1px 3px rgba(26, 29, 46, 0.06));
  }

  .calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .month-title {
    font-family: 'Outfit', 'DM Sans', sans-serif;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-primary, #1A1D2E);
    letter-spacing: -0.01em;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: 1px solid var(--border-color, #E2E5EF);
    background: transparent;
    color: var(--text-secondary, #5C6178);
    cursor: pointer;
    transition:
      border-color var(--duration-fast, 150ms) ease,
      color var(--duration-fast, 150ms) ease,
      background var(--duration-fast, 150ms) ease;
  }

  .nav-btn:hover {
    border-color: var(--accent-color, #5B5FE6);
    color: var(--accent-color, #5B5FE6);
    background: var(--accent-gradient-subtle, rgba(91,95,230,0.08));
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  .day-name {
    text-align: center;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-muted, #8B8FA3);
    padding: 8px 0 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .day-cell {
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-primary, #1A1D2E);
    cursor: pointer;
    transition:
      background var(--duration-fast, 150ms) ease,
      border-color var(--duration-fast, 150ms) ease,
      transform var(--duration-fast, 150ms) ease;
    position: relative;
  }

  .day-cell:hover:not(:disabled) {
    background: rgba(91, 95, 230, 0.08);
    border-color: rgba(91, 95, 230, 0.2);
    transform: scale(1.05);
  }

  .day-cell.other-month {
    opacity: 0.25;
    cursor: default;
  }

  .day-cell.today {
    border-color: var(--accent-color, #5B5FE6);
    background: rgba(91, 95, 230, 0.08);
  }

  .day-cell.today .day-number {
    font-weight: 700;
  }

  .day-cell.future,
  .day-cell.before {
    opacity: 0.25;
    cursor: default;
  }

  .day-cell.selected {
    background: var(--accent-gradient, linear-gradient(135deg, #5B5FE6, #7C5CFC, #E2478A));
    color: white;
    border-color: transparent;
    font-weight: 700;
    transform: scale(1.05);
  }

  .day-number {
    font-size: 0.86rem;
    font-weight: 500;
    line-height: 1;
  }

  .day-indicator {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    display: block;
  }

  .day-cell.selected .day-indicator {
    background: white !important;
    box-shadow: 0 0 6px rgba(255,255,255,0.5);
  }

  /* ── Answer Panel ── */
  .answer-section {
    position: sticky;
    top: 92px;
  }

  .answer-panel {
    padding: 32px;
    min-height: 320px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: scaleIn 0.4s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
    background: var(--bg-card, #FFFFFF);
    border: 1px solid var(--border-color, #E2E5EF);
    border-radius: var(--radius-xl, 20px);
    box-shadow: var(--shadow-sm, 0 1px 3px rgba(26, 29, 46, 0.06));
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .answer-content {
    width: 100%;
    text-align: center;
  }

  .answer-meta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 28px;
  }

  .answer-date {
    font-size: 0.88rem;
    color: var(--text-secondary, #5C6178);
    font-weight: 500;
  }

  .answer-day {
    font-size: 0.82rem;
    color: var(--accent-color, #5B5FE6);
    font-weight: 700;
    padding: 4px 12px;
    background: var(--accent-gradient-subtle, rgba(91,95,230,0.08));
    border-radius: var(--radius-full, 9999px);
    border: 1px solid rgba(91, 95, 230, 0.1);
  }

  /* ── Colordle Answer ── */
  .answer-swatch-row {
    display: flex;
    align-items: center;
    gap: 24px;
    justify-content: center;
  }

  .answer-swatch {
    width: 100px;
    height: 100px;
    border-radius: 20px;
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow-md, 0 4px 12px rgba(26, 29, 46, 0.07));
    flex-shrink: 0;
  }

  .swatch-reflection {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      170deg,
      rgba(255, 255, 255, 0.22) 0%,
      rgba(255, 255, 255, 0.04) 35%,
      transparent 50%
    );
    pointer-events: none;
  }

  .answer-details {
    text-align: left;
  }

  .answer-color-name {
    font-family: 'Outfit', 'DM Sans', sans-serif;
    font-size: 1.4rem;
    font-weight: 800;
    text-transform: capitalize;
    margin-bottom: 4px;
    letter-spacing: -0.01em;
    color: var(--text-primary, #1A1D2E);
  }

  .answer-hex {
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
    font-size: 0.85rem;
    color: var(--text-secondary, #5C6178);
    font-weight: 500;
  }

  /* ── Colorfle Answer ── */
  .answer-mode-toggle {
    display: inline-flex;
    gap: 4px;
    background: var(--bg-tertiary, #EEF0F6);
    border-radius: 12px;
    padding: 3px;
    margin-bottom: 20px;
    border: 1px solid var(--border-color, #E2E5EF);
  }

  .amode-btn {
    padding: 7px 20px;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: var(--text-secondary, #5C6178);
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .amode-btn.active {
    background: var(--accent-gradient, linear-gradient(135deg, #5B5FE6, #7C5CFC, #E2478A));
    color: white;
    box-shadow: 0 3px 8px rgba(91, 95, 230, 0.25);
  }

  .amode-btn:not(.active):hover {
    background: var(--bg-secondary, #FFFFFF);
    color: var(--text-primary, #1A1D2E);
  }

  .colorfle-blocks {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .colorfle-block-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .colorfle-block-swatch {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow-sm, 0 1px 3px rgba(26, 29, 46, 0.06));
  }

  .block-reflection {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      170deg,
      rgba(255, 255, 255, 0.2) 0%,
      rgba(255, 255, 255, 0.04) 35%,
      transparent 50%
    );
    pointer-events: none;
    border-radius: inherit;
  }

  .colorfle-block-name {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-primary, #1A1D2E);
    text-transform: capitalize;
  }

  .colorfle-block-weight {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.62rem;
    color: var(--text-muted, #5A6178);
    font-weight: 500;
  }

  /* ── Colorfle Blend ── */
  .colorfle-blend {
    border-top: 1px solid var(--border-color, #E2E5EF);
    padding-top: 18px;
  }

  .blend-formula-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .formula-chip {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .chip-dot {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .chip-name {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-secondary, #5C6178);
    text-transform: capitalize;
  }

  .chip-pct {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.62rem;
    color: var(--text-muted, #5A6178);
  }

  .formula-plus {
    color: var(--text-muted, #5A6178);
    font-size: 0.8rem;
    font-weight: 300;
  }

  .formula-eq {
    color: var(--text-muted, #5A6178);
    font-size: 0.9rem;
    font-weight: 300;
    margin-left: 2px;
  }

  .blend-result-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .colorfle-blend-swatch {
    width: 80px;
    height: 80px;
    border-radius: 18px;
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow-sm, 0 1px 3px rgba(26, 29, 46, 0.06));
  }

  .blend-result-label {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-muted, #5A6178);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ── States ── */
  .loading-state {
    text-align: center;
    color: var(--text-secondary, #5C6178);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color, #E2E5EF);
    border-top-color: var(--accent-color, #5B5FE6);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .no-answer {
    text-align: center;
    color: var(--text-muted, #5A6178);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .no-answer-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(207, 34, 46, 0.08);
    color: var(--error, #CF222E);
  }

  .hint-panel {
    text-align: center;
    flex-direction: column;
    gap: 16px;
  }

  .hint-icon {
    color: var(--text-muted, #5A6178);
  }

  .hint-text {
    color: var(--text-secondary, #5C6178);
    font-size: 0.95rem;
    font-weight: 500;
  }

  .hint-sub {
    color: var(--text-muted, #8B8FA3);
    font-size: 0.82rem;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .archive-wrapper {
      grid-template-columns: 1fr;
    }

    .answer-section {
      position: static;
    }

    .answer-swatch-row {
      flex-direction: column;
      gap: 16px;
    }

    .answer-details {
      text-align: center;
    }

    .colorfle-block-swatch {
      width: 52px;
      height: 52px;
    }
  }
</style>
