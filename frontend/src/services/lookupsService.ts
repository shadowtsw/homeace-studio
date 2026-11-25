import type { Area, Floor, Label } from "@/types/entry";

import { apiFetch } from "./api";

export function fetchAreas(): Promise<Area[]> {
  return apiFetch<Area[]>("/areas");
}

/** HA's floors in its own order (by level). */
export function fetchFloors(): Promise<Floor[]> {
  return apiFetch<Floor[]>("/floors");
}

export function fetchLabels(): Promise<Label[]> {
  return apiFetch<Label[]>("/labels");
}
