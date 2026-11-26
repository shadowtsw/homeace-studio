import type { SortingNames } from "@/utils/entitySorting/model";

type Translate = (key: string) => string;

/**
 * The names the engine gives groups of its own ("System", "Rauchmelder", …), in the UI language.
 * Called inside a computed, so the names follow a language switch.
 */
export function sortingNames(t: Translate): SortingNames {
  return {
    system: t("entitySorting.names.system"),
    systemKinds: {
      sun: t("entitySorting.names.sun"),
      zone: t("entitySorting.names.zone"),
      person: t("entitySorting.names.person"),
      weather: t("entitySorting.names.weather"),
      update: t("entitySorting.names.update"),
      backup: t("entitySorting.names.backup"),
    },
    deviceClasses: {
      smoke: t("entitySorting.names.smoke"),
      battery: t("entitySorting.names.battery"),
      moisture: t("entitySorting.names.moisture"),
      window: t("entitySorting.names.window"),
      door: t("entitySorting.names.door"),
      motion: t("entitySorting.names.motion"),
    },
  };
}
