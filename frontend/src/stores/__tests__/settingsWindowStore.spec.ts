import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";

import { useSettingsWindowStore } from "@/stores/settingsWindowStore";

let router: Router;

/** The window's keys in the address, as the browser history holds them. */
function windowQuery(): Record<string, unknown> {
  const { settings, topic, step } = router.currentRoute.value.query;
  return { settings, topic, step };
}

/** A store on a phone, or wherever the tabs do not fit: list → page. */
async function listLayoutStore(): Promise<ReturnType<typeof useSettingsWindowStore>> {
  const settingsWindow = useSettingsWindowStore();
  settingsWindow.reportTabsOverflow(true);
  await vi.waitFor(() => expect(router.currentRoute.value.query).toEqual({}));

  return settingsWindow;
}

describe("settingsWindowStore", () => {
  // An app with a router in memory instead of the browser's history; the store gets it like in
  // the real app
  beforeEach(async () => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: { render: () => null } }],
    });
    const pinia = createPinia();
    createApp({ render: () => null })
      .use(pinia)
      .use(router);
    setActivePinia(pinia);
    await router.replace("/");
  });

  afterEach(() => vi.restoreAllMocks());

  describe("list layout", () => {
    it("opens on the list, and back goes exactly one step", async () => {
      const settingsWindow = await listLayoutStore();

      await settingsWindow.open();
      expect(windowQuery()).toEqual({ settings: "home", topic: undefined, step: "1" });
      expect(settingsWindow.section).toBeNull();

      await settingsWindow.open("editing");
      expect(settingsWindow.section).toBe("editing");
      expect(windowQuery().step).toBe("2");

      // The browser's back (a phone's gesture) and "‹" do the same
      router.back();
      await vi.waitFor(() => expect(settingsWindow.section).toBeNull());
      expect(settingsWindow.isOpen).toBe(true);

      await settingsWindow.open("editing");
      settingsWindow.back();
      await vi.waitFor(() => expect(settingsWindow.section).toBeNull());
      expect(windowQuery().step).toBe("1");
    });

    it("a jump opens the page at once with the list behind it", async () => {
      const settingsWindow = await listLayoutStore();

      await settingsWindow.open("about");
      expect(settingsWindow.section).toBe("about");
      expect(windowQuery().step).toBe("2");

      settingsWindow.back();
      await vi.waitFor(() => expect(settingsWindow.section).toBeNull());
      expect(settingsWindow.isOpen).toBe(true);
    });

    it("'Mehr dazu' on a page leads to the topic, and back via its page to the list", async () => {
      const settingsWindow = await listLayoutStore();
      await settingsWindow.open();
      await settingsWindow.open("editing");

      settingsWindow.showTopic("scenes");
      await vi.waitFor(() => expect(settingsWindow.topic).toBe("scenes"));
      expect(windowQuery()).toEqual({ settings: "goodToKnow", topic: "scenes", step: "3" });

      settingsWindow.back();
      await vi.waitFor(() => expect(settingsWindow.topic).toBeNull());
      expect(settingsWindow.section).toBe("goodToKnow");

      settingsWindow.back();
      await vi.waitFor(() => expect(settingsWindow.section).toBeNull());
    });

    it("a jump from a topic first goes back to where its chain branches off", async () => {
      const settingsWindow = await listLayoutStore();
      settingsWindow.showTopic("labels");
      await vi.waitFor(() => expect(settingsWindow.topic).toBe("labels"));

      await settingsWindow.open("about");
      expect(windowQuery()).toEqual({ settings: "about", topic: undefined, step: "2" });
    });

    it("closing takes all of the window's entries out of the history", async () => {
      const settingsWindow = await listLayoutStore();
      settingsWindow.showTopic("labels");
      await vi.waitFor(() => expect(windowQuery().step).toBe("3"));
      const goSpy = vi.spyOn(router, "go");

      settingsWindow.close();
      await vi.waitFor(() => expect(settingsWindow.isOpen).toBe(false));
      expect(goSpy).toHaveBeenCalledWith(-3);
    });
  });

  describe("tab layout", () => {
    it("keeps one entry for the whole window; another tab replaces it", async () => {
      const settingsWindow = useSettingsWindowStore();
      await vi.waitFor(() => expect(router.currentRoute.value.query).toEqual({}));

      await settingsWindow.open();
      expect(settingsWindow.tab).toBe("general");

      settingsWindow.selectTab("tools");
      await vi.waitFor(() => expect(settingsWindow.tab).toBe("tools"));
      expect(windowQuery().step).toBe("1");

      const goSpy = vi.spyOn(router, "go");
      settingsWindow.close();
      await vi.waitFor(() => expect(settingsWindow.isOpen).toBe(false));
      expect(goSpy).toHaveBeenCalledWith(-1);
    });

    it("a tab shown later as a page: '‹' replaces it with the list", async () => {
      const settingsWindow = useSettingsWindowStore();
      await settingsWindow.open("about");
      settingsWindow.reportTabsOverflow(true);
      expect(settingsWindow.section).toBe("about");
      const goSpy = vi.spyOn(router, "go");

      settingsWindow.back();
      await vi.waitFor(() => expect(settingsWindow.section).toBeNull());
      expect(windowQuery().step).toBe("1");
      expect(goSpy).not.toHaveBeenCalled();
    });
  });

  it("an address with the window open (after a reload) starts closed", async () => {
    await router.push({ query: { settings: "about", step: "2" } });

    const settingsWindow = useSettingsWindowStore();
    await vi.waitFor(() => expect(settingsWindow.isOpen).toBe(false));
  });
});
