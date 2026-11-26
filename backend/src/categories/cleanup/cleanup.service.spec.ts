import { BadRequestException } from "@nestjs/common";

import { createDemoHome } from "../../demo/demo-home";
import { DemoHaConnectionService } from "../../demo/demo-ha.services";
import { FakeHa } from "../../demo/fake-ha";
import { MemoryOverlayRepository } from "../../demo/memory-overlay.repository";
import { HA_COMMAND } from "../../ha/ha.constants";
import type { HaCategory, HaEntityRegistryEntry } from "../../ha/ha.types";
import { HaCategoriesRepository } from "../repositories/ha-categories.repository";
import { CleanupService } from "./cleanup.service";

/** The demo home plus old dash categories, run through the real repository against FakeHa. */
function setup() {
  const fake = new FakeHa(createDemoHome());
  const ha = new DemoHaConnectionService(fake);
  const overlay = new MemoryOverlayRepository({ folderColors: { "Büro - Licht": "#3a80c2" } });
  const service = new CleanupService(new HaCategoriesRepository(ha), overlay);

  const create = (scope: string, name: string) =>
    fake.call({ type: HA_COMMAND.categoryRegistryCreate, payload: { scope, name } }) as HaCategory;
  const assign = (entityId: string, scope: string, category: HaCategory) =>
    fake.call({
      type: HA_COMMAND.entityRegistryUpdate,
      payload: {
        entity_id: entityId,
        categories: { [scope]: category.category_id },
      },
    });

  assign("automation.preheat_bathroom", "automation", create("automation", "Büro - Licht"));
  assign("automation.old_light_switch_test", "automation", create("automation", "Büro-Licht"));
  assign("input_boolean.guest_mode", "helpers", create("helpers", "Büro-Licht"));

  const categoryOf = (entityId: string, scope: string): string | undefined => {
    const entries = fake.call({ type: HA_COMMAND.entityRegistryList }) as HaEntityRegistryEntry[];
    const id = entries.find((entry) => entry.entity_id === entityId)?.categories[scope];
    const list = fake.call({
      type: HA_COMMAND.categoryRegistryList,
      payload: { scope },
    }) as HaCategory[];

    return list.find((category) => category.category_id === id)?.name;
  };

  return { service, overlay, categoryOf, fake };
}

describe("CleanupService", () => {
  it("lists proposals and hides ignored ones", async () => {
    const { service } = setup();

    const keys = async () => (await service.overview()).proposals.map((proposal) => proposal.key);

    // The demo home brings its own old categories ("Office - Heating", "Routine" / "Routines").
    expect(await keys()).toEqual(
      expect.arrayContaining([
        "split:Büro - Licht",
        "split:Büro-Licht",
        "split:Office - Heating",
        "merge:Routine|Routines",
      ]),
    );

    await service.ignore("split:Büro-Licht");
    expect(await keys()).not.toContain("split:Büro-Licht");
    expect(await keys()).toContain("split:Büro - Licht");
    expect((await service.overview()).ignoredCount).toBe(1);
  });

  it("previews and applies: renames, merges into the same folder, moves the folder color", async () => {
    const { service, overlay, categoryOf, fake } = setup();
    const changes = [
      { from: "Büro - Licht", to: "Büro / Licht" },
      { from: "Büro-Licht", to: "Büro/Licht" },
    ];

    const steps = await service.preview(changes);
    expect(steps.map(({ scope, kind }) => `${scope} ${kind}`)).toEqual([
      "automation rename",
      "automation merge",
      "helpers rename",
    ]);

    const result = await service.apply(changes);

    expect(result).toEqual({ categoryCount: 2, stepCount: 3 });
    expect(categoryOf("automation.preheat_bathroom", "automation")).toBe("Büro/Licht");
    expect(categoryOf("automation.old_light_switch_test", "automation")).toBe("Büro/Licht");
    expect(categoryOf("input_boolean.guest_mode", "helpers")).toBe("Büro/Licht");
    const automationNames = (
      fake.call({
        type: HA_COMMAND.categoryRegistryList,
        payload: { scope: "automation" },
      }) as HaCategory[]
    ).map((category) => category.name);
    expect(automationNames.filter((name) => name.startsWith("Büro"))).toEqual(["Büro/Licht"]);
    expect((await overlay.read()).folderColors["Büro/Licht"]).toBe("#3a80c2");
  });

  it("refuses a name listed twice and an invalid target", async () => {
    const { service } = setup();

    await expect(
      service.apply([
        { from: "Büro-Licht", to: "Büro/Licht" },
        { from: "Büro-Licht", to: "Büro/Lampen" },
      ]),
    ).rejects.toThrow(BadRequestException);
    await expect(service.preview([{ from: "Büro-Licht", to: "Büro//" }])).rejects.toThrow(
      BadRequestException,
    );
  });
});
