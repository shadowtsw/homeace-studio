import { BadRequestException, ConflictException, Logger } from "@nestjs/common";

import { HaCommandError } from "../ha/ha-command.error";
import { EMPTY_OVERLAY, type Overlay } from "../overlay/overlay.model";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import type { CategoryScope } from "./categories.constants";
import { CategoriesService } from "./categories.service";
import type { Category } from "./category.model";
import type { CategoryRepository } from "./repositories/category.repository";

/** In-memory HA categories per scope plus entity assignments, enough to play HA's side. */
class FakeCategories implements CategoryRepository {
  readonly byScope = new Map<CategoryScope, Category[]>();
  readonly assignments = new Map<string, string | null>();
  private nextId = 1;

  seed(scope: CategoryScope, name: string, assignedEntityIds: string[] = []): string {
    const categoryId = `cat-${this.nextId++}`;
    this.byScope.set(scope, [...(this.byScope.get(scope) ?? []), { categoryId, name }]);
    assignedEntityIds.forEach((entityId) =>
      this.assignments.set(`${scope}:${entityId}`, categoryId),
    );

    return categoryId;
  }

  names(scope: CategoryScope): string[] {
    return (this.byScope.get(scope) ?? []).map((category) => category.name).sort();
  }

  list = (scope: CategoryScope) => Promise.resolve([...(this.byScope.get(scope) ?? [])]);

  create = (scope: CategoryScope, name: string) => {
    const categoryId = this.seed(scope, name);
    return Promise.resolve({ categoryId, name });
  };

  rename = (scope: CategoryScope, categoryId: string, name: string) => {
    const category = this.byScope.get(scope)?.find((item) => item.categoryId === categoryId);
    if (category) category.name = name;
    return Promise.resolve();
  };

  delete = (scope: CategoryScope, categoryId: string) => {
    const remaining = (this.byScope.get(scope) ?? []).filter(
      (item) => item.categoryId !== categoryId,
    );
    this.byScope.set(scope, remaining);
    return Promise.resolve();
  };

  assign = (entityId: string, scope: CategoryScope, categoryId: string | null) => {
    if (this.unregistered.has(entityId))
      return Promise.reject(new HaCommandError("not_found", "Entity not found"));
    this.assignments.set(`${scope}:${entityId}`, categoryId);
    return Promise.resolve();
  };

  countAssigned = (scope: CategoryScope, categoryId: string) => {
    const assigned = [...this.assignments.entries()].filter(
      ([key, value]) => key.startsWith(`${scope}:`) && value === categoryId,
    );
    return Promise.resolve(assigned.length);
  };

  /** Entities HA has no registry entry for. */
  readonly unregistered = new Set<string>();

  findEntityCategory = (entityId: string, scope: CategoryScope) =>
    Promise.resolve(
      this.unregistered.has(entityId)
        ? undefined
        : (this.assignments.get(`${scope}:${entityId}`) ?? null),
    );

  listAssignments = (scope: CategoryScope) => {
    const byCategory = new Map<string, string[]>();
    for (const [key, categoryId] of this.assignments.entries()) {
      if (!key.startsWith(`${scope}:`) || !categoryId) continue;
      byCategory.set(categoryId, [
        ...(byCategory.get(categoryId) ?? []),
        key.slice(scope.length + 1),
      ]);
    }
    return Promise.resolve(byCategory);
  };
}

class FakeOverlay implements OverlayRepository {
  data: Overlay = structuredClone(EMPTY_OVERLAY);
  read = () => Promise.resolve(structuredClone(this.data));
  update = (change: (overlay: Overlay) => Overlay) => {
    this.data = change(structuredClone(this.data));
    return Promise.resolve(this.data);
  };
}

describe("CategoriesService", () => {
  let categories: FakeCategories;
  let overlay: FakeOverlay;
  let service: CategoriesService;

  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  beforeEach(() => {
    categories = new FakeCategories();
    overlay = new FakeOverlay();
    service = new CategoriesService(categories, overlay);
  });

  describe("assign", () => {
    it("creates a missing category, remembers it as owned and assigns it", async () => {
      await service.assign({
        entityId: "automation.licht",
        scope: "automation",
        currentCategoryId: null,
        targetPath: " Haus / Pool ",
      });

      expect(categories.names("automation")).toEqual(["Haus/Pool"]);
      expect(overlay.data.ownedCategoryIds).toHaveLength(1);
      expect(categories.assignments.get("automation:automation.licht")).toBe(
        overlay.data.ownedCategoryIds[0],
      );
    });

    it("reuses an existing category and creates nothing", async () => {
      const existingId = categories.seed("helpers", "Haus");

      await service.assign({
        entityId: "input_boolean.gaeste",
        scope: "helpers",
        currentCategoryId: null,
        targetPath: "Haus",
      });

      expect(categories.assignments.get("helpers:input_boolean.gaeste")).toBe(existingId);
      expect(overlay.data.ownedCategoryIds).toEqual([]);
    });

    it("deletes the old category when it became empty and was created by HomeAce Studio", async () => {
      const ownedId = categories.seed("script", "Haus/Pool", ["script.pool"]);
      overlay.data.ownedCategoryIds = [ownedId];

      await service.assign({
        entityId: "script.pool",
        scope: "script",
        currentCategoryId: ownedId,
        targetPath: null,
      });

      expect(categories.names("script")).toEqual([]);
      expect(overlay.data.ownedCategoryIds).toEqual([]);
    });

    it("never deletes the user's own categories, even when empty", async () => {
      const userId = categories.seed("script", "Haus - Routine", ["script.a"]);

      await service.assign({
        entityId: "script.a",
        scope: "script",
        currentCategoryId: userId,
        targetPath: null,
      });

      expect(categories.names("script")).toEqual(["Haus - Routine"]);
    });

    it("keeps an owned category that still has other entries", async () => {
      const ownedId = categories.seed("scene", "Haus/Pool", ["scene.a", "scene.b"]);
      overlay.data.ownedCategoryIds = [ownedId];

      await service.assign({
        entityId: "scene.a",
        scope: "scene",
        currentCategoryId: ownedId,
        targetPath: "Haus",
      });

      expect(categories.names("scene")).toEqual(["Haus", "Haus/Pool"]);
    });

    it("rejects paths with empty levels", async () => {
      const assignment = {
        entityId: "scene.a",
        scope: "scene" as const,
        currentCategoryId: null,
        targetPath: "Haus//Pool",
      };

      await expect(service.assign(assignment)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("moveEntity", () => {
    it("puts an entity into a folder in HomeAce Studio's own scope, other scopes untouched", async () => {
      const otherId = categories.seed("automation", "Haus/Terrasse", ["light.terrasse"]);

      await service.moveEntity("light.terrasse", "Haus/Terrasse");

      expect(categories.names("homeace_entities")).toEqual(["Haus/Terrasse"]);
      expect(categories.assignments.get("homeace_entities:light.terrasse")).toBe(
        overlay.data.ownedCategoryIds[0],
      );
      expect(categories.assignments.get("automation:light.terrasse")).toBe(otherId);
    });

    it("takes it out again and removes the folder it created when it became empty", async () => {
      await service.moveEntity("light.terrasse", "Haus/Terrasse");
      await service.moveEntity("light.terrasse", null);

      expect(categories.assignments.get("homeace_entities:light.terrasse")).toBeNull();
      expect(categories.names("homeace_entities")).toEqual([]);
      expect(overlay.data.ownedCategoryIds).toEqual([]);
    });

    it("refuses an entity without a registry entry", async () => {
      categories.unregistered.add("light.yaml");

      await expect(service.moveEntity("light.yaml", "Haus")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(categories.names("homeace_entities")).toEqual([]);
    });
  });

  describe("moveEntities", () => {
    it("moves many entities, creates each folder once and cleans up the emptied one", async () => {
      await service.moveEntity("sensor.old", "Alt");

      const results = await service.moveEntities([
        { entityId: "light.a", targetPath: "Haus/Küche" },
        { entityId: "light.b", targetPath: "Haus/Küche" },
        { entityId: "sensor.old", targetPath: "Haus/Küche" },
      ]);

      expect(results.map((result) => result.status)).toEqual(["moved", "moved", "moved"]);
      expect(results[2]?.from).toBe("Alt");
      expect(categories.names("homeace_entities")).toEqual(["Haus/Küche"]);
      expect(overlay.data.ownedCategoryIds).toHaveLength(1);
    });

    it("reports per entity: unchanged, changed since, and not in the registry", async () => {
      await service.moveEntity("light.a", "Haus");
      categories.unregistered.add("sensor.yaml");

      const results = await service.moveEntities([
        { entityId: "light.a", targetPath: "Haus" },
        { entityId: "light.b", targetPath: null, expectedPath: "Haus" },
        { entityId: "sensor.yaml", targetPath: "Haus" },
      ]);

      expect(results.map((result) => result.status)).toEqual([
        "unchanged",
        "changed",
        "notInRegistry",
      ]);
    });
  });

  describe("rename", () => {
    it("renames the folder and everything below it in every scope", async () => {
      categories.seed("automation", "Haus");
      categories.seed("automation", "Haus/Terrasse");
      categories.seed("automation", "Hausflur");
      categories.seed("helpers", "Haus/Terrasse/Licht");

      const renamedCount = await service.rename("Haus", "Heim");

      expect(renamedCount).toBe(3);
      expect(categories.names("automation")).toEqual(["Hausflur", "Heim", "Heim/Terrasse"]);
      expect(categories.names("helpers")).toEqual(["Heim/Terrasse/Licht"]);
    });

    it("renames nothing when a new name exists already in any scope", async () => {
      categories.seed("automation", "Haus/Terrasse");
      categories.seed("script", "Haus/Terrasse");
      categories.seed("script", "Heim/Terrasse");

      await expect(service.rename("Haus", "Heim")).rejects.toBeInstanceOf(ConflictException);
      expect(categories.names("automation")).toEqual(["Haus/Terrasse"]);
    });

    it("moves empty overlay folders below the renamed folder along", async () => {
      categories.seed("automation", "Haus");
      overlay.data.folders = ["Haus/Pool", "Hausflur/Neu", "Garage"];

      await service.rename("Haus", "Heim");

      expect(overlay.data.folders).toEqual(["Heim/Pool", "Hausflur/Neu", "Garage"]);
    });

    it("refuses to move a folder into itself", async () => {
      await expect(service.rename("Haus", "Haus/Neu")).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
