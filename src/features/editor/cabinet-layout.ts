import type { CabinetSettings, EditorScreen, ScreenPatternSettings } from "./types";

const positiveInteger = (value: number) => Math.max(1, Math.round(Number.isFinite(value) ? value : 1));

/** Input-map dimensions can be scaled; a physical cabinet count is always integral. */
export function getCabinetLayout(screen: Pick<EditorScreen, "width" | "height" | "cabinet">) {
  const pixelWidth = positiveInteger(screen.cabinet.pixelWidth);
  const pixelHeight = positiveInteger(screen.cabinet.pixelHeight);
  const columns = positiveInteger(screen.width / pixelWidth);
  const rows = positiveInteger(screen.height / pixelHeight);
  const nativeWidth = columns * pixelWidth, nativeHeight = rows * pixelHeight;
  return {
    columns, rows, nativeWidth, nativeHeight,
    cellWidth: screen.width / columns, cellHeight: screen.height / rows,
    scaled: screen.width !== nativeWidth || screen.height !== nativeHeight,
    physicalWidthMm: columns * screen.cabinet.physicalWidthMm,
    physicalHeightMm: rows * screen.cabinet.physicalHeightMm
  };
}

export function cabinetForDimensions(cabinet: CabinetSettings, width: number, height: number): CabinetSettings {
  const layout = getCabinetLayout({ cabinet, width, height });
  return { ...cabinet, cabinetColumns: layout.columns, cabinetRows: layout.rows };
}

export function getPatternGrid(screen: EditorScreen, pattern: ScreenPatternSettings) {
  if (pattern.gridSource !== "custom") {
    const layout = getCabinetLayout(screen);
    return { columns: layout.columns, rows: layout.rows, width: layout.cellWidth, height: layout.cellHeight, x: 0, y: 0, col: 0, row: 0, cabinet: true };
  }
  const size = Math.max(4, pattern.gridSize);
  const ox = pattern.mode === "global" ? screen.x : 0, oy = pattern.mode === "global" ? screen.y : 0;
  const x = -((ox % size + size) % size), y = -((oy % size + size) % size);
  return { columns: Math.ceil((screen.width - x) / size), rows: Math.ceil((screen.height - y) / size), width: size, height: size, x, y, col: Math.floor(ox / size), row: Math.floor(oy / size), cabinet: false };
}

export function* patternCells(screen: EditorScreen, pattern: ScreenPatternSettings) {
  const grid = getPatternGrid(screen, pattern);
  // Avoid replacing real cabinet boundaries with invented larger cabinets at low detail.
  if (grid.columns * grid.rows > 12000) return;
  for (let row = 0; row < grid.rows; row++) for (let col = 0; col < grid.columns; col++) {
    const x = Math.round(grid.x + col * grid.width), y = Math.round(grid.y + row * grid.height);
    const right = grid.cabinet && col === grid.columns - 1 ? screen.width : Math.round(grid.x + (col + 1) * grid.width);
    const bottom = grid.cabinet && row === grid.rows - 1 ? screen.height : Math.round(grid.y + (row + 1) * grid.height);
    yield { x, y, width: right - x, height: bottom - y, col: grid.col + col, row: grid.row + row };
  }
}
