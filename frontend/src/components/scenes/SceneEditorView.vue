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
      <div class="scene-editor__bar" :class="{ 'scene-editor__bar--live': isPreviewing }">
        <span class="mdi" :class="isPreviewing ? 'mdi-eye-outline' : 'mdi-minus-circle-outline'" />
        <span v-if="isPreviewing">
          <b>{{ t("scene.previewOn") }}</b> {{ t("scene.previewOnText") }}
        </span>
        <span v-else>
          <b>{{ t("scene.calm") }}</b> {{ t("scene.calmText") }}
        </span>
        <button
          type="button"
          class="btn btn--small"
          :class="{ 'btn--primary': isPreviewing }"
          :disabled="order.length === 0"
          @click="togglePreview"
        >
          <span class="mdi" :class="isPreviewing ? 'mdi-stop' : 'mdi-eye-outline'" />
          {{ isPreviewing ? t("scene.previewStop") : t("scene.preview") }}
        </button>
      </div>

      <div class="scene-editor__list">
        <SceneDeviceRow
          v-for="id in order"
          :key="id"
          :device="deviceOf(id)"
          :value="draft[id] ?? {}"
          :is-trying="trying.has(id)"
          :is-technical-details-visible="isTechnicalDetailsVisible"
          @change="(value) => change(id, value)"
          @try="tryDevice(id)"
          @take-current="takeCurrent(id)"
          @remove="remove(id)"
        />
        <p v-if="order.length === 0" class="scene-editor__state">{{ t("scene.empty") }}</p>
      </div>

      <div ref="addRoot" class="scene-editor__add">
        <button ref="addButton" class="btn" type="button" @click="openPicker">
          <span class="mdi mdi-plus" /> {{ t("scene.add") }}
        </button>
        <div v-if="isPicking" ref="picker" class="scene-editor__picker" :style="pickerStyle">
          <!-- Suggestions come from the scene's area; devices already in it keep their tick. -->
          <EntityPicker
            :entities="lookups.entities"
            :selected="order"
            :domains="SCENE_DOMAINS"
            :used-ids="[]"
            :area-id="entry.area?.areaId ?? null"
            :can-pick-area="false"
            :is-technical-details-visible="isTechnicalDetailsVisible"
            @pick="add"
          />
        </div>
      </div>
    </template>

    <Teleport defer to="#entry-detail-footer">
      <!-- With automatic saving the footer stays as a status line once it is up, so it slides in
           only once. -->
      <SaveFooter
        v-if="view?.isEditable && !hasError && !isLoading && (isDirty || (isAutoSave && undo))"
        :is-saving="isSaving"
        :note="hasRemoteChange ? t('save.remoteChanged') : null"
        :auto-status="isAutoSave ? (isDirty ? 'pending' : 'saved') : null"
        :saved-at="undo?.savedAt ?? null"
        :can-undo-all="undo !== null"
        @save="save"
        @discard="discard"
        @undo-all="undoAll"
      />
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { onClickOutside, useEventListener } from "@vueuse/core";
import { computed, onBeforeUnmount, reactive, ref, toRaw, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import SaveFooter from "@/components/common/SaveFooter.vue";
import EntityPicker from "@/components/flow/EntityPicker.vue";
import {
  fetchScene,
  fetchSceneDevice,
  previewScene,
  restoreScene,
  restoreSceneOnLeave,
  saveScene,
  type SceneDevice,
  type SceneView,
} from "@/services/scenesService";
import { useDraftsStore, type SceneEntities } from "@/stores/draftsStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToastStore } from "@/stores/toastStore";
import type { Entry } from "@/types/entry";
import { domainOf, type SceneValue } from "@/utils/sceneValues";

import SceneDeviceRow from "./SceneDeviceRow.vue";

const props = defineProps<{
  entry: Entry;
  isTechnicalDetailsVisible: boolean;
}>();

/** Device kinds a scene editor offers to add; others can be in a scene and stay as they are. */
const SCENE_DOMAINS = ["light", "switch", "cover", "climate", "fan", "media_player"];
/** Live edits during a preview wait this long, so a dragged slider does not flood HA. */
const PREVIEW_DELAY_MS = 250;
/** With automatic saving on, a scene is saved this long after the last edit. */
const AUTO_SAVE_DELAY_MS = 1000;

const { t, locale } = useI18n();
const toasts = useToastStore();
const messages = useMessagesStore();
const lookups = useLookupsStore();
const drafts = useDraftsStore();
const settings = useSettingsStore();

const view = ref<SceneView | null>(null);
const devices = reactive(new Map<string, SceneDevice>());
/** What the scene sets, as HA has it saved and as the user edits it; `order` keeps the rows. */
const saved = ref<Record<string, SceneValue>>({});
const draft = ref<Record<string, SceneValue>>({});
const order = ref<string[]>([]);
const isLoading = ref(false);
const hasError = ref(false);
const isSaving = ref(false);
const isPreviewing = ref(false);
/** The scene the shown values belong to; null while another one loads. */
const loadedId = ref<string | null>(null);
/** Devices shown on their own with "Ausprobieren". */
const trying = reactive(new Set<string>());
const isPicking = ref(false);
const addRoot = useTemplateRef("addRoot");
const addButton = useTemplateRef("addButton");
const picker = useTemplateRef("picker");
const pickerStyle = ref<Record<string, string>>({});
onClickOutside(addRoot, () => (isPicking.value = false));

/** Size of the device picker and its distance to the button and the window edges. */
const PICKER = { width: 460, maxHeight: 460, minBelow: 320, gap: 6, margin: 12 };

/**
 * Places the picker next to its button within the window: below, or above when there is more room
 * there, never taller than the room it has (it used to run out of the window at the bottom).
 */
function placePicker(): void {
  const button = addButton.value?.getBoundingClientRect();
  if (!button) return;

  const below = window.innerHeight - button.bottom - PICKER.gap - PICKER.margin;
  const above = button.top - PICKER.gap - PICKER.margin;
  const opensUp = below < PICKER.minBelow && above > below;
  const width = Math.min(PICKER.width, window.innerWidth - 2 * PICKER.margin);
  const left = Math.min(
    Math.max(PICKER.margin, button.left),
    window.innerWidth - width - PICKER.margin,
  );

  pickerStyle.value = {
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${Math.min(PICKER.maxHeight, opensUp ? above : below)}px`,
    ...(opensUp
      ? { bottom: `${window.innerHeight - button.top + PICKER.gap}px` }
      : { top: `${button.bottom + PICKER.gap}px` }),
  };
}

// The picker stays at its place in the window, so it closes when the details scroll or the window
// changes size (scrolling inside the picker itself is fine).
useEventListener(
  document,
  "scroll",
  (event: Event) => {
    if (isPicking.value && !picker.value?.contains(event.target as Node)) isPicking.value = false;
  },
  { capture: true, passive: true },
);
useEventListener(window, "resize", () => (isPicking.value = false));

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
  const kept = drafts.scenes[result.entityId];
  view.value = result;
  devices.clear();
  for (const device of [...result.devices, ...(kept?.added ?? [])]) {
    devices.set(device.entityId, device);
  }
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
    if (loadedId.value && view.value?.isEditable) {
      drafts.keepScene(loadedId.value, saved.value, entities(), addedDevices());
    }
  },
  { deep: true },
);

// ---- editing (switches nothing, unless a preview or "Ausprobieren" runs) ---------------------

const pending = new Map<string, ReturnType<typeof setTimeout>>();

function change(id: string, value: SceneValue): void {
  draft.value = { ...draft.value, [id]: value };
  if (isPreviewing.value || trying.has(id)) showLive(id);
}

function showLive(id: string): void {
  clearTimeout(pending.get(id));
  pending.set(
    id,
    setTimeout(() => {
      pending.delete(id);
      previewScene(props.entry.entityId, { [id]: draft.value[id] ?? {} }).catch(fail);
    }, PREVIEW_DELAY_MS),
  );
}

async function togglePreview(): Promise<void> {
  try {
    if (isPreviewing.value) {
      await restoreScene(props.entry.entityId);
      isPreviewing.value = false;
      trying.clear();
      toasts.show(t("scene.toast.restored"));
    } else {
      await previewScene(props.entry.entityId, entities());
      isPreviewing.value = true;
      trying.clear();
      toasts.show(t("scene.toast.previewOn", order.value.length));
    }
  } catch (error) {
    fail(error);
  }
}

async function tryDevice(id: string): Promise<void> {
  const name = deviceOf(id).name;

  try {
    if (trying.has(id)) {
      await restoreScene(props.entry.entityId, [id]);
      trying.delete(id);
      toasts.show(t("scene.toast.triedBack", { name }));
    } else {
      await previewScene(props.entry.entityId, { [id]: draft.value[id] ?? {} });
      trying.add(id);
      toasts.show(t("scene.toast.tried", { name }));
    }
  } catch (error) {
    fail(error);
  }
}

/** Takes everything the device has right now, also what the editor has no control for. */
function takeCurrent(id: string): void {
  const current = deviceOf(id).current;
  if (!current) return;

  change(id, { state: current.state, ...current.attributes });
  toasts.show(t("scene.toast.taken", { name: deviceOf(id).name }));
}

async function remove(id: string): Promise<void> {
  if (isPreviewing.value || trying.has(id)) {
    await restoreScene(props.entry.entityId, [id]).catch(fail);
    trying.delete(id);
  }
  const next = { ...draft.value };
  delete next[id];
  draft.value = next;
  order.value = order.value.filter((item) => item !== id);
}

async function openPicker(): Promise<void> {
  isPicking.value = !isPicking.value;
  if (!isPicking.value) return;
  placePicker();
  await lookups.loadEntities();
}

async function add(id: string): Promise<void> {
  isPicking.value = false;
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

/**
 * Takes over what HA saved. Edits made while saving stay as a draft (automatic saving sends them
 * next); if another scene was opened meanwhile, only its kept draft is done.
 */
function applySaved(result: SceneView, sent: SceneEntities): void {
  const entityId = result.entityId;
  const kept = drafts.scenes[entityId];
  const isDone = !kept || same(kept.value, sent);

  if (isDone) drafts.dropScene(entityId);
  if (loadedId.value !== entityId) return;
  if (isDone) {
    show(result);
    return;
  }

  view.value = result;
  for (const device of result.devices) devices.set(device.entityId, device);
  saved.value = valuesOf(result);
  // The draft now starts from what was just saved, so it is not taken for a change in HA.
  drafts.dropScene(entityId);
  drafts.keepScene(entityId, saved.value, entities(), addedDevices());
}

async function save(): Promise<void> {
  const entityId = loadedId.value;
  if (!entityId) return;

  const sent = entities();
  isSaving.value = true;

  try {
    applySaved(await saveScene(entityId, sent), sent);
    toasts.show(t("scene.toast.saved", { name: props.entry.name }));
    hasAutoSaveFailed.value = false;
  } catch (error) {
    fail(error);
  } finally {
    isSaving.value = false;
  }
}

// ---- saving automatically (setting under the gear; editing switches nothing anyway) -----------

/** A failed automatic save falls back to the normal footer, so the edits are not left hanging. */
const hasAutoSaveFailed = ref(false);
const isAutoSave = computed(() => settings.isSceneAutoSave && !hasAutoSaveFailed.value);
/** "Alles rückgängig" of this scene: how it was before its first automatic save. */
const undo = computed(() =>
  drafts.sceneUndo && drafts.sceneUndo.entityId === loadedId.value ? drafts.sceneUndo : null,
);
let autoSaveTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleAutoSave(): void {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => void autoSave(), AUTO_SAVE_DELAY_MS);
}

/** Saves without a toast; the footer tells "Automatisch gespeichert · 14:25". */
async function autoSave(): Promise<void> {
  autoSaveTimer = undefined;
  const entityId = loadedId.value;
  if (!entityId || !isDirty.value) return;
  if (isSaving.value) {
    scheduleAutoSave();
    return;
  }

  const sent = entities();
  const before = saved.value;
  isSaving.value = true;

  try {
    const result = await saveScene(entityId, sent);
    const time = new Date().toLocaleTimeString(locale.value, {
      hour: "2-digit",
      minute: "2-digit",
    });
    drafts.noteAutoSave(entityId, before, time);
    applySaved(result, sent);
  } catch (error) {
    hasAutoSaveFailed.value = true;
    fail(error);
  } finally {
    isSaving.value = false;
  }

  // Edited further while saving: those edits follow.
  if (isAutoSave.value && isDirty.value && loadedId.value === entityId) scheduleAutoSave();
}

/** Leaving with an edit still waiting: it is saved right away. */
function flushAutoSave(): void {
  if (autoSaveTimer === undefined) return;
  clearTimeout(autoSaveTimer);
  void autoSave();
}

watch([isAutoSave, () => JSON.stringify(entities())], () => {
  if (isAutoSave.value && isDirty.value && view.value?.isEditable) {
    scheduleAutoSave();
    return;
  }
  clearTimeout(autoSaveTimer);
  autoSaveTimer = undefined;
});

/** Back to how the scene was when it was opened, also in HA, however many saves there were. */
async function undoAll(): Promise<void> {
  const entityId = loadedId.value;
  const base = undo.value?.base;
  if (!entityId || !base) return;

  clearTimeout(autoSaveTimer);
  autoSaveTimer = undefined;
  isSaving.value = true;

  try {
    const result = await saveScene(entityId, base);
    drafts.dropScene(entityId);
    drafts.forgetUndo();
    show(result);
    if (isPreviewing.value) previewScene(entityId, entities()).catch(fail);
    toasts.show(t("scene.toast.undoneAll", { name: props.entry.name }));
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
  if (isPreviewing.value) previewScene(props.entry.entityId, entities()).catch(fail);
}

// ---- leaving: the devices go back to how they were -------------------------------------------

function leave(entityId: string): void {
  if (!isPreviewing.value && trying.size === 0) return;

  isPreviewing.value = false;
  trying.clear();
  restoreScene(entityId)
    .then(() => toasts.show(t("scene.toast.restored")))
    .catch(fail);
}

useEventListener(window, "pagehide", () => {
  if (isPreviewing.value || trying.size > 0) restoreSceneOnLeave(props.entry.entityId);
});

watch(
  () => props.entry.entityId,
  (entityId, previous) => {
    flushAutoSave();
    if (previous) leave(previous);
    isPicking.value = false;
    hasAutoSaveFailed.value = false;
    loadedId.value = null;
    void load();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  flushAutoSave();
  leave(props.entry.entityId);
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
  display: grid;
  gap: 10px;
}

.scene-editor__add {
  position: relative;
}

/* Fixed in the window; placePicker() sets where and how big. */
.scene-editor__picker {
  position: fixed;
  z-index: 50;
  display: flex;
  flex-direction: column;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  box-shadow: var(--shadow);
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
