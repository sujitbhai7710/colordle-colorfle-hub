<script lang="ts">
  interface Props {
    color: string;
    hex?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    rounded?: boolean;
    animated?: boolean;
    showInfo?: boolean;
  }

  let {
    color,
    hex = '',
    size = 'md',
    rounded = false,
    animated = true,
    showInfo = true,
  }: Props = $props();

  let visible = $state(false);

  const sizeMap = {
    sm: 80,
    md: 140,
    lg: 200,
    xl: 260,
  };

  $effect(() => {
    if (animated) {
      const timer = setTimeout(() => { visible = true; }, 600);
      return () => clearTimeout(timer);
    } else {
      visible = true;
    }
  });
</script>

<div class="swatch-container" class:visible>
  <div
    class="swatch"
    class:rounded
    style="width: {sizeMap[size]}px; height: {sizeMap[size]}px; background: {hex || color}; --swatch-color: {hex || color};"
  >
    <div class="swatch-reflection"></div>
    <div class="swatch-shine"></div>
  </div>
  {#if showInfo && visible}
    <div class="swatch-info">
      <span class="color-name">{color}</span>
      {#if hex}
        <span class="color-hex">{hex}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .swatch-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    opacity: 0;
    transform: scale(0.85);
    transition:
      opacity 0.7s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)),
      transform 0.7s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
  }

  .swatch-container.visible {
    opacity: 1;
    transform: scale(1);
  }

  .swatch {
    position: relative;
    border-radius: 20px;
    overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08) inset,
      0 24px 48px -12px rgba(0, 0, 0, 0.5),
      0 0 60px color-mix(in srgb, var(--swatch-color) 25%, transparent);
    transition:
      transform 0.4s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)),
      box-shadow 0.4s ease;
    cursor: pointer;
  }

  .swatch:hover {
    transform: scale(1.04) translateY(-4px);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.12) inset,
      0 32px 64px -16px rgba(0, 0, 0, 0.6),
      0 0 80px color-mix(in srgb, var(--swatch-color) 35%, transparent);
  }

  .swatch.rounded {
    border-radius: 50%;
  }

  /* ── Top reflection ── */
  .swatch-reflection {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      170deg,
      rgba(255, 255, 255, 0.22) 0%,
      rgba(255, 255, 255, 0.06) 30%,
      transparent 50%
    );
    pointer-events: none;
  }

  /* ── Animated shine sweep ── */
  .swatch-shine {
    position: absolute;
    top: -100%;
    left: -100%;
    width: 300%;
    height: 300%;
    background: linear-gradient(
      45deg,
      transparent 40%,
      rgba(255, 255, 255, 0.06) 45%,
      rgba(255, 255, 255, 0.12) 50%,
      rgba(255, 255, 255, 0.06) 55%,
      transparent 60%
    );
    animation: shine 4s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes shine {
    0%, 100% { transform: translateX(-40%) translateY(-40%) rotate(45deg); }
    50% { transform: translateX(40%) translateY(40%) rotate(45deg); }
  }

  /* ── Info ── */
  .swatch-info {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 6px;
    animation: fadeInUp 0.5s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
  }

  .color-name {
    font-size: 1.4rem;
    font-weight: 800;
    text-transform: capitalize;
    color: var(--text-primary, #F1F5F9);
    letter-spacing: -0.01em;
  }

  .color-hex {
    font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
    font-size: 0.92rem;
    font-weight: 500;
    color: var(--text-secondary, #94A3B8);
    letter-spacing: 0.02em;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
