<template>
  <button type="button" class="list-group-head" :aria-expanded="isOpen" @click="emit('toggle')">
    <span class="mdi" :class="isOpen ? 'mdi-chevron-down' : 'mdi-chevron-right'" />
    <span class="list-group-head__name">{{ name }}</span>
    <span class="list-group-head__line" />
    <span class="list-group-head__count">{{ count }}</span>
  </button>
</template>

<script setup lang="ts">
/** The head of a folder group in the list: open or closed, its name and how many rows it has. */
defineProps<{
  name: string;
  /** Entries and plain entities of the group. */
  count: number;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  /** Clicked: the list opens or closes the group. */
  toggle: [];
}>();
</script>

<style scoped>
.list-group-head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: calc(100% - 4px);
  margin: 10px 2px 4px;
  padding: 5px 6px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.list-group-head:hover {
  background: var(--sunken);
  color: var(--fg);
}

.list-group-head .mdi {
  color: var(--faint);
  font-size: 16px;
}

.list-group-head__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-group-head__line {
  flex: 1;
  height: 1px;
  background: var(--line);
}

.list-group-head__count {
  color: var(--faint);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
</style>
