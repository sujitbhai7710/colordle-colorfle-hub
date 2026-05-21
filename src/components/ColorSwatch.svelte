<script lang="ts">
  interface Props {
    color: string;
    hex?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    rounded?: boolean;
    animated?: boolean;
  }

  let { color, hex = '', size = 'md', rounded = false, animated = true }: Props = $props();

  let revealed = $state(false);

  const sizeMap = {
    sm: '60px',
    md: '100px',
    lg: '160px',
    xl: '220px',
  };

  function handleReveal() {
    if (!revealed) revealed = true;
  }

  $effect(() => {
    if (animated) {
      const timer = setTimeout(() => { revealed = true; }, 800);
      return () => clearTimeout(timer);
    } else {
      revealed = true;
    }
  });
</script>

<div class="swatch-container" class:revealed>
  <div
    class="swatch"
    class:rounded
    style="width: {sizeMap[size]}; height: {sizeMap[size]}; background: {hex || color};"
    onclick={handleReveal}
  >
    {#if !revealed}
      <div class="swatch-overlay">
        <span class="reveal-text">Click to Reveal</span>
      </div>
    {/if}
    <div class="swatch-shine"></div>
  </div>
  {#if revealed}
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
    gap: 16px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .swatch-container.revealed {
    opacity: 1;
    transform: translateY(0);
  }

  .swatch {
    position: relative;
    border-radius: 16px;
    cursor: pointer;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .swatch:hover {
    transform: scale(1.03);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
  }

  .swatch.rounded {
    border-radius: 50%;
  }

  .swatch-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    z-index: 2;
    transition: opacity 0.3s ease;
  }

  .reveal-text {
    color: white;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .swatch-shine {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 40%,
      rgba(255, 255, 255, 0.1) 45%,
      rgba(255, 255, 255, 0.2) 50%,
      rgba(255, 255, 255, 0.1) 55%,
      transparent 60%
    );
    animation: shine 3s ease-in-out infinite;
  }

  @keyframes shine {
    0%, 100% { transform: translateX(-100%) translateY(-100%); }
    50% { transform: translateX(100%) translateY(100%); }
  }

  .swatch-info {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .color-name {
    font-size: 1.2rem;
    font-weight: 700;
    text-transform: capitalize;
    color: var(--text-primary);
  }

  .color-hex {
    font-size: 0.85rem;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: var(--text-secondary);
  }
</style>
