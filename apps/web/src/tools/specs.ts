/**
 * Fictional sample specs for the desk tools. These are not manufacturer data.
 * Keyed by unit ID so they follow the physical projector.
 */
export interface ProjectorSpec {
  /** Throw ratio range: distance to screen divided by image width. */
  throwMin: number;
  throwMax: number;
  watts: number;
}

export const PROJECTOR_SPECS: Record<string, ProjectorSpec> = {
  "PR-04": { throwMin: 1.15, throwMax: 1.5, watts: 300 },
  "PR-06": { throwMin: 1.35, throwMax: 1.62, watts: 260 },
};
