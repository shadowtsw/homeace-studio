import { buildCatalog, type CatalogSources } from "./catalog.mapper";

const sources: CatalogSources = {
  triggers: {
    "zone.entered": {
      fields: {
        for: { required: true, default: "00:00:00", selector: { duration: {} } },
        zone: { required: true, selector: { entity: { domain: ["zone"] } } },
      },
      target: { entity: [{ domain: ["person"] }] },
    },
  },
  conditions: { "switch.is_on": { fields: {}, target: { entity: [{ domain: ["switch"] }] } } },
  services: {
    climate: {
      set_temperature: {
        name: "Set target temperature",
        fields: {
          temperature: { selector: { number: { step: 0.1 } } },
          temperature_range: {
            fields: {
              target_temp_high: { selector: { number: {} } },
              target_temp_low: { selector: { number: {} } },
            },
          },
        },
        target: { entity: [{ domain: ["climate"] }] },
      },
    },
    // Each script is its own action; HA names it by the alias and has no translation for it.
    script: {
      abendstimmung: {
        name: "Abendstimmung",
        description: "",
        fields: { dauer: { name: "Dauer", description: "Wie lange", selector: { number: {} } } },
      },
    },
  },
  translations: {
    triggers: {
      "component.zone.triggers.entered.name": "Zone betreten",
      "component.zone.triggers.entered.fields.for.name": "Für mindestens",
    },
    conditions: {},
    services: {
      "component.climate.services.set_temperature.name": "Solltemperatur einstellen",
      "component.climate.services.set_temperature.fields.temperature.name": "Soll-Temperatur",
    },
  },
};

describe("buildCatalog", () => {
  const catalog = buildCatalog(sources);

  it("names triggers and their fields from the translations", () => {
    expect(catalog.triggers["zone.entered"]).toMatchObject({
      name: "Zone betreten",
      target: { entity: [{ domain: ["person"] }] },
      fields: {
        for: { name: "Für mindestens", required: true, default: "00:00:00" },
        zone: { name: null, required: true, selector: { entity: { domain: ["zone"] } } },
      },
    });
  });

  it("falls back to the key when HA has no translation", () => {
    expect(catalog.conditions["switch.is_on"]?.name).toBe("switch.is_on");
  });

  it("keys actions like configs use them and flattens field sections", () => {
    const action = catalog.actions["climate.set_temperature"];

    expect(action?.name).toBe("Solltemperatur einstellen");
    expect(Object.keys(action?.fields ?? {})).toEqual([
      "temperature",
      "target_temp_high",
      "target_temp_low",
    ]);
    expect(action?.fields.temperature?.name).toBe("Soll-Temperatur");
  });

  it("prefers the translation over HA's English name", () => {
    expect(catalog.actions["climate.set_temperature"]?.name).toBe("Solltemperatur einstellen");
  });

  it("names a script and its fields by HA's own texts when there is no translation", () => {
    expect(catalog.actions["script.abendstimmung"]).toMatchObject({
      name: "Abendstimmung",
      description: null,
      fields: { dauer: { name: "Dauer", description: "Wie lange" } },
    });
  });
});
