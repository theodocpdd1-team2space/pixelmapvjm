import type { ScreenPatternSettings } from "./types";
import { colorWithAlpha } from "./color";

const SIZE = 384;
type Sprite = { face: HTMLCanvasElement; side: HTMLCanvasElement; shine: HTMLCanvasElement };
const cache = new Map<string, Sprite>();

function canvas() {
  const result = document.createElement("canvas"); result.width = SIZE; result.height = SIZE;
  return result;
}

function sprite(p: ScreenPatternSettings, image?: HTMLImageElement): Sprite {
  const key = JSON.stringify([p.logoTemplate, p.logoText, p.logoColor, p.accentColor, p.logoExtrude, image?.src]);
  const previous = cache.get(key);
  if (previous) return previous;
  const face = canvas(), side = canvas(), shine = canvas();
  const ctx = face.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  const metallic = ctx.createLinearGradient(0, 70, 0, 300);
  const shade = (factor: number) => `#${[1, 3, 5].map(i => Math.round(parseInt(p.logoColor.slice(i, i + 2), 16) * factor).toString(16).padStart(2, "0")).join("")}`;
  metallic.addColorStop(0, p.logoColor); metallic.addColorStop(0.42, shade(0.55)); metallic.addColorStop(0.5, p.logoColor); metallic.addColorStop(1, shade(0.7));
  ctx.fillStyle = p.logoExtrude ? metallic : p.logoColor; ctx.strokeStyle = p.logoExtrude ? metallic : p.logoColor; ctx.lineWidth = 12;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  if (p.logoTemplate === "upload" && image) {
    const scale = 320 / Math.max(image.naturalWidth, image.naturalHeight);
    const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
    ctx.drawImage(image, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  } else {
    if (p.logoTemplate === "diamond") {
      ctx.beginPath(); ctx.moveTo(192, 30); ctx.lineTo(344, 192); ctx.lineTo(192, 354); ctx.lineTo(40, 192); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(134, 108); ctx.lineTo(250, 108); ctx.moveTo(134, 276); ctx.lineTo(250, 276); ctx.stroke();
    } else if (p.logoTemplate === "orbit") {
      ctx.beginPath(); ctx.ellipse(192, 192, 163, 128, -0.45, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(322, 97, 17, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(48, 105); ctx.lineTo(112, 105); ctx.moveTo(48, 105); ctx.lineTo(48, 150);
      ctx.moveTo(336, 234); ctx.lineTo(336, 279); ctx.lineTo(272, 279); ctx.stroke();
      ctx.fillRect(88, 259, 168, 8);
    }
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "900 96px sans-serif";
    ctx.fillText(p.logoText || "VJM", 192, 197, p.logoTemplate === "diamond" ? 230 : 294);
  }
  const depth = side.getContext("2d")!;
  depth.drawImage(face, 0, 0); depth.globalCompositeOperation = "source-in";
  const gradient = depth.createLinearGradient(0, 0, SIZE, SIZE);
  gradient.addColorStop(0, p.accentColor); gradient.addColorStop(0.5, "#142038"); gradient.addColorStop(1, p.accentColor);
  depth.fillStyle = gradient; depth.fillRect(0, 0, SIZE, SIZE);
  if (cache.size >= 16) cache.delete(cache.keys().next().value!);
  const result = { face, side, shine }; cache.set(key, result); return result;
}

/** Layered extrusion and a moving specular band: a 2.5D treatment, not a 3D mesh. */
export function drawCenterLogo(ctx: CanvasRenderingContext2D, p: ScreenPatternSettings, cx: number, cy: number, radius: number, time = 0, image?: HTMLImageElement) {
  const art = sprite(p, image);
  const angle = p.logoRotate ? time * p.logoSpeed * Math.PI * 2 : 0;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(cx, cy);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.2);
  glow.addColorStop(0, "rgba(0,0,0,0.65)"); glow.addColorStop(0.8, colorWithAlpha(p.accentColor, 0.12)); glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow; ctx.fillRect(-radius * 1.2, -radius * 1.2, radius * 2.4, radius * 2.4);
  ctx.rotate(angle);
  if (p.logoExtrude) ctx.transform(0.93, -0.07, 0.12, 0.96, 0, 0);
  const diameter = radius * 2;
  if (p.logoExtrude && p.logoDepth > 0) {
    const depth = radius * p.logoDepth;
    const steps = Math.min(18, Math.max(1, Math.ceil(depth)));
    for (let i = steps; i >= 1; i--) {
      const offset = depth * i / steps;
      ctx.drawImage(art.side, -radius + offset * 0.72, -radius + offset, diameter, diameter);
    }
  }
  ctx.drawImage(art.face, -radius, -radius, diameter, diameter);
  if (p.logoShine) {
    const shine = art.shine.getContext("2d")!;
    shine.clearRect(0, 0, SIZE, SIZE);
    shine.globalCompositeOperation = "source-over";
    shine.drawImage(art.face, 0, 0);
    shine.globalCompositeOperation = "source-in";
    const phase = ((time * p.logoSpeed + 0.35) % 1 + 1) % 1;
    const x = -SIZE + phase * SIZE * 3;
    const band = shine.createLinearGradient(x - 90, 0, x + 90, SIZE);
    band.addColorStop(0, "rgba(255,255,255,0)"); band.addColorStop(0.4, "rgba(255,255,255,0)");
    band.addColorStop(0.5, "rgba(255,255,255,0.95)"); band.addColorStop(0.6, "rgba(255,255,255,0)"); band.addColorStop(1, "rgba(255,255,255,0)");
    shine.fillStyle = band; shine.fillRect(0, 0, SIZE, SIZE);
    ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.drawImage(art.shine, -radius, -radius, diameter, diameter); ctx.restore();
  }
  ctx.restore();
}
