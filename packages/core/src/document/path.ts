import type { Path } from "./types.js";

export function pathEquals(a: Path, b: Path): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

export function pathCompare(a: Path, b: Path): number {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av < bv) {
      return -1;
    }
    if (av > bv) {
      return 1;
    }
  }
  return a.length - b.length;
}

export function pathIsAncestor(ancestor: Path, path: Path): boolean {
  if (ancestor.length >= path.length) {
    return false;
  }
  return ancestor.every((value, index) => value === path[index]);
}

export function pathParent(path: Path): Path {
  if (path.length === 0) {
    throw new Error("Le chemin racine n'a pas de parent.");
  }
  return path.slice(0, -1);
}

export function pathIndex(path: Path): number {
  const index = path[path.length - 1];
  if (index === undefined) {
    throw new Error("Chemin vide.");
  }
  return index;
}

export function pathNext(path: Path): Path {
  const next = path.slice();
  const last = next.length - 1;
  const value = next[last];
  if (value === undefined) {
    throw new Error("Chemin vide.");
  }
  next[last] = value + 1;
  return next;
}

export function pathPrevious(path: Path): Path {
  const prev = path.slice();
  const last = prev.length - 1;
  const value = prev[last];
  if (value === undefined || value === 0) {
    throw new Error("Pas de frère précédent.");
  }
  prev[last] = value - 1;
  return prev;
}

export function pathCommon(a: Path, b: Path): Path {
  const common: Path = [];
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    if (a[i] !== b[i]) {
      break;
    }
    common.push(a[i] as number);
  }
  return common;
}

