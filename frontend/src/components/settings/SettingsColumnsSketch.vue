<template>
  <!-- A drawn sketch, not a screenshot: it follows light/dark and the language and never goes stale. -->
  <figure class="columns-sketch">
    <div
      class="columns-sketch__app"
      role="img"
      :aria-label="t('settings.goodToKnow.columns.sketch')"
    >
      <div class="columns-sketch__bar" aria-hidden="true">
        <span class="columns-sketch__brand"
          ><span class="mdi mdi-file-tree-outline" /> HomeAce</span
        >
        <span class="columns-sketch__gear">
          <span class="mdi mdi-cog-outline" />
          <span class="columns-sketch__badge">1</span>
        </span>
      </div>

      <div class="columns-sketch__panes" aria-hidden="true">
        <section class="columns-sketch__pane">
          <strong>{{ t("settings.goodToKnow.columns.navigation") }}</strong>
          <span class="columns-sketch__chip">
            <span>{{ t("areas.viewFolders") }}</span><span>·</span
            ><span>{{ t("areas.viewAreas") }}</span>
          </span>
          <span class="columns-sketch__row"><span class="mdi mdi-folder-outline" /><i /></span>
          <span class="columns-sketch__row"><span class="mdi mdi-folder-outline" /><i /></span>
          <span class="columns-sketch__row columns-sketch__row--sub">
            <span class="mdi mdi-folder-outline" /><i />
          </span>
        </section>

        <section class="columns-sketch__pane">
          <strong>{{ t("settings.goodToKnow.columns.list") }}</strong>
          <span v-for="n in 4" :key="n" class="columns-sketch__row" :class="{ 'is-on': n === 2 }">
            <span class="mdi mdi-robot-outline" /><i />
          </span>
        </section>

        <section class="columns-sketch__pane columns-sketch__pane--detail">
          <strong>{{ t("settings.goodToKnow.columns.details") }}</strong>
          <span class="columns-sketch__tabs">
            <span class="is-on">{{ t("detail.tabs.flow") }}</span>
            <span>{{ t("detail.tabs.properties") }}</span>
            <span class="columns-sketch__badge">2</span>
          </span>
          <span class="columns-sketch__line" />
          <span class="columns-sketch__line columns-sketch__line--short" />
          <span class="columns-sketch__line" />
          <span class="columns-sketch__line columns-sketch__line--short" />
          <span class="columns-sketch__footer">
            <span class="columns-sketch__dot" />
            <span class="columns-sketch__save">{{ t("save.save") }}</span>
            <span class="columns-sketch__badge">3</span>
          </span>
        </section>
      </div>
    </div>

    <ol class="columns-sketch__legend">
      <li>
        <span class="columns-sketch__badge">1</span>{{ t("settings.goodToKnow.columns.gear") }}
      </li>
      <li>
        <span class="columns-sketch__badge">2</span>{{ t("settings.goodToKnow.columns.tabs") }}
      </li>
      <li>
        <span class="columns-sketch__badge">3</span>{{ t("settings.goodToKnow.columns.footer") }}
      </li>
    </ol>
  </figure>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

/** "Was ist was" in "Gut zu wissen": the three columns with the names the app and its users share. */
const { t } = useI18n();
</script>

<style scoped>
.columns-sketch {
  max-width: 62ch;
  margin: 4px 0 16px;
}

.columns-sketch__app {
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  font-size: 11.5px;
}

.columns-sketch__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
}

.columns-sketch__brand,
.columns-sketch__gear,
.columns-sketch__row,
.columns-sketch__tabs,
.columns-sketch__footer {
  display: flex;
  align-items: center;
  gap: 6px;
}

.columns-sketch__panes {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1.7fr;
  min-height: 170px;
}

.columns-sketch__pane {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  padding: 10px;
  border-right: 1px solid var(--line);
}

.columns-sketch__pane:last-child {
  border-right: 0;
}

.columns-sketch__pane strong {
  color: var(--accent);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.columns-sketch__chip {
  display: flex;
  gap: 5px;
  align-self: flex-start;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--sunken);
  color: var(--muted);
  white-space: nowrap;
}

.columns-sketch__row {
  padding: 2px 4px;
  border-radius: 6px;
  color: var(--muted);
}

.columns-sketch__row--sub {
  padding-left: 16px;
}

.columns-sketch__row.is-on {
  background: var(--accent-soft);
  color: var(--accent);
}

/* Placeholder text: a grey bar instead of words */
.columns-sketch__row i,
.columns-sketch__line {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--line);
}

.columns-sketch__row.is-on i {
  background: currentcolor;
  opacity: 0.35;
}

/* In the detail the bars stack: no growing in height */
.columns-sketch__line {
  flex: none;
}

.columns-sketch__line--short {
  width: 60%;
}

.columns-sketch__tabs {
  flex-wrap: wrap;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
}

.columns-sketch__tabs .is-on {
  color: var(--accent);
  font-weight: 600;
}

.columns-sketch__footer {
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 6px;
  border-top: 1px solid var(--line);
}

.columns-sketch__dot {
  width: 7px;
  height: 7px;
  margin-right: auto;
  border-radius: 50%;
  background: var(--warn);
}

.columns-sketch__save {
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--accent);
  color: var(--on-accent);
  white-space: nowrap;
}

.columns-sketch__badge {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--fg);
  color: var(--surface);
  font-size: 10.5px;
  font-weight: 700;
}

.columns-sketch__legend {
  display: grid;
  gap: 5px;
  margin: 10px 0 0;
  padding: 0;
  font-size: 13px;
  list-style: none;
}

.columns-sketch__legend li {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
