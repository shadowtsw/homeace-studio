import { CategoriesService } from "../categories/categories.service";
import { HaCategoriesRepository } from "../categories/repositories/ha-categories.repository";
import { createDemoHome } from "../demo/demo-home";
import { DemoHaConnectionService, DemoHaRestService } from "../demo/demo-ha.services";
import { FakeHa } from "../demo/fake-ha";
import { MemoryOverlayRepository } from "../demo/memory-overlay.repository";
import { EditorService } from "../editor/editor.service";
import { FlowsService } from "../editor/flows.service";
import { HaEditorRepository } from "../editor/repositories/ha-editor.repository";
import { EntriesService } from "../entries/entries.service";
import { HaEntriesRepository } from "../entries/repositories/ha-entries.repository";
import { HelpersService } from "../helpers/helpers.service";
import { HaHelpersRepository } from "../helpers/repositories/ha-helpers.repository";
import { DuplicateService } from "./duplicate.service";

/** Duplicates in the demo home, through the real services. */
function setup() {
  const fake = new FakeHa(createDemoHome());
  const ha = new DemoHaConnectionService(fake);
  const overlay = new MemoryOverlayRepository({});
  const categories = new CategoriesService(new HaCategoriesRepository(ha), overlay);
  const entries = new EntriesService(new HaEntriesRepository(ha), overlay, categories);
  const editor = new HaEditorRepository(ha, new DemoHaRestService(fake));
  const editorService = new EditorService(editor);
  const flows = new FlowsService(
    editor,
    editorService,
    categories,
    overlay,
    () => Promise.resolve(),
    () => 1_700_000_000_000,
  );

  const helpers = new HelpersService(new HaHelpersRepository(ha), categories, overlay, () =>
    Promise.resolve(),
  );
  const service = new DuplicateService(flows, editorService, entries, helpers, editor);

  return { service, entries, editor, helpers };
}

describe("DuplicateService", () => {
  it("copies an automation with folder, labels and area, switched off", async () => {
    const { service, entries, editor } = setup();

    const { entityId } = await service.duplicate({
      entityId: "automation.terrace_light_on_motion",
      name: "Terrace light on motion (Kopie)",
    });

    const all = await entries.findAll();
    const original = all.find((entry) => entry.entityId === "automation.terrace_light_on_motion");
    const copy = all.find((entry) => entry.entityId === entityId);
    expect(copy).toMatchObject({
      name: "Terrace light on motion (Kopie)",
      categoryPath: original?.categoryPath,
      labels: original?.labels,
      area: original?.area,
      state: "off",
    });

    const config = await editor.loadConfig({ kind: "automation", entityId });
    const source = await editor.loadConfig({
      kind: "automation",
      entityId: "automation.terrace_light_on_motion",
    });
    expect(config.triggers).toEqual(source.triggers);
    expect(config.id).not.toBe(source.id);
  });

  it("copies a script under a new key", async () => {
    const { service, editor } = setup();

    const { entityId } = await service.duplicate({
      entityId: "script.terrace_evening_mood",
      name: "Evening mood 2",
    });

    expect(entityId).not.toBe("script.terrace_evening_mood");
    const config = await editor.loadConfig({ kind: "script", entityId });
    expect(config.alias).toBe("Evening mood 2");
    expect(Array.isArray(config.sequence)).toBe(true);
  });

  it("copies a storage helper with its settings, folder, labels and area", async () => {
    const { service, entries, helpers } = setup();

    const { entityId } = await service.duplicate({
      entityId: "input_number.terrace_brightness",
      name: "Terrace brightness late",
    });

    const all = await entries.findAll();
    const original = all.find((entry) => entry.entityId === "input_number.terrace_brightness");
    const copy = all.find((entry) => entry.entityId === entityId);
    expect(entityId).toBe("input_number.terrace_brightness_late");
    expect(copy).toMatchObject({
      name: "Terrace brightness late",
      categoryPath: original?.categoryPath,
      labels: original?.labels,
      area: original?.area,
    });
    await expect(helpers.settings(entityId)).resolves.toEqual(
      await helpers.settings("input_number.terrace_brightness"),
    );
  });
});
