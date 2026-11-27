<template>
  <!-- A picture only (the import preview) is no button -->
  <component
    :is="isPicture ? 'div' : 'button'"
    class="theme-card"
    :class="{ 'theme-card--on': isActive, 'theme-card--picture': isPicture }"
    :type="isPicture ? undefined : 'button'"
    :role="isPicture ? undefined : 'radio'"
    :aria-checked="isPicture ? undefined : isActive"
    @click="isPicture || emit('select')"
  >
    <!-- The theme's own colours, drawn small: page, a surface with text, the flow colours, accent -->
    <span class="theme-card__preview" :style="tokens" aria-hidden="true">
      <span class="theme-card__surface">
        <i class="theme-card__text" />
        <i class="theme-card__text theme-card__text--quiet" />
        <span class="theme-card__flow">
          <b class="theme-card__when" />
          <b class="theme-card__if" />
          <b class="theme-card__then" />
        </span>
      </span>
      <span class="theme-card__accent" />
    </span>
    <b class="theme-card__name">{{ name }}</b>
    <small class="theme-card__note">{{ note }}</small>
  </component>
</template>

<script setup lang="ts">
import type { ThemeTokens } from "@/core/themes/themeFormat";

/** One theme as a card: a small picture in its own colours, its name and a short note. */
defineProps<{
  /** The theme's tokens in the version it would show now; only the picture uses them. */
  tokens: ThemeTokens;
  name: string;
  note: string;
  isActive: boolean;
  /** Only the picture, not to be chosen (the preview of an import). */
  isPicture?: boolean;
}>();

const emit = defineEmits<{ select: [] }>();
</script>

<style scoped>
.theme-card {
  display: grid;
  align-content: start;
  gap: 6px;
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--fg);
  text-align: left;
  cursor: pointer;
}

.theme-card--picture {
  cursor: default;
}

.theme-card:hover {
  border-color: var(--line-strong);
}

.theme-card--on,
.theme-card--on:hover {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.theme-card__name {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-card__note {
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.3;
}

/* The small picture uses the card's own token values (inline), not the page's. */
.theme-card__preview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 6px;
  height: 62px;
  padding: 7px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
}

.theme-card__surface {
  display: grid;
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.theme-card__text {
  display: block;
  width: 80%;
  height: 5px;
  border-radius: 3px;
  background: var(--fg);
}

.theme-card__text--quiet {
  width: 50%;
  background: var(--muted);
}

.theme-card__flow {
  display: flex;
  gap: 3px;
}

.theme-card__flow b {
  width: 12px;
  height: 6px;
  border-radius: 3px;
}

.theme-card__when {
  background: var(--flow-when);
}

.theme-card__if {
  background: var(--flow-if);
}

.theme-card__then {
  background: var(--flow-then);
}

.theme-card__accent {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
}
</style>
