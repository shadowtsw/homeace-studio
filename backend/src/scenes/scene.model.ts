/** What a scene sets for one device: HA's state plus attributes, as scenes.yaml keeps them. */
export type SceneValue = Record<string, unknown> & { state?: unknown };

/** One device of a scene. */
export type SceneDevice = {
  entityId: string;
  /** Its name in HA (friendly_name), else the entity ID. */
  name: string;
  domain: string;
  /** What the scene sets; null for scenes HomeAce Studio cannot read (not in scenes.yaml). */
  values: SceneValue | null;
  /** What the device does right now, with its attributes (e.g. the colour modes a light has). */
  current: { state: string; attributes: Record<string, unknown> } | null;
};

export type SceneView = {
  entityId: string;
  /** In scenes.yaml with an id, so HomeAce Studio can change it. */
  isEditable: boolean;
  devices: SceneDevice[];
};
