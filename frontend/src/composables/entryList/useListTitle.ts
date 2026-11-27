import { computed, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { CATEGORY_FILTER, CATEGORY_SEPARATOR } from "@/constants/entries";
import type { AreaListView } from "@/utils/areas/areaNotes";

const BREADCRUMB_SEPARATOR = " › ";

/** The title above the entry list: where it is (breadcrumb), its name and a line about it. */
export type ListTitle = { crumb: string; name: string; subtitle: string };

type UseListTitleOptions = {
  /** Selected tree node: a category path or one of CATEGORY_FILTER. */
  category: Ref<string>;
  /** Set while an area is selected: its title and why each entry is in it. */
  areaView: Ref<AreaListView | null>;
  /** A real folder is selected, not a filter. */
  isRealCategory: Ref<boolean>;
  isTechnicalDetailsVisible: Ref<boolean>;
};

/** The title of the entry list and the labels of its folder groups. */
export function useListTitle({
  category,
  areaView,
  isRealCategory,
  isTechnicalDetailsVisible,
}: UseListTitleOptions) {
  const { t } = useI18n();

  const title = computed((): ListTitle => {
    if (areaView.value)
      return { crumb: "", name: areaView.value.name, subtitle: areaView.value.subtitle };

    if (category.value === CATEGORY_FILTER.all) {
      return { crumb: "", name: t("nav.all"), subtitle: t("list.allSubtitle") };
    }

    if (category.value === CATEGORY_FILTER.favorites) {
      return { crumb: "", name: t("nav.favorites"), subtitle: t("list.favoritesSubtitle") };
    }

    if (category.value === CATEGORY_FILTER.uncategorized) {
      return { crumb: "", name: t("nav.uncategorized"), subtitle: t("list.uncategorizedSubtitle") };
    }

    const segments = category.value.split(CATEGORY_SEPARATOR);
    const name = segments.pop() ?? category.value;

    // How HA stores the folder is a technical detail; the user sees the folder itself.
    return {
      crumb: segments.join(BREADCRUMB_SEPARATOR),
      name,
      subtitle: isTechnicalDetailsVisible.value ? t("list.inHa", { path: category.value }) : "",
    };
  });

  /** Inside a selected category, group headers show the path relative to it. */
  function groupLabel(path: string | null): string {
    if (path === null) return t("nav.uncategorized");
    if (!isRealCategory.value) return path.split(CATEGORY_SEPARATOR).join(BREADCRUMB_SEPARATOR);
    if (path === category.value) return t("list.directIn", { name: title.value.name });

    const relativePath = path.slice(category.value.length + CATEGORY_SEPARATOR.length);

    return relativePath.split(CATEGORY_SEPARATOR).join(BREADCRUMB_SEPARATOR);
  }

  return { title, groupLabel };
}
