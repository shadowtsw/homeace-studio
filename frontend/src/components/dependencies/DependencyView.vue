<template>
  <div class="deps">
    <p v-if="deps.hasError && !result" class="deps__note">{{ t("deps.error") }}</p>
    <p v-else-if="!result" class="deps__note">{{ t("deps.loading") }}</p>

    <template v-else>
      <p v-if="!hasFindingBanner" class="deps__summary">
        <span class="mdi" :class="summaryIcon" />
        <span>{{ summary }}</span>
      </p>

      <section class="deps__section">
        <h3>
          {{ t("deps.uses") }} <small>{{ result.uses.length }}</small>
        </h3>
        <div class="deps__card">
          <template v-for="group in groups" :key="group.role">
            <div class="deps__group">
              <span class="mdi" :class="ROLE_ICON[group.role]" />
              {{ t(`deps.roles.${group.role}`) }}
            </div>
            <DependencyUseRow
              v-for="use in group.uses"
              :key="`${group.role}:${use.entityId}`"
              :use="use"
              :option="optionOf(use.entityId)"
              :label="labelOf(use.entityId, use.name)"
              :entry="entryOf(use.entityId)"
              :entry-of="entryOf"
              :gone-hint="goneHint"
              :is-technical-details-visible="isTechnicalDetailsVisible"
              @open="(id) => emit('open', id)"
            />
          </template>
          <p v-if="groups.length === 0" class="deps__empty">
            {{ entry.kind === "helper" ? t("deps.emptyUses.helper") : t("deps.emptyUses.other") }}
          </p>
        </div>
      </section>

      <section class="deps__section">
        <h3>
          {{ t("deps.usedBy") }} <small>{{ result.usedBy.length }}</small>
        </h3>
        <div class="deps__card">
          <DependencyUserRow
            v-for="user in result.usedBy"
            :key="user.entityId"
            :user="user"
            :entry="entryOf(user.entityId)"
            @open="(id) => emit('open', id)"
          />
          <p v-if="result.usedBy.length === 0" class="deps__empty">
            {{ t(`deps.emptyUsedBy.${entry.kind}`) }}
          </p>
        </div>
        <p class="deps__hint">
          <span class="mdi mdi-information-outline" /> {{ t("deps.dashboards") }}
        </p>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";

import type { DependencyRole } from "@/services/dependenciesService";
import { useDependenciesStore } from "@/stores/dependenciesStore";
import { useEntriesStore } from "@/stores/entriesStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import type { EntityOption } from "@/types/editor";
import type { Entry } from "@/types/entry";
import { countUses, goneHintKey, groupUsesByRole } from "@/utils/dependencies";
import { countByDevice, rowLabel } from "@/utils/entities/entityPicker";

import DependencyUseRow from "./DependencyUseRow.vue";
import DependencyUserRow from "./DependencyUserRow.vue";

/** The "Abhängigkeiten" tab: what an entry uses, by role, and who uses it. */
const props = defineProps<{
  entry: Entry;
  /** The check-up banner above already says what is wrong; no summary line then. */
  hasFindingBanner: boolean;
  isTechnicalDetailsVisible: boolean;
}>();

const emit = defineEmits<{
  open: [entityId: string];
}>();

const ROLE_ICON: Record<DependencyRole, string> = {
  trigger: "mdi-lightning-bolt-outline",
  condition: "mdi-check-decagram-outline",
  action: "mdi-tune-variant",
  member: "mdi-palette-outline",
  value: "mdi-import",
  call: "mdi-play-circle-outline",
};

const { t } = useI18n();
const deps = useDependenciesStore();
const lookups = useLookupsStore();
const entriesStore = useEntriesStore();

// States are shown as they are now.
watch(
  () => props.entry.entityId,
  () => void lookups.loadEntities(true),
  { immediate: true },
);

const result = computed(() =>
  deps.current?.entityId === props.entry.entityId ? deps.current : null,
);

const goneHint = computed(() => t(goneHintKey(props.entry.kind)));

// The detail loads the dependencies with the entry; if that failed, opening the tab tries again.
onMounted(() => {
  if (!result.value && !deps.isLoading) void deps.load(props.entry.entityId);
});
const groups = computed(() => groupUsesByRole(result.value?.uses ?? []));

const options = computed(
  () => new Map(lookups.entities.map((entity) => [entity.entityId, entity])),
);
const deviceCounts = computed(() => countByDevice(lookups.entities));
const entries = computed(() => new Map(entriesStore.entries.map((item) => [item.entityId, item])));

function optionOf(entityId: string): EntityOption | null {
  return options.value.get(entityId) ?? null;
}

function entryOf(entityId: string): Entry | null {
  return entries.value.get(entityId) ?? null;
}

/** "Front door sensor: Battery" when HA knows the device, else the name, else the ID. */
function labelOf(entityId: string, name: string | null): string {
  const option = optionOf(entityId);
  if (option) return rowLabel(option, "list", deviceCounts.value);
  return name ?? entityId;
}

const summaryIcon = computed(() =>
  (result.value?.uses.length ?? 0) + (result.value?.usedBy.length ?? 0) > 0
    ? "mdi-check-circle-outline"
    : "mdi-minus-circle-outline",
);

/** "Benutzt 4 Dinge, alle da. Wird von 2 anderen benutzt." */
const summary = computed(() => {
  const current = result.value;
  if (!current) return "";

  const { total, gone } = countUses(current.uses);
  const isAllThere =
    gone === 0 && current.uses.every((use) => optionOf(use.entityId)?.state !== "unavailable");
  const parts = [];

  if (total > 0) parts.push(t(isAllThere ? "deps.summaryUses" : "deps.summaryUsesPlain", total));
  parts.push(t("deps.summaryUsedBy", current.usedBy.length));

  return parts.join(" ");
});
</script>

<style scoped>
.deps {
  max-width: 780px;
}

.deps__note {
  color: var(--muted);
}

.deps__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.deps__summary .mdi {
  color: var(--muted);
  font-size: 18px;
}

.deps__section {
  margin-bottom: 24px;
}

.deps__section h3 {
  margin: 0 0 10px;
  font: 700 15px/1.2 var(--font-display);
}

.deps__section h3 small {
  color: var(--muted);
  font: 500 12.5px var(--font-body);
}

.deps__card {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.deps__group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px 4px;
  border-top: 1px solid var(--line);
  color: var(--faint);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.deps__group:first-child {
  border-top: 0;
}

.deps__empty {
  margin: 0;
  padding: 12px 14px;
  color: var(--muted);
}

.deps__hint {
  display: flex;
  gap: 6px;
  margin: 8px 2px 0;
  color: var(--muted);
  font-size: 12.5px;
}
</style>
