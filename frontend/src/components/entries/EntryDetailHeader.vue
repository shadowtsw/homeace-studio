<template>
  <header class="entry-detail-header">
    <button
      class="icon-btn entry-detail-header__back"
      type="button"
      :aria-label="t('detail.back')"
      @click="emit('back')"
    >
      <span class="mdi mdi-arrow-left" />
    </button>
    <span class="entry-detail-header__icon" :class="`kind-${entry.kind}`">
      <span class="mdi" :class="mdiIconClass(entry.icon) ?? ENTRY_KIND_ICON[entry.kind]" />
    </span>
    <div class="entry-detail-header__title">
      <div class="entry-detail-header__kind">
        {{ t(`kind.${entry.kind}`) }}
        <span v-if="entry.isDisabled" class="entry-detail-header__disabled">
          <span class="mdi mdi-power-plug-off-outline" />{{ t("visibility.badge") }}
        </span>
      </div>
      <InlineNameInput
        v-if="isRenaming"
        class="entry-detail-header__rename-input"
        :value="entry.name"
        :label="t('detail.rename')"
        @save="(name) => emit('rename', name)"
        @cancel="emit('cancelRename')"
      />
      <h1 v-else @dblclick="entry.isInRegistry && emit('startRename')">
        {{ entry.name }}
        <span v-if="entry.isInRegistry" class="entry-detail-header__title-tools">
          <button
            class="icon-btn"
            type="button"
            :title="t('detail.rename')"
            :aria-label="t('detail.rename')"
            @click="emit('startRename')"
          >
            <span class="mdi mdi-pencil-outline" />
          </button>
          <button
            v-if="canDuplicate"
            class="icon-btn"
            type="button"
            :title="t('detail.duplicate')"
            :aria-label="t('detail.duplicate')"
            :disabled="isBusy"
            @click="emit('duplicate')"
          >
            <span class="mdi mdi-content-copy" />
          </button>
        </span>
      </h1>
      <div v-if="isTechnicalDetailsVisible" class="entry-detail-header__entity-id mono">
        {{ entry.entityId }}
      </div>
    </div>

    <div class="entry-detail-header__actions">
      <button
        v-if="entry.isDisabled"
        class="btn btn--primary"
        type="button"
        :disabled="isBusy"
        @click="emit('enable')"
      >
        <span class="mdi mdi-power-plug-outline" /> {{ t("visibility.enable") }}
      </button>
      <label v-else-if="canToggle(entry)" class="entry-detail-header__switch">
        <span>{{ isOn(entry) ? t("detail.on") : t("detail.off") }}</span>
        <SwitchToggle
          :model-value="isOn(entry)"
          :label="t('detail.switch')"
          @update:model-value="emit('act', toggleAction(entry))"
        />
      </label>
      <button
        v-if="supportsAction(entry, ENTRY_ACTION.run)"
        class="btn"
        type="button"
        :disabled="isBusy"
        @click="emit('act', ENTRY_ACTION.run)"
      >
        <span class="mdi mdi-play" /> {{ t(`detail.run.${entry.domain}`) }}
      </button>
      <button
        class="icon-btn"
        :class="{ 'entry-detail-header__star--on': entry.isFavorite }"
        type="button"
        :aria-pressed="entry.isFavorite"
        :aria-label="t('detail.favorite')"
        :title="t('detail.favorite')"
        @click="emit('toggleFavorite')"
      >
        <span class="mdi" :class="entry.isFavorite ? 'mdi-star' : 'mdi-star-outline'" />
      </button>
      <button
        v-if="canDelete(entry)"
        class="icon-btn"
        type="button"
        :aria-label="t('detail.delete')"
        :title="t('detail.delete')"
        @click="emit('delete')"
      >
        <span class="mdi mdi-delete-outline" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { canDuplicate as canDuplicateEntry } from "@/utils/entryActions";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import InlineNameInput from "@/components/common/InlineNameInput.vue";
import SwitchToggle from "@/components/common/SwitchToggle.vue";
import { ENTRY_ACTION, ENTRY_KIND_ICON, type EntryAction } from "@/constants/entries";
import type { Entry } from "@/types/entry";
import { canDelete, canToggle, isOn, supportsAction, toggleAction } from "@/utils/entryActions";
import { mdiIconClass } from "@/utils/text";

const props = defineProps<{
  entry: Entry;
  /** The title is an input right now. */
  isRenaming?: boolean;
  isTechnicalDetailsVisible: boolean;
  isBusy: boolean;
}>();

const emit = defineEmits<{
  back: [];
  act: [action: EntryAction];
  toggleFavorite: [];
  /** Disabled entries get an "Aktivieren" button instead of on/off. */
  enable: [];
  startRename: [];
  duplicate: [];
  rename: [name: string];
  cancelRename: [];
  delete: [];
}>();

const { t } = useI18n();

/** HomeAce Studio copies automations and scripts; helpers and scenes not yet. */
const canDuplicate = computed(() => canDuplicateEntry(props.entry));
</script>

<style scoped>
.entry-detail-header {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding: 18px 28px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}

.entry-detail-header__back {
  display: none;
  margin-left: -8px;
}

.entry-detail-header__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  font-size: 26px;
}

.entry-detail-header__title {
  flex: 1;
  min-width: 180px;
}

.entry-detail-header__kind {
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.entry-detail-header__title h1 {
  margin: 1px 0 2px;
  font: 700 26px/1.15 var(--font-display);
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.entry-detail-header__entity-id {
  color: var(--muted);
}

.entry-detail-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.entry-detail-header__switch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 4px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}

.entry-detail-header__star--on {
  color: var(--kind-automation);
}

@media (max-width: 820px) {
  .entry-detail-header__back {
    display: inline-grid;
  }

  .entry-detail-header {
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
  }
}

.entry-detail-header__disabled {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.entry-detail-header__title-tools {
  display: inline-flex;
  gap: 2px;
  margin-left: 6px;
  vertical-align: middle;
  opacity: 0;
}

.entry-detail-header__title-tools .icon-btn {
  width: 30px;
  height: 30px;
  font-size: 17px;
}

.entry-detail-header__title:hover .entry-detail-header__title-tools,
.entry-detail-header__title-tools:focus-within {
  opacity: 1;
}

@media (hover: none) {
  .entry-detail-header__title-tools {
    opacity: 1;
  }
}

.entry-detail-header__rename-input {
  height: 40px;
  font: 700 22px/1.1 var(--font-display);
}
</style>
