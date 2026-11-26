<template>
  <div class="plan__preview">
    <div v-for="op in chosen" :key="op.id" class="plan__step">
      <span
        class="mdi"
        :class="op.type === 'renameFolder' ? 'mdi-pencil-outline' : 'mdi-folder-move-outline'"
      />
      <div>
        <div class="plan__map">
          <template v-if="op.type === 'renameFolder'">
            <code>{{ op.from }}</code>
          </template>
          <b v-else>{{ op.entryName }}</b>
          <span class="mdi mdi-arrow-right plan__arrow" />
          <code>{{ op.to }}</code>
        </div>
        <small>
          {{ op.type === "renameFolder" ? t("ai.previewRename") : t("ai.previewMove") }}
          <template
            v-if="op.type === 'moveEntry' && isNewFolder({ path: op.to, allPaths, plan, selected })"
          >
            {{ t("ai.previewNewFolder") }}
          </template>
        </small>
      </div>
    </div>
  </div>
  <p class="plan__hint"><span class="mdi mdi-information-outline" />{{ t("ai.previewHint") }}</p>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import type { AiOperation, AiPlan } from "@/services/aiService";
import { isNewFolder } from "@/utils/aiPlan";

/** The second step of a plan review: what will change in HA, one line per ticked operation. */
defineProps<{
  plan: AiPlan;
  allPaths: string[];
  selected: Set<string>;
  /** The ticked operations that can still run. */
  chosen: AiOperation[];
}>();

const { t } = useI18n();
</script>

<style scoped src="./aiPlanDialog.css"></style>
