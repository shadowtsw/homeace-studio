<template>
  <component
    :is="isLink ? 'button' : 'div'"
    :type="isLink ? 'button' : undefined"
    class="dep-user"
    :class="{ 'dep-user--link': isLink, 'dep-user--compact': isCompact }"
    @click="isLink && emit('open', user.entityId)"
  >
    <span class="dep-user__icon" :class="entry ? `kind-${entry.kind}` : 'dep-user__icon--plain'">
      <span class="mdi" :class="entry ? ENTRY_KIND_ICON[entry.kind] : icon" />
    </span>
    <span class="dep-user__main">
      <b>{{ user.name }}</b>
      <small>{{ what }}</small>
    </span>
    <span v-if="isLink && !isCompact" class="mdi mdi-chevron-right dep-user__chevron" />
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { DOMAIN_ICON, FALLBACK_DOMAIN_ICON } from "@/constants/domainIcons";
import { ENTRY_KIND_ICON } from "@/constants/entries";
import type { DependencyUser } from "@/services/dependenciesService";
import type { Entry } from "@/types/entry";

/** An automation, script, scene or group that uses something, and what it does with it. */
const props = defineProps<{
  user: DependencyUser;
  /** Set when it is an entry, which then opens on click (groups are not). */
  entry: Entry | null;
  /** Smaller, inside an expanded "+2 more". */
  isCompact?: boolean;
  /** Only shown, not opened (in the delete dialog). */
  isPlain?: boolean;
}>();

const emit = defineEmits<{
  open: [entityId: string];
}>();

const { t, te } = useI18n();

const isLink = computed(() => props.entry !== null && !props.isPlain);
const domain = computed(() => props.user.entityId.split(".")[0] ?? "");
const icon = computed(() => DOMAIN_ICON[domain.value] ?? FALLBACK_DOMAIN_ICON);

/** "Automation" for an entry; otherwise the domain's name ("Licht"), or the domain itself. */
const kind = computed(() => {
  if (props.entry) return t(`kind.${props.entry.kind}`);

  const domainKey = `picker.kinds.${domain.value}`;
  return te(domainKey) ? t(domainKey) : domain.value;
});
/** "Automation · reagiert darauf, steuert es". */
const what = computed(() => {
  const verbs = props.user.roles.map((role) => t(`deps.verbs.${role}`)).join(", ");

  return props.isCompact ? verbs : `${kind.value} · ${verbs}`;
});
</script>

<style scoped>
.dep-user {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
}

.dep-user + .dep-user {
  border-top: 1px solid var(--line);
}

.dep-user--link {
  cursor: pointer;
}

.dep-user--link:hover,
.dep-user--link:focus-visible {
  background: var(--sunken);
}

.dep-user--compact {
  gap: 8px;
  padding: 5px 6px;
  border-radius: 7px;
}

.dep-user--compact + .dep-user--compact {
  border-top: 0;
}

.dep-user__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  font-size: 17px;
}

.dep-user--compact .dep-user__icon {
  width: 24px;
  height: 24px;
  font-size: 14px;
}

.dep-user__icon--plain {
  background: var(--sunken);
  color: var(--muted);
}

.dep-user__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.dep-user__main b {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dep-user--compact .dep-user__main {
  flex-direction: row;
  align-items: baseline;
  gap: 6px;
}

.dep-user__main small {
  overflow: hidden;
  color: var(--faint);
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dep-user__chevron {
  color: var(--faint);
}
</style>
