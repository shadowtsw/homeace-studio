<template>
  <template v-if="items.length">
    <div class="checkup-trash__group">
      <span class="mdi mdi-delete-restore" />
      {{ t("versions.trash.title") }}
      <span class="checkup-trash__line" />
      <span class="checkup-trash__count">{{ items.length }}</span>
    </div>
    <p class="checkup-trash__hint">{{ t("versions.trash.hint") }}</p>

    <div v-for="item in items" :key="`${item.kind}:${item.key}`" class="checkup-trash__row">
      <span class="checkup-trash__icon" :class="`kind-${item.kind}`">
        <span class="mdi" :class="ENTRY_KIND_ICON[item.kind]" />
      </span>
      <span class="checkup-trash__main">
        <b>{{ item.name }}</b>
        <span>
          {{ deletedText(item.deletedAt) }}
          {{ t(`versions.trash.where.${item.where}`) }} ·
          {{ t("versions.trash.versions", { count: item.versionCount }, item.versionCount) }}
        </span>
      </span>
      <span class="checkup-trash__days" :class="{ 'is-soon': item.daysLeft <= SOON_DAYS }">
        {{ t("versions.trash.daysLeft", { count: item.daysLeft }, item.daysLeft) }}
      </span>
      <button class="btn" type="button" :disabled="busyKey === item.key" @click="restore(item)">
        <span class="mdi mdi-restore" />{{ t("versions.trash.restore") }}
      </button>
    </div>
  </template>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { ENTRY_KIND_ICON } from "@/constants/entries";
import { fetchTrash, restoreFromTrash, type TrashItem } from "@/services/versionsService";
import { useCheckupStore } from "@/stores/checkupStore";
import { useEntriesStore } from "@/stores/entriesStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";
import { relativeTime } from "@/utils/runs/relativeTime";

/** Fewer days than this are shown in the warning colour. */
const SOON_DAYS = 7;
const MINUTE_MS = 60_000;

/**
 * "Kürzlich gelöscht" in the check-up: deleted automations, scripts and scenes, kept with their
 * versions for 30 days (HA has no trash). Bringing one back creates it in HA again.
 */
const emit = defineEmits<{ select: [entityId: string] }>();

const { t, locale } = useI18n();
const checkup = useCheckupStore();
const entries = useEntriesStore();
const messages = useMessagesStore();
const toasts = useToastStore();

const items = ref<TrashItem[]>([]);
const busyKey = ref<string | null>(null);

async function load(): Promise<void> {
  try {
    items.value = await fetchTrash();
  } catch (error) {
    console.error("Loading the trash failed", error);
  }
}

onMounted(load);
// A deletion outside HomeAce shows up once the check-up reloads after HA's change.
watch(() => checkup.findings, load);

function deletedText(iso: string): string {
  const now = new Date();
  if (now.getTime() - Date.parse(iso) < MINUTE_MS) return t("versions.trash.deletedJustNow");
  return t("versions.trash.deleted", { when: relativeTime({ iso, now, locale: locale.value }) });
}

async function restore(item: TrashItem): Promise<void> {
  busyKey.value = item.key;
  try {
    const back = await restoreFromTrash({ kind: item.kind, key: item.key });
    // HA may give the entry a new entity ID; references elsewhere still use the old one.
    const text =
      back.entityId === item.entityId
        ? t("versions.trash.restored", { name: back.name })
        : t("versions.trash.restoredNewId", {
            name: back.name,
            entityId: back.entityId,
            before: item.entityId,
          });
    toasts.show({ text });
    await entries.load();
    await load();
    emit("select", back.entityId);
  } catch (error) {
    toasts.show({
      text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
      tone: "error",
    });
  } finally {
    busyKey.value = null;
  }
}
</script>

<style scoped>
.checkup-trash__group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 18px 4px 2px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.checkup-trash__line {
  flex: 1;
  height: 1px;
  background: var(--line);
}

.checkup-trash__count {
  font-variant-numeric: tabular-nums;
}

.checkup-trash__hint {
  margin: 0 4px 8px;
  color: var(--muted);
  font-size: 12.5px;
}

.checkup-trash__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 6px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.checkup-trash__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.checkup-trash__main {
  display: grid;
  flex: 1 1 180px;
  gap: 2px;
  min-width: 0;
  color: var(--muted);
  font-size: 12.5px;
}

.checkup-trash__main b {
  color: var(--fg);
  font-size: 14px;
}

.checkup-trash__days {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 11.5px;
  font-weight: 700;
}

.checkup-trash__days.is-soon {
  background: var(--warn-soft);
  color: var(--warn);
}
</style>
