<template>
  <!-- "mdi" on the SVG too, so the sizes set for .mdi in the places that use it apply. -->
  <svg
    v-if="packIcon"
    class="mdi app-icon"
    :viewBox="packIcon.viewBox ?? '0 0 24 24'"
    aria-hidden="true"
  >
    <path :d="packIcon.path" />
  </svg>
  <span v-else class="mdi" :class="mdiClass" aria-hidden="true" />
</template>

<script setup lang="ts">
import { computed, watchEffect } from "vue";

import { useIconPacksStore } from "@/stores/iconPacksStore";
import { MDI_PACK, parseHaIcon } from "@/utils/haIcon";

/**
 * An HA icon: a standard one ("mdi:lamp") from the icon font, one of an icon pack ("phu:wallbox")
 * as SVG. Unknown, empty or from a pack that is not loaded: the fallback.
 */
const props = defineProps<{
  icon: string | null | undefined;
  /** MDI class shown instead, e.g. the icon of the entry's kind. */
  fallback: string;
}>();

const packs = useIconPacksStore();
const parsed = computed(() => parseHaIcon(props.icon));

const mdiClass = computed(() => {
  const name = parsed.value?.pack === MDI_PACK ? parsed.value.name : null;
  return name && packs.hasStandardIcon(name) ? `mdi-${name}` : props.fallback;
});

const packIcon = computed(() => {
  const icon = props.icon?.trim();
  if (!icon || !parsed.value || parsed.value.pack === MDI_PACK) return null;
  return packs.paths[icon] ?? null;
});

watchEffect(() => {
  const icon = props.icon?.trim();
  if (icon && parsed.value && parsed.value.pack !== MDI_PACK) void packs.resolve(icon);
});
</script>

<style scoped>
.app-icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  fill: currentColor;
  vertical-align: -0.125em;
}
</style>
