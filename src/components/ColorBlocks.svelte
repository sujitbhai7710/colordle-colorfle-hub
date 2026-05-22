<script lang="ts">
  interface Props {
    colors: string[];
    names?: string[];
    size?: 'sm' | 'md' | 'lg' | 'xl';
    animated?: boolean;
    showLabels?: boolean;
    showBlend?: boolean;
    blendWeights?: number[];
  }

  let {
    colors,
    names = [],
    size = 'md',
    animated = true,
    showLabels = true,
    showBlend = false,
    blendWeights = [],
  }: Props = $props();

  let visible = $state(false);

  const sizeMap = {
    sm: 40,
    md: 64,
    lg: 88,
    xl: 110,
  };

  const fontMap = {
    sm: '0.6rem',
    md: '0.72rem',
    lg: '0.82rem',
    xl: '0.92rem',
  };

  function blendColors(cols: string[], weights: number[]): string {
    if (!cols.length) return '#888';
    const w = weights.length === cols.length ? weights : cols.map(() => 1 / cols.length);
    const totalWeight = w.reduce((a: number, b: number) => a + b, 0);
    let r = 0, g = 0, b = 0;
    cols.forEach((c, i) => {
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

  let blendedColor = $derived(
    showBlend && colors.length > 0
      ? blendColors(colors, blendWeights)
      : ''
  );

  $effect(() => {
    if (animated) {
      const timer = setTimeout(() => { visible = true; }, 500);
      return () => clearTimeout(timer);
    } else {
      visible = true;
    }
  });
</script>

<div class="blocks-container" class:visible>
  <div class="blocks-row">
    {#each colors as color, i}
      <div class="block-wrapper" style="animation-delay: {i * 0.1}s;">
        <div
          class="color-block"
          style="width: {sizeMap[size]}px; height: {sizeMap[size]}px; background: {color}; --block-color: {color};"
        >
          <div class="block-reflection"></div>
        </div>
        {#if showLabels}
          <span class="block-label" style="font-size: {fontMap[size]}">
            {names[i] || color}
          </span>
        {/if}
        {#if i < colors.length - 1}
          <span class="block-plus">+</span>
        {/if}
      </div>
    {/each}
  </div>

  {#if showBlend && blendedColor}
    <div class="blend-preview">
      <div class="blend-divider"></div>
      <div class="blend-result">
        <div
          class="blend-swatch"
          style="background: {blendedColor}; --blend-color: {blendedColor};"
        >
          <div class="block-reflection"></div>
        </div>
        <span class="blend-label">Mixed Result</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .blocks-container {
    opacity: 0;
    transform: translateY(16px);
    transition:
      opacity 0.6s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)),
      transform 0.6s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1));
  }

  .blocks-container.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .blocks-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .block-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    animation: popIn 0.5s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
  }

  .color-block {
    border-radius: 16px;
    position: relative;
    overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08) inset,
      0 12px 28px -8px rgba(0, 0, 0, 0.4),
      0 0 40px color-mix(in srgb, var(--block-color) 20%, transparent);
    transition:
      transform 0.3s var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)),
      box-shadow 0.3s ease;
    cursor: pointer;
  }

  .color-block:hover {
    transform: scale(1.08) translateY(-3px);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.12) inset,
      0 20px 40px -12px rgba(0, 0, 0, 0.5),
      0 0 60px color-mix(in srgb, var(--block-color) 30%, transparent);
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

  .block-label {
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
    font-weight: 600;
    color: var(--text-secondary, #94A3B8);
    letter-spacing: 0.01em;
    text-transform: capitalize;
  }

  .block-plus {
    align-self: center;
    margin-top: -20px;
    color: var(--text-muted, #64748B);
    font-size: 1.3rem;
    font-weight: 300;
  }

  /* ── Blend Preview ── */
  .blend-preview {
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .blend-divider {
    width: 40px;
    height: 1px;
    background: var(--border-color, rgba(255, 255, 255, 0.06));
  }

  .blend-result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .blend-swatch {
    width: 72px;
    height: 72px;
    border-radius: 14px;
    position: relative;
    overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08) inset,
      0 8px 20px -6px rgba(0, 0, 0, 0.4),
      0 0 40px color-mix(in srgb, var(--blend-color) 25%, transparent);
  }

  .blend-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-muted, #64748B);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* ── Animations ── */
  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.7) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
