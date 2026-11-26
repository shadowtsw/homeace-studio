import { defineStore } from "pinia";
import { ref } from "vue";

import { ApiError } from "@/services/api";
import { fetchMessageCatalog } from "@/services/messagesService";
import { fillPlaceholders } from "@/utils/text";

/**
 * Texts for backend message IDs (docs/api.md, GET /api/messages).
 * The backend owns these texts; UI texts live in vue-i18n.
 */
export const useMessagesStore = defineStore("messages", () => {
  const catalog = ref<Record<string, string>>({});

  async function load(language: string): Promise<void> {
    try {
      catalog.value = await fetchMessageCatalog(language);
    } catch (error) {
      // Without a catalog, errors still show the built-in fallback text.
      console.error("Loading the message catalog failed", error);
    }
  }

  /**
   * Text for an error, with placeholders like {path} filled in.
   */
  function textFor({ error, fallback }: { error: unknown; fallback: string }): string {
    if (!(error instanceof ApiError)) return fallback;

    const template = catalog.value[error.messageId];

    return template ? fillPlaceholders({ template, params: error.data?.params ?? {} }) : fallback;
  }

  return { catalog, load, textFor };
});
