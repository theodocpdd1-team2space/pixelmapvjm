import { defaultScreenPattern, type EditorScreen, type ScreenPatternSettings } from "./types";
import { colorWithAlpha } from "./color";

export const stageCardTypes = ["festival-card", "badge-card", "coordinate-card"];
export const stageEffectTypes = ["wire-tunnel", "neon-flow", "digital-glitch", "slice-chase", "slice-bounce"];

function line(ctx: CanvasRenderingContext2D, x: number, y: number, x2: number, y2: number) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
}

export function cellRowName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name;
  return name;
}

export function drawStageCard(ctx: CanvasRenderingContext2D, screen: EditorScreen, p: ScreenPatternSettings) {
  const w = screen.width, h = screen.height;
  // Bound drawing work even for very large compositions with tiny grid settings.
  const size = Math.max(4, p.gridSize, Math.ceil(Math.sqrt(w * h / 12000)));
  const ox = p.mode === "global" ? screen.x : 0, oy = p.mode === "global" ? screen.y : 0;
  const sx = -((ox % size + size) % size), sy = -((oy % size + size) % size);
  ctx.save();
  for (let y = sy; y < h; y += size) for (let x = sx; x < w; x += size) {
    const col = Math.floor((x + ox) / size), row = Math.floor((y + oy) / size);
    const colors = p.type === "badge-card" ? [p.primaryColor, p.secondaryColor, p.accentColor] : [p.primaryColor, p.secondaryColor];
    ctx.fillStyle = colors[((col + row) % colors.length + colors.length) % colors.length];
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = colorWithAlpha(p.gridColor, 0.5); ctx.lineWidth = Math.max(0.5, p.lineWidth);
    ctx.strokeRect(x, y, size, size);
    if (p.showDiagonal) {
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      line(ctx, x, y, x + size, y + size); line(ctx, x + size, y, x, y + size);
    }
    if (p.showCellLabels && size >= 24) {
      ctx.font = `700 ${Math.max(10, size * 0.22)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = p.labelTextColor;
      ctx.shadowColor = "#000000"; ctx.shadowBlur = 3;
      ctx.fillText(`${cellRowName(Math.max(0, row))}${col + 1}`, x + size / 2, y + size / 2, size * 0.85);
      ctx.shadowBlur = 0;
    }
  }
  ctx.strokeStyle = p.gridColor; ctx.lineWidth = p.lineThickness;
  if (p.showDiagonal) {
    line(ctx, 0, 0, w, h); line(ctx, w, 0, 0, h);
  }
  if (p.showCenterCrosshair) {
    ctx.setLineDash([p.dashedLineLength, p.dashedLineGap]);
    line(ctx, 0, h / 2, w, h / 2); line(ctx, w / 2, 0, w / 2, h);
    ctx.setLineDash([]);
  }
  if (p.showCircle) {
    const count = Math.max(1, Math.min(20, p.circleCount));
    for (let i = 1; i <= count; i++) {
      ctx.strokeStyle = i === count ? p.accentColor : colorWithAlpha(p.gridColor, 0.85);
      ctx.beginPath(); ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.47 * i / count, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.strokeStyle = p.accentColor; ctx.lineWidth = p.edgeThickness;
  ctx.strokeRect(p.edgeThickness / 2, p.edgeThickness / 2, w - p.edgeThickness, h - p.edgeThickness);
  if (p.showCoordinates || p.showPosition) {
    const fs = Math.max(8, Math.min(24, w / 20, h / 12));
    ctx.font = `700 ${fs}px monospace`; ctx.textBaseline = "top";
    [[0, 0], [w, 0], [0, h], [w, h]].forEach(([x, y]) => {
      const text = `X:${screen.x + x} Y:${screen.y + y}`;
      const width = ctx.measureText(text).width + 8;
      ctx.fillStyle = colorWithAlpha(p.labelBackgroundColor, p.labelBackgroundOpacity);
      ctx.fillRect(x ? w - width : 0, y ? h - fs - 8 : 0, width, fs + 8);
      ctx.textAlign = x ? "right" : "left"; ctx.fillStyle = p.labelTextColor;
      ctx.fillText(text, x ? w - 4 : 4, y ? h - fs - 4 : 4);
    });
  }
  ctx.restore();
}

export function getChaseLevel(screen: EditorScreen, screens: EditorScreen[], time: number) {
  const a = screen.animation;
  const horizontal = a.direction === "left-to-right" || a.direction === "right-to-left";
  const reverse = a.direction === "right-to-left" || a.direction === "bottom-to-top";
  const participants = screens.filter(s => s.visible && s.type !== "logo" && s.animation.type === a.type)
    .sort((x, y) => (horizontal ? x.x - y.x || x.y - y.y : x.y - y.y || x.x - y.x) || x.zIndex - y.zIndex);
  if (reverse) participants.reverse();
  const index = participants.findIndex(s => s.id === screen.id), n = participants.length;
  if (index < 0) return 0;
  // All slices use the same clock even when their stored speeds differ.
  const speed = participants[0]?.animation.speed ?? 1;
  const position = Math.max(0, time) * Math.max(0.1, speed), slot = Math.floor(position), phase = position - slot;
  const cycle = a.type === "slice-bounce" ? Math.max(1, n * 2 - 2) : n;
  const step = slot % cycle;
  const head = step < n ? step : cycle - step;
  return head === index ? 1 - phase * 0.75 : 0.035;
}

export function drawStageEffect(ctx: CanvasRenderingContext2D, screen: EditorScreen, screens: EditorScreen[], time: number) {
  const a = screen.animation, w = screen.width, h = screen.height;
  const reverse = a.direction === "right-to-left" || a.direction === "bottom-to-top";
  const t = time * a.speed * (reverse ? -1 : 1);
  ctx.save();
  ctx.fillStyle = "#030308"; ctx.fillRect(0, 0, w, h);
  if (a.type === "slice-chase" || a.type === "slice-bounce") {
    const level = getChaseLevel(screen, screens, time);
    ctx.globalAlpha *= level;
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, a.primaryColor); gradient.addColorStop(1, a.secondaryColor);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  } else if (a.type === "wire-tunnel") {
    ctx.translate(w / 2, h / 2);
    ctx.lineWidth = Math.max(1.5, Math.min(w, h) / 220);
    for (let i = 0; i < 18; i++) {
      const phase = ((i / 18 + t * 0.18) % 1 + 1) % 1;
      const r = Math.pow(phase, 2) * Math.hypot(w, h) * 0.8;
      ctx.save(); ctx.rotate(Math.sin(t * 0.4) * 0.35 + i * 0.035);
      ctx.strokeStyle = colorWithAlpha(i % 2 ? a.primaryColor : a.secondaryColor, phase);
      ctx.strokeRect(-r, -r * h / w, r * 2, r * 2 * h / w); ctx.restore();
    }
  } else if (a.type === "neon-flow") {
    ctx.lineWidth = Math.max(2, h / 160);
    for (let j = 0; j < 24; j++) {
      ctx.strokeStyle = colorWithAlpha(j % 2 ? a.primaryColor : a.secondaryColor, 0.35 + j / 40);
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const x = w * i / 80;
        const y = h * (j / 24 + Math.sin(i / 80 * Math.PI * 4 + t * 2 + j * 0.16) * 0.16);
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (a.type === "digital-glitch") {
    const tick = Math.floor(t * 12);
    for (let i = 0; i < 36; i++) {
      const noise = (seed: number) => { const v = Math.sin(seed * 127.1 + tick * 311.7) * 43758.5453; return v - Math.floor(v); };
      ctx.fillStyle = colorWithAlpha(i % 2 ? a.primaryColor : a.secondaryColor, 0.2 + noise(i + 100) * 0.8);
      ctx.fillRect(noise(i + 2) * w, noise(i + 50) * h, w * (0.03 + noise(i + 10) * 0.5), Math.max(1, noise(i + 20) * h * 0.04));
    }
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
    for (let y = 0; y < h; y += Math.max(4, h / 250)) line(ctx, 0, y, w, y);
  }
  ctx.restore();
}

export function drawStageLabel(ctx: CanvasRenderingContext2D, screen: EditorScreen) {
  const p = { ...defaultScreenPattern, ...screen.pattern };
  const w = screen.width, h = screen.height;
  const badge = p.type === "festival-card" || p.type === "badge-card";
  const radius = Math.min(w * 0.19, h * 0.27);
  ctx.save();
  if (badge && p.showScreenIndex && p.badgeText) {
    ctx.beginPath();
    if (p.type === "badge-card") {
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i - Math.PI / 2;
        const x = w / 2 + Math.cos(angle) * radius, y = h / 2 + Math.sin(angle) * radius;
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = p.labelTextColor; ctx.strokeStyle = p.accentColor; ctx.lineWidth = Math.max(3, radius * 0.065); ctx.fill(); ctx.stroke();
    ctx.fillStyle = p.labelBackgroundColor; ctx.font = `900 ${radius * 1.3}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(p.badgeText, w / 2, h / 2 + radius * 0.06, radius * 1.65);
  }
  const lines = [p.showScreenName ? screen.name : "", p.showResolution || p.showSize ? `${w} × ${h} px` : ""];
  if (p.showCabinetInfo) {
    const mw = w / screen.cabinet.pixelWidth * screen.cabinet.physicalWidthMm / 1000;
    const mh = h / screen.cabinet.pixelHeight * screen.cabinet.physicalHeightMm / 1000;
    lines.push(`${mw.toFixed(2)} × ${mh.toFixed(2)} m`);
  }
  const content = lines.filter(Boolean);
  if (content.length) {
    const fs = Math.max(6, Math.min(p.labelSize, w / 14, h / (badge && p.showScreenIndex ? 18 : 7)));
    const lh = fs * 1.35, bh = lh * content.length + fs * 0.6;
    ctx.font = `700 ${fs}px sans-serif`;
    const bw = Math.min(w * 0.94, Math.max(...content.map(s => ctx.measureText(s).width)) + fs * 1.6);
    const x = (w - bw) / 2, y = badge && p.showScreenIndex ? Math.min(h - bh - h * 0.04, h / 2 + radius + fs * 0.5) : (h - bh) / 2;
    ctx.fillStyle = colorWithAlpha(p.labelBackgroundColor, p.labelBackgroundOpacity); ctx.fillRect(x, y, bw, bh);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    content.forEach((text, i) => {
      if (i === 0 && p.showScreenName) { ctx.fillStyle = p.labelTextColor; ctx.fillRect(x, y, bw, lh + fs * 0.3); ctx.fillStyle = p.labelBackgroundColor; }
      else ctx.fillStyle = p.labelTextColor;
      ctx.fillText(text, w / 2, y + fs * 0.3 + lh * (i + 0.5), bw - fs * 0.7);
    });
  }
  ctx.restore();
}
