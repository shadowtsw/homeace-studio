import { HaCommandError } from "../ha/ha-command.error";
import { HA_COMMAND, HA_REST_PATH } from "../ha/ha.constants";
import type { HaCategory, HaEntityRegistryEntry, HaState } from "../ha/ha.types";
import { createDemoHome } from "./demo-home";
import { FakeHa } from "./fake-ha";

function registry(fake: FakeHa): HaEntityRegistryEntry[] {
  return fake.call({ type: HA_COMMAND.entityRegistryList }) as HaEntityRegistryEntry[];
}

function categories(fake: FakeHa, scope: string): HaCategory[] {
  return fake.call({ type: HA_COMMAND.categoryRegistryList, payload: { scope } }) as HaCategory[];
}

describe("FakeHa (demo mode)", () => {
  it("keeps one category list per scope with nested names", () => {
    const fake = new FakeHa(createDemoHome());
    const automationNames = categories(fake, "automation").map((category) => category.name);

    expect(automationNames).toEqual(expect.arrayContaining(["House/Terrace", "Energy/Solar"]));
    expect(categories(fake, "script").map((category) => category.name)).toContain("Routines");

    const terrace = registry(fake).find(
      (entry) => entry.entity_id === "automation.terrace_light_on_motion",
    );
    const terraceId = categories(fake, "automation").find((c) => c.name === "House/Terrace");
    expect(terrace?.categories.automation).toBe(terraceId?.category_id);
  });

  it("refuses a duplicate category name in the same scope, like HA", () => {
    const fake = new FakeHa(createDemoHome());

    expect(() =>
      fake.call({
        type: HA_COMMAND.categoryRegistryCreate,
        payload: { scope: "automation", name: "Security" },
      }),
    ).toThrow(HaCommandError);
    expect(
      fake.call({
        type: HA_COMMAND.categoryRegistryCreate,
        payload: { scope: "scene", name: "Garden" },
      }),
    ).toMatchObject({ name: "Garden" });
  });

  it("registers the entity of a newly saved automation and fires an event", async () => {
    const fake = new FakeHa(createDemoHome());
    const handler = jest.fn();
    fake.subscribe({ eventType: "entity_registry_updated", handler });

    fake.restPost({
      path: HA_REST_PATH.automationConfig + "1800000000000",
      body: {
        id: "1800000000000",
        alias: "Hallway light",
        triggers: [],
        actions: [],
      },
    });

    const created = registry(fake).find((entry) => entry.unique_id === "1800000000000");
    expect(created?.entity_id).toBe("automation.hallway_light");
    expect(fake.restGet(HA_REST_PATH.automationConfig + "1800000000000")).toMatchObject({
      alias: "Hallway light",
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(handler).toHaveBeenCalled();
  });

  it("switches states through services and creates and deletes helpers", () => {
    const fake = new FakeHa(createDemoHome());
    const stateOf = (entityId: string): string | undefined =>
      (fake.call({ type: HA_COMMAND.getStates }) as HaState[]).find((s) => s.entity_id === entityId)
        ?.state;

    fake.call({
      type: HA_COMMAND.callService,
      payload: {
        domain: "input_boolean",
        service: "turn_on",
        target: { entity_id: "input_boolean.guest_mode" },
      },
    });
    expect(stateOf("input_boolean.guest_mode")).toBe("on");

    const created = fake.call({ type: "counter/create", payload: { name: "Coffee cups" } }) as {
      id: string;
    };
    expect(stateOf("counter.coffee_cups")).toBeDefined();

    fake.call({ type: "counter/delete", payload: { counter_id: created.id } });
    expect(stateOf("counter.coffee_cups")).toBeUndefined();
  });
});
