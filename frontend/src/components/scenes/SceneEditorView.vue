<template>
  <section class="scene-editor">
    <p v-if="isLoading" class="scene-editor__state">{{ t("scene.loading") }}</p>

    <p v-else-if="hasError" class="scene-editor__state">
      {{ t("scene.error") }}
      <button class="btn" type="button" @click="load">{{ t("errors.retry") }}</button>
    </p>

    <template v-else-if="view && !view.isEditable">
      <p class="scene-editor__state">
        <span class="mdi mdi-information-outline" /> {{ t("scene.readOnly") }}
      </p>
      <ul class="scene-editor__readonly">
        <li v-for="device in view.devices" :key="device.entityId">{{ device.name }}</li>
      </ul>
    </template>

    <template v-else-if="view">
      <div class="scene-editor__bar" :class="{ 'scene-editor__bar--live': preview.isPreviewing }">
        <span
          class="mdi"
          :class="preview.isPreviewing ? 'mdi-eye-outline' : 'mdi-minus-circle-outline'"
        />
        <span v-if="preview.isPreviewing">
          <b>{{ t("scene.previewOn") }}</b> {{ t("scene.previewOnText") }}
        </span>
        <span v-else>
          <b>{{ t("scene.calm") }}</b> {{ t("scene.calmText") }}
        </span>
        <button
          type="button"
          class="btn btn--small"
          :class="{ 'btn--primary': preview.isPreviewing }"
          :disabled="order.length === 0"
          @click="preview.togglePreview"
        >
          <span class="mdi" :class="preview.isPreviewing ? 'mdi-stop' : 'mdi-eye-outline'" />
          {{ preview.isPreviewing ? t("scene.previewStop") : t("scene.preview") }}
        </button>
      </div>

      <!-- Plain entities from the list can be dropped here; they join with their current state. -->
      <div
        class="scene-editor__list"
        :class="{
          'scene-editor__list--drop-ok': entityDrop.sign.value?.isOk,
          'scene-editor__list--drop-no': entityDrop.sign.value && !entityDrop.sign.value.isOk,
          'scene-editor__list--drop-over': entityDrop.isDropOver.value,
        }"
        @dragover="entityDrop.onDragOver"
        @dragleave="entityDrop.onDragLeave"
        @drop="entityDrop.onDrop"
      >
        <span
          v-if="entityDrop.sign.value"
          class="scene-editor__drop-sign"
          :class="{ 'scene-editor__drop-sign--no': !entityDrop.sign.value.isOk }"
        >
          <span
            class="mdi"
            :class="entityDrop.sign.value.isOk ? 'mdi-plus-circle-outline' : 'mdi-cancel'"
          />{{ entityDrop.sign.value.text }}
        </span>
        <SceneDeviceRow
          v-for="id in order"
          :key="id"
          :device="deviceOf(id)"
          :value="draft[id] ?? {}"
          :is-trying="preview.trying.has(id)"
          :is-technical-details-visible="isTechnicalDetailsVisible"
          :temperature-unit="view?.temperatureUnit"
          @change="(value) => change({ id, value })"
          @try="preview.tryDevice(id)"
          @take-current="takeCurrent(id)"
          @remove="remove(id)"
        />
        <p v-if="order.length === 0" class="scene-editor__state">{{ t("scene.empty") }}</p>
      </div>

      <!-- key: another scene starts with the picker closed. -->
      <SceneDevicePicker
        :key="entry.entityId"
        :selected="order"
        :area-id="entry.area?.areaId ?? null"
        :is-technical-details-visible="isTechnicalDetailsVisible"
        @pick="add"
      />
    </template>

    <Teleport defer to="#entry-detail-footer">
      <!-- With automatic saving the footer stays as a status line once it is up, so it slides in
           only once. -->
      <SaveFooter
        v-if="isFooterShown"
        :is-saving="isSaving"
        :note="hasRemoteChange ? t('save.remoteChanged') : null"
        :auto-status="autoSave.isAutoSave ? (isDirty ? 'pending' : 'saved') : null"
        :saved-at="autoSave.undo?.savedAt ?? null"
        :can-undo-all="autoSave.undo !== null"
        @save="save"
        @discard="discard"
        @undo-all="autoSave.undoAll"
      />
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import { useI18n } from "vue-i18n";

import SaveFooter from "@/components/common/SaveFooter.vue";
import { useSceneEditor } from "@/composables/scenes/useSceneEditor";
import type { Entry } from "@/types/entry";

import SceneDevicePicker from "./SceneDevicePicker.vue";
import SceneDeviceRow from "./SceneDeviceRow.vue";

const props = defineProps<{
  entry: Entry;
  isTechnicalDetailsVisible: boolean;
}>();

const { t } = useI18n();

const {
  view,
  draft,
  order,
  isLoading,
  hasError,
  isSaving,
  isDirty,
  hasRemoteChange,
  deviceOf,
  load,
  preview,
  autoSave,
  entityDrop,
  isFooterShown,
  change,
  takeCurrent,
  remove,
  add,
  save,
  discard,
} = useSceneEditor({ entry: toRef(props, "entry") });
</script>

<style scoped>
.scene-editor {
  display: grid;
  gap: 12px;
}

.scene-editor__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  font-size: 13px;
}

.scene-editor__bar > span:not(.mdi) {
  flex: 1;
  min-width: 220px;
  line-height: 1.45;
}

.scene-editor__bar b {
  color: var(--fg);
}

.scene-editor__bar--live {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.scene-editor__bar--live > .mdi {
  color: var(--accent);
}

.scene-editor__list {
  position: relative;
  display: grid;
  gap: 10px;
}

/* While an entity is dragged: the list lights up, or steps back with the reason. */
.scene-editor__list--drop-ok {
  outline: 2px dashed var(--kind-scene);
  outline-offset: 6px;
  border-radius: 12px;
}

.scene-editor__list--drop-over {
  outline-style: solid;
  background: var(--kind-scene-soft);
}

.scene-editor__list--drop-no > .scene-row {
  opacity: 0.4;
}

/* Floats above the list, so the rows never move under the pointer. */
.scene-editor__drop-sign {
  position: absolute;
  top: -34px;
  right: 0;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--kind-scene);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.scene-editor__drop-sign--no {
  background: var(--sunken);
  color: var(--muted);
  font-weight: 500;
}

.scene-editor__state {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.scene-editor__readonly {
  margin: 0;
  padding-left: 20px;
  color: var(--fg);
  font-size: 13px;
  line-height: 1.6;
}
</style>
