import { cabinetForDimensions } from "./cabinet-layout";
import { createRectangleScreen } from "./screen-factory";
import { defaultScreenPattern, type EditorCanvasSettings, type EditorScreen, type MaskPoint } from "./types";
import { visualTemplates } from "./visual-templates";
import { pointsBounds, rectangleFromQuad, sliceCorners } from "./slice-geometry";

export type ResolumeImport = {
  source: string;
  screens: EditorScreen[];
  width: number;
  height: number;
  warnings: string[];
};

function param(element: Element, group: string, name: string) {
  return Array.from(element.children).find(child => child.tagName === "Params" && child.getAttribute("name") === group)
    ?.querySelector(`[name="${name}"]`)?.getAttribute("value");
}

function readQuad(slice: Element): MaskPoint[] {
  const rect = Array.from(slice.children).find(el => el.tagName === "InputRect");
  const points = rect ? Array.from(rect.children).filter(el => el.tagName === "v").map(v => ({
    x: v.hasAttribute("x") ? Number(v.getAttribute("x")) : NaN,
    y: v.hasAttribute("y") ? Number(v.getAttribute("y")) : NaN
  })) : [];
  if (points.length !== 4 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > 32768 || Math.abs(p.y) > 32768)) {
    throw new Error("InputRect harus memiliki 4 titik valid (maksimum koordinat ±32768 px).");
  }
  return points;
}

export function parseResolumeXml(xml: string, source: string, canvas: EditorCanvasSettings): ResolumeImport {
  if (xml.length > 10_000_000) throw new Error("XML terlalu besar (maksimum 10 MB).");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("XML dengan DTD/entity tidak didukung.");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("XML tidak valid. Pilih preset Advanced Output Resolume.");
  const setup = doc.querySelector("ScreenSetup");
  if (!setup) throw new Error("ScreenSetup tidak ditemukan. Gunakan file Advanced Output, bukan composition.");
  const warnings = new Set<string>();
  const result: EditorScreen[] = [];
  const palettes = visualTemplates.filter(template => template.id.startsWith("festival-"));
  const outputs = Array.from(setup.querySelectorAll("Screen"));
  for (const [outputIndex, output] of outputs.entries()) {
    const outputName = param(output, "Params", "Name") || output.getAttribute("name") || `Output ${outputIndex + 1}`;
    const outputId = output.getAttribute("uniqueId") || String(outputIndex);
    const slices = Array.from(output.querySelectorAll("Slice"));
    for (const [sliceIndex, slice] of slices.entries()) {
      if (result.length >= 512) throw new Error("Maksimum 512 slice per impor.");
      const name = param(slice, "Common", "Name")?.trim() || slice.getAttribute("name") || `Slice ${sliceIndex + 1}`;
      let points: MaskPoint[];
      try { points = readQuad(slice); } catch (error) { warnings.add(`${name}: ${error instanceof Error ? error.message : "Geometri tidak valid"}`); continue; }
      const x = Math.floor(Math.min(...points.map(p => p.x))), y = Math.floor(Math.min(...points.map(p => p.y)));
      const width = Math.ceil(Math.max(...points.map(p => p.x))) - x, height = Math.ceil(Math.max(...points.map(p => p.y))) - y;
      if (width <= 0 || height <= 0) { warnings.add(`${name}: slice tanpa area dilewati.`); continue; }
      const area = Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % 4]; return sum + p.x * q.y - q.x * p.y; }, 0)) / 2;
      if (area < 0.5) { warnings.add(`${name}: slice degenerat dilewati.`); continue; }
      const normalized = points.map(p => ({ x: (p.x - x) / width, y: (p.y - y) / height }));
      const rectangle = rectangleFromQuad(points);
      const geometry = rectangle ?? { x, y, width, height, rotation: 0 };
      const base = createRectangleScreen(canvas, result.length), palette = palettes[result.length % palettes.length];
      const inputSource = param(slice, "Input", "Input Source");
      if (inputSource && inputSource !== "0:1") warnings.add("Ada routing layer/group. Konten diekspor dalam koordinat composition; sesuaikan Input Source di Resolume.");
      if (!rectangle) warnings.add("Input quad dengan skew/warp diimpor sebagai polygon mask; orientasi tekstur/warp tidak disimulasikan. Rectangle berotasi didukung.");
      if (x < 0 || y < 0) warnings.add("Ada slice di koordinat negatif; bagian di luar canvas tidak ikut gambar/video.");
      if (slice.querySelector("InputMask, Mask, SoftEdge")) warnings.add("Mask tambahan/soft edge Resolume tidak diterapkan pada preview.");
      result.push({
        ...base, name, ...geometry,
        visible: param(slice, "Common", "Enabled") !== "0" && param(output, "Params", "Enabled") !== "0",
        borderColor: palette.borderColor, fillColor: palette.fillColor,
        cabinet: { ...cabinetForDimensions(base.cabinet, geometry.width, geometry.height), showCabinetGrid: false, showPixelDots: false },
        mask: rectangle ? base.mask : { type: "custom", points: normalized },
        pattern: { ...defaultScreenPattern, ...palette.pattern, badgeText: String(result.length + 1) },
        animation: { ...base.animation, type: "none" },
        metadata: { resolumeSource: source, resolumeKey: `${outputId}/${slice.getAttribute("uniqueId") || sliceIndex}`, resolumeOutput: outputName, resolumeGeometryVersion: 2 }
      });
    }
  }
  if (!result.length) throw new Error("Tidak ada slice InputRect yang bisa dibaca.");
  const composition = setup.querySelector("CurrentCompositionTextureSize");
  const declaredWidth = Number(composition?.getAttribute("width")), declaredHeight = Number(composition?.getAttribute("height"));
  const bounds = pointsBounds(result.flatMap(sliceCorners));
  const maxX = Math.ceil(bounds.x + bounds.width), maxY = Math.ceil(bounds.y + bounds.height);
  const width = declaredWidth > 0 && declaredWidth <= 32768 ? Math.round(declaredWidth) : Math.max(1, maxX);
  const height = declaredHeight > 0 && declaredHeight <= 32768 ? Math.round(declaredHeight) : Math.max(1, maxY);
  if (maxX > width || maxY > height) warnings.add("Ada slice di luar ukuran composition tersimpan. Perbesar canvas jika diperlukan.");
  warnings.add("Impor menggunakan Input Selection. Output warping, blending, dan device routing tetap dikelola di Resolume.");
  return { source, screens: result, width, height, warnings: [...warnings] };
}

export function mergeResolumeScreens(existing: EditorScreen[], imported: ResolumeImport) {
  const previous = new Map(existing.filter(s => s.metadata.resolumeSource === imported.source).map(s => [s.metadata.resolumeKey, s]));
  const manual = existing.filter(s => s.metadata.resolumeSource !== imported.source);
  const synced = imported.screens.map(fresh => {
    const old = previous.get(fresh.metadata.resolumeKey);
    return old ? { ...fresh, id: old.id, pattern: old.pattern, animation: old.animation, cabinet: cabinetForDimensions(old.cabinet, fresh.width, fresh.height), borderColor: old.borderColor, borderWidth: old.borderWidth, fillColor: old.fillColor, opacity: old.opacity, locked: old.locked } : fresh;
  });
  return [...manual, ...synced].map((screen, zIndex) => ({ ...screen, zIndex }));
}

const escapeXml = (value: string) => value.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));

export function exportResolumeXml(canvas: EditorCanvasSettings, screens: EditorScreen[]) {
  const visible = screens.filter(s => s.visible && s.type !== "logo").sort((a, b) => a.zIndex - b.zIndex);
  if (!visible.length) throw new Error("Tambahkan minimal satu screen yang terlihat.");
  if (visible.some(s => s.mask.type !== "none" && s.mask.type !== "rectangle")) throw new Error("Ekspor layout XML mendukung rectangle. Untuk polygon mask, gunakan PNG/video dengan slice yang sudah ada di Resolume.");
  const quad = (screen: EditorScreen) => sliceCorners(screen).map(p => `<v x="${+p.x.toFixed(4)}" y="${+p.y.toFixed(4)}"/>`).join("");
  const slices = visible.map((s, index) => {
    const vertices = quad(s);
    return `<Slice uniqueId="${1001 + index}"><Params name="Common"><Param name="Name" T="STRING" value="${escapeXml(s.name)}"/><Param name="Enabled" T="BOOL" value="1"/></Params><Params name="Input"><ParamChoice name="Input Source" value="0:1"/></Params><InputRect orientation="0">${vertices}</InputRect><OutputRect orientation="0">${vertices}</OutputRect><Warper><Params name="Warper"><ParamChoice name="Point Mode" value="PM_LINEAR"/></Params><Homography><src>${vertices}</src><dst>${vertices}</dst></Homography></Warper></Slice>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>\n<XmlState name="PixelMapVJM"><ScreenSetup name="ScreenSetup"><Params name="ScreenSetupParams"/><CurrentCompositionTextureSize width="${canvas.width}" height="${canvas.height}"/><screens><Screen name="PixelMapVJM" uniqueId="1000"><Params name="Params"><Param name="Name" T="STRING" value="PixelMapVJM"/><Param name="Enabled" T="BOOL" value="1"/></Params><layers>${slices}</layers><OutputDevice><OutputDeviceVirtual name="PixelMapVJM" deviceId="VirtualPixelMapVJM" width="${canvas.width}" height="${canvas.height}"/></OutputDevice></Screen></screens></ScreenSetup></XmlState>`;
}
