import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchEntities } from "@/services/editorService";
import { useLookupsStore } from "@/stores/lookupsStore";
import type { EntityOption } from "@/types/editor";

vi.mock("@/services/editorService", () => ({
  fetchEntities: vi.fn<() => Promise<EntityOption[]>>(),
}));

function option(entityId: string): EntityOption {
  return { entityId } as EntityOption;
}

/** An answer that arrives only when the test says so, to make loads overlap on purpose. */
function later<T>(): { promise: Promise<T>; arrive: (value: T) => void } {
  let arrive!: (value: T) => void;
  const promise = new Promise<T>((resolve) => (arrive = resolve));

  return { promise, arrive };
}

const idsOf = (entities: EntityOption[]): string[] => entities.map((entity) => entity.entityId);

describe("lookupsStore.loadEntities", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(fetchEntities).mockReset();
  });

  it("runs one load at a time and loads once more after it, so the newest answer wins", async () => {
    const first = later<EntityOption[]>();
    const second = later<EntityOption[]>();
    vi.mocked(fetchEntities).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const lookups = useLookupsStore();

    // Three live updates while the first load is still on its way
    const loads = [
      lookups.loadEntities(true),
      lookups.loadEntities(true),
      lookups.loadEntities(true),
    ];
    first.arrive([option("light.old")]);
    await vi.waitFor(() => expect(fetchEntities).toHaveBeenCalledTimes(2));
    second.arrive([option("light.new")]);
    await Promise.all(loads);

    expect(fetchEntities).toHaveBeenCalledTimes(2);
    expect(idsOf(lookups.entities)).toEqual(["light.new"]);
  });

  it("waits for a running load without loading again when nothing fresh is needed", async () => {
    const first = later<EntityOption[]>();
    vi.mocked(fetchEntities).mockReturnValueOnce(first.promise);
    const lookups = useLookupsStore();

    const loads = [lookups.loadEntities(), lookups.loadEntities()];
    first.arrive([option("light.only")]);
    await Promise.all(loads);

    expect(fetchEntities).toHaveBeenCalledTimes(1);
    expect(idsOf(lookups.entities)).toEqual(["light.only"]);
  });

  it("loads again after a failed load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(fetchEntities)
      .mockRejectedValueOnce(new Error("HA away"))
      .mockResolvedValueOnce([option("light.back")]);
    const lookups = useLookupsStore();

    await lookups.loadEntities(true);
    await lookups.loadEntities(true);

    expect(idsOf(lookups.entities)).toEqual(["light.back"]);
  });
});
