import type { OraDocument, OraElement, OraNode, Path } from "./types.js";
import { cloneNode, isElement, isText } from "./types.js";
import { pathIndex, pathParent } from "./path.js";

export function getNode(doc: OraDocument, path: Path): OraNode {
  if (path.length === 0) {
    return { type: "doc", content: doc.content };
  }
  let current: OraNode = { type: "doc", content: doc.content };
  for (const index of path) {
    if (!isElement(current) || !current.content || current.content[index] === undefined) {
      throw new Error(`Nœud introuvable au chemin [${path.join(", ")}].`);
    }
    current = current.content[index];
  }
  return current;
}

export function getParent(doc: OraDocument, path: Path): OraElement {
  if (path.length === 0) {
    throw new Error("La racine n'a pas de parent.");
  }
  const parent = getNode(doc, pathParent(path));
  if (!isElement(parent)) {
    throw new Error("Le parent n'est pas un élément.");
  }
  return parent;
}

export function hasNode(doc: OraDocument, path: Path): boolean {
  try {
    getNode(doc, path);
    return true;
  } catch {
    return false;
  }
}

export function updateNode(doc: OraDocument, path: Path, updater: (node: OraNode) => OraNode): OraDocument {
  if (path.length === 0) {
    const next = updater({ type: "doc", content: doc.content });
    if (!isElement(next) || next.type !== "doc") {
      throw new Error("La racine doit rester un document.");
    }
    return { ...doc, content: next.content ?? [] };
  }

  const rec = (node: OraElement, depth: number): OraElement => {
    const index = path[depth];
    if (index === undefined || !node.content || node.content[index] === undefined) {
      throw new Error(`Nœud introuvable au chemin [${path.join(", ")}].`);
    }
    const child = node.content[index];
    const nextChild =
      depth === path.length - 1
        ? updater(child)
        : rec(child as OraElement, depth + 1);
    const content = node.content.slice();
    content[index] = nextChild;
    return { ...node, content };
  };

  const root = rec({ type: "doc", content: doc.content }, 0);
  return { ...doc, content: root.content ?? [] };
}

export function insertNodeAt(doc: OraDocument, path: Path, node: OraNode): OraDocument {
  const parentPath = pathParent(path);
  const index = pathIndex(path);
  return updateNode(doc, parentPath, (parent) => {
    if (!isElement(parent)) {
      throw new Error("Impossible d'insérer dans un nœud texte.");
    }
    const content = (parent.content ?? []).slice();
    content.splice(index, 0, cloneNode(node));
    return { ...parent, content };
  });
}

export function removeNodeAt(doc: OraDocument, path: Path): { doc: OraDocument; node: OraNode } {
  const node = cloneNode(getNode(doc, path));
  const parentPath = pathParent(path);
  const index = pathIndex(path);
  const next = updateNode(doc, parentPath, (parent) => {
    if (!isElement(parent) || !parent.content) {
      throw new Error("Impossible de supprimer depuis un nœud texte.");
    }
    const content = parent.content.slice();
    content.splice(index, 1);
    return { ...parent, content };
  });
  return { doc: next, node };
}

export function insertTextAt(doc: OraDocument, path: Path, offset: number, text: string): OraDocument {
  return updateNode(doc, path, (node) => {
    if (!isText(node)) {
      throw new Error("insert_text nécessite un nœud texte.");
    }
    return {
      ...node,
      text: node.text.slice(0, offset) + text + node.text.slice(offset),
    };
  });
}

export function removeTextAt(doc: OraDocument, path: Path, offset: number, text: string): OraDocument {
  return updateNode(doc, path, (node) => {
    if (!isText(node)) {
      throw new Error("remove_text nécessite un nœud texte.");
    }
    const actual = node.text.slice(offset, offset + text.length);
    if (actual !== text) {
      return {
        ...node,
        text: node.text.slice(0, offset) + node.text.slice(offset + text.length),
      };
    }
    return {
      ...node,
      text: node.text.slice(0, offset) + node.text.slice(offset + text.length),
    };
  });
}

export function textContent(node: OraNode): string {
  if (isText(node)) {
    return node.text;
  }
  return (node.content ?? []).map(textContent).join("");
}

export function nodeLength(node: OraNode): number {
  if (isText(node)) {
    return node.text.length;
  }
  return node.content?.length ?? 0;
}

export function walkTextPaths(doc: OraDocument): Path[] {
  const paths: Path[] = [];
  const visit = (nodes: OraNode[], path: Path) => {
    nodes.forEach((node, index) => {
      const current = [...path, index];
      if (isText(node)) {
        paths.push(current);
      } else if (node.content) {
        visit(node.content, current);
      }
    });
  };
  visit(doc.content, []);
  return paths;
}
