import { Injectable, type OnModuleInit } from "@nestjs/common";
import { debounceTime, Observable, share, Subject } from "rxjs";

import { HaConnectionService } from "../ha/ha-connection.service";
import { isRelevantChange, LIVE_EVENT_TYPES } from "./live-events";

/**
 * Several HA events often come in a burst (e.g. a scene switches many things); the UI should
 * reload once after the burst, not for every single event.
 */
export const LIVE_DEBOUNCE_MS = 500;

/** Tells the UI when something it shows changed in HA. */
@Injectable()
export class LiveService implements OnModuleInit {
  private readonly changes = new Subject<void>();

  /** Fires once after a burst of relevant HA events. Shared by all connected browsers. */
  readonly changes$: Observable<void> = this.changes.pipe(debounceTime(LIVE_DEBOUNCE_MS), share());

  constructor(private readonly ha: HaConnectionService) {}

  /** For changes that do not come from HA, e.g. a new folder plan from an AI. */
  notify(): void {
    this.changes.next();
  }

  onModuleInit(): void {
    for (const eventType of LIVE_EVENT_TYPES) {
      this.ha.subscribe({
        eventType,
        handler: (event) => {
          if (isRelevantChange(event)) this.changes.next();
        },
      });
    }
  }
}
