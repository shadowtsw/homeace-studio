<template>
  <button
    class="preview-note__mark"
    type="button"
    :aria-label="t('app.previewAbout')"
    :title="t('app.previewAbout')"
    @click="open"
  >
    {{ t("app.preview") }}
    <span v-if="isUnread" class="preview-note__dot" />
  </button>

  <Teleport to="body">
    <DialogFrame v-if="isOpen" :title="t('previewNote.title')" @close="isOpen = false">
      <div class="preview-note__text">
        <p v-for="paragraph in PARAGRAPHS" :key="paragraph">
          {{ t(`previewNote.${paragraph}`) }}
        </p>
      </div>
      <p class="preview-note__hint">
        <span class="mdi mdi-information-outline" />{{ t("previewNote.feedbackHint") }}
      </p>
      <template #buttons>
        <button class="btn" type="button" @click="isOpen = false">{{ t("common.close") }}</button>
        <a class="btn btn--primary" :href="FEEDBACK_URL" target="_blank" rel="noopener noreferrer">
          <span class="mdi mdi-open-in-new" />{{ t("settings.previewFeedbackOpen") }}
        </a>
      </template>
    </DialogFrame>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import DialogFrame from "@/components/common/DialogFrame.vue";
import { usePreference } from "@/composables/usePreference";
import { PREFERENCES } from "@/constants/preferences";
import { previewFeedbackUrl } from "@/utils/releaseChannel";

/**
 * The text's edition. Raise it when the text changes (planned for 0.15), so the dot shows again on
 * every device that read the old one.
 */
const NOTE_EDITION = "0.14";
const PARAGRAPHS = ["welcome", "purpose", "release", "storage", "feedback"] as const;
const FEEDBACK_URL = previewFeedbackUrl(__APP_VERSION__);

/**
 * The "Preview" mark in the top bar of the Preview app, as a button: it opens a note on what the
 * Preview is, what carries over to the normal app, and how to give feedback. A dot shows until the
 * note was opened once on this device. It never opens by itself.
 */
const { t } = useI18n();
const readEdition = usePreference({ preference: PREFERENCES.previewNoteRead, defaultValue: "" });
const isOpen = ref(false);
const isUnread = computed(() => readEdition.value !== NOTE_EDITION);

function open(): void {
  isOpen.value = true;
  readEdition.value = NOTE_EDITION;
}
</script>

<style scoped>
/* Looks like the former mark; only hover and focus tell it is a button (the bar has no room to spare). */
.preview-note__mark {
  position: relative;
  flex: none;
  padding: 2px 8px;
  border: 0;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
}

.preview-note__mark:hover {
  box-shadow: 0 0 0 1px var(--accent);
}

.preview-note__dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 2px var(--surface);
}

.preview-note__text p {
  margin: 0 0 10px;
  line-height: 1.5;
}

.preview-note__hint {
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.45;
}
</style>
