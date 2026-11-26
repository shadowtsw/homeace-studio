import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";

import { apiError } from "../common/api/api-response";
import type { HaState } from "../ha/ha.types";
import { MESSAGE_ID } from "../messages/message-ids";
import { SCENE_REPOSITORY } from "./scenes.constants";
import type { SceneDevice, SceneValue, SceneView } from "./scene.model";
import type { SceneRepository } from "./repositories/scene.repository";

const DOMAIN_SEPARATOR = ".";
/** Shown when HA's temperature unit cannot be read; HA's own default. */
const FALLBACK_TEMPERATURE_UNIT = "°C";
/** HA's metadata for a device added to a scene on its own, not with its whole device. */
const ENTITY_ONLY = { entity_only: true };

export type SaveOptions = {
  entityId: string;
  entities: Record<string, SceneValue>;
};

export type PreviewOptions = {
  sceneId: string;
  entities: Record<string, SceneValue>;
};

export type RestoreOptions = {
  sceneId: string;
  deviceIds?: readonly string[];
};

/**
 * Scenes edited without switching anything: the values go straight into scenes.yaml through HA's
 * config API (HA's own editor "photographs" the devices instead, so it switches them).
 *
 * Preview and trying one device use `scene.apply`. Before that, the devices' states are kept here,
 * and restore() applies them again, so nothing extra (like a snapshot scene) shows up in HA.
 */
@Injectable()
export class ScenesService {
  private readonly logger = new Logger(ScenesService.name);
  /** Per scene: what its previewed devices did before, to bring it back. */
  private readonly snapshots = new Map<string, Map<string, SceneValue>>();

  constructor(@Inject(SCENE_REPOSITORY) private readonly scenes: SceneRepository) {}

  /** The scene's devices with what the scene sets and what they do right now. */
  async get(entityId: string): Promise<SceneView> {
    const [config, states, temperatureUnit] = await Promise.all([
      this.findConfig(entityId),
      this.scenes.loadStates(),
      this.temperatureUnit(),
    ]);
    const stateOf = new Map(states.map((state) => [state.entity_id, state]));

    if (config) {
      const entities = entitiesOf(config.config);
      return {
        entityId,
        isEditable: true,
        devices: Object.entries(entities).map(([id, values]) =>
          device({ entityId: id, values, stateOf }),
        ),
        temperatureUnit,
      };
    }

    // Not in scenes.yaml (e.g. from a package): shown with its members, read-only.
    const members = stateOf.get(entityId)?.attributes.entity_id;
    const ids = Array.isArray(members) ? members.filter((id) => typeof id === "string") : [];
    return {
      entityId,
      isEditable: false,
      devices: ids.map((id) => device({ entityId: id, values: null, stateOf })),
      temperatureUnit,
    };
  }

  /** HA's temperature unit; read with every scene, so a change in HA's settings shows at once. */
  private async temperatureUnit(): Promise<string> {
    try {
      return await this.scenes.loadTemperatureUnit();
    } catch (error) {
      this.logger.warn(
        `Temperature unit not read, showing ${FALLBACK_TEMPERATURE_UNIT}: ${String(error)}`,
      );
      return FALLBACK_TEMPERATURE_UNIT;
    }
  }

  /** One device as it would join a scene: its current state as the starting values. */
  async candidate(deviceId: string): Promise<SceneDevice> {
    const states = await this.scenes.loadStates();
    const stateOf = new Map(states.map((state) => [state.entity_id, state]));
    const state = stateOf.get(deviceId);

    return device({ entityId: deviceId, values: state ? valueOf(state) : null, stateOf });
  }

  /**
   * Saves what the scene sets. Name, icon and anything else in its config stay. Devices that stay
   * keep their metadata, devices that left the scene lose it, new ones are added as single
   * entities (like HA does it).
   *
   * HA's own editor writes metadata only for single entities and shows the others under their
   * device; giving those `entity_only` too would move them out of their device there for good.
   *
   * @throws BadRequestException `SCENE_NOT_EDITABLE` for scenes outside scenes.yaml.
   */
  async save({ entityId, entities }: SaveOptions): Promise<SceneView> {
    const found = await this.findConfig(entityId);
    if (!found) throw notEditable(entityId);

    const metadata = (found.config.metadata ?? {}) as Record<string, unknown>;
    const before = entitiesOf(found.config);
    const nextMetadata = Object.fromEntries(
      Object.keys(entities).flatMap((id) => {
        const kept = metadata[id] ?? (id in before ? undefined : ENTITY_ONLY);
        return kept === undefined ? [] : [[id, kept]];
      }),
    );

    await this.scenes.saveConfig({
      id: found.id,
      config: {
        ...found.config,
        entities,
        metadata: nextMetadata,
      },
    });
    this.logger.log(`Saved scene ${entityId}`);

    return this.get(entityId);
  }

  /**
   * Shows the given values on the devices now. The first time a device is touched, its state is
   * kept, so restore() can bring it back; later calls (live edits) only apply.
   */
  async preview({ sceneId, entities }: PreviewOptions): Promise<void> {
    const snapshot = this.snapshots.get(sceneId) ?? new Map<string, SceneValue>();
    const missing = Object.keys(entities).filter((id) => !snapshot.has(id));

    if (missing.length > 0) {
      const states = await this.scenes.loadStates();
      for (const state of states) {
        if (missing.includes(state.entity_id)) snapshot.set(state.entity_id, valueOf(state));
      }
    }

    this.snapshots.set(sceneId, snapshot);
    await this.scenes.apply(entities);
  }

  /**
   * Brings devices back to how they were before the preview: the given ones (trying one device),
   * or all of the scene's.
   */
  async restore({ sceneId, deviceIds }: RestoreOptions): Promise<void> {
    const snapshot = this.snapshots.get(sceneId);
    if (!snapshot) return;

    const ids = deviceIds?.length
      ? deviceIds.filter((id) => snapshot.has(id))
      : [...snapshot.keys()];
    if (ids.length === 0) return;

    await this.scenes.apply(Object.fromEntries(ids.map((id) => [id, snapshot.get(id) ?? {}])));
    for (const id of ids) snapshot.delete(id);
    if (snapshot.size === 0) this.snapshots.delete(sceneId);
  }

  private async findConfig(
    entityId: string,
  ): Promise<{ id: string; config: Record<string, unknown> } | null> {
    const id = await this.scenes.findStorageId(entityId);
    if (!id) return null;

    const config = await this.scenes.loadConfig(id);
    return config ? { id, config } : null;
  }
}

/** scenes.yaml allows a plain state ("on") or an object with state and attributes. */
function entitiesOf(config: Record<string, unknown>): Record<string, SceneValue> {
  const raw = config.entities;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([id, value]) => [
      id,
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as SceneValue)
        : { state: value },
    ]),
  );
}

/**
 * A device's state as scene values: the state with all its attributes, as HA would photograph it.
 */
function valueOf(state: HaState): SceneValue {
  return { state: state.state, ...(state.attributes as Record<string, unknown>) };
}

function device({
  entityId,
  values,
  stateOf,
}: {
  entityId: string;
  values: SceneValue | null;
  stateOf: Map<string, HaState>;
}): SceneDevice {
  const state = stateOf.get(entityId);
  const name = state?.attributes.friendly_name;

  return {
    entityId,
    name: typeof name === "string" && name ? name : entityId,
    domain: entityId.split(DOMAIN_SEPARATOR)[0] ?? "",
    values,
    current: state ? { state: state.state, attributes: state.attributes } : null,
  };
}

function notEditable(entityId: string): BadRequestException {
  return new BadRequestException(
    apiError({ message: MESSAGE_ID.sceneNotEditable, details: { params: { entityId } } }),
  );
}
