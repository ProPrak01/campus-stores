import type { ProjectorSpec } from "./specs";

export type Aspect = "16:9" | "16:10" | "4:3";
export const ASPECTS: Record<Aspect, [number, number]> = {
  "16:9": [16, 9],
  "16:10": [16, 10],
  "4:3": [4, 3],
};

export interface ScreenSize {
  width: number;
  height: number;
  diagonal: number;
}

export function sizeFromWidth(width: number, aspect: Aspect): ScreenSize {
  const [w, h] = ASPECTS[aspect];
  const height = (width * h) / w;
  return { width, height, diagonal: Math.hypot(width, height) };
}

export function sizeFromDiagonal(diagonal: number, aspect: Aspect): ScreenSize {
  const [w, h] = ASPECTS[aspect];
  const unit = diagonal / Math.hypot(w, h);
  return { width: unit * w, height: unit * h, diagonal };
}

/**
 * Image sizes a projector gives at a distance. Width = distance / throw ratio, so the
 * smallest image is at the longest throw ratio. Sizes come out in the same unit as the distance.
 */
export function imageAtDistance(distance: number, spec: ProjectorSpec, aspect: Aspect) {
  return {
    smallest: sizeFromWidth(distance / spec.throwMax, aspect),
    largest: sizeFromWidth(distance / spec.throwMin, aspect),
  };
}

/** Distances (same unit as the width) that give an image this wide. */
export function distanceForWidth(width: number, spec: ProjectorSpec) {
  return { nearest: width * spec.throwMin, farthest: width * spec.throwMax };
}
