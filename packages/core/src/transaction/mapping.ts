import type { Path, Point } from "../document/types.js";
import { pathEquals, pathIndex, pathIsAncestor, pathParent, pathPrevious } from "../document/path.js";
import type { Operation } from "./types.js";

export function transformPath(path: Path, op: Operation, affinity: "forward" | "backward" = "forward"): Path | null {
  switch (op.type) {
    case "insert_text":
    case "remove_text":
    case "set_node":
    case "set_selection":
      return path;
    case "insert_node":
      return transformAfterInsert(path, op.path, affinity);
    case "remove_node": {
      if (pathEquals(path, op.path) || pathIsAncestor(op.path, path)) {
        return null;
      }
      return transformAfterRemove(path, op.path);
    }
    case "split_node": {
      if (pathEquals(path, op.path) || pathIsAncestor(op.path, path)) {
        return path;
      }
      if (path.length > 0 && pathIsAncestor(pathParent(op.path), path) && pathIndex(path) > pathIndex(op.path)) {
        const next = path.slice();
        const parentLen = op.path.length - 1;
        const current = next[parentLen];
        if (current !== undefined) {
          next[parentLen] = current + 1;
        }
        return next;
      }
      return path;
    }
    case "merge_node": {
      if (pathEquals(path, op.path)) {
        return null;
      }
      if (pathIsAncestor(op.path, path)) {
        const prev = pathPrevious(op.path);
        return [...prev, ...path.slice(op.path.length)];
      }
      if (path.length > 0 && pathIsAncestor(pathParent(op.path), path) && pathIndex(path) > pathIndex(op.path)) {
        const next = path.slice();
        const parentLen = op.path.length - 1;
        const current = next[parentLen];
        if (current !== undefined) {
          next[parentLen] = current - 1;
        }
        return next;
      }
      return path;
    }
    default:
      return path;
  }
}

function transformAfterInsert(path: Path, insertPath: Path, affinity: "forward" | "backward"): Path {
  if (insertPath.length === 0) {
    return path;
  }
  const parent = pathParent(insertPath);
  const index = pathIndex(insertPath);
  if (path.length >= insertPath.length && (parent.length === 0 || pathEquals(parent, path.slice(0, parent.length)))) {
    const pathIndexAt = path[parent.length];
    if (pathIndexAt === undefined) {
      return path;
    }
    if (pathIndexAt > index || (pathIndexAt === index && affinity === "forward")) {
      const next = path.slice();
      next[parent.length] = pathIndexAt + 1;
      return next;
    }
  }
  return path;
}

function transformAfterRemove(path: Path, removePath: Path): Path {
  const parent = pathParent(removePath);
  const index = pathIndex(removePath);
  if (path.length >= removePath.length && (parent.length === 0 || pathEquals(parent, path.slice(0, parent.length)))) {
    const pathIndexAt = path[parent.length];
    if (pathIndexAt !== undefined && pathIndexAt > index) {
      const next = path.slice();
      next[parent.length] = pathIndexAt - 1;
      return next;
    }
  }
  return path;
}

export function transformPoint(point: Point, op: Operation, affinity: "forward" | "backward" = "forward"): Point | null {
  switch (op.type) {
    case "insert_text": {
      if (!pathEquals(point.path, op.path)) {
        return point;
      }
      if (point.offset > op.offset || (point.offset === op.offset && affinity === "forward")) {
        return { path: point.path, offset: point.offset + op.text.length };
      }
      return point;
    }
    case "remove_text": {
      if (!pathEquals(point.path, op.path)) {
        return point;
      }
      const end = op.offset + op.text.length;
      if (point.offset <= op.offset) {
        return point;
      }
      if (point.offset <= end) {
        return { path: point.path, offset: op.offset };
      }
      return { path: point.path, offset: point.offset - op.text.length };
    }
    case "split_node": {
      if (pathEquals(point.path, op.path)) {
        if (point.offset >= op.position) {
          const next = op.path.slice();
          const last = next.length - 1;
          const value = next[last];
          if (value !== undefined) {
            next[last] = value + 1;
          }
          return { path: next, offset: point.offset - op.position };
        }
        return point;
      }
      const mapped = transformPath(point.path, op, affinity);
      return mapped ? { path: mapped, offset: point.offset } : null;
    }
    case "merge_node": {
      if (pathEquals(point.path, op.path)) {
        return { path: pathPrevious(op.path), offset: point.offset + op.position };
      }
      const mapped = transformPath(point.path, op, affinity);
      return mapped ? { path: mapped, offset: point.offset } : null;
    }
    default: {
      const mapped = transformPath(point.path, op, affinity);
      return mapped ? { path: mapped, offset: point.offset } : null;
    }
  }
}
