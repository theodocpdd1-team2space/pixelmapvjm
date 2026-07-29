import type { EditorCanvasSettings } from "@/features/editor/types";

export type RectGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function roundCoord(value: number) {
  return Math.round(value * 100) / 100;
}

export function snapValue(value: number, canvas: EditorCanvasSettings) {
  if (!canvas.snappingEnabled) {
    return roundCoord(value);
  }

  return roundCoord(Math.round(value / canvas.gridSize) * canvas.gridSize);
}

function snapNear(value: number, target: number, threshold: number) {
  return Math.abs(value - target) <= threshold ? target : value;
}

export function snapRectToCanvas(
  rect: RectGeometry,
  canvas: EditorCanvasSettings,
  options: { zoom?: number; otherScreens?: RectGeometry[]; gridSnap?: boolean; objectSnap?: boolean } = {}
): RectGeometry {
  if (!canvas.snappingEnabled) {
    return {
      x: roundCoord(rect.x),
      y: roundCoord(rect.y),
      width: Math.max(1, roundCoord(rect.width)),
      height: Math.max(1, roundCoord(rect.height))
    };
  }

  const threshold = 6 / Math.max(0.05, options.zoom ?? 1);
  const shouldGridSnap = options.gridSnap ?? true;
  const shouldObjectSnap = options.objectSnap ?? true;
  let x = shouldGridSnap ? snapValue(rect.x, canvas) : roundCoord(rect.x);
  let y = shouldGridSnap ? snapValue(rect.y, canvas) : roundCoord(rect.y);
  let width = Math.max(1, shouldGridSnap ? snapValue(rect.width, canvas) : roundCoord(rect.width));
  let height = Math.max(1, shouldGridSnap ? snapValue(rect.height, canvas) : roundCoord(rect.height));

  x = snapNear(x, 0, threshold);
  y = snapNear(y, 0, threshold);
  x = snapNear(x, canvas.width - width, threshold);
  y = snapNear(y, canvas.height - height, threshold);
  x = snapNear(x, canvas.width / 2 - width / 2, threshold);
  y = snapNear(y, canvas.height / 2 - height / 2, threshold);

  if (shouldObjectSnap) {
    const otherScreens = options.otherScreens ?? [];
    for (const other of otherScreens) {
      if (Math.abs(x - other.x) <= threshold) x = other.x;
      if (Math.abs(x + width - (other.x + other.width)) <= threshold) x = other.x + other.width - width;
      if (Math.abs(x + width / 2 - (other.x + other.width / 2)) <= threshold) x = other.x + other.width / 2 - width / 2;
      if (Math.abs(y - other.y) <= threshold) y = other.y;
      if (Math.abs(y + height - (other.y + other.height)) <= threshold) y = other.y + other.height - height;
      if (Math.abs(y + height / 2 - (other.y + other.height / 2)) <= threshold) y = other.y + other.height / 2 - height / 2;
    }
  }

  const right = snapNear(x + width, canvas.width, threshold);
  const bottom = snapNear(y + height, canvas.height, threshold);
  width = Math.max(1, right - x);
  height = Math.max(1, bottom - y);

  return {
    x: roundCoord(x),
    y: roundCoord(y),
    width: roundCoord(width),
    height: roundCoord(height)
  };
}

export function fitZoom(viewportWidth: number, viewportHeight: number, canvas: EditorCanvasSettings) {
  const padding = 80;
  const scaleX = (viewportWidth - padding) / canvas.width;
  const scaleY = (viewportHeight - padding) / canvas.height;
  return clamp(Math.min(scaleX, scaleY), 0.05, 4);
}
