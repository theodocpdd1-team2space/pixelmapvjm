import { parseResolumeXml, exportResolumeXml, mergeResolumeScreens } from "../src/features/editor/resolume";
import { useEditorStore } from "../src/stores/editor-store";
import { rectangleFromQuad, sliceCorners, localToComposition, rotateSliceAroundCenter, pointsBounds } from "../src/features/editor/slice-geometry";
import { snapScreenPosition } from "../src/features/editor/geometry";
import { renderEditorFrame } from "../src/features/editor/render-service";
import { getCabinetLayout } from "../src/features/editor/cabinet-layout";
import { editorScreenSchema } from "../src/types/project";
import { visualTemplates } from "../src/features/editor/visual-templates";
import type { EditorScreen, MaskPoint } from "../src/features/editor/types";

let previewScreens: EditorScreen[] = [];
export function loadRotationPreview() {
  const store = useEditorStore.getState();
  store.loadDocument({ projectId: 'rotation', pageId: 'rotation', projectName: 'Rotation', canvas: { ...store.canvas, width: 1200, height: 800 }, screens: previewScreens, pages: [], serverUpdatedAt: '' });
  store.selectScreen(previewScreens[0].id); store.setZoom(0.5); store.setPan({ x: 30, y: 30 });
}

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function close(a: number, b: number, message: string, tolerance = 0.003) { assert(Math.abs(a - b) < tolerance, `${message}: ${a} != ${b}`); }
function quad(cx: number, cy: number, width: number, height: number, degrees: number) {
  const angle = degrees * Math.PI / 180;
  return [[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]].map(([x, y]) => ({ x: +(cx + x * Math.cos(angle) - y * Math.sin(angle)).toFixed(4), y: +(cy + x * Math.sin(angle) + y * Math.cos(angle)).toFixed(4) }));
}
function xml(points: MaskPoint[], size = '<CurrentCompositionTextureSize width="1200" height="800"/>') {
  return `<ScreenSetup>${size}<Screen uniqueId="1"><Slice uniqueId="2" name="ROTATED"><InputRect>${points.map(p => `<v x="${p.x}" y="${p.y}"/>`).join("")}</InputRect></Slice></Screen></ScreenSetup>`;
}

export async function rotationRegression() {
  const store = useEditorStore.getState(), canvas = { ...store.canvas, width: 1200, height: 800 };
  const angles = [0, 15, 30, 45, 90, 135, 180, 270, -45, 22.5];
  for (const angle of angles) {
    for (const [width, height] of [[128, 128], [256, 128], [128.25, 255.75]]) {
      const vertices = quad(300.25, 300.125, width, height, angle);
      const imported = parseResolumeXml(xml(vertices), 'rotation.xml', canvas);
      const s = imported.screens[0];
      assert(s.mask.type === 'none', `rectangle at ${angle} must not become polygon`);
      close(s.width, width, 'local width'); close(s.height, height, 'local height');
      close(localToComposition(s, width / 2, height / 2).x, 300.25, 'center x');
      assert(!imported.warnings.some(w => w.includes('skew/warp')), 'rotated rectangle has no warp warning');
      assert(getCabinetLayout(s).columns === Math.round(width / 128), 'cabinet columns use edges');
      let current = s;
      for (let i = 0; i < 3; i++) {
        current = parseResolumeXml(exportResolumeXml(canvas, [editorScreenSchema.parse(current)]), 'rotation.xml', canvas).screens[0];
        sliceCorners(current).forEach((p, index) => { close(p.x, vertices[index].x, 'roundtrip corner x'); close(p.y, vertices[index].y, 'roundtrip corner y'); });
      }
      store.loadDocument({ projectId: 'rotation', pageId: 'rotation', projectName: 'Rotation', canvas, screens: [s], pages: [], serverUpdatedAt: '' });
      sliceCorners(useEditorStore.getState().screens[0]).forEach((p, index) => close(p.x, vertices[index].x, 'load keeps subpixel precision'));
      const rotated = rotateSliceAroundCenter(s, angle + 37);
      const center = localToComposition(rotated, width / 2, height / 2);
      close(center.x, 300.25, 'manual rotation preserves center x'); close(center.y, 300.125, 'manual rotation preserves center y');
      const moved = snapScreenPosition({ ...s, x: s.x + 17, y: s.y + 21 }, { ...canvas, snappingEnabled: true });
      assert(moved.width === s.width && moved.height === s.height && moved.rotation === s.rotation, 'drag snapping never resizes or rotates a cabinet');
    }
  }
  const vertices = quad(160, 160, 128, 128, 45);
  const fresh = parseResolumeXml(xml(vertices), 'rotation.xml', canvas).screens[0];
  const bounds = pointsBounds(vertices);
  const legacy: EditorScreen = { ...fresh, ...bounds, rotation: 0, metadata: { resolumeSource: 'rotation.xml', resolumeKey: '1/2' }, mask: { type: 'custom', points: vertices.map(p => ({ x: (p.x - bounds.x) / bounds.width, y: (p.y - bounds.y) / bounds.height })) }, pattern: { ...fresh.pattern, centerMode: 'logo', logoText: 'KEEP' } };
  const manual = { ...legacy, id: 'manual', metadata: {} };
  store.loadDocument({ projectId: 'rotation', pageId: 'rotation', projectName: 'Rotation', canvas, screens: [legacy, manual], pages: [], serverUpdatedAt: '' });
  const migrated = useEditorStore.getState().screens[0];
  assert(migrated.mask.type === 'none' && migrated.rotation === 45 && migrated.width === 128, 'legacy imported diamond repaired on load');
  assert(migrated.pattern.logoText === 'KEEP' && migrated.id === legacy.id, 'migration preserves identity and branding');
  assert(useEditorStore.getState().screens[1].mask.type === 'custom', 'manual masks not migrated');
  store.pushHistory(); store.updateScreen(migrated.id, { rotation: 30 }); store.undo(); store.redo();
  assert(useEditorStore.getState().screens[0].rotation === 30, 'rotation survives undo redo');
  const synced = mergeResolumeScreens([migrated], parseResolumeXml(xml(quad(200, 220, 256, 128, -30)), 'rotation.xml', canvas)).at(0)!;
  close(synced.rotation, -30, 'sync updates angle'); assert(synced.pattern.logoText === 'KEEP' && synced.width === 256, 'sync retains branding and local size');
  const warped = vertices.map((p, i) => i === 2 ? { x: p.x + 8, y: p.y } : p);
  assert(rectangleFromQuad(warped) === null, 'warp never disguised as rotation');
  assert(parseResolumeXml(xml(warped), 'warp.xml', canvas).screens[0].mask.type === 'custom', 'warp fallback stays explicit');
  assert(rectangleFromQuad([vertices[0], vertices[3], vertices[2], vertices[1]]) !== null, 'reverse winding accepted');
  const auto = parseResolumeXml(xml(quad(500, 500, 256, 128, 135), ''), 'auto.xml', canvas);
  const actual = pointsBounds(sliceCorners(auto.screens[0]));
  assert(auto.width >= actual.x + actual.width && auto.height >= actual.y + actual.height, 'canvas bounds include every rotated corner');
  assert(parseResolumeXml(xml(quad(0, 50, 128, 128, 45)), 'negative.xml', canvas).warnings.some(w => w.includes('negatif')), 'negative rotated corner warning');

  // A simple local two-column card makes orientation and coverage observable by pixels.
  const colored: EditorScreen = { ...fresh, borderWidth: 0, cabinet: { ...fresh.cabinet, pixelWidth: 64, pixelHeight: 128 }, pattern: { ...fresh.pattern, type: 'checkerboard', primaryColor: '#FF0000', secondaryColor: '#0000FF', showScreenIndex: false, showScreenName: false, showSize: false, showResolution: false, showCabinetInfo: false }, animation: { ...fresh.animation, type: 'none' } };
  const rendered = await renderEditorFrame({ ...canvas, width: 320, height: 320 }, [colored]);
  const ctx = rendered.getContext('2d')!;
  for (const [x, y, channel] of [[32, 32, 0], [32, 96, 0], [96, 32, 2], [96, 96, 2]]) {
    const p = localToComposition(colored, x, y), pixel = ctx.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data;
    assert(pixel[channel] === 255 && pixel[2 - channel] === 0, 'whole cabinet columns rotate with slice');
  }
  assert(ctx.getImageData(70, 70, 1, 1).data[0] === 0, 'bounding-box corners remain empty');
  const examples: EditorScreen[] = [];
  for (const [index, angle] of [45, -30, 90, 135, 22.5, -45].entries()) {
    const cx = 200 + index % 3 * 400, cy = 200 + Math.floor(index / 3) * 400;
    const s = parseResolumeXml(xml(quad(cx, cy, index === 1 || index === 4 ? 256 : 192, index === 1 || index === 4 ? 128 : 192, angle)), 'preview.xml', canvas).screens[0];
    const preset = visualTemplates.filter(t => ['festival-card', 'badge-card'].includes(t.pattern.type ?? ''))[index % 4];
    examples.push({ ...s, id: `preview-${index}`, name: `SLICE ${index + 1} / ${angle}°`, pattern: { ...s.pattern, ...preset.pattern, badgeText: String(index + 1), centerMode: index > 2 ? 'logo' : 'screen', logoText: 'VJM', logoTemplate: ['monogram', 'diamond', 'orbit'][index % 3], logoRotate: true }, animation: { ...s.animation, type: 'wire-tunnel', opacity: 0.18 } });
  }
  const sheet = await renderEditorFrame(canvas, examples, { time: 0.2 }); sheet.id = 'rotation-sheet'; document.body.append(sheet);
  previewScreens = examples;
  return { rotationRegression: 'PASS', angles: angles.length, sizes: 3, legacyMigration: true };
}
