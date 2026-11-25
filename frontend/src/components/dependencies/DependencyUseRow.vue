<template>
  <div class="dep-use">
    <!-- A div, because the "+2 more" button sits inside; entries still open by click or Enter. -->
    <div
      class="dep-use__row"
      :class="{ 'dep-use__row--link': entry, 'dep-use__row--gone': !use.exists }"
      :role="entry ? 'button' : undefined"
      :tabindex="entry ? 0 : undefined"
      @click="entry && emit('open', use.entityId)"
      @keydown.enter.self="entry && emit('open', use.entityId)"
    >
      <span v-if="entry" class="dep-use__icon" :class="`kind-${entry.kind}`">
        <span class="mdi" :class="ENTRY_KIND_ICON[entry.kind]" />
      </span>
      <span v-else class="dep-use__icon dep-use__icon--plain">
        <span class="mdi" :class="use.exists ? icon : 'mdi-link-variant-off'" />
      </span>

      <span class="dep-use__main">
        <b>{{ label }}</b>
        <small v-if="sub || isTechnicalDetailsVisible">
          {{ sub }}<template v-if="sub && isTechnicalDetailsVisible"> · </template>
          <span v-if="isTechnicalDetailsVisible" class="mono">{{ use.entityId }}</span>
        </small>
      </span>

      <button
        v-if="use.alsoUsedBy.length"
        type="button"
        class="dep-use__more"
        :class="{ 'dep-use__more--open': isOpen }"
        :aria-expanded="isOpen"
        :title="t('deps.moreTitle')"
        @click.stop="isOpen = !isOpen"
      >
        {{ t("deps.more", use.alsoUsedBy.length) }}
      </button>
      <span v-if="state" class="dep-use__state" :class="`dep-use__state--${state.tone}`">
        {{ state.text }}
      </span>
      <span v-if="entry" class="mdi mdi-chevron-right dep-use__chevron" />
    </div>

    <div v-if="isOpen" class="dep-use__also">
      <DependencyUserRow
        v-for="user in use.alsoUsedBy"
        :key="user.entityId"
        :user="user"
        :entry="entryOf(user.entityId)"
        is-compact
        @open="(id) => emit('open', id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { useStateText } from "@/composables/useStateText";
import { DOMAIN_ICON, FALLBACK_DOMAIN_ICON } from "@/constants/domainIcons";
import { ENTRY_KIND_ICON } from "@/constants/entries";
import type { DependencyUse } from "@/services/dependenciesService";
import type { EntityOption } from "@/types/editor";
import type { Entry } from "@/types/entry";

import DependencyUserRow from "./DependencyUserRow.vue";

/** Something an entry uses: what it is, where, its state now, and who else uses it. */
const props = defineProps<{
  use: DependencyUse;
  /** Picker data of the entity (device, area, state); null when HA does not list it. */
  option: EntityOption | null;
  /** The label people know it by ("Front door sensor: Battery"). */
  label: string;
  /** Set when it is an entry of its own, which then opens on click. */
  entry: Entry | null;
  entryOf: (entityId: string) => Entry | null;
  /** What to do when it no longer exists; depends on the kind of the open entry. */
  goneHint: string;
  isTechnicalDetailsVisible: boolean;
}>();

const emit = defineEmits<{
  open: [entityId: string];
}>();

const { t } = useI18n();
const toStateText = useStateText();
const isOpen = ref(false);

const icon = computed(
  () => DOMAIN_ICON[props.use.entityId.split(".")[0] ?? ""] ?? FALLBACK_DOMAIN_ICON,
);

const sub = computed(() => {
  if (!props.use.exists) return props.goneHint;
  if (props.entry) return t(`kind.${props.entry.kind}`);
  return props.option?.areaName ?? "";
});

const state = computed((): { text: string; tone: "plain" | "warn" | "err" } | null => {
  if (!props.use.exists) return { text: t("deps.gone"), tone: "err" };

  const option = props.option;
  if (!option) return null;
  if (option.state === "unavailable")
    return { text: toStateText(option.state, null), tone: "warn" };

  return { text: toStateText(option.state, option.unit), tone: "plain" };
});
</script>

<style scoped>
.dep-use + .dep-use {
  border-top: 1px solid var(--line);
}

.dep-use__row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
}

.dep-use__row--link {
  cursor: pointer;
}

.dep-use__row--link:hover,
.dep-use__row--link:focus-visible {
  background: var(--sunken);
}

.dep-use__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  font-size: 17px;
}

.dep-use__icon--plain {
  background: var(--sunken);
  color: var(--muted);
}

.dep-use__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.dep-use__main b {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dep-use__row--gone .dep-use__main b {
  color: var(--err);
}

.dep-use__main small {
  overflow: hidden;
  color: var(--faint);
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dep-use__more {
  flex: none;
  padding: 2px 9px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}

.dep-use__more:hover,
.dep-use__more--open {
  border-color: var(--line-strong);
  color: var(--fg);
}

.dep-use__state {
  flex: none;
  max-width: 38%;
  overflow: hidden;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dep-use__state--warn {
  background: var(--warn-soft);
  color: var(--warn);
}

.dep-use__state--err {
  background: var(--err-soft);
  color: var(--err);
}

.dep-use__chevron {
  color: var(--faint);
}

.dep-use__also {
  display: grid;
  gap: 2px;
  padding: 0 14px 10px 54px;
}
</style>
