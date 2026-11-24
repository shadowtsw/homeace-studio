<template>
  <div class="save-footer" role="status">
    <span class="save-footer__dot" />
    <div class="save-footer__text">
      <strong>{{ t("save.unsaved") }}</strong>
      <small v-if="note">{{ note }}</small>
    </div>
    <button type="button" class="btn" :disabled="isSaving" @click="emit('discard')">
      {{ t("save.discard") }}
    </button>
    <button
      type="button"
      class="btn btn--primary"
      :disabled="isSaving || Boolean(blockedBy)"
      :title="blockedBy ?? undefined"
      @click="emit('save')"
    >
      <span class="mdi mdi-cloud-upload-outline" />
      {{ isSaving ? t("save.saving") : t("save.save") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{
  isSaving: boolean;
  /** A short line below "Ungespeicherte Änderungen", e.g. that HA changed meanwhile. */
  note?: string | null;
  /** Why saving is not possible right now; disables the button and is its tooltip. */
  blockedBy?: string | null;
}>();

const emit = defineEmits<{ save: []; discard: [] }>();

const { t } = useI18n();
</script>

<style scoped>
/* Sits in the details' footer slot below the scrolling content, so it is always in view. */
.save-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 28px;
  border-top: 1px solid var(--line);
  background: var(--surface);
  box-shadow: 0 -8px 20px rgb(0 0 0 / 14%);
  animation: save-footer-in 0.18s ease-out;
}

.save-footer__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--warn);
}

.save-footer__text {
  flex: 1;
  min-width: 160px;
  display: grid;
}

.save-footer__text strong {
  color: var(--warn);
  font-size: 13px;
}

.save-footer__text small {
  color: var(--muted);
  font-size: 12px;
}

@keyframes save-footer-in {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
}

@media (max-width: 820px) {
  .save-footer {
    padding-inline: max(16px, env(safe-area-inset-left, 0px));
    padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  }

  .save-footer .btn--primary {
    flex: 1;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .save-footer {
    animation: none;
  }
}
</style>
