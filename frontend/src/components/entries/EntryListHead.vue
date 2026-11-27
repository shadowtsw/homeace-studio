<template>
  <div class="entry-list-head">
    <div class="entry-list-head__title-row">
      <button
        class="icon-btn entry-list-head__nav-toggle"
        type="button"
        :aria-label="t('nav.open')"
        @click="emit('openNav')"
      >
        <span class="mdi mdi-menu" />
      </button>
      <div class="entry-list-head__title">
        <div v-if="title.crumb" class="entry-list-head__crumb">{{ title.crumb }} ›</div>
        <h2>{{ title.name }}</h2>
        <div v-if="title.subtitle" class="entry-list-head__subtitle">{{ title.subtitle }}</div>
      </div>
      <div ref="newMenu" class="entry-list-head__new">
        <button
          class="btn btn--primary"
          type="button"
          :aria-expanded="isNewMenuOpen"
          aria-haspopup="menu"
          @click="isNewMenuOpen = !isNewMenuOpen"
        >
          <span class="mdi mdi-plus" />
          <span class="entry-list-head__new-label">{{ t("list.new") }}</span>
        </button>
        <div v-if="isNewMenuOpen" class="entry-list-head__new-menu" role="menu">
          <button
            v-for="kind in NEW_ENTRY_KINDS"
            :key="kind"
            type="button"
            role="menuitem"
            @click="pickNew(kind)"
          >
            <span class="entry-list-head__new-icon" :class="`kind-${kind}`">
              <span class="mdi" :class="ENTRY_KIND_ICON[kind]" />
            </span>
            {{ t(`list.newMenu.${kind}`) }}
          </button>
          <div class="entry-list-head__new-sep" role="separator" />
          <button type="button" role="menuitem" @click="pickFolder">
            <span class="entry-list-head__new-icon">
              <span class="mdi mdi-folder-plus-outline" />
            </span>
            {{ isRealCategory ? t("list.newSubfolder") : t("list.newFolder") }}
          </button>
        </div>
      </div>
    </div>

    <label class="entry-list-head__search">
      <span class="mdi mdi-magnify" />
      <input
        v-model="studio.search"
        type="search"
        :placeholder="t('list.search')"
        autocomplete="off"
      />
    </label>

    <ListScopeTabs
      :scopes="studio.scopes"
      :counts="scopeCounts"
      @select="(scope) => studio.selectScope(scope)"
      @toggle="(scope) => studio.toggleListScope(scope)"
    />
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import type { ListTitle } from "@/composables/useListTitle";
import {
  ENTRY_KIND_ICON,
  NEW_ENTRY_KINDS,
  type ListScope,
  type NewEntryKind,
} from "@/constants/entries";
import { useStudioStore } from "@/stores/studioStore";

import ListScopeTabs from "./ListScopeTabs.vue";

/** The head of the entry list: title with breadcrumb, the "Neu" menu, search and scope tabs. */
defineProps<{
  title: ListTitle;
  /** A real folder is selected (not a filter): "Neu" offers a subfolder of it. */
  isRealCategory: boolean;
  scopeCounts: Record<ListScope, number>;
}>();

const emit = defineEmits<{
  openNav: [];
  /** "Neu" was picked for this kind; the page opens the matching dialog. */
  create: [kind: NewEntryKind];
  /** "Neuer Ordner" (or subfolder) was picked. */
  addFolder: [];
}>();

const { t } = useI18n();
const studio = useStudioStore();

const isNewMenuOpen = ref(false);
const newMenu = useTemplateRef("newMenu");

onClickOutside(newMenu, () => (isNewMenuOpen.value = false));

function pickNew(kind: NewEntryKind): void {
  isNewMenuOpen.value = false;
  emit("create", kind);
}

function pickFolder(): void {
  isNewMenuOpen.value = false;
  emit("addFolder");
}
</script>

<style scoped>
.entry-list-head {
  display: grid;
  gap: 10px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--line);
}

.entry-list-head__title-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.entry-list-head__nav-toggle {
  display: none;
}

.entry-list-head__title {
  flex: 1;
  min-width: 0;
}

.entry-list-head__new {
  position: relative;
  flex: none;
}

.entry-list-head__new-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 30;
  display: grid;
  gap: 1px;
  min-width: 190px;
  padding: 6px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.entry-list-head__new-sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--line);
}

.entry-list-head__new-menu button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border: 0;
  border-radius: 8px;
  background: none;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.entry-list-head__new-menu button:hover,
.entry-list-head__new-menu button:focus-visible {
  background: var(--sunken);
}

.entry-list-head__new-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  font-size: 17px;
}

.entry-list-head__crumb {
  color: var(--faint);
  font-size: 12px;
}

.entry-list-head__title h2 {
  margin: 0;
  font: 700 22px/1.15 var(--font-display);
  letter-spacing: -0.015em;
  text-wrap: balance;
}

.entry-list-head__subtitle {
  margin-top: 3px;
  color: var(--muted);
  font-size: 12.5px;
}

.entry-list-head__search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 10px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--faint);
  font-size: 18px;
}

.entry-list-head__search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.entry-list-head__search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--fg);
  font-size: 14px;
}

@media (max-width: 1180px) {
  .entry-list-head__nav-toggle {
    display: inline-grid;
  }
}
</style>
