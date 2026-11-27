/**
 * A small Home Assistant in memory for demo mode and tests. `FakeHa` routes the commands; one
 * module per topic (registry, areas, labels, categories, scenes, services, flows, helpers) does
 * the work on the shared data in `data.ts`.
 */
export { FakeHa, type CallOptions, type RestPostOptions, type SubscribeOptions } from "./fake-ha";
