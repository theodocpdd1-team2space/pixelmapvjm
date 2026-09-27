import { createRectangleScreen } from "../src/features/editor/screen-factory";
import { defaultScreenPattern, type AnimationType, type EditorScreen } from "../src/features/editor/types";
import { useEditorStore } from "../src/stores/editor-store";
import { renderEditorFrame, drawAnimation } from "../src/features/editor/render-service";
import { visualTemplates } from "../src/features/editor/visual-templates";
import { editorScreenSchema } from "../src/types/project";

const check = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
export async function overlayLogoRegression() {
  const canvas = { ...useEditorStore.getState().canvas, width: 400, height: 360 };
  const base = createRectangleScreen(canvas, 0);
  const screen: EditorScreen = { ...base, x: 0, y: 0, width: 400, height: 360, borderWidth: 0,
    cabinet: { ...base.cabinet, showCabinetGrid: false, showModuleGrid: false, showPixelDots: false },
    pattern: { ...defaultScreenPattern, type: "solid", backgroundColor: "#28405A", showScreenName: false, showSize: false, showResolution: false, showScreenIndex: false },
    animation: { ...base.animation, speed: 0.6, opacity: 0 }
  };
  const baseline = await renderEditorFrame(canvas, [screen]);
  for (const type of ["gradient-wipe", "horizontal-wipe", "vertical-wipe", "radial-wave", "wire-tunnel", "neon-flow", "digital-glitch", "slice-chase", "slice-bounce"] as AnimationType[]) {
    const effect = { ...screen, animation: { ...screen.animation, type } };
    const zero = await renderEditorFrame(canvas, [effect], { time: 0.43 });
    check(zero.toDataURL() === baseline.toDataURL(), `${type}: zero opacity leaves test card intact`);
    const full = await renderEditorFrame(canvas, [{ ...effect, animation: { ...effect.animation, opacity: 1 } }], { time: 0.43 });
    const half = await renderEditorFrame(canvas, [{ ...effect, animation: { ...effect.animation, opacity: 0.5 } }], { time: 0.43 });
    check(full.toDataURL() !== zero.toDataURL() && half.toDataURL() !== full.toDataURL(), `${type}: opacity adjusts overlay`);
    const pixels = full.getContext("2d")!.getImageData(0, 0, 400, 360).data;
    for (let i = 0; i < pixels.length; i += 4) check(pixels[i] >= 39 && pixels[i + 1] >= 63 && pixels[i + 2] >= 89, `${type}: no opaque dark replacement background`);
  }
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.globalAlpha = 0.35; ctx.globalCompositeOperation = "multiply";
  for (const type of ["wire-tunnel", "radial-wave", "gradient-wipe"] as AnimationType[]) {
    drawAnimation(ctx, { ...screen, animation: { ...screen.animation, type, opacity: 0.5 } }, [screen], 0.43);
    check(Math.abs(ctx.globalAlpha - 0.35) < 0.001 && ctx.globalCompositeOperation === "multiply", "effect restores caller rendering state");
  }
  const stage = { ...screen, pattern: { ...defaultScreenPattern, ...visualTemplates.find(t => t.id === "festival-cyan")!.pattern, centerMode: "logo", showScreenIndex: true, logoText: "VJM", logoRotate: true, logoShine: true }, animation: { ...screen.animation, type: "none" as const } };
  const sheet = document.createElement("canvas"); sheet.width = 1200; sheet.height = 720; sheet.id = "overlay-logo-sheet";
  const sheetCtx = sheet.getContext("2d")!;
  for (const [index, template] of (["monogram", "diamond", "orbit"] as const).entries()) {
    const logo = { ...stage, pattern: { ...stage.pattern, logoTemplate: template } };
    const parsed = editorScreenSchema.parse(logo);
    check(parsed.pattern.centerMode === "logo" && parsed.pattern.logoRotate && parsed.animation.opacity === 0, "logo and overlay controls persist");
    const a = await renderEditorFrame(canvas, [logo], { time: 0 });
    const b = await renderEditorFrame(canvas, [logo], { time: 0.7 });
    check(a.toDataURL() !== b.toDataURL(), "logo motion runs independently of overlay animation");
    const flat = await renderEditorFrame(canvas, [{ ...logo, pattern: { ...logo.pattern, logoExtrude: false } }], { time: 0 });
    check(a.toDataURL() !== flat.toDataURL(), "extrusion adds visible depth");
    const shine = { ...logo, pattern: { ...logo.pattern, logoRotate: false } };
    const shineA = await renderEditorFrame(canvas, [shine], { time: 0 });
    const shineB = await renderEditorFrame(canvas, [shine], { time: 1.7 });
    check(shineA.toDataURL() !== shineB.toDataURL(), "specular sweep animates without rotation");
    const still = { ...logo, pattern: { ...logo.pattern, logoRotate: false, logoShine: false } };
    check((await renderEditorFrame(canvas, [still], { time: 0 })).toDataURL() === (await renderEditorFrame(canvas, [still], { time: 1 } )).toDataURL(), "disabled logo motion stays still");
    const overlay = { ...logo, animation: { ...logo.animation, type: ["gradient-wipe", "wire-tunnel", "radial-wave"][index] as AnimationType, opacity: 0.45 } };
    sheetCtx.drawImage(await renderEditorFrame(canvas, [overlay], { time: 0.7 }), index * 400, 0);
    sheetCtx.drawImage(await renderEditorFrame(canvas, [{ ...overlay, pattern: { ...overlay.pattern, logoRotate: false, centerMode: "screen", badgeText: String(index + 1) } }], { time: 0.7 }), index * 400, 360);
  }
  const upload = document.createElement("canvas"); upload.width = 320; upload.height = 80;
  const uploadedCtx = upload.getContext("2d")!; uploadedCtx.fillStyle = "#EEFFFF"; uploadedCtx.fillRect(0, 0, 320, 80);
  const ownLogo = { ...stage, pattern: { ...stage.pattern, logoTemplate: "upload", logoDataUrl: upload.toDataURL() } };
  check(editorScreenSchema.parse({ ...ownLogo, pattern: { ...ownLogo.pattern, logoScale: 1.5 } }).pattern.logoScale === 1.5, "logo size persists");
  check(editorScreenSchema.parse({ ...ownLogo, pattern: { ...ownLogo.pattern, logoScale: undefined } }).pattern.logoScale === 1, "legacy logo size defaults to 100 percent");
  const uploaded = await renderEditorFrame(canvas, [ownLogo], { time: 0 });
  check(uploaded.toDataURL() !== baseline.toDataURL(), "uploaded center logo loads in exported frame");
  document.body.append(sheet);
  return { overlayLogoRegression: "PASS", overlayTypes: 9, builtinLogos: 3 };
}
