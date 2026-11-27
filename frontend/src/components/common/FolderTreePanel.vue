<template>
  <div
    class="folder-tree-panel"
    role="dialog"
    :aria-label="t('folderPicker.title')"
    @keydown.escape.stop="emit('close')"
  >
    <div class="folder-tree-panel__head">
      <input
        ref="search"
        v-model="query"
        class="field-input"
        type="search"
        :placeholder="t('folderPicker.search')"
        :aria-label="t('folderPicker.search')"
      />
      <PopoverClose @close="emit('close')" />
    </div>
    <ul class="folder-tree-panel__tree">
      <li v-for="row in rows" :key="row.node.path" :style="{ paddingLeft: `${row.depth * 16}px` }">
        <button
          v-if="row.node.children.length && !query"
          class="folder-tree-panel__toggle"
          type="button"
          :aria-label="
            expanded.has(row.node.path) ? t('folderPicker.collapse') : t('folderPicker.expand')
          "
          @click="toggleNode(row.node.path)"
        >
          <span
            class="mdi"
            :class="expanded.has(row.node.path) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
          />
        </button>
        <span v-else class="folder-tree-panel__spacer" />
        <button
          class="folder-tree-panel__folder"
          :class="{ 'folder-tree-panel__folder--current': row.node.path === current }"
          type="button"
          @click="emit('pick', row.node.path)"
        >
          <span class="mdi mdi-folder-outline" />
          <span>{{ query ? row.node.path : row.node.name }}</span>
        </button>
      </li>
      <li v-if="!rows.length" class="folder-tree-panel__empty">{{ t("folderPicker.none") }}</li>
    </ul>
    <div v-if="$slots.footer" class="folder-tree-panel__foot"><slot name="footer" /></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import { buildCategoryTree, type CategoryNode } from "@/utils/categories/categoryTree";

import PopoverClose from "./PopoverClose.vue";

/**
 * The folder tree as a small panel with a search, like the navigation: branches open by the
 * chevron, a click on a folder picks it. The branch of `current` starts open.
 */
const props = defineProps<{
  folders: readonly string[];
  current?: string;
}>();

const emit = defineEmits<{
  pick: [path: string];
  close: [];
}>();

const { t } = useI18n();
const searchInput = useTemplateRef("search");
const query = ref("");
const levels = (props.current ?? "").split("/").filter(Boolean);
const expanded = ref(new Set(levels.map((_, index) => levels.slice(0, index + 1).join("/"))));

const tree = computed(() =>
  buildCategoryTree({ categoryPaths: [], savedFolders: [], allCategoryPaths: props.folders }),
);

type Row = { node: CategoryNode; depth: number };

/** Visible rows: the open branches, or every match (as a full path) while searching. */
const rows = computed<Row[]>(() => {
  const result: Row[] = [];
  const needle = query.value.trim().toLowerCase();
  const walk = ({ nodes, depth }: { nodes: CategoryNode[]; depth: number }): void => {
    for (const node of nodes) {
      if (needle) {
        if (node.path.toLowerCase().includes(needle)) result.push({ node, depth: 0 });
        walk({ nodes: node.children, depth: depth + 1 });
      } else {
        result.push({ node, depth });
        if (expanded.value.has(node.path)) walk({ nodes: node.children, depth: depth + 1 });
      }
    }
  };
  walk({ nodes: tree.value, depth: 0 });

  return result;
});

function toggleNode(path: string): void {
  const next = new Set(expanded.value);
  if (!next.delete(path)) next.add(path);
  expanded.value = next;
}

onMounted(() => searchInput.value?.focus());
</script>

<style scoped>
.folder-tree-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 8px;
  width: min(420px, 100%);
  min-width: 260px;
  max-height: 340px;
  padding: 10px;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.folder-tree-panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.folder-tree-panel__tree {
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;
}

.folder-tree-panel__tree li {
  display: flex;
  align-items: center;
  gap: 2px;
}

.folder-tree-panel__toggle,
.folder-tree-panel__spacer {
  display: grid;
  flex: none;
  place-items: center;
  width: 24px;
  height: 28px;
  border: 0;
  background: none;
  color: var(--faint);
  cursor: pointer;
}

.folder-tree-panel__folder {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 28px;
  padding: 0 6px;
  border: 0;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  text-align: left;
}

.folder-tree-panel__folder:hover,
.folder-tree-panel__folder:focus-visible,
.folder-tree-panel__folder--current {
  background: var(--accent-soft);
  color: var(--accent);
}

.folder-tree-panel__folder .mdi {
  color: var(--faint);
}

.folder-tree-panel__empty {
  padding: 6px;
  color: var(--muted);
}

.folder-tree-panel__foot {
  padding-top: 8px;
  border-top: 1px solid var(--line);
}
</style>
