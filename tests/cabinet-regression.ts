import { cabinetForDimensions, getCabinetLayout, patternCells } from "../src/features/editor/cabinet-layout";
import { cabinetSettingsFromPreset } from "../src/features/editor/cabinet-presets";
import { createRectangleScreen } from "../src/features/editor/screen-factory";
import { defaultScreenPattern, type EditorScreen } from "../src/features/editor/types";
import { visualTemplates } from "../src/features/editor/visual-templates";
import { renderEditorFrame } from "../src/features/editor/render-service";
import { parseResolumeXml, mergeResolumeScreens } from "../src/features/editor/resolume";
import { useEditorStore } from "../src/stores/editor-store";
import { editorScreenSchema } from "../src/types/project";

const check = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };

export async function cabinetRegression(xml: string) {
  const canvas = { ...useEditorStore.getState().canvas, width: 2000, height: 1400 };
  const preset = visualTemplates.find(template => template.id === "festival-cyan")!;
  const screen: EditorScreen = {
    ...createRectangleScreen(canvas, 0), name: "Slice 2", width: 903, height: 1280, x: 0, y: 0,
    cabinet: { ...cabinetSettingsFromPreset("p391-500"), cabinetColumns: 1, cabinetRows: 1 },
    // Reproduce a saved document with the old 108px visual grid and stale 1x1 array.
    pattern: { ...defaultScreenPattern, ...preset.pattern, gridSize: 108, mode: "global" },
    animation: { ...createRectangleScreen(canvas, 0).animation, type: "none" }
  };
  delete screen.pattern.gridSource;
  const p = { ...defaultScreenPattern, ...screen.pattern };
  const layout = getCabinetLayout(screen);
  check(layout.columns === 7 && layout.rows === 10 && layout.nativeWidth === 896 && layout.nativeHeight === 1280 && layout.scaled, "903x1280 means 7x10 whole cabinets, scaled from 896x1280");
  check(layout.physicalWidthMm === 3500 && layout.physicalHeightMm === 5000, "physical size must not include fractions of cabinets");
  const cells = [...patternCells(screen, p)];
  check(cells.length === 70 && cells.every(c => c.width === 129 && c.height === 128), "exactly 70 full cells before reapplying preset");
  check(cells.at(-1)!.x + cells.at(-1)!.width === 903 && cells.at(-1)!.y + cells.at(-1)!.height === 1280, "last cell ends exactly at screen boundary");
  check(JSON.stringify(cells) === JSON.stringify([...patternCells({ ...screen, x: 53, y: 97 }, p)]), "global pattern mode and movement cannot offset physical cabinet cells");
  const strip = { ...screen, width: 1536, height: 512, cabinet: cabinetSettingsFromPreset("strip-512x256") };
  const stripCells = [...patternCells(strip, p)];
  check(stripCells.length === 6 && stripCells.every(c => c.width === 512 && c.height === 256), "rectangular cabinets preserve both dimensions");
  check([...patternCells({ ...screen, width: 1, height: 1 }, p)].length === 1, "small slices still have one complete scaled cell");
  check(editorScreenSchema.parse(screen).pattern.gridSource === "cabinet", "legacy projects default to cabinet grid");
  check(editorScreenSchema.parse({ ...screen, pattern: { ...p, gridSource: "custom" } }).pattern.gridSource === "custom", "custom graphics remain explicitly supported");

  const before = await renderEditorFrame({ ...canvas, width: 903, height: 1280 }, [screen]);
  const reapplied = { ...screen, cabinet: cabinetSettingsFromPreset("p391-500") };
  const after = await renderEditorFrame({ ...canvas, width: 903, height: 1280 }, [reapplied]);
  check(before.toDataURL() === after.toDataURL(), "initial render and reapplied P3.91 render must be identical");
  before.id = "cabinet-regression"; document.body.append(before);
  const clean = { ...screen, borderWidth: 0, pattern: { ...p, showDiagonal: false, showCenterCrosshair: false, showCircle: false, showScreenIndex: false, showScreenName: false, showSize: false, showResolution: false, showCabinetInfo: false } };
  const pixels = (await renderEditorFrame({ ...canvas, width: 903, height: 1280 }, [clean])).getContext("2d")!;
  const expected = [p.primaryColor, p.secondaryColor];
  for (let col = 0; col < 7; col++) {
    const value = pixels.getImageData(col * 129 + 64, 32, 1, 1).data;
    const color = `#${Array.from(value.slice(0, 3)).map(v => v.toString(16).padStart(2, "0")).join("")}`;
    check(color.toUpperCase() === expected[col % 2].toUpperCase(), "rendered cells match cabinet layout, not legacy 108px grid");
  }
  const store = useEditorStore.getState();
  store.loadDocument({ projectId: "cabinet", pageId: "cabinet", projectName: "Cabinet regression", canvas, pages: [], screens: [screen], serverUpdatedAt: "" });
  const current = () => useEditorStore.getState().screens[0];
  check(current().cabinet.cabinetColumns === 7 && current().cabinet.cabinetRows === 10, "load repairs stale inspector counts");
  store.beginTransform(); store.updateScreen(screen.id, { width: 896, height: 1280 }); store.commitTransform();
  check(!getCabinetLayout(current()).scaled, "native correction eliminates scaling");
  store.undo(); check(current().width === 903 && current().cabinet.cabinetColumns === 7, "native correction undo");
  store.redo(); check(current().width === 896, "native correction redo");
  store.updateScreen(screen.id, { width: 903, cabinet: cabinetSettingsFromPreset("p625-500") });
  check(current().cabinet.cabinetColumns === 11 && current().cabinet.cabinetRows === 16, "changing preset recalculates integral counts");
  store.updateScreen(screen.id, { cabinet: cabinetSettingsFromPreset("p391-500") });
  check(current().cabinet.cabinetColumns === 7 && current().cabinet.cabinetRows === 10, "switch back without grid side effects");
  store.updateScreen(screen.id, { width: 1024, height: 768 });
  check(current().cabinet.cabinetColumns === 8 && current().cabinet.cabinetRows === 6, "resizing synchronizes stored cabinet counts");
  const imported = parseResolumeXml(xml, "cabinet.xml", canvas);
  check(imported.screens.every(s => s.cabinet.cabinetColumns === getCabinetLayout(s).columns && s.cabinet.cabinetRows === getCabinetLayout(s).rows), "XML import initializes correct counts");
  const synced = mergeResolumeScreens(imported.screens.map(s => ({ ...s, cabinet: cabinetForDimensions(cabinetSettingsFromPreset("p625-500"), s.width, s.height) })), imported);
  check(synced.every(s => s.cabinet.pixelWidth === 80 && s.cabinet.cabinetColumns === getCabinetLayout(s).columns), "XML sync preserves preset and recalculates counts");
  store.loadDocument({ projectId: "cabinet", pageId: "cabinet", projectName: "Cabinet regression", canvas, pages: [], screens: [screen], serverUpdatedAt: "" });
  store.setZoom(0.4); store.setPan({ x: 20, y: 20 }); store.selectScreen(screen.id);
  return { cabinetRegression: "PASS", cells: cells.length, native: "896 × 1280", slice: "903 × 1280" };
}
