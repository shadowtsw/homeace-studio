import type { ConfigPath, FlowChange } from "@/types/editor";
import { asList } from "@/utils/list";

import { getAtPath, setAtPath } from "./configPath";

type Config = Record<string, unknown>;

/** HA's shorthand for a template condition is a plain string; disabling needs the long form. */
const TEMPLATE_CONDITION = "template";

/** A list in the config; HA also allows a single item or nothing where a list is expected. */
function listAt({ config, listPath }: { config: Config; listPath: ConfigPath }): unknown[] {
  const value = getAtPath({ root: config, path: listPath });
  const items = asList(value);

  return [...items];
}

const withList = ({
  config,
  listPath,
  list,
}: {
  config: Config;
  listPath: ConfigPath;
  list: unknown[];
}): Config => setAtPath({ root: config, path: listPath, value: list }) as Config;

export type ApplyFlowChangeOptions = {
  config: Config;
  change: FlowChange;
};

/**
 * Applies one editor change and returns the new config; the given config is not touched.
 * A list that was a single item becomes a real list once its length changes.
 *
 * @example
 * applyFlowChange({ config, change: { type: "move", listPath: ["actions"], from: 2, to: 1 } })
 */
export function applyFlowChange({ config, change }: ApplyFlowChangeOptions): Config {
  switch (change.type) {
    case "set":
      return setAtPath({ root: config, path: change.path, value: change.value }) as Config;

    case "insert":
      return withList({
        config,
        listPath: change.listPath,
        list: [...listAt({ config, listPath: change.listPath }), change.item],
      });

    case "move": {
      const list = listAt({ config, listPath: change.listPath });

      if (change.to < 0 || change.to >= list.length) return config;

      const [item] = list.splice(change.from, 1);
      list.splice(change.to, 0, item);
      return withList({ config, listPath: change.listPath, list });
    }

    case "duplicate": {
      const list = listAt({ config, listPath: change.listPath });
      list.splice(change.index + 1, 0, structuredClone(list[change.index]));
      return withList({ config, listPath: change.listPath, list });
    }

    case "remove": {
      const list = listAt({ config, listPath: change.listPath });
      list.splice(change.index, 1);
      return withList({ config, listPath: change.listPath, list });
    }

    case "toggle": {
      // Through the item's own path, so a single item keeps its shape.
      const path = [...change.listPath, change.index];
      return setAtPath({
        root: config,
        path,
        value: toggledItem(getAtPath({ root: config, path })),
      }) as Config;
    }
  }
}

/** `enabled: false` disables a block in HA; enabling removes the key again. */
function toggledItem(item: unknown): unknown {
  if (typeof item === "string") {
    return { condition: TEMPLATE_CONDITION, value_template: item, enabled: false };
  }

  if (!item || typeof item !== "object") return item;

  const record = { ...(item as Config) };

  if (record.enabled === false) delete record.enabled;
  else record.enabled = false;

  return record;
}
