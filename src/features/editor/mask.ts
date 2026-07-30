import { defaultScreenMask } from "@/features/editor/types";
import type { MaskPoint, ScreenMaskSettings, ScreenMaskType } from "@/features/editor/types";

type PathContext = {
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  closePath: () => void;
  rect?: (x: number, y: number, width: number, height: number) => void;
};

export function maskPresetPoints(type: ScreenMaskType): MaskPoint[] {
  if (type === "triangle") {
    return [
      { x: 0.5, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ];
  }

  if (type === "trapezoid") {
    return [
      { x: 0.18, y: 0 },
      { x: 0.82, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ];
  }

  return [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ];
}

function clampPoint(point: MaskPoint): MaskPoint {
  return {
    x: Math.min(1, Math.max(0, Number.isFinite(point.x) ? point.x : 0)),
    y: Math.min(1, Math.max(0, Number.isFinite(point.y) ? point.y : 0))
  };
}

export function normalizeScreenMask(mask?: Partial<ScreenMaskSettings> | null): ScreenMaskSettings {
  const type = mask?.type ?? defaultScreenMask.type;
  const points = Array.isArray(mask?.points) ? mask.points.map(clampPoint) : maskPresetPoints(type);

  if (type === "custom") {
    return {
      type,
      points: points.length >= 3 ? points.slice(0, 12) : maskPresetPoints("trapezoid")
    };
  }

  return {
    type,
    points: maskPresetPoints(type)
  };
}

export function maskAbsolutePoints(mask: ScreenMaskSettings, width: number, height: number) {
  const normalized = normalizeScreenMask(mask);
  return normalized.points.map((point) => ({
    x: point.x * width,
    y: point.y * height
  }));
}

export function isMaskActive(mask?: ScreenMaskSettings) {
  return Boolean(mask && mask.type !== "none");
}

export function drawMaskPath(context: PathContext, mask: ScreenMaskSettings, width: number, height: number) {
  const normalized = normalizeScreenMask(mask);

  context.beginPath();
  if (normalized.type === "none" || normalized.type === "rectangle") {
    if (context.rect) {
      context.rect(0, 0, width, height);
    } else {
      context.moveTo(0, 0);
      context.lineTo(width, 0);
      context.lineTo(width, height);
      context.lineTo(0, height);
      context.closePath();
    }
    return;
  }

  const points = maskAbsolutePoints(normalized, width, height);
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.closePath();
}

export function addMaskPoint(mask: ScreenMaskSettings) {
  const normalized = normalizeScreenMask({ ...mask, type: "custom" });
  let insertAt = normalized.points.length;
  let longestDistance = -1;

  normalized.points.forEach((point, index) => {
    const next = normalized.points[(index + 1) % normalized.points.length];
    const distance = Math.hypot(next.x - point.x, next.y - point.y);
    if (distance > longestDistance) {
      longestDistance = distance;
      insertAt = index + 1;
    }
  });

  const previous = normalized.points[(insertAt - 1 + normalized.points.length) % normalized.points.length];
  const next = normalized.points[insertAt % normalized.points.length];
  return {
    type: "custom" as const,
    points: [
      ...normalized.points.slice(0, insertAt),
      clampPoint({ x: (previous.x + next.x) / 2, y: (previous.y + next.y) / 2 }),
      ...normalized.points.slice(insertAt)
    ]
  };
}

export function removeMaskPoint(mask: ScreenMaskSettings, index: number) {
  const normalized = normalizeScreenMask({ ...mask, type: "custom" });
  if (normalized.points.length <= 3) {
    return normalized;
  }

  return {
    type: "custom" as const,
    points: normalized.points.filter((_, pointIndex) => pointIndex !== index)
  };
}
