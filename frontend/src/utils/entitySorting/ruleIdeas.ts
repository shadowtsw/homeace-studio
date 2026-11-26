import type { SortingRule } from "@/types/entitySorting";

import { HUB_INTEGRATIONS, RULE_PLACEHOLDER } from "./constants";
import type { SortingHome } from "./home";
import type { SortingComputation } from "./model";

const MIN_LABEL_ENTITIES = 5;
const MIN_INTEGRATION_BUNDLES = 3;
const MAX_IDEAS = 3;

/**
 * Rules worth suggesting from the data: a label on many entities ("Licht" → "Licht/{area}"), or a
 * brand integration whose devices nothing else explains ("Google Cast" → "Google Cast"). Ideas the
 * user has as a rule already are left out.
 */
export function ruleIdeas(input: {
  home: SortingHome;
  computation: SortingComputation;
  rules: SortingRule[];
}): SortingRule[] {
  const { home, computation, rules } = input;
  const has = (type: string, value: string): boolean =>
    rules.some((rule) =>
      rule.conditions.some((item) => item.type === type && item.value === value),
    );
  const labelCounts = new Map<string, number>();
  const integrationCounts = new Map<string, number>();

  computation.bundles.forEach((bundle) => {
    bundle.entities.forEach((entity) =>
      entity.labels.forEach((label) => labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1)),
    );

    const integration = bundle.integration;
    const isUnexplained = computation.suggestions.get(bundle.key)?.confidence === "unclear";
    if (integration && isUnexplained && !HUB_INTEGRATIONS.has(integration))
      integrationCounts.set(integration, (integrationCounts.get(integration) ?? 0) + 1);
  });

  const byCount = (counts: Map<string, number>, minimum: number): string[] =>
    [...counts.entries()]
      .filter(([, count]) => count >= minimum)
      .sort((first, second) => second[1] - first[1])
      .map(([value]) => value);

  const labelIdeas = byCount(labelCounts, MIN_LABEL_ENTITIES)
    .filter((label) => !has("label", label))
    .map((label): SortingRule => ({
      conditions: [{ type: "label", value: label }],
      target: `${label}/${RULE_PLACEHOLDER.area}`,
    }));
  const integrationIdeas = byCount(integrationCounts, MIN_INTEGRATION_BUNDLES)
    .filter((integration) => !has("integration", integration))
    .map((integration): SortingRule => ({
      conditions: [{ type: "integration", value: integration }],
      target: home.context.integrations[integration] ?? integration,
    }));

  return [...labelIdeas, ...integrationIdeas].slice(0, MAX_IDEAS);
}
