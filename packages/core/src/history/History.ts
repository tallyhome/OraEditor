import type { OraMark } from "../document/types.js";
import type { Selection } from "../selection/types.js";
import type { Operation } from "../transaction/types.js";

export type HistoryKind = "typing" | "delete" | "format" | "other";

export interface HistoryStep {
  ops: Operation[];
  inverses: Operation[];
  selectionBefore: Selection;
  selectionAfter: Selection;
  storedMarksBefore: OraMark[] | null;
  storedMarksAfter: OraMark[] | null;
  time: number;
  kind: HistoryKind;
}

const MAX_STEPS = 200;
const GROUP_MS = 500;

export class History {
  private undoStack: HistoryStep[] = [];
  private redoStack: HistoryStep[] = [];

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  push(step: HistoryStep): void {
    if (step.ops.length === 0) {
      return;
    }
    const last = this.undoStack[this.undoStack.length - 1];
    if (last && canGroup(last, step)) {
      last.ops.push(...step.ops);
      last.inverses.push(...step.inverses);
      last.selectionAfter = step.selectionAfter;
      last.storedMarksAfter = step.storedMarksAfter;
      last.time = step.time;
      this.redoStack = [];
      return;
    }
    this.undoStack.push(step);
    if (this.undoStack.length > MAX_STEPS) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  popUndo(): HistoryStep | undefined {
    const step = this.undoStack.pop();
    if (step) {
      this.redoStack.push(step);
    }
    return step;
  }

  popRedo(): HistoryStep | undefined {
    const step = this.redoStack.pop();
    if (step) {
      this.undoStack.push(step);
    }
    return step;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

function canGroup(last: HistoryStep, next: HistoryStep): boolean {
  if (last.kind !== "typing" || next.kind !== "typing") {
    return false;
  }
  return next.time - last.time <= GROUP_MS;
}
