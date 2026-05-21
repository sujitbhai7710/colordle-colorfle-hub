<script lang="ts">
  interface Props {
    colors: string[];
    names?: string[];
    size?: 'sm' | 'md' | 'lg';
    animated?: boolean;
  }

  let { colors, names = [], size = 'md', animated = true }: Props = $props();

  let revealed = $state(false);

  const sizeMap = {
    sm: 36,
    md: 52,
    lg: 72,
  };

  $effect(() => {
    if (animated) {
      const timer = setTimeout(() => { revealed = true; }, 600);
      return () => clearTimeout(timer);
    } else {
      revealed = true;
    }
  });
</script>

<div class="blocks-container" class:revealed>
  <div class="blocks-row">
    {#each colors as color, i}
      <div
        class="color-block"
        style="width: {sizeMap[size]}px; height: {sizeMap[size]}px; background: {color}; animation-delay: {i * 0.15}s;"
      >
        {#if names[i]}
          <span class="block-name">{names[i]}</span>
        {/if}
      </div>
      {#if i < colors.length - 1}
        <span class="block-plus">+</span>
      {/if}
    {/each}
  </div>
</div>

<style>
  .blocks-container {
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .blocks-container.revealed {
    opacity: 1;
    transform: translateY(0);
  }

  .blocks-row {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .color-block {
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    position: relative;
    transition: transform 0.2s ease;
    animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
  }

  .color-block:hover {
    transform: scale(1.08);
  }

  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .block-name {
    font-size: 0.65rem;
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 3px rgba(0,0,0,0.5);
    padding: 4px 6px;
    background: rgba(0,0,0,0.25);
    width: 100%;
    text-align: center;
  }

  .block-plus {
    color: var(--text-muted);
    font-size: 1.2rem;
    font-weight: 300;
  }
</style>
