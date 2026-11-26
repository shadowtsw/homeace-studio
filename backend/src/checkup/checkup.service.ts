import { Inject, Injectable } from "@nestjs/common";

import { FLOW_KIND } from "../editor/editor.model";
import { OVERLAY_REPOSITORY } from "../overlay/overlay.constants";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import { HomeSnapshotService, type HomeSnapshot } from "../snapshot/home-snapshot.service";
import { analyzeCheckup, createdTimes, type CheckupFinding } from "./checkup-analysis";

export type CheckupOverview = {
  findings: CheckupFinding[];
  ignoredCount: number;
  checkedAt: string;
};

/** The check-up: what in the home needs a look, read live from HA. */
@Injectable()
export class CheckupService {
  private analyzed: { snapshot: HomeSnapshot; findings: CheckupFinding[] } | null = null;

  constructor(
    private readonly snapshots: HomeSnapshotService,
    @Inject(OVERLAY_REPOSITORY) private readonly overlay: OverlayRepository,
  ) {}

  async overview(): Promise<CheckupOverview> {
    const overlay = await this.overlay.read();
    const ignored = new Set(overlay.checkupIgnored);
    const snapshot = await this.snapshots.get();
    const all = this.findingsOf(snapshot);

    return {
      findings: all.filter((finding) => !ignored.has(finding.key)),
      ignoredCount: ignored.size,
      checkedAt: new Date(snapshot.at).toISOString(),
    };
  }

  async ignore(key: string): Promise<void> {
    await this.overlay.update((overlay) => ({
      ...overlay,
      checkupIgnored: [...new Set([...overlay.checkupIgnored, key])],
    }));
  }

  async restoreIgnored(): Promise<void> {
    await this.overlay.update((overlay) => ({ ...overlay, checkupIgnored: [] }));
  }

  /** The same snapshot gives the same findings; analyzed once. */
  private findingsOf(snapshot: HomeSnapshot): CheckupFinding[] {
    if (this.analyzed?.snapshot === snapshot) return this.analyzed.findings;

    const findings = analyzeCheckup({
      entries: snapshot.entries,
      states: snapshot.states,
      registryIds: new Set(snapshot.registry.map((entry) => entry.entity_id)),
      scriptKeys: new Set(
        snapshot.registry
          .filter((entry) => entry.platform === FLOW_KIND.script)
          .map((entry) => entry.unique_id),
      ),
      configs: snapshot.configs,
      lastRuns: snapshot.lastRuns,
      createdAt: createdTimes(snapshot.registry),
      now: new Date(snapshot.at),
      ignored: new Set(),
    });

    this.analyzed = { snapshot, findings };
    return findings;
  }
}
