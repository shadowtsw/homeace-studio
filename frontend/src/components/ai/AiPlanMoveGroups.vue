<template>
  <section v-if="groups.length" class="plan__section">
    <h3>
      {{ t("ai.moveTitle") }}<small>{{ moveCount }}</small>
    </h3>
    <div v-for="group in groups" :key="group.to" class="plan__list">
      <label class="plan__group">
        <input
          type="checkbox"
          :checked="isGroupOn({ group, selected })"
          :disabled="!group.operations.some((op) => op.state === 'ok')"
          :aria-label="t('ai.allInto', { path: group.to })"
          @change="emit('toggleGroup', group)"
        />
        <span
          class="mdi"
          :class="
            isNewFolder({ path: group.to, allPaths, plan, selected })
              ? 'mdi-folder-plus-outline'
              : 'mdi-folder-outline'
          "
        />
        <span class="plan__group-path">{{ group.to }}</span>
        <span
          v-if="isNewFolder({ path: group.to, allPaths, plan, selected })"
          class="plan__tag plan__tag--new"
        >
          {{ t("ai.newFolder") }}
        </span>
        <span class="plan__count">{{ group.operations.length }}</span>
      </label>
      <label
        v-for="op in group.operations"
        :key="op.id"
        class="plan__row"
        :class="{ 'plan__row--on': selected.has(op.id), 'plan__row--stale': op.state !== 'ok' }"
      >
        <input
          type="checkbox"
          :checked="selected.has(op.id)"
          :disabled="op.state !== 'ok'"
          :aria-label="t('ai.take')"
          @change="emit('toggle', op.id)"
        />
        <span class="plan__main">
          <span class="plan__entry">
            <span class="plan__icon" :class="`kind-${op.kind ?? 'automation'}`">
              <span class="mdi" :class="ENTRY_KIND_ICON[op.kind ?? 'automation']" />
            </span>
            <b>{{ op.entryName }}</b>
          </span>
          <span class="plan__meta">
            <template v-if="op.state !== 'gone'">
              {{ t(`kind.${op.kind ?? "automation"}`) }} ·
              {{
                op.currentFolder
                  ? t("ai.currentFolder", { path: op.currentFolder })
                  : t("ai.noFolder")
              }}
            </template>
            <span v-if="op.state !== 'ok'" class="plan__tag">{{ t(operationStateKey(op)) }}</span>
          </span>
        </span>
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { ENTRY_KIND_ICON } from "@/constants/entries";
import type { AiPlan } from "@/services/aiService";
import {
  isGroupOn,
  isNewFolder,
  moveGroups,
  operationStateKey,
  type MoveGroup,
} from "@/utils/aiPlan";

/** The moves of an AI's folder plan, grouped by target folder; a group and each line can be ticked. */
const props = defineProps<{
  plan: AiPlan;
  allPaths: string[];
  selected: Set<string>;
}>();

const emit = defineEmits<{
  toggle: [id: string];
  toggleGroup: [group: MoveGroup];
}>();

const { t } = useI18n();

const groups = computed(() => moveGroups(props.plan));
const moveCount = computed(() =>
  groups.value.reduce((sum, group) => sum + group.operations.length, 0),
);
</script>

<style scoped src="./aiPlanDialog.css"></style>
