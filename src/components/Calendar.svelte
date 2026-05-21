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

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  async function selectDate(y: number, m: number, d: number) {
    const dateStr = formatDate(y, m, d);
    if (isFuture(y, m, d) || isBeforeStart(y, m, d)) return;
    selectedDate = dateStr;
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
  }

  let calendarDays = $derived.by(() => {
    const days: { day: number; month: number; year: number }[] = [];
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1);

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, month: currentMonth - 1, year: currentMonth === 0 ? currentYear - 1 : currentYear });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month: currentMonth, year: currentYear });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: currentMonth + 1, year: currentMonth === 11 ? currentYear + 1 : currentYear });
    }
    return days;
  });
</script>

<div class="calendar-wrapper">
  <div class="calendar glass-card">
    <div class="calendar-header">
      <button class="nav-btn" onclick={prevMonth} aria-label="Previous month">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <h3 class="month-title">{monthNames[currentMonth]} {currentYear}</h3>
      <button class="nav-btn" onclick={nextMonth} aria-label="Next month">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
    <div class="calendar-grid">
      {#each dayNames as day}
        <div class="day-name">{day}</div>
      {/each}
      {#each calendarDays as d}
        {@const dateStr = formatDate(d.year, d.month, d.day)}
        {@const isCurrentMonth = d.month === currentMonth}
        {@const today = isToday(d.year, d.month, d.day)}
        {@const future = isFuture(d.year, d.month, d.day)}
        {@const before = isBeforeStart(d.year, d.month, d.day)}
        {@const selected = selectedDate === dateStr}
        {@const hasAnswer = answers[dateStr]}
        <button
          class="day-cell"
          class:other-month={!isCurrentMonth}
          class:today
          class:future
          class:before
          class:selected
          class:has-answer={hasAnswer}
          onclick={() => isCurrentMonth && !future && !before && selectDate(d.year, d.month, d.day)}
          disabled={!isCurrentMonth || future || before}
        >
          {d.day}
        </button>
      {/each}
    </div>
  </div>

  {#if selectedDate}
    <div class="answer-panel glass-card">
      {#if loading}
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading answer...</p>
        </div>
      {:else if selectedAnswer}
        {#if game === 'colordle'}
          <div class="answer-content">
            <p class="answer-date">{selectedDate}</p>
            <p class="answer-day">Day #{selectedAnswer.day_number}</p>
            <div class="answer-color-display" style="background: {selectedAnswer.color_hex || '#888'}">
              <span class="answer-color-name">{selectedAnswer.color_name}</span>
            </div>
            <p class="answer-hex">{selectedAnswer.color_hex}</p>
          </div>
        {:else}
          <div class="answer-content">
            <p class="answer-date">{selectedDate}</p>
            <p class="answer-day">Day #{selectedAnswer.day_number}</p>
            <div class="answer-label">Normal Mode</div>
            <div class="answer-colors-row">
              {#each (JSON.parse(selectedAnswer.normal_answer || '[]') as string[]) as color, i}
                <div class="answer-block" style="background: {color}"></div>
              {/each}
            </div>
            <div class="answer-label">Hard Mode</div>
            <div class="answer-colors-row">
              {#each (JSON.parse(selectedAnswer.hard_answer || '[]') as string[]) as color, i}
                <div class="answer-block" style="background: {color}"></div>
              {/each}
            </div>
          </div>
        {/if}
      {:else}
        <div class="no-answer">
          <p>No answer available for this date</p>
        </div>
      {/if}
    </div>
  {:else}
    <div class="answer-panel glass-card hint-panel">
      <div class="hint-icon">📅</div>
      <p>Click any date on the calendar to view the answer</p>
    </div>
  {/if}
</div>

<style>
  .calendar-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    align-items: start;
  }

  .calendar {
    padding: 24px;
  }

  .calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .month-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .nav-btn:hover {
    border-color: var(--accent-color);
    color: var(--accent-light);
    background: rgba(139, 92, 246, 0.08);
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  .day-name {
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    padding: 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .day-cell {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-primary);
    font-size: 0.88rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .day-cell:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.12);
    border-color: rgba(139, 92, 246, 0.3);
  }

  .day-cell.other-month {
    color: var(--text-muted);
    opacity: 0.4;
  }

  .day-cell.today {
    border-color: var(--accent-color);
    background: rgba(139, 92, 246, 0.15);
    font-weight: 700;
  }

  .day-cell.future,
  .day-cell.before {
    opacity: 0.3;
    cursor: default;
  }

  .day-cell.selected {
    background: var(--accent-gradient);
    color: white;
    border-color: transparent;
    font-weight: 700;
  }

  .answer-panel {
    padding: 32px;
    min-height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .answer-content {
    text-align: center;
    width: 100%;
  }

  .answer-date {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  .answer-day {
    font-size: 0.85rem;
    color: var(--accent-light);
    font-weight: 600;
    margin-bottom: 20px;
  }

  .answer-color-display {
    width: 120px;
    height: 120px;
    border-radius: 20px;
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
    position: relative;
  }

  .answer-color-name {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: capitalize;
    text-shadow: 0 1px 4px rgba(0,0,0,0.5);
    color: white;
    padding: 4px 8px;
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
  }

  .answer-hex {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .answer-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    margin-top: 16px;
  }

  .answer-colors-row {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-bottom: 8px;
  }

  .answer-block {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .loading {
    text-align: center;
    color: var(--text-secondary);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color);
    border-top-color: var(--accent-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 12px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .hint-panel {
    text-align: center;
    color: var(--text-muted);
  }

  .hint-icon {
    font-size: 2.5rem;
    margin-bottom: 12px;
  }

  .no-answer {
    text-align: center;
    color: var(--text-muted);
  }

  @media (max-width: 768px) {
    .calendar-wrapper {
      grid-template-columns: 1fr;
    }
  }
</style>
