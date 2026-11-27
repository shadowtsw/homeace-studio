import { CategoriesService } from "../categories/categories.service";
import { HaCategoriesRepository } from "../categories/repositories/ha-categories.repository";
import { createDemoHome } from "../demo/demo-home";
import { DemoHaConnectionService, DemoHaRestService } from "../demo/demo-ha.services";
import { FakeHa } from "../demo/fake-ha";
import { MemoryOverlayRepository } from "../demo/memory-overlay.repository";
import { EditorService } from "../editor/editor.service";
import { HaEditorRepository } from "../editor/repositories/ha-editor.repository";
import { EntriesService } from "../entries/entries.service";
import { HaEntriesRepository } from "../entries/repositories/ha-entries.repository";
import { LiveService } from "../live/live.service";
import { HomeSnapshotService } from "../snapshot/home-snapshot.service";
import { RenameService } from "./rename.service";
import type { VersionsService } from "src/versions/versions.service";

/** Versions are not under test here; saving must work without them. */
const noVersions = {
  recordSaved: () => Promise.resolve(),
  recordRename: () => Promise.resolve(),
} as unknown as VersionsService;

/** Renames in the demo home, through the real services. */
function setup() {
  const fake = new FakeHa(createDemoHome());
  const ha = new DemoHaConnectionService(fake);
  const overlay = new MemoryOverlayRepository({
    favorites: ["input_number.terrace_brightness"],
    notes: { "input_number.terrace_brightness": "Evening only" },
  });
  const categories = new CategoriesService(new HaCategoriesRepository(ha), overlay);
  const entries = new EntriesService(new HaEntriesRepository(ha), overlay, categories);
  const editor = new HaEditorRepository(ha, new DemoHaRestService(fake));
  const snapshots = new HomeSnapshotService(entries, ha, editor, () => 0, new LiveService(ha));
  const service = new RenameService(
    ha,
    entries,
    snapshots,
    new EditorService(editor, noVersions),
    editor,
    overlay,
    noVersions,
  );

  return { service, editor, overlay };
}

describe("RenameService", () => {
  it("lists the flows that name an entity, with their count", async () => {
    const references = await setup().service.references("input_number.terrace_brightness");

    expect(references).toEqual([
      expect.objectContaining({
        entityId: "script.terrace_evening_mood",
        count: 1,
        isEditable: true,
      }),
    ]);
  });

  it("renames the entity, its references and its extras", async () => {
    const { service, editor, overlay } = setup();

    const result = await service.rename({
      entityId: "input_number.terrace_brightness",
      newEntityId: "input_number.patio_brightness",
      withReferences: true,
    });

    expect(result.entityId).toBe("input_number.patio_brightness");
    expect(result.updated.map((item) => item.entityId)).toEqual(["script.terrace_evening_mood"]);
    const script = await editor.loadConfig({
      kind: "script",
      entityId: "script.terrace_evening_mood",
    });
    expect(JSON.stringify(script)).toContain("input_number.patio_brightness");
    expect(JSON.stringify(script)).not.toContain("input_number.terrace_brightness");

    const extras = await overlay.read();
    expect(extras.favorites).toEqual(["input_number.patio_brightness"]);
    expect(extras.notes).toEqual({ "input_number.patio_brightness": "Evening only" });
  });

  it("keeps the old references when asked to", async () => {
    const { service, editor } = setup();

    const result = await service.rename({
      entityId: "script.all_off",
      newEntityId: "script.everything_off",
      withReferences: false,
    });

    expect(result.updated).toEqual([]);
    expect(result.skipped.map((item) => item.entityId)).toEqual(["script.good_night"]);
    expect(
      JSON.stringify(await editor.loadConfig({ kind: "script", entityId: "script.good_night" })),
    ).toContain("script.all_off");
  });

  it("refuses a taken ID and another domain", async () => {
    const { service } = setup();

    await expect(
      service.rename({
        entityId: "input_number.terrace_brightness",
        newEntityId: "input_boolean.guest_mode",
        withReferences: true,
      }),
    ).rejects.toMatchObject({ response: { message: "ENTRY_ID_INVALID" } });
    await expect(
      service.rename({
        entityId: "script.all_off",
        newEntityId: "script.good_night",
        withReferences: true,
      }),
    ).rejects.toMatchObject({ response: { message: "ENTRY_ID_TAKEN" } });
  });
});
