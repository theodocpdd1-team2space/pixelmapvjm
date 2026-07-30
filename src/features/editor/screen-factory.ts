import type { CabinetSettings, EditorCanvasSettings, EditorScreen } from "@/features/editor/types";
import { defaultScreenAnimation, defaultScreenMask, defaultScreenPattern } from "@/features/editor/types";
import { defaultCabinetSettings } from "@/features/editor/cabinet-presets";

export function createRectangleScreen(canvas: EditorCanvasSettings, index: number): EditorScreen {
  const width = Math.min(640, Math.max(180, Math.round(canvas.width * 0.22)));
  const height = Math.min(360, Math.max(120, Math.round(canvas.height * 0.18)));

  return {
    id: crypto.randomUUID(),
    name: `SCREEN ${String(index + 1).padStart(2, "0")}`,
    type: "rectangle",
    x: Math.round((canvas.width - width) / 2),
    y: Math.round((canvas.height - height) / 2),
    width,
    height,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    fillColor: "#161616",
    borderColor: "#FF3030",
    borderWidth: 3,
    locked: false,
    visible: true,
    zIndex: index,
    groupId: null,
    cabinet: { ...defaultCabinetSettings },
    mask: { ...defaultScreenMask, points: defaultScreenMask.points.map((point) => ({ ...point })) },
    pattern: { ...defaultScreenPattern },
    animation: { ...defaultScreenAnimation },
    metadata: {}
  };
}

export function duplicateScreen(screen: EditorScreen, index: number): EditorScreen {
  return {
    ...screen,
    id: crypto.randomUUID(),
    name: `${screen.name} COPY`,
    x: screen.x + 32,
    y: screen.y + 32,
    locked: false,
    visible: true,
    zIndex: index
  };
}

export function createCabinetScreen(canvas: EditorCanvasSettings, index: number, cabinet: CabinetSettings): EditorScreen {
  const screen = createRectangleScreen(canvas, index);
  const width = Math.max(8, cabinet.pixelWidth * cabinet.cabinetColumns);
  const height = Math.max(8, cabinet.pixelHeight * cabinet.cabinetRows);
  return {
    ...screen,
    name: `CABINET ARRAY ${String(index + 1).padStart(2, "0")}`,
    x: Math.round((canvas.width - width) / 2),
    y: Math.round((canvas.height - height) / 2),
    width,
    height,
    cabinet: { ...cabinet }
  };
}

export function createLogoScreen(
  canvas: EditorCanvasSettings,
  index: number,
  logoDataUrl: string,
  fileName: string,
  naturalWidth: number,
  naturalHeight: number
): EditorScreen {
  const maxWidth = Math.min(640, canvas.width * 0.28);
  const scale = naturalWidth > 0 ? Math.min(1, maxWidth / naturalWidth) : 1;
  const width = Math.max(64, Math.round(naturalWidth * scale));
  const height = Math.max(64, Math.round(naturalHeight * scale));

  return {
    id: crypto.randomUUID(),
    name: fileName.replace(/\.[^.]+$/, "").slice(0, 32).toUpperCase() || `LOGO ${index + 1}`,
    type: "logo",
    x: Math.round((canvas.width - width) / 2),
    y: Math.round((canvas.height - height) / 2),
    width,
    height,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    fillColor: "#050505",
    borderColor: "#FF3030",
    borderWidth: 2,
    locked: false,
    visible: true,
    zIndex: index,
    groupId: null,
    cabinet: { ...defaultCabinetSettings, showPixelDots: false, showCabinetGrid: false },
    mask: { ...defaultScreenMask, points: defaultScreenMask.points.map((point) => ({ ...point })) },
    pattern: { ...defaultScreenPattern, type: "solid", showScreenName: false, showResolution: false, showCabinetInfo: false },
    animation: { ...defaultScreenAnimation },
    metadata: {
      logoDataUrl,
      fileName,
      naturalWidth,
      naturalHeight
    }
  };
}
