<template>
  <!-- Fixed above the rows in both views, so it is always clear which side is which version. The
       name control sits at the chosen version: left, or right in "Mit Vorgänger". -->
  <div class="version-head">
    <div class="version-head__cell">
      <template v-if="mode === 'prev' && previous">
        {{ t("versions.compare.before") }} · <b>{{ whenOf(previous.at) }}</b>
      </template>
      <template v-else>
        <b>{{ whenOf(version.at) }}</b>
        <span v-if="version.user">· {{ version.user.name }}</span>
        <template v-if="mode === 'restore'">
          <span v-if="version.name">· „{{ version.name }}“</span>
          <span>· {{ t("versions.compare.isFetched") }}</span>
        </template>
        <VersionNameControl
          v-else
          :version="version"
          @name="(name) => emit('name', { name })"
          @unpin="unpin"
        />
      </template>
    </div>

    <div class="version-head__cell version-head__right">
      <template v-if="mode === 'prev'">
        {{ t("versions.compare.after") }} · <b>{{ whenOf(version.at) }}</b>
        <span v-if="version.user">· {{ version.user.name }}</span>
        <VersionNameControl
          :version="version"
          @name="(name) => emit('name', { name })"
          @unpin="unpin"
        />
      </template>
      <template v-else>
        <b>{{ t("versions.compare.now") }}</b>
        <!-- "Jetzt" always right, always with the same tag (owner rule) -->
        <span class="version-head__now">{{ t("versions.compare.nowTag") }}</span>
      </template>
    </div>

    <!-- Unnamed, this version would be deleted at once: ask first, across the whole width -->
    <div v-if="isAskingDrop" class="version-head__warn" role="alert">
      <span class="mdi mdi-alert-outline" />
      <span>{{ t("versions.compare.dropWarn", { max: VERSION_LIMITS.unnamed }) }}</span>
      <div class="version-head__warn-buttons">
        <button class="btn btn--sm" type="button" @click="isAskingDrop = false">
          {{ t("versions.compare.keep") }}
        </button>
        <button class="btn btn--sm version-head__drop" type="button" @click="confirmDrop">
          {{ t("versions.compare.unpinDrop") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { VERSION_LIMITS } from "@/constants/versions";
import type { Version } from "@/services/versionsService";
import { wouldDropWhenUnnamed } from "@/utils/versions/naming";

import VersionNameControl from "./VersionNameControl.vue";

const props = defineProps<{
  mode: "view" | "prev" | "restore";
  /** The chosen version. */
  version: Version;
  /** Its predecessor, for "Mit Vorgänger". */
  previous: Version | null;
  /** All versions, oldest first: whether unnaming would delete it. */
  versions: Version[];
  whenOf: (iso: string) => string;
}>();
const emit = defineEmits<{
  /** A new name, or null to take it away (`confirmDrop`: the user agreed it gets deleted). */
  name: [change: { name: string | null; confirmDrop?: boolean }];
}>();

const { t } = useI18n();
const isAskingDrop = ref(false);

watch(
  () => [props.version.id, props.mode],
  () => (isAskingDrop.value = false),
);

function unpin(): void {
  if (wouldDropWhenUnnamed({ versions: props.versions, versionId: props.version.id })) {
    isAskingDrop.value = true;
    return;
  }
  emit("name", { name: null });
}

function confirmDrop(): void {
  isAskingDrop.value = false;
  emit("name", { name: null, confirmDrop: true });
}
</script>

<style scoped>
.version-head {
  display: grid;
  flex: none;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  margin-bottom: 8px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 12.5px;
}

.version-head__cell {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  min-width: 0;
  padding: 8px 12px;
}

.version-head__cell b {
  color: var(--fg);
  font-weight: 600;
}

.version-head__right {
  border-left: 1px solid var(--line);
}

.version-head__now {
  margin-left: auto;
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.version-head__warn {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 6px 8px;
  margin: 0 8px 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--warn-soft);
  color: var(--fg);
  line-height: 1.4;
}

.version-head__warn > .mdi {
  color: var(--warn);
}

.version-head__warn-buttons {
  display: flex;
  flex-wrap: wrap;
  grid-column: 1 / -1;
  justify-content: flex-end;
  gap: 6px;
}

.version-head__warn-buttons .btn {
  height: auto;
  min-height: 28px;
  white-space: normal;
}

.version-head__drop {
  border-color: var(--err);
  color: var(--err);
}

@media (max-width: 640px) {
  .version-head__cell {
    padding: 7px 9px;
  }
}
</style>
