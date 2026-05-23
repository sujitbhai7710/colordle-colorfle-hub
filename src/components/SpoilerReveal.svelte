<script lang="ts">
  interface Props {
    revealed?: boolean;
  }

  let { revealed = false }: Props = $props();

  function handleReveal() {
    if (!revealed) revealed = true;
  }
</script>

<div class="spoiler-wrapper" class:revealed>
  {#if !revealed}
    <button class="spoiler-overlay" onclick={handleReveal} aria-label="Click to reveal answer">
      <div class="spoiler-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
      <span class="spoiler-text">Click to Reveal</span>
    </button>
  {/if}
  <div class="spoiler-content" class:blurred={!revealed}>
    {@render children()}
  </div>
</div>

<style>
  .spoiler-wrapper {
    position: relative;
  }

  .spoiler-content {
    transition: filter 0.6s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
  }

  .spoiler-content.blurred {
    filter: blur(20px) saturate(0.3);
    user-select: none;
    pointer-events: none;
  }

  .spoiler-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: rgba(11, 13, 23, 0.4);
    border: 1px solid var(--glass-border, rgba(255,255,255,0.06));
    border-radius: var(--radius-xl, 24px);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    cursor: pointer;
    font-family: inherit;
    transition:
      background var(--duration-normal, 250ms) ease,
      border-color var(--duration-normal, 250ms) ease,
      transform var(--duration-normal, 250ms) cubic-bezier(0.16, 1, 0.3, 1);
  }

  .spoiler-overlay:hover {
    background: rgba(11, 13, 23, 0.5);
    border-color: var(--accent-color, #8B5CF6);
    transform: scale(1.01);
  }

  .spoiler-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-gradient-subtle, linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15), rgba(236,72,153,0.15)));
    border: 1px solid rgba(139, 92, 246, 0.2);
    color: var(--accent-light, #A78BFA);
    transition: transform var(--duration-normal, 250ms) cubic-bezier(0.16, 1, 0.3, 1);
  }

  .spoiler-overlay:hover .spoiler-icon {
    transform: scale(1.1);
  }

  .spoiler-text {
    color: var(--text-secondary, #94A3B8);
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
</style>
