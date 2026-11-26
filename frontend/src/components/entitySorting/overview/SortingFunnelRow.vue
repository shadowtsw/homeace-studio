<template>
  <div class="funnel-row" :class="`funnel-row--${kind}`">
    <span class="funnel-row__label">
      <b v-if="kind === 'keep'">{{ label }}</b>
      <template v-else>{{ label }}</template>
      <slot />
    </span>
    <span class="funnel-row__count">{{ kind === "minus" ? `−${count}` : count }}</span>
    <span
      class="funnel-row__bar"
      :style="{ width: `${Math.max(2, (100 * count) / Math.max(1, max))}%` }"
    />
  </div>
</template>

<script setup lang="ts">
/** One line of the funnel in step 1: what is taken away, and what is left. */
defineProps<{
  label: string;
  count: number;
  max: number;
  kind: "total" | "minus" | "keep";
}>();
</script>

<style scoped>
.funnel-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px minmax(70px, 34%);
  align-items: center;
  gap: 12px;
  font-size: 13.5px;
}

.funnel-row__label {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.funnel-row__count {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.funnel-row__bar {
  height: 9px;
  border-radius: 5px;
  background: var(--line-strong);
}

.funnel-row--minus {
  color: var(--muted);
}

.funnel-row--minus .funnel-row__count {
  font-weight: 600;
}

.funnel-row--minus .funnel-row__bar {
  background: var(--line);
}

.funnel-row--total .funnel-row__bar {
  background: var(--fg);
  opacity: 0.75;
}

.funnel-row--keep .funnel-row__bar {
  background: var(--accent);
}
</style>
