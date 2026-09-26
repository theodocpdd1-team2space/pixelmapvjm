import { defaultScreenMask, type EditorScreen, type MaskPoint } from "./types";

export type SliceGeometry = Pick<EditorScreen, "x" | "y" | "width" | "height" | "rotation">;

/** Retain subpixel geometry from rotated InputRect vertices across save/load. */
export const geometryPrecision = (value: number) => Math.round(value * 10000) / 10000;
const sideLength = (value: number) => Math.abs(value - Math.round(value)) < 0.001 ? Math.round(value) : geometryPrecision(value);

export function localToComposition(screen: SliceGeometry, x: number, y: number): MaskPoint {
  const angle = screen.rotation * Math.PI / 180;
  return { x: screen.x + x * Math.cos(angle) - y * Math.sin(angle), y: screen.y + x * Math.sin(angle) + y * Math.cos(angle) };
}

export function sliceCorners(screen: SliceGeometry) {
  return [[0, 0], [screen.width, 0], [screen.width, screen.height], [0, screen.height]].map(([x, y]) => localToComposition(screen, x, y));
}

export function rotateSliceAroundCenter(screen: SliceGeometry, rotation: number): SliceGeometry {
  const center = localToComposition(screen, screen.width / 2, screen.height / 2);
  const offset = localToComposition({ ...screen, x: 0, y: 0, rotation }, screen.width / 2, screen.height / 2);
  return { x: geometryPrecision(center.x - offset.x), y: geometryPrecision(center.y - offset.y), width: screen.width, height: screen.height, rotation };
}

export function pointsBounds(points: MaskPoint[]) {
  const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y));
  return { x, y, width: Math.max(...points.map(p => p.x)) - x, height: Math.max(...points.map(p => p.y)) - y };
}

/** Ordered rectangle vertices, not an axis-aligned bounding box. Reject real warp/skew. */
export function rectangleFromQuad(points: MaskPoint[]): SliceGeometry | null {
  if (points.length !== 4 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const [origin, second, opposite, fourth] = points;
  let u = { x: second.x - origin.x, y: second.y - origin.y };
  let v = { x: fourth.x - origin.x, y: fourth.y - origin.y };
  // Also accept counterclockwise polygons without turning the content inside out.
  if (u.x * v.y - u.y * v.x < 0) [u, v] = [v, u];
  const width = Math.hypot(u.x, u.y), height = Math.hypot(v.x, v.y);
  if (width < 1 || height < 1) return null;
  const tolerance = Math.max(0.002, Math.max(width, height) * 0.000001);
  if (Math.hypot(opposite.x - origin.x - u.x - v.x, opposite.y - origin.y - u.y - v.y) > tolerance) return null;
  if (Math.abs(u.x * v.x + u.y * v.y) / Math.min(width, height) > tolerance) return null;
  return { x: geometryPrecision(origin.x), y: geometryPrecision(origin.y), width: sideLength(width), height: sideLength(height), rotation: geometryPrecision(Math.atan2(u.y, u.x) * 180 / Math.PI) };
}

/** Repair only legacy imported rectangles; deliberately authored masks stay masks. */
export function migrateLegacyResolumeRectangle(screen: EditorScreen): EditorScreen {
  if (typeof screen.metadata.resolumeSource !== "string" || screen.metadata.resolumeGeometryVersion === 2 || screen.mask?.type !== "custom") return screen;
  const points = screen.mask.points.map(p => localToComposition(screen, p.x * screen.width, p.y * screen.height));
  const geometry = rectangleFromQuad(points);
  if (!geometry) return screen;
  return { ...screen, ...geometry, mask: { ...defaultScreenMask }, metadata: { ...screen.metadata, resolumeGeometryVersion: 2 } };
}
