export { overlayLogoRegression } from "./overlay-logo-regression";
export { rotationRegression, loadRotationPreview } from "./rotation-regression";
export { cabinetRegression } from "./cabinet-regression";
import { createRoot } from "react-dom/client";
import { useCallback } from "react";
import { parseResolumeXml, exportResolumeXml, mergeResolumeScreens } from "../src/features/editor/resolume";
import { useEditorStore } from "../src/stores/editor-store";
import { visualTemplates } from "../src/features/editor/visual-templates";
import { cellRowName, getChaseLevel } from "../src/features/editor/stage-visuals";
import { defaultScreenPattern, type AnimationType } from "../src/features/editor/types";
import { renderEditorFrame, exportMp4 } from "../src/features/editor/render-service";
import { createRectangleScreen } from "../src/features/editor/screen-factory";
import { editorScreenSchema } from "../src/types/project";
import { EditorCanvas } from "../src/components/editor/editor-canvas";
import { VisualLibrary } from "../src/components/editor/visual-library";
import { ResolumePanel } from "../src/components/editor/resolume-panel";
import { ScreenInspector } from "../src/components/editor/screen-inspector";

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function reject(fn: () => unknown, message: string) { let thrown = false; try { fn(); } catch { thrown = true; } assert(thrown, message); }
const canvas = { ...useEditorStore.getState().canvas, width: 1920, height: 1080 };

export async function runChecks(xml: string) {
  const parsed = parseResolumeXml(xml, "stage.xml", canvas);
  assert(parsed.screens.length === 4, "all slices including disabled");
  assert(parsed.width === 1920 && parsed.height === 1080, "composition dimensions");
  assert(parsed.screens[0].x === 320 && parsed.screens[0].name === "MAIN & STAGE", "input geometry and XML escaping");
  assert(parsed.screens[2].visible === false, "disabled slice");
  assert(parsed.screens[0].metadata.resolumeKey !== parsed.screens[3].metadata.resolumeKey, "output identity scopes duplicate slice IDs");
  reject(() => parseResolumeXml("<ScreenSetup>", "bad.xml", canvas), "malformed XML rejected");
  reject(() => parseResolumeXml('<!DOCTYPE test><ScreenSetup/>', "bad.xml", canvas), "DTD rejected");
  reject(() => parseResolumeXml(xml.replaceAll('x="320"', 'x="NaN"').replaceAll('x="0"', 'x="NaN"').replaceAll('x="1664"', 'x="NaN"'), "bad.xml", canvas), "invalid coordinates rejected");
  const polygon = parseResolumeXml(xml.replace('x="320" y="0"', 'x="400" y="0"'), "poly.xml", canvas);
  assert(polygon.screens[0].mask.type === "custom", "polygon input is masked");
  reject(() => exportResolumeXml(canvas, polygon.screens), "unsupported mask export is explicit");
  const fresh = parseResolumeXml(xml.replaceAll('x="320"', 'x="300"'), "stage.xml", canvas);
  const old = parsed.screens.map(s => ({ ...s, pattern: { ...s.pattern, accentColor: "#ABCDEF" }, animation: { ...s.animation, type: "wire-tunnel" as const } }));
  const manual = createRectangleScreen(canvas, 4);
  const merged = mergeResolumeScreens([...old, manual], fresh);
  const changed = merged.find(s => s.id === old[0].id)!;
  assert(changed.x === 300 && changed.pattern.accentColor === "#ABCDEF" && changed.animation.type === "wire-tunnel", "sync preserves colors/effects/IDs");
  assert(merged.some(s => s.id === manual.id), "sync preserves manual screens");
  assert(mergeResolumeScreens(old, { ...fresh, screens: fresh.screens.slice(1) }).length === 3, "deleted external slice removed");
  const back = parseResolumeXml(exportResolumeXml(canvas, parsed.screens), "roundtrip.xml", canvas);
  assert(back.screens.length === 3 && back.screens[0].x === 320 && back.screens[0].name === "MAIN & STAGE", "export/import round trip");
  const store = useEditorStore.getState();
  store.loadDocument({ projectId: "test", pageId: "test", projectName: "Test", pages: [], canvas, screens: [manual], serverUpdatedAt: "" });
  store.syncResolume(parsed, true); store.undo();
  assert(useEditorStore.getState().screens.length === 1, "sync undo");
  store.redo(); assert(useEditorStore.getState().screens.length === 5, "sync redo");
  assert(cellRowName(26) === "AA" && cellRowName(0) === "A", "cell labels beyond Z");
  const chase = parsed.screens.filter(s => s.visible).map(s => ({ ...s, animation: { ...s.animation, type: "slice-chase" as const, speed: 1 } }));
  const left = chase.find(s => s.name === "LEFT")!;
  assert(getChaseLevel(left, chase, 0) === 1, "chase uses spatial order");
  assert(getChaseLevel(left, chase, 1) < 0.1, "chase advances");
  const bounce = chase.map(s => ({ ...s, animation: { ...s.animation, type: "slice-bounce" as const } }));
  assert(bounce.filter(s => getChaseLevel(s, bounce, 3) === 1).length === 1, "bounce has single active slice");
  for (const template of visualTemplates) {
    const s = { ...parsed.screens[0], pattern: { ...defaultScreenPattern, ...template.pattern }, animation: { ...parsed.screens[0].animation, ...template.animation } };
    assert(editorScreenSchema.parse(s).pattern.type === template.pattern.type, `persist ${template.id}`);
  }
  const small = { ...canvas, width: 320, height: 180 };
  const screen = { ...manual, x: 0, y: 0, width: 320, height: 180, borderWidth: 0, pattern: { ...defaultScreenPattern, type: "solid", showScreenName: false, showSize: false, showResolution: false, showCabinetInfo: false }, cabinet: { ...manual.cabinet, showPixelDots: false, showCabinetGrid: false } };
  const blank = await renderEditorFrame(small, [screen]);
  const corner = blank.getContext("2d")!.getImageData(0, 0, 1, 1).data;
  assert(corner[0] === 2 && corner[1] === 8 && corner[2] === 6, "border width zero draws no border");
  for (const type of ["wire-tunnel", "neon-flow", "digital-glitch", "slice-chase", "slice-bounce", "gradient-wipe"] as AnimationType[]) {
    const animated = { ...screen, animation: { ...screen.animation, type } };
    assert(editorScreenSchema.parse(animated).animation.type === type, `persist ${type}`);
    const a = await renderEditorFrame(small, [animated], { time: 0.1 });
    const b = await renderEditorFrame(small, [animated], { time: 0.6 });
    assert(a.toDataURL() !== b.toDataURL(), `${type} moves on solid pattern`);
    const still = await renderEditorFrame(small, [animated]);
    const none = await renderEditorFrame(small, [{ ...animated, animation: { ...animated.animation, type: "none" } }]);
    assert(still.toDataURL() === none.toDataURL(), "static export excludes animation");
  }
  const stages = visualTemplates.filter(t => ["festival-card", "badge-card", "coordinate-card"].includes(t.pattern.type ?? ""));
  const sheet = document.createElement("canvas"); sheet.width = 1200; sheet.height = 720;
  const ctx = sheet.getContext("2d")!;
  for (const [i, template] of stages.entries()) {
    const s = { ...screen, name: "MAIN SCREEN", width: 600, height: 240, pattern: { ...defaultScreenPattern, ...template.pattern, gridSize: 60 } };
    ctx.drawImage(await renderEditorFrame({ ...small, width: 600, height: 240 }, [s]), i % 2 * 600, Math.floor(i / 2) * 240);
  }
  sheet.id = "contact-sheet"; document.body.append(sheet);
  const sample = parsed.screens.map(s => ({ ...s, visible: true }));
  store.loadDocument({ projectId: "test", pageId: "test", projectName: "Test", pages: [], canvas, screens: sample, serverUpdatedAt: "" });
  store.setZoom(0.4); store.setPan({ x: 20, y: 20 });
  return { passed: true, slices: parsed.screens.length, presets: stages.length, effects: 6 };
}

export async function recordSample() {
  const state = useEditorStore.getState();
  const small = { ...state.canvas, width: 320, height: 180 };
  const s = { ...state.screens[0], x: 0, y: 0, width: 320, height: 180, pattern: { ...defaultScreenPattern, ...state.screens[0].pattern, centerMode: "logo", showScreenIndex: true, logoRotate: true }, animation: { ...state.screens[0].animation, type: "wire-tunnel" as const } };
  await exportMp4(small, [s], () => {}, { fps: 30, duration: 1 });
}

function Harness() {
  const viewport = useCallback(() => {}, []);
  return <div style={{ display: "grid", gridTemplateColumns: "300px 820px 300px", gap: 16 }}>
    <aside><VisualLibrary /><ResolumePanel /></aside><div style={{ height: 500 }}><EditorCanvas onViewportChange={viewport} /></div><aside><ScreenInspector /></aside>
  </div>;
}
export function mount() { createRoot(document.getElementById("root")!).render(<Harness />); }
export function state() { return useEditorStore.getState(); }
