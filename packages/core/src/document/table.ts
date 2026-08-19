import type { OraElement, OraNode } from "./types.js";
import { emptyText, isElement, isText } from "./types.js";
import { emptyCell } from "./blocks.js";

export interface TableGridSlot {
  row: number;
  cell: number;
  visualRow: number;
  visualCol: number;
  origin: boolean;
}

export function cellColSpan(cell: OraElement): number {
  const value = cell.attrs?.colspan;
  return typeof value === "number" && value >= 1 ? Math.min(20, Math.round(value)) : 1;
}

export function cellRowSpan(cell: OraElement): number {
  const value = cell.attrs?.rowspan;
  return typeof value === "number" && value >= 1 ? Math.min(50, Math.round(value)) : 1;
}

export function cellBackground(cell: OraElement): string | undefined {
  return typeof cell.attrs?.background === "string" ? cell.attrs.background : undefined;
}

export function buildTableGrid(table: OraElement): (TableGridSlot | null)[][] {
  const rows = (table.content ?? []).filter(isElement);
  const grid: (TableGridSlot | null)[][] = rows.map(() => []);

  const ensure = (r: number, c: number) => {
    const row = grid[r];
    if (!row) {
      return;
    }
    while (row.length <= c) {
      row.push(null);
    }
  };

  for (let r = 0; r < rows.length; r += 1) {
    const cells = (rows[r]?.content ?? []).filter(isElement);
    let visualCol = 0;
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const rowSlots = grid[r];
      if (!rowSlots) {
        break;
      }
      while (rowSlots[visualCol]) {
        visualCol += 1;
      }
      const cell = cells[cellIndex];
      if (!cell) {
        continue;
      }
      const cs = cellColSpan(cell);
      const rs = cellRowSpan(cell);
      for (let dr = 0; dr < rs; dr += 1) {
        const rr = r + dr;
        if (rr >= rows.length) {
          break;
        }
        for (let dc = 0; dc < cs; dc += 1) {
          const cc = visualCol + dc;
          ensure(rr, cc);
          const target = grid[rr];
          if (!target) {
            continue;
          }
          target[cc] = {
            row: r,
            cell: cellIndex,
            visualRow: rr,
            visualCol: cc,
            origin: dr === 0 && dc === 0,
          };
        }
      }
      visualCol += cs;
    }
  }
  return grid;
}

export function tableVisualWidth(grid: (TableGridSlot | null)[][]): number {
  return grid.reduce((max, row) => Math.max(max, row.length), 0);
}

export function findOriginSlot(grid: (TableGridSlot | null)[][], row: number, cell: number): TableGridSlot | null {
  for (const slots of grid) {
    for (const slot of slots) {
      if (slot?.origin && slot.row === row && slot.cell === cell) {
        return slot;
      }
    }
  }
  return null;
}

export function concatCellContent(left: OraElement, right: OraElement): OraNode[] {
  const keep = (nodes: OraNode[] | undefined) =>
    (nodes ?? []).filter((node) => !isText(node) || node.text.length > 0);
  const merged = [...keep(left.content), ...keep(right.content)];
  return merged.length > 0 ? merged : [emptyText()];
}

export function spanAttrs(colspan: number, rowspan: number, extra?: Record<string, unknown>): Record<string, unknown> | undefined {
  const attrs = { ...(extra ?? {}) };
  if (colspan > 1) {
    attrs.colspan = colspan;
  } else {
    delete attrs.colspan;
  }
  if (rowspan > 1) {
    attrs.rowspan = rowspan;
  } else {
    delete attrs.rowspan;
  }
  return Object.keys(attrs).length > 0 ? attrs : undefined;
}

export function coveredColumnsAtRow(grid: (TableGridSlot | null)[][], row: number): Set<number> {
  const covered = new Set<number>();
  const width = tableVisualWidth(grid);
  for (let col = 0; col < width; col += 1) {
    const slot = grid[row]?.[col];
    if (slot && !slot.origin) {
      covered.add(col);
    }
  }
  return covered;
}

export function emptyCellsForInsert(count: number, header = false): OraElement[] {
  return Array.from({ length: Math.max(0, count) }, () => emptyCell(header));
}

export function originInsertIndex(grid: (TableGridSlot | null)[][], row: number, visualCol: number): number {
  const seen = new Set<string>();
  let index = 0;
  const slots = grid[row] ?? [];
  for (let col = 0; col < visualCol && col < slots.length; col += 1) {
    const slot = slots[col];
    if (!slot || !slot.origin) {
      continue;
    }
    const key = `${slot.row}.${slot.cell}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    index += 1;
  }
  return index;
}
