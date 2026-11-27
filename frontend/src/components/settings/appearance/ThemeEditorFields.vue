<template>
  <div v-if="editor.draft && editor.editedColors" class="editor-fields">
    <b class="editor-fields__group">{{ t("settings.appearance.editor.baseColors") }}</b>
    <ThemeColorField
      v-for="key in BASE_KEYS"
      :key="key"
      :label="t(`settings.appearance.words.color.${key}`)"
      :value="editor.editedColors[key]"
      :disabled="editor.isEditedDerived"
      @update="(value) => editor.setColor({ key, value })"
    />

    <b class="editor-fields__group">{{ t("settings.appearance.editor.flowColors") }}</b>
    <ThemeColorField
      v-for="key in FLOW_KEYS"
      :key="key"
      :label="t(`settings.appearance.words.color.${key}`)"
      :value="editor.editedColors[key]"
      :disabled="editor.isEditedDerived"
      @update="(value) => editor.setColor({ key, value })"
    />

    <label v-if="editor.draft.light" class="editor-fields__derive">
      <input
        type="checkbox"
        :checked="editor.draft.isDarkDerived"
        @change="editor.setDarkDerived(($event.target as HTMLInputElement).checked)"
      />
      {{ t("settings.appearance.editor.deriveDark") }}
    </label>
    <p v-if="editor.isEditedDerived" class="settings-note">
      <span class="mdi mdi-information-outline" />
      {{ t("settings.appearance.editor.derivedHint") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import type { ThemeColorKey } from "@/core/themes/themeFormat";
import { useThemeEditorStore } from "@/stores/themeEditorStore";

import ThemeColorField from "./ThemeColorField.vue";

const BASE_KEYS: ThemeColorKey[] = ["accent", "background", "surface", "text"];
const FLOW_KEYS: ThemeColorKey[] = ["flowWhen", "flowIf", "flowThen"];

/**
 * The colours of the version being edited: four base colours, the three flow colours (filled in
 * from the start theme) and "Dunkel automatisch ableiten". While the dark version is derived its
 * fields only show the derived values.
 */
const { t } = useI18n();
const editor = useThemeEditorStore();
</script>

<style scoped>
.editor-fields {
  display: grid;
}

.editor-fields__group {
  margin: 8px 0 2px;
  color: var(--faint);
  font-size: 11.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.editor-fields__derive {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 13px;
}
</style>
