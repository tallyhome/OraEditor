import { DOCUMENT_MODEL_VERSION } from "../../version.js";
import type { OraDocument } from "../types.js";
import { createEmptyDocument } from "../types.js";

/**
 * Migrations du format Document Model (entier `version`), distinctes du SemVer package.
 */
export function migrateDocument(doc: OraDocument): OraDocument {
  if (!doc || doc.type !== "doc") {
    return createEmptyDocument();
  }
  if (doc.version === DOCUMENT_MODEL_VERSION) {
    return doc;
  }
  if (doc.version < 1 || typeof doc.version !== "number") {
    return { ...doc, version: DOCUMENT_MODEL_VERSION };
  }
  if (doc.version > DOCUMENT_MODEL_VERSION) {
    throw new Error(
      `Document Model v${doc.version} non pris en charge (moteur v${DOCUMENT_MODEL_VERSION}).`,
    );
  }
  return { ...doc, version: DOCUMENT_MODEL_VERSION };
}
