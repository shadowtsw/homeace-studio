import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";

import {
  fetchIconPackResources,
  haWindow,
  iconSets,
  loadIconScripts,
  type PackIcon,
} from "@/services/iconPacksService";
import { MDI_PACK, mdiNamesFromStyleSheets, parseHaIcon } from "@/utils/haIcon";

/**
 * Icons beyond HA's standard ones: the packs registered in HA's page (custom-brand-icons and co.).
 * HA loads them only once a dashboard was open, so when none is there yet, HomeAce Studio loads the
 * icon pack resources itself (never cards). Outside HA (own port, demo) there are none.
 */
export const useIconPacksStore = defineStore("iconPacks", () => {
  /** Opened from HA's sidebar: HA's page is around it. */
  const isInHa = haWindow() !== null;
  const isReady = ref(false);
  /** The prefixes of the packs found, e.g. ["phu"]. */
  const packs = ref<string[]>([]);
  /** HA lists an icon pack resource, but no pack appeared: the hint to open a dashboard. */
  const isPackMissing = ref(false);
  /** Path per pack icon ("phu:wallbox"); null when the pack does not know it. */
  const paths = ref<Record<string, PackIcon | null>>({});
  /** The icon names per pack that can list them, for the search. */
  const packIcons = shallowRef<Record<string, string[]>>({});

  let loading: Promise<void> | null = null;
  let mdiNames: string[] | null = null;
  let mdiNameSet: Set<string> | null = null;
  const requested = new Set<string>();

  /** Finds the packs once; loads their scripts when HA has not yet. */
  function load(): Promise<void> {
    loading ??= (async () => {
      // Step 1: what HA's page already has
      if (isInHa && Object.keys(iconSets()).length === 0) {
        // Step 2: HA had no dashboard open yet, so we load the icon resources ourselves
        const urls = await fetchIconPackResources().catch((): string[] => []);
        await loadIconScripts(urls);
        isPackMissing.value = urls.length > 0 && Object.keys(iconSets()).length === 0;
      }
      packs.value = Object.keys(iconSets()).sort();
      isReady.value = true;
    })();

    return loading;
  }

  /** Looks up a pack icon once; the result lands in `paths`. */
  async function resolve(icon: string): Promise<void> {
    const parsed = parseHaIcon(icon);
    if (!parsed || parsed.pack === MDI_PACK || requested.has(icon)) return;
    requested.add(icon);

    await load();
    let found: PackIcon | undefined;
    try {
      // A pack is someone else's code: a failing one must not break the list
      found = await iconSets()[parsed.pack]?.getIcon(parsed.name);
    } catch {
      found = undefined;
    }
    paths.value = { ...paths.value, [icon]: found?.path ? found : null };
  }

  /** The names of all standard icons, read once from the font's stylesheet. */
  function standardIcons(): string[] {
    mdiNames ??= mdiNamesFromStyleSheets(Array.from(document.styleSheets));
    return mdiNames;
  }

  /** Whether HA knows this standard icon; true when the stylesheet could not be read. */
  function hasStandardIcon(name: string): boolean {
    mdiNameSet ??= new Set(standardIcons());
    return mdiNameSet.size === 0 || mdiNameSet.has(name);
  }

  /** The names in every pack that can list them, for the search. */
  async function loadPackIcons(): Promise<void> {
    await load();
    const sets = iconSets();
    const lists = await Promise.all(
      packs.value.map(async (pack) => {
        let list: { name: string }[] = [];
        try {
          list = (await sets[pack]?.getIconList?.()) ?? [];
        } catch {
          list = [];
        }
        return [pack, list.map((item) => item.name)] as const;
      }),
    );
    packIcons.value = Object.fromEntries(lists);
  }

  return {
    isInHa,
    isReady,
    packs,
    isPackMissing,
    paths,
    packIcons,
    load,
    resolve,
    standardIcons,
    hasStandardIcon,
    loadPackIcons,
  };
});
