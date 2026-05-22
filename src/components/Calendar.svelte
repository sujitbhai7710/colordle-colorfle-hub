<script lang="ts">
  interface DayAnswer {
    date: string;
    day_number?: number;
    color_name?: string;
    color_hex?: string;
    normal_answer?: string;
    hard_answer?: string;
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

  $effect(() => {
    loadMonthData();
  });
</script>

<div class="archive-wrapper">
  <!-- Calendar -->
  <div class="calendar glass-card">
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
      <div class="answer-panel glass-card" key={selectedDate}>
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

              <div class="answer-mode">
                <span class="mode-label">Normal</span>
                <div class="answer-blocks-row">
                  {#each normalColors as color, i}
                    <div
                      class="answer-block"
                      style="background: {color}; --block-color: {color};"
                    >
                      <div class="block-reflection"></div>
                    </div>
                  {/each}
                </div>
                <span class="mode-hex-row">
                  {#each normalColors as color, i}
                    <span class="hex-label">{COLOR_NAMES[color] || color}</span>
                  {/each}
                </span>
              </div>

              {#if hardColors.length > 0}
                <div class="answer-mode">
                  <span class="mode-label">Hard</span>
                  <div class="answer-blocks-row">
                    {#each hardColors as color, i}
                      <div
                        class="answer-block"
                        style="background: {color}; --block-color: {color};"
                      >
                        <div class="block-reflection"></div>
                      </div>
                    {/each}
                  </div>
                  <span class="mode-hex-row">
                    {#each hardColors as color, i}
                      <span class="hex-label">{COLOR_NAMES[color] || color}</span>
                    {/each}
                  </span>
                </div>
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
      <div class="answer-panel hint-panel glass-card">
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
  }

  .calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .month-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-primary, #F1F5F9);
    letter-spacing: -0.01em;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: 1px solid var(--glass-border, rgba(255,255,255,0.06));
    background: transparent;
    color: var(--text-secondary, #94A3B8);
    cursor: pointer;
    transition:
      border-color var(--duration-fast, 150ms) ease,
      color var(--duration-fast, 150ms) ease,
      background var(--duration-fast, 150ms) ease;
  }

  .nav-btn:hover {
    border-color: var(--accent-color, #8B5CF6);
    color: var(--accent-light, #A78BFA);
    background: rgba(139, 92, 246, 0.08);
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
    color: var(--text-muted, #64748B);
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
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-primary, #F1F5F9);
    cursor: pointer;
    transition:
      background var(--duration-fast, 150ms) ease,
      border-color var(--duration-fast, 150ms) ease,
      transform var(--duration-fast, 150ms) ease;
    position: relative;
  }

  .day-cell:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.25);
    transform: scale(1.05);
  }

  .day-cell.other-month {
    opacity: 0.25;
    cursor: default;
  }

  .day-cell.today {
    border-color: var(--accent-color, #8B5CF6);
    background: rgba(139, 92, 246, 0.12);
  }

  .day-cell.today .day-number {
    font-weight: 700;
  }

  .day-cell.future,
  .day-cell.before {
    opacity: 0.2;
    cursor: default;
  }

  .day-cell.selected {
    background: var(--accent-gradient, linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899));
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
    box-shadow: 0 0 6px var(--swatch-color, transparent);
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
    color: var(--text-secondary, #94A3B8);
    font-weight: 500;
  }

  .answer-day {
    font-size: 0.82rem;
    color: var(--accent-light, #A78BFA);
    font-weight: 700;
    padding: 4px 12px;
    background: var(--accent-gradient-subtle, linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15), rgba(236,72,153,0.15)));
    border-radius: var(--radius-full, 9999px);
    border: 1px solid rgba(139, 92, 246, 0.15);
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
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08) inset,
      0 16px 32px -8px rgba(0, 0, 0, 0.4),
      0 0 40px color-mix(in srgb, var(--swatch-color) 25%, transparent);
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
    font-size: 1.4rem;
    font-weight: 800;
    text-transform: capitalize;
    margin-bottom: 4px;
    letter-spacing: -0.01em;
  }

  .answer-hex {
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
    font-size: 0.85rem;
    color: var(--text-secondary, #94A3B8);
    font-weight: 500;
  }

  /* ── Colorfle Answer ── */
  .answer-mode {
    margin-bottom: 20px;
  }

  .answer-mode:last-child {
    margin-bottom: 0;
  }

  .mode-label {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-muted, #64748B);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 12px;
    padding: 4px 12px;
    background: rgba(255,255,255,0.04);
    border-radius: var(--radius-full, 9999px);
  }

  .answer-blocks-row {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 8px;
  }

  .answer-block {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    position: relative;
    overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08) inset,
      0 8px 20px -6px rgba(0, 0, 0, 0.4),
      0 0 30px color-mix(in srgb, var(--block-color) 20%, transparent);
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
  }

  .mode-hex-row {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .hex-label {
    width: 56px;
    text-align: center;
    font-size: 0.65rem;
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-muted, #64748B);
    font-weight: 500;
  }

  /* ── States ── */
  .loading-state {
    text-align: center;
    color: var(--text-secondary, #94A3B8);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--glass-border, rgba(255,255,255,0.06));
    border-top-color: var(--accent-color, #8B5CF6);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .no-answer {
    text-align: center;
    color: var(--text-muted, #64748B);
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
    background: rgba(239, 68, 68, 0.1);
    color: var(--error, #EF4444);
  }

  .hint-panel {
    text-align: center;
    flex-direction: column;
    gap: 16px;
  }

  .hint-icon {
    color: var(--text-muted, #64748B);
  }

  .hint-text {
    color: var(--text-secondary, #94A3B8);
    font-size: 0.95rem;
    font-weight: 500;
  }

  .hint-sub {
    color: var(--text-muted, #64748B);
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

    .answer-block {
      width: 48px;
      height: 48px;
    }

    .hex-label {
      width: 48px;
    }
  }
</style>
