import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";

import { MAX_OWN_THEMES } from "../core/themes/ownThemes";
import { MemoryOverlayRepository } from "../demo/memory-overlay.repository";
import type { HaUser } from "../preferences/ha-user";
import { ThemesService } from "./themes.service";

const ALEX: HaUser = { id: "user-alex", name: "Alex" };
const SAM: HaUser = { id: "user-sam", name: "Sam" };

const DARK = {
  background: "#0e1117",
  surface: "#161a22",
  text: "#e6e9f0",
  accent: "#8197ff",
  flowWhen: "#f0a54a",
  flowIf: "#4cc4b3",
  flowThen: "#8197ff",
};
const THEME_FILE = { "homeace-theme": 1, name: "Abendrot", dark: DARK };

function createService(): ThemesService {
  return new ThemesService(new MemoryOverlayRepository({}));
}

describe("ThemesService", () => {
  it("keeps a checked theme per user and gives it an id", async () => {
    const service = createService();

    const created = await service.create({ user: ALEX, theme: THEME_FILE });

    expect(created.id).toMatch(/^own-[0-9a-f]{12}$/);
    expect(created.themes).toHaveLength(1);
    expect(created.themes[0]).toMatchObject({ id: created.id, name: "Abendrot", dark: DARK });
    expect(await service.list(SAM)).toEqual([]);
  });

  it("checks again what comes in: only known fields, clean values", async () => {
    const service = createService();
    const suspicious = {
      ...THEME_FILE,
      name: "<b>Abend</b>rot",
      dark: { ...DARK, accent: "url(https://example.org/x.png)" },
      update: "https://example.org/more.js",
    };

    const { themes } = await service.create({ user: ALEX, theme: suspicious });

    expect(themes[0]?.name).toBe("Abendrot");
    expect(themes[0]?.dark.accent).toBe("#8197ff");
    expect(themes[0]).not.toHaveProperty("update");
  });

  it("refuses what is no theme, and anything without a HA user", async () => {
    const service = createService();

    await expect(service.create({ user: ALEX, theme: { name: "x" } })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.create({ user: null, theme: THEME_FILE })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.list(null)).rejects.toThrow(BadRequestException);
  });

  it("never overwrites a name", async () => {
    const service = createService();
    await service.create({ user: ALEX, theme: THEME_FILE });

    const { themes } = await service.create({ user: ALEX, theme: THEME_FILE });

    expect(themes.map((theme) => theme.name)).toEqual(["Abendrot", "Abendrot (2)"]);
  });

  it("keeps at most MAX_OWN_THEMES per user", async () => {
    const service = createService();
    for (let index = 0; index < MAX_OWN_THEMES; index += 1) {
      await service.create({ user: ALEX, theme: THEME_FILE });
    }

    await expect(service.create({ user: ALEX, theme: THEME_FILE })).rejects.toThrow(
      ConflictException,
    );
    // The queue goes on after a refused step
    expect(await service.list(ALEX)).toHaveLength(MAX_OWN_THEMES);
  });

  it("deletes only the user's own theme", async () => {
    const service = createService();
    const { id } = await service.create({ user: ALEX, theme: THEME_FILE });

    await expect(service.remove({ user: SAM, id })).rejects.toThrow(NotFoundException);
    expect(await service.remove({ user: ALEX, id })).toEqual([]);
  });

  it("replaces an own theme in place, checked again, keeping its id", async () => {
    const service = createService();
    const { id } = await service.create({ user: ALEX, theme: THEME_FILE });
    const changed = { ...THEME_FILE, name: "Abendrot neu", dark: { ...DARK, accent: "#ff8800" } };

    const themes = await service.update({ user: ALEX, id, theme: changed });

    expect(themes).toHaveLength(1);
    expect(themes[0]).toMatchObject({ id, name: "Abendrot neu", dark: { accent: "#ff8800" } });
  });

  it("keeps names unique when replacing, but a theme may keep its own name", async () => {
    const service = createService();
    const first = await service.create({ user: ALEX, theme: THEME_FILE });
    const second = await service.create({ user: ALEX, theme: { ...THEME_FILE, name: "Nacht" } });

    const keptName = await service.update({ user: ALEX, id: first.id, theme: THEME_FILE });
    const renamed = await service.update({ user: ALEX, id: second.id, theme: THEME_FILE });

    expect(keptName.map((theme) => theme.name)).toEqual(["Abendrot", "Nacht"]);
    expect(renamed.map((theme) => theme.name)).toEqual(["Abendrot", "Abendrot (2)"]);
  });

  it("replaces only the user's own theme, and only with a valid one", async () => {
    const service = createService();
    const { id } = await service.create({ user: ALEX, theme: THEME_FILE });

    await expect(service.update({ user: SAM, id, theme: THEME_FILE })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.update({ user: ALEX, id, theme: { name: "x" } })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("checks stored themes again when reading (the overlay can be edited by hand)", async () => {
    const broken = { id: "own-000000000001", "homeace-theme": 1, name: "Broken" };
    const service = new ThemesService(
      new MemoryOverlayRepository({ userThemes: { [ALEX.id]: [broken as never] } }),
    );

    expect(await service.list(ALEX)).toEqual([]);
  });
});
