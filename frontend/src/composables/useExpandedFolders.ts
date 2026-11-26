import { ref, watch, type Ref } from "vue";

import { pathAndAncestors } from "@/utils/categories/categoryPath";
import { isSpecialCategory } from "@/utils/entries/entryFilter";

/**
 * Which folders of the tree are open: pure UI state. A folder selected from elsewhere (a new
 * folder, the list) opens the tree down to it.
 */
export function useExpandedFolders({ selected }: { selected: Ref<string> }) {
  const expandedPaths = ref(new Set<string>());

  function toggle(path: string): void {
    const next = new Set(expandedPaths.value);

    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }

    expandedPaths.value = next;
  }

  function expand(path: string): void {
    expandedPaths.value = new Set(expandedPaths.value).add(path);
  }

  watch(selected, (path) => {
    if (isSpecialCategory(path)) return;

    const next = new Set(expandedPaths.value);
    for (const folder of pathAndAncestors(path)) next.add(folder);
    expandedPaths.value = next;
  });

  return { expandedPaths, toggle, expand };
}
