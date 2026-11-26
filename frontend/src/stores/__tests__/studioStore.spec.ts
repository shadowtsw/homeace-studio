import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useStudioStore } from "@/stores/studioStore";

describe("studioStore selection", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("ticks entries and entities separately: ticking one kind clears the other", () => {
    const studio = useStudioStore();

    expect(studio.setChecked(["automation.a", "script.b"], true)).toBe(false);
    // Ticking an entity clears the entries and says so
    expect(studio.setEntityChecked(["light.lamp"], true)).toBe(true);
    expect([...studio.checkedIds]).toEqual([]);
    expect([...studio.checkedEntityIds]).toEqual(["light.lamp"]);

    // And the other way round
    expect(studio.setChecked(["automation.a"], true)).toBe(true);
    expect([...studio.checkedEntityIds]).toEqual([]);
  });

  it("unticking never clears the other kind", () => {
    const studio = useStudioStore();
    studio.setEntityChecked(["light.lamp", "light.desk"], true);

    expect(studio.setChecked(["automation.a"], false)).toBe(false);
    expect(studio.setEntityChecked(["light.desk"], false)).toBe(false);
    expect([...studio.checkedEntityIds]).toEqual(["light.lamp"]);
  });

  it("clears both kinds at once", () => {
    const studio = useStudioStore();
    studio.setEntityChecked(["light.lamp"], true);

    studio.clearChecked();
    expect(studio.checkedEntityIds.size).toBe(0);
    expect(studio.checkedIds.size).toBe(0);
  });
});
