import type { Point } from "./types.js";
import { pathCompare, pathEquals } from "./path.js";

export function pointEquals(a: Point, b: Point): boolean {
  return pathEquals(a.path, b.path) && a.offset === b.offset;
}

export function pointCompare(a: Point, b: Point): number {
  const compared = pathCompare(a.path, b.path);
  if (compared !== 0) {
    return compared;
  }
  return a.offset - b.offset;
}
