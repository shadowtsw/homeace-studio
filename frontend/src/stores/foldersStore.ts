import { defineStore } from "pinia";
import { ref } from "vue";

import {
  createFolder,
  deleteFolder,
  fetchFolders,
  setFolderColor,
  setFolderOrder,
} from "@/services/foldersService";

/** Empty folders the user created and the colors of folders (both only in HomeAce Studio). */
export const useFoldersStore = defineStore("folders", () => {
  const folders = ref<string[]>([]);
  const colors = ref<Record<string, string>>({});
  const order = ref<Record<string, string[]>>({});

  async function load(): Promise<void> {
    try {
      const overview = await fetchFolders();
      folders.value = overview.saved;
      colors.value = overview.colors;
      order.value = overview.order ?? {};
    } catch (error) {
      // The tree still works with the folders that come from HA categories.
      console.error("Loading folders failed", error);
    }
  }

  /** Errors go to the caller, which shows them. @returns The stored path. */
  async function create(path: string): Promise<string> {
    const storedPath = await createFolder(path);
    await load();

    return storedPath;
  }

  async function remove(path: string): Promise<void> {
    await deleteFolder(path);
    await load();
  }

  async function setColor({ path, color }: { path: string; color: string | null }): Promise<void> {
    await setFolderColor({ path, color });
    await load();
  }

  /** Errors go to the caller. */
  async function setOrder({
    parent,
    children,
  }: {
    parent: string;
    children: string[];
  }): Promise<void> {
    await setFolderOrder({ parent, order: children });
    await load();
  }

  return { folders, colors, order, load, create, remove, setColor, setOrder };
});
