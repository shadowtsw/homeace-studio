import { ref } from "vue";

import { useLayoutStore } from "@/stores/layoutStore";
import { useStudioStore } from "@/stores/studioStore";

/**
 * Picking on the studio page. A picked folder closes the navigation drawer; a picked entry shows the
 * detail column (unfolded, and on phones as a full-screen layer). The two flags only matter on
 * narrow screens, where CSS shows the navigation as a drawer and the detail as a layer.
 */
export function useStudioSelection() {
  const studio = useStudioStore();
  const layout = useLayoutStore();

  const isNavOpen = ref(false);
  const isDetailOpen = ref(false);

  function selectCategory(path: string): void {
    studio.selectCategory(path);
    isNavOpen.value = false;
  }

  function showDetail(): void {
    isDetailOpen.value = true;
    layout.isDetailFolded = false;
  }

  function selectEntry(entityId: string): void {
    studio.selectEntry(entityId);
    showDetail();
  }

  return { isNavOpen, isDetailOpen, selectCategory, selectEntry, showDetail };
}
