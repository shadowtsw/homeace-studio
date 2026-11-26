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
          @change="(value) => change(id, value)"
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
import { computed, onBeforeUnmount, reactive, ref, toRaw, watch } from "vue";
import { useI18n } from "vue-i18n";

import SaveFooter from "@/components/common/SaveFooter.vue";
import { useSceneAutoSave } from "@/composables/scenes/useSceneAutoSave";
import { useScenePreview } from "@/composables/scenes/useScenePreview";
import { useSceneEntityDrop } from "@/composables/scenes/useSceneEntityDrop";
import {
  fetchScene,
  fetchSceneDevice,
  saveScene,
  type SceneDevice,
  type SceneView,
} from "@/services/scenesService";
import { useDraftsStore, type SceneEntities } from "@/stores/draftsStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";
import type { Entry } from "@/types/entry";
import { domainOf, type SceneValue } from "@/utils/sceneValues";

import SceneDevicePicker from "./SceneDevicePicker.vue";
import SceneDeviceRow from "./SceneDeviceRow.vue";

const props = defineProps<{
  entry: Entry;
  isTechnicalDetailsVisible: boolean;
}>();

const { t } = useI18n();
const toasts = useToastStore();
const messages = useMessagesStore();
const drafts = useDraftsStore();

const view = ref<SceneView | null>(null);
const devices = reactive(new Map<string, SceneDevice>());
/** What the scene sets, as HA has it saved and as the user edits it; `order` keeps the rows. */
const saved = ref<SceneEntities>({});
const draft = ref<SceneEntities>({});
const order = ref<string[]>([]);
const isLoading = ref(false);
const hasError = ref(false);
const isSaving = ref(false);
/** The scene the shown values belong to; null while another one loads. */
const loadedId = ref<string | null>(null);

const entities = (): SceneEntities =>
  Object.fromEntries(order.value.map((id) => [id, draft.value[id] ?? {}]));
const same = (first: unknown, second: unknown): boolean =>
  JSON.stringify(first) === JSON.stringify(second);
const isDirty = computed(() => !same(entities(), saved.value));
/** HA has other values than when the edits started. */
const hasRemoteChange = computed(() => {
  const kept = loadedId.value ? drafts.scenes[loadedId.value] : undefined;

  return kept !== undefined && !same(kept.base, saved.value);
});
/** Devices added in the editor that HA does not have in the scene yet. */
const addedDevices = (): SceneDevice[] =>
  order.value.filter((id) => !(id in saved.value)).map(deviceOf);

function deviceOf(id: string): SceneDevice {
  return (
    devices.get(id) ?? { entityId: id, name: id, domain: domainOf(id), values: null, current: null }
  );
}

function fail(error: unknown): void {
  toasts.show(messages.textFor(error, t("errors.actionFailed")), "error");
}

// reactive(): the template reads isPreviewing and isAutoSave without .value.
const preview = reactive(
  useScenePreview({
    sceneId: () => props.entry.entityId,
    entities,
    nameOf: (id) => deviceOf(id).name,
    fail,
  }),
);
const autoSave = reactive(
  useSceneAutoSave({
    loadedId,
    saved,
    isDirty,
    isSaving,
    isEditable: () => view.value?.isEditable === true,
    entities,
    applySaved,
    show,
    onUndone: () => {
      preview.showAgain();
      toasts.show(t("scene.toast.undoneAll", { name: props.entry.name }));
    },
    fail,
  }),
);

// Dragging an entity from the list onto the device list
const entityDrop = useSceneEntityDrop({
  isEditable: computed(() => view.value?.isEditable === true),
  deviceIds: order,
  add,
});

const isFooterShown = computed(() => {
  const isReady = view.value?.isEditable === true && !hasError.value && !isLoading.value;
  const hasStatus = autoSave.isAutoSave && autoSave.undo !== null;

  return isReady && (isDirty.value || hasStatus);
});

// ---- loading and showing ------------------------------------------------------------------------

async function load(): Promise<void> {
  const entityId = props.entry.entityId;
  isLoading.value = true;
  hasError.value = false;

  try {
    const result = await fetchScene(entityId);
    if (entityId !== props.entry.entityId) return;
    show(result);
  } catch {
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
}

const valuesOf = (result: SceneView): SceneEntities =>
  Object.fromEntries(result.devices.map((d) => [d.entityId, d.values ?? {}]));

/** Shows a scene as HA has it, or with the edits kept from before switching tabs or entries. */
function show(result: SceneView): void {
  // Devices from HA plus the ones added in a kept draft
  const kept = drafts.scenes[result.entityId];
  view.value = result;
  devices.clear();
  for (const device of [...result.devices, ...(kept?.added ?? [])]) {
    devices.set(device.entityId, device);
  }

  // Values: the kept draft wins over what HA has
  saved.value = valuesOf(result);
  // toRaw: Vue wraps refs in proxies, which structuredClone cannot copy.
  draft.value = structuredClone(toRaw(kept?.value ?? saved.value));
  order.value = Object.keys(draft.value);
  loadedId.value = result.entityId;
}

// Every edit goes into the drafts store, so it survives switching tabs and entries.
watch(
  [draft, order],
  () => {
    if (!loadedId.value || !view.value?.isEditable) return;

    drafts.keepScene({
      entityId: loadedId.value,
      saved: saved.value,
      value: entities(),
      added: addedDevices(),
    });
  },
  { deep: true },
);

// ---- editing (switches nothing, unless a preview or "Ausprobieren" runs) ---------------------

function change(id: string, value: SceneValue): void {
  draft.value = { ...draft.value, [id]: value };
  preview.showLive(id);
}

/** Takes everything the device has right now, also what the editor has no control for. */
function takeCurrent(id: string): void {
  const current = deviceOf(id).current;
  if (!current) return;

  change(id, { state: current.state, ...current.attributes });
  toasts.show(t("scene.toast.taken", { name: deviceOf(id).name }));
}

async function remove(id: string): Promise<void> {
  await preview.restoreDevice(id);

  const next = { ...draft.value };
  delete next[id];
  draft.value = next;
  order.value = order.value.filter((item) => item !== id);
}

async function add(id: string): Promise<void> {
  if (order.value.includes(id)) return;

  try {
    const device = await fetchSceneDevice(id);
    devices.set(id, device);
    order.value = [...order.value, id];
    change(id, device.values ?? { state: "on" });
    toasts.show(t("scene.toast.added", { name: device.name }));
  } catch (error) {
    fail(error);
  }
}

// ---- saving -------------------------------------------------------------------------------------

/**
 * Takes over what HA saved. Edits made while saving stay as a draft (automatic saving sends them
 * next); if another scene was opened meanwhile, only its kept draft is done.
 */
function applySaved({ result, sent }: { result: SceneView; sent: SceneEntities }): void {
  // Nothing edited since sending: the kept draft is done, also for a scene no longer open
  const entityId = result.entityId;
  const kept = drafts.scenes[entityId];
  const isDone = !kept || same(kept.value, sent);
  const isStillOpen = loadedId.value === entityId;

  if (isDone) drafts.dropScene(entityId);
  if (!isStillOpen) return;
  if (isDone) {
    show(result);
    return;
  }

  // Edited further: take HA's answer, keep the newer edits on top
  view.value = result;
  for (const device of result.devices) devices.set(device.entityId, device);
  saved.value = valuesOf(result);

  // Restart the draft from what was just saved, so it is not taken for a change in HA
  drafts.dropScene(entityId);
  drafts.keepScene({ entityId, saved: saved.value, value: entities(), added: addedDevices() });
}

async function save(): Promise<void> {
  const entityId = loadedId.value;
  if (!entityId) return;

  const sent = entities();
  isSaving.value = true;

  try {
    const result = await saveScene(entityId, sent);
    applySaved({ result, sent });
    toasts.show(t("scene.toast.saved", { name: props.entry.name }));
    autoSave.reset();
  } catch (error) {
    fail(error);
  } finally {
    isSaving.value = false;
  }
}

function discard(): void {
  // toRaw: Vue wraps refs in proxies, which structuredClone cannot copy.
  draft.value = structuredClone(toRaw(saved.value));
  order.value = Object.keys(saved.value);
  preview.showAgain();
}

// ---- switching scenes and leaving: waiting edits are saved, devices go back --------------------

watch(
  () => props.entry.entityId,
  (entityId, previous) => {
    autoSave.flush();
    if (previous) preview.leave(previous);
    autoSave.reset();
    loadedId.value = null;
    void load();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  autoSave.flush();
  preview.leave(props.entry.entityId);
});
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
