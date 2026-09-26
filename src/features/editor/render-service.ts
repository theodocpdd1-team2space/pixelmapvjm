"use client";

import type {
  EditorCanvasSettings,
  EditorScreen,
  ScreenPatternSettings
} from "@/features/editor/types";
import { drawStageCard, drawStageEffect, drawStageLabel, stageCardTypes, stageEffectTypes } from "./stage-visuals";
import { getCabinetLayout, getPatternGrid, patternCells } from "./cabinet-layout";
import { getStrobeAnimationState } from "@/features/editor/animation";
import {
  adaptiveLabelSize,
  animationRenderConstants,
  colorWithAlpha,
  patternRenderConstants,
  pulseAnimationOpacity
} from "@/features/editor/color";
import { drawMaskPath, isMaskActive, normalizeScreenMask } from "@/features/editor/mask";
import { defaultScreenPattern } from "@/features/editor/types";

type RenderOptions = {
  time?: number;
  includeLabels?: boolean;
  output?: HTMLCanvasElement;
  imageCache?: ImageCache;
};

type ImageCache = Map<string, HTMLImageElement>;
type VideoEncodeSettings = {
  width: number;
  height: number;
  padded: boolean;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image failed to load."));
    image.src = src;
  });
}

async function buildImageCache(screens: EditorScreen[]) {
  const cache: ImageCache = new Map();
  const urls = new Set(screens.flatMap(screen => [screen.metadata.logoDataUrl, screen.pattern.centerMode === "logo" && screen.pattern.logoTemplate === "upload" ? screen.pattern.logoDataUrl : undefined]).filter((url): url is string => typeof url === "string" && url.length > 0));
  await Promise.all([...urls].map(async url => { cache.set(url, await loadImage(url)); }));

  return cache;
}

function drawLine(ctx: CanvasRenderingContext2D, points: number[]) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let index = 2; index < points.length; index += 2) {
    ctx.lineTo(points[index], points[index + 1]);
  }
  ctx.stroke();
}

function drawCabinetGrid(ctx: CanvasRenderingContext2D, screen: EditorScreen, pattern: ScreenPatternSettings) {
  const baseAlpha = ctx.globalAlpha;
  const layout = getCabinetLayout(screen);
  ctx.lineWidth = Math.max(1, screen.cabinet.cabinetLineThickness ?? pattern.cabinetGridThickness);
  ctx.strokeStyle = pattern.cabinetGridColor;
  ctx.globalAlpha = baseAlpha * (screen.cabinet.cabinetLineOpacity ?? 0.72);

  if (screen.cabinet.showCabinetGrid) {
    for (let col = 1; col < Math.min(layout.columns, 12000); col++) {
      const x = Math.round(col * layout.cellWidth);
      drawLine(ctx, [x, 0, x, screen.height]);
    }
    for (let row = 1; row < Math.min(layout.rows, 12000); row++) {
      const y = Math.round(row * layout.cellHeight);
      drawLine(ctx, [0, y, screen.width, y]);
    }
  }

  if (screen.cabinet.showModuleGrid) {
    ctx.globalAlpha = baseAlpha;
    ctx.lineWidth = 1;
    ctx.strokeStyle = colorWithAlpha(pattern.moduleGridColor, patternRenderConstants.moduleGridAlpha);
    const columns = layout.columns * Math.max(1, Math.round(screen.cabinet.pixelWidth / screen.cabinet.modulePixelWidth));
    const rows = layout.rows * Math.max(1, Math.round(screen.cabinet.pixelHeight / screen.cabinet.modulePixelHeight));
    for (let col = 1; col < Math.min(columns, 12000); col++) {
      const x = Math.round(col * screen.width / columns);
      drawLine(ctx, [x, 0, x, screen.height]);
    }
    for (let row = 1; row < Math.min(rows, 12000); row++) {
      const y = Math.round(row * screen.height / rows);
      drawLine(ctx, [0, y, screen.width, y]);
    }
  }
  ctx.globalAlpha = baseAlpha;
}

export function drawPattern(
  ctx: CanvasRenderingContext2D,
  screen: EditorScreen,
  canvas: EditorCanvasSettings,
  screens: EditorScreen[],
  time?: number
) {
  const pattern = { ...defaultScreenPattern, ...(screen.pattern as Partial<ScreenPatternSettings>) };
  const calibration = pattern.type === "mapper-calibration" || pattern.type === "calibration";
  const grid = getPatternGrid(screen, pattern);

  ctx.fillStyle = pattern.backgroundColor;
  ctx.fillRect(0, 0, screen.width, screen.height);

  if (stageCardTypes.includes(pattern.type)) {
    drawStageCard(ctx, screen, pattern);
    if (time !== undefined) drawAnimation(ctx, screen, screens, time);
    return;
  }

  if (pattern.type === "rgb-bars") {
    const bars = ["#ff1f1f", "#18d85f", "#2b68ff", "#ffffff", "#ffff00", "#00ffff", "#ff00ff", "#111111"];
    bars.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect((screen.width / bars.length) * index, 0, screen.width / bars.length + 1, screen.height);
    });
  }

  if (pattern.type === "checkerboard" || calibration) {
    for (const { x, y, width, height, col, row } of patternCells(screen, pattern)) {
      const parity = ((col + row) % 2 + 2) % 2;
      if (pattern.type === "checkerboard" || parity === 0) {
        ctx.fillStyle = pattern.type === "checkerboard"
          ? parity === 0 ? pattern.primaryColor : pattern.secondaryColor
          : colorWithAlpha(pattern.secondaryColor, patternRenderConstants.calibrationCheckerAlpha);
        ctx.fillRect(x, y, width, height);
      }
    }
  }

  if ((pattern.type === "grid" || calibration) && grid.columns + grid.rows < 12000) {
    ctx.strokeStyle = pattern.type === "grid" ? pattern.gridColor : colorWithAlpha(pattern.gridColor, patternRenderConstants.calibrationGridAlpha);
    ctx.lineWidth = pattern.lineWidth;
    for (let col = 0; col <= grid.columns; col++) {
      const x = Math.round(grid.x + col * grid.width);
      drawLine(ctx, [x, 0, x, screen.height]);
    }
    for (let row = 0; row <= grid.rows; row++) {
      const y = Math.round(grid.y + row * grid.height);
      drawLine(ctx, [0, y, screen.width, y]);
    }
  }

  if (pattern.type === "diagonal-lines" || (calibration && pattern.showDiagonal)) {
    ctx.strokeStyle = pattern.primaryColor;
    ctx.lineWidth = calibration ? pattern.lineThickness : pattern.lineWidth;
    drawLine(ctx, [0, 0, screen.width, screen.height]);
    drawLine(ctx, [screen.width, 0, 0, screen.height]);
  }

  if (pattern.type === "crosshair" || (calibration && pattern.showCenterCrosshair)) {
    const centerX = screen.width / 2;
    const centerY = screen.height / 2;
    ctx.strokeStyle = pattern.secondaryColor;
    ctx.lineWidth = pattern.lineThickness;
    ctx.setLineDash([pattern.dashedLineLength, pattern.dashedLineGap]);
    drawLine(ctx, [centerX, 0, centerX, screen.height]);
    drawLine(ctx, [0, centerY, screen.width, centerY]);
    ctx.setLineDash([]);
  }

  if (pattern.type === "concentric-circles" || (calibration && pattern.showCircle)) {
    const centerX = screen.width / 2;
    const centerY = screen.height / 2;
    const maxRadius = Math.hypot(screen.width, screen.height);
    ctx.strokeStyle = pattern.primaryColor;
    ctx.lineWidth = pattern.lineThickness;
    const radiusStep = maxRadius / Math.max(1, pattern.circleCount);
    for (let radius = radiusStep; radius < maxRadius; radius += radiusStep) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawCabinetGrid(ctx, screen, pattern);

  if (screen.cabinet.showPixelDots) {
    const stepX = Math.max(8, Math.ceil(screen.width / patternRenderConstants.pixelDotStepXDivisor));
    const stepY = Math.max(8, Math.ceil(screen.height / patternRenderConstants.pixelDotStepYDivisor));
    ctx.fillStyle = colorWithAlpha(pattern.pixelDotColor, patternRenderConstants.pixelDotAlpha);
    for (let y = stepY / 2; y < screen.height; y += stepY) {
      for (let x = stepX / 2; x < screen.width; x += stepX) {
        ctx.fillRect(x, y, Math.max(1, stepX * 0.12), Math.max(1, stepY * 0.12));
      }
    }
  }

  if (time !== undefined) drawAnimation(ctx, screen, screens, time);
}

export function drawAnimation(ctx: CanvasRenderingContext2D, screen: EditorScreen, screens: EditorScreen[], time: number) {
  const animation = screen.animation;
  const opacity = Math.max(0, Math.min(1, animation.opacity ?? 0.45));
  if (animation.type === "none" || opacity === 0) return;
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.globalCompositeOperation = "screen";
  if (stageEffectTypes.includes(animation.type)) {
    drawStageEffect(ctx, screen, screens, time);
    ctx.restore();
    return;
  }

  const rawProgress = ((time * animation.speed) % 1 + 1) % 1;
  const progress = 0.5 - Math.cos(rawProgress * Math.PI * 2) / 2;
  const baseAlpha = ctx.globalAlpha;
  ctx.fillStyle = animation.primaryColor;

  if (["gradient-wipe", "horizontal-wipe", "vertical-wipe"].includes(animation.type)) {
    const horizontal = animation.type === "horizontal-wipe" || (animation.type === "gradient-wipe" && (animation.direction === "left-to-right" || animation.direction === "right-to-left"));
    const length = horizontal ? screen.width : screen.height;
    const band = Math.max(24, length * 0.32);
    const reverse = animation.direction === "right-to-left" || animation.direction === "bottom-to-top";
    const head = (reverse ? 1 - rawProgress : rawProgress) * (length + band * 2) - band;
    const gradient = horizontal ? ctx.createLinearGradient(head - band, 0, head + band, 0) : ctx.createLinearGradient(0, head - band, 0, head + band);
    gradient.addColorStop(0, colorWithAlpha(animation.primaryColor, 0));
    gradient.addColorStop(0.35, colorWithAlpha(animation.secondaryColor, 0.25));
    gradient.addColorStop(0.55, colorWithAlpha(animation.primaryColor, 0.8));
    gradient.addColorStop(0.62, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.72, colorWithAlpha(animation.secondaryColor, 0.5));
    gradient.addColorStop(1, colorWithAlpha(animation.secondaryColor, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(horizontal ? head - band : 0, horizontal ? 0 : head - band, horizontal ? band * 2 : screen.width, horizontal ? screen.height : band * 2);
  } else if (animation.type === "scanner") {
    ctx.fillStyle = animation.secondaryColor;
    ctx.globalAlpha = baseAlpha * animationRenderConstants.scannerOpacity;
    const horizontal = animation.direction === "left-to-right" || animation.direction === "right-to-left";
    const barSize = horizontal ? Math.max(18, screen.width * 0.08) : Math.max(18, screen.height * 0.08);
    const pos = horizontal
      ? (animation.direction === "right-to-left" ? 1 - progress : progress) * (screen.width + barSize) - barSize
      : (animation.direction === "bottom-to-top" ? 1 - progress : progress) * (screen.height + barSize) - barSize;
    ctx.fillRect(horizontal ? pos : 0, horizontal ? 0 : pos, horizontal ? barSize : screen.width, horizontal ? screen.height : barSize);
  } else if (animation.type === "radial-wave") {
    const maxRadius = Math.hypot(screen.width, screen.height) * 0.55;
    const reverse = animation.direction === "right-to-left" || animation.direction === "bottom-to-top";
    for (let index = 0; index < 4; index++) {
      const phase = ((reverse ? 1 - rawProgress : rawProgress) + index / 4) % 1;
      const color = index % 2 ? animation.primaryColor : animation.secondaryColor;
      ctx.strokeStyle = color;
      ctx.shadowColor = color; ctx.shadowBlur = Math.max(3, Math.min(screen.width, screen.height) * 0.015);
      ctx.lineWidth = Math.max(2, Math.min(screen.width, screen.height) * 0.008);
      ctx.globalAlpha = baseAlpha * Math.sin(phase * Math.PI);
      ctx.beginPath(); ctx.arc(screen.width / 2, screen.height / 2, phase * maxRadius, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (animation.type === "fade-gradient-circle") {
    const maxRadius = Math.hypot(screen.width, screen.height) * 0.52;
    const radius = maxRadius * (0.72 + progress * 0.16);
    const breathe = 0.58 + Math.sin(rawProgress * Math.PI * 2) * 0.08;
    const gradient = ctx.createRadialGradient(
      screen.width / 2,
      screen.height / 2,
      0,
      screen.width / 2,
      screen.height / 2,
      radius
    );

    gradient.addColorStop(0, colorWithAlpha(animation.secondaryColor, 0.92));
    gradient.addColorStop(0.34, colorWithAlpha(animation.secondaryColor, 0.7));
    gradient.addColorStop(0.62, colorWithAlpha(animation.primaryColor, 0.28));
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = baseAlpha * breathe;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screen.width / 2, screen.height / 2, radius, 0, Math.PI * 2);
    ctx.fill();
  } else if (animation.type === "pulse") {
    ctx.globalAlpha = baseAlpha * pulseAnimationOpacity(time, animation.speed);
    ctx.fillRect(0, 0, screen.width, screen.height);
  } else if (animation.type === "blink" && progress < 0.5) {
    ctx.fillStyle = animation.secondaryColor;
    ctx.globalAlpha = baseAlpha * animationRenderConstants.blinkOpacity;
    ctx.fillRect(0, 0, screen.width, screen.height);
  } else if (animation.type === "strobe-sequence" || animation.type === "strobe-random") {
    const strobe = getStrobeAnimationState(screen, screens, time);
    if (strobe.active) {
      ctx.fillStyle = animation.secondaryColor;
      ctx.globalAlpha = baseAlpha * strobe.opacity;
      ctx.fillRect(0, 0, screen.width, screen.height);
    }
  }

  ctx.restore();
}

export function drawLabel(ctx: CanvasRenderingContext2D, screen: EditorScreen, time = 0, logo?: HTMLImageElement) {
  const pattern = { ...defaultScreenPattern, ...(screen.pattern as Partial<ScreenPatternSettings>) };
  if (stageCardTypes.includes(pattern.type) || pattern.centerMode === "logo" || pattern.showScreenIndex) { drawStageLabel(ctx, screen, time, logo); return; }
  const lines = [
    pattern.showScreenName ? screen.name : "",
    pattern.showSize || pattern.showResolution ? `SIZE: ${Math.round(screen.width)} x ${Math.round(screen.height)}` : "",
    pattern.showPosition || pattern.showCoordinates ? `X: ${Math.round(screen.x)} Y: ${Math.round(screen.y)}` : ""
  ].filter(Boolean);

  if (lines.length === 0) {
    return;
  }

  const fontSize = adaptiveLabelSize(pattern.labelSize, screen.width, screen.height);
  const padding = Math.max(4, fontSize * 0.48);
  const lineHeight = fontSize * 1.22;
  ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
  const width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + padding * 2;
  const height = lines.length * lineHeight + padding * 1.4;
  const x = (screen.width - width) / 2;
  const y = (screen.height - height) / 2;
  const strokeWidth = Math.max(1, Math.min(2, fontSize * 0.08));

  ctx.fillStyle = colorWithAlpha(pattern.labelBackgroundColor, pattern.labelBackgroundOpacity);
  ctx.strokeStyle = pattern.primaryColor;
  ctx.lineWidth = strokeWidth;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = pattern.labelTextColor;
  lines.forEach((line, index) => {
    ctx.fillText(line, x + padding, y + padding + fontSize + index * lineHeight * 0.95);
  });
}

export async function renderEditorFrame(
  canvasSettings: EditorCanvasSettings,
  screens: EditorScreen[],
  options: RenderOptions = {}
) {
  const output = options.output ?? document.createElement("canvas");
  if (output.width !== canvasSettings.width) output.width = canvasSettings.width;
  if (output.height !== canvasSettings.height) output.height = canvasSettings.height;
  const ctx = output.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D is not available.");
  }

  const imageCache = options.imageCache ?? await buildImageCache(screens);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, output.width, output.height);
  if (!canvasSettings.backgroundTransparent) {
    ctx.fillStyle = canvasSettings.backgroundColor;
    ctx.fillRect(0, 0, output.width, output.height);
  }

  screens
    .filter((screen) => screen.visible)
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)
    .forEach((screen) => {
      ctx.save();
      ctx.translate(screen.x, screen.y);
      ctx.rotate((screen.rotation * Math.PI) / 180);
      ctx.globalAlpha = screen.opacity;
      drawMaskPath(ctx, normalizeScreenMask(screen.mask), screen.width, screen.height);
      ctx.clip();

      const logoDataUrl = typeof screen.metadata.logoDataUrl === "string" ? screen.metadata.logoDataUrl : "";
      const logo = logoDataUrl ? imageCache.get(logoDataUrl) : null;
      if (screen.type === "logo") {
        if (logo) {
          ctx.drawImage(logo, 0, 0, screen.width, screen.height);
        }
      } else {
        drawPattern(ctx, screen, canvasSettings, screens, options.time);
      }

      if (screen.type !== "logo" && logo && screen.pattern.showLogo) {
        ctx.drawImage(logo, screen.width * 0.36, screen.height * 0.28, screen.width * 0.28, screen.height * 0.44);
      }

      if (screen.type !== "logo" && options.includeLabels !== false) {
        drawLabel(ctx, screen, options.time ?? 0, imageCache.get(String(screen.pattern.logoDataUrl ?? "")));
      }
      ctx.restore();

      if (screen.borderWidth > 0) {
        ctx.save();
        ctx.translate(screen.x, screen.y);
        ctx.rotate((screen.rotation * Math.PI) / 180);
        ctx.globalAlpha = screen.opacity;
        ctx.strokeStyle = screen.borderColor;
        ctx.lineWidth = screen.borderWidth;
        if (isMaskActive(normalizeScreenMask(screen.mask))) {
          drawMaskPath(ctx, normalizeScreenMask(screen.mask), screen.width, screen.height);
          ctx.stroke();
        } else {
          ctx.strokeRect(0, 0, screen.width, screen.height);
        }
        ctx.restore();
      }
    });

  return output;
}

export async function exportImage(
  canvasSettings: EditorCanvasSettings,
  screens: EditorScreen[],
  format: "png" | "jpeg"
) {
  const output = await renderEditorFrame(
    format === "jpeg" ? { ...canvasSettings, backgroundTransparent: false } : canvasSettings,
    screens,
    {}
  );
  if (output.width !== canvasSettings.width || output.height !== canvasSettings.height) {
    throw new Error("Image output resolution does not match composition.");
  }
  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) => {
    output.toBlob((result) => (result ? resolve(result) : reject(new Error("Image export failed."))), mimeType, 1);
  });
  downloadBlob(blob, `pixelmapvjm-${canvasSettings.width}x${canvasSettings.height}.${format === "png" ? "png" : "jpg"}`);
}

function pickMp4MimeType() {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4;codecs=avc1.4D401F",
    "video/mp4;codecs=avc1.640028",
    "video/mp4;codecs=h264"
  ];

  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

function getSafeVideoEncodeSettings(canvasSettings: EditorCanvasSettings): VideoEncodeSettings {
  const width = canvasSettings.width % 2 === 0 ? canvasSettings.width : canvasSettings.width + 1;
  const height = canvasSettings.height % 2 === 0 ? canvasSettings.height : canvasSettings.height + 1;

  return {
    width,
    height,
    padded: width !== canvasSettings.width || height !== canvasSettings.height
  };
}

function fillVideoBackground(ctx: CanvasRenderingContext2D, canvasSettings: EditorCanvasSettings, width: number, height: number) {
  ctx.fillStyle = canvasSettings.backgroundTransparent ? "#000000" : canvasSettings.backgroundColor;
  ctx.fillRect(0, 0, width, height);
}

function createVideoCanvas(canvasSettings: EditorCanvasSettings, encodeSettings: VideoEncodeSettings) {
  const output = document.createElement("canvas");
  output.width = encodeSettings.width;
  output.height = encodeSettings.height;
  const ctx = output.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D is not available.");
  }

  ctx.imageSmoothingEnabled = false;
  fillVideoBackground(ctx, canvasSettings, output.width, output.height);
  return output;
}

function drawVideoFrame(
  output: HTMLCanvasElement,
  frameCanvas: HTMLCanvasElement,
  canvasSettings: EditorCanvasSettings
) {
  const ctx = output.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D is not available.");
  }

  fillVideoBackground(ctx, canvasSettings, output.width, output.height);
  ctx.drawImage(frameCanvas, 0, 0);
}

export async function exportMp4(
  canvasSettings: EditorCanvasSettings,
  screens: EditorScreen[],
  onProgress: (progress: { frame: number; totalFrames: number; percent: number }) => void,
  options: { fps?: number; duration?: number } = {}
) {
  const fps = options.fps ?? Math.max(60, canvasSettings.fps);
  const duration = Math.min(options.duration ?? canvasSettings.duration, 30);
  const totalFrames = Math.max(1, Math.round(fps * duration));
  if (!window.MediaRecorder) {
    throw new Error("Browser belum mendukung export MP4 di canvas ini.");
  }

  const mimeType = pickMp4MimeType();
  if (!mimeType) {
    throw new Error("Browser ini belum support MP4/H.264 export. Coba Safari atau Chrome terbaru.");
  }

  const encodeSettings = getSafeVideoEncodeSettings(canvasSettings);
  const output = createVideoCanvas(canvasSettings, encodeSettings);
  const imageCache = await buildImageCache(screens);
  const frameCanvas = await renderEditorFrame(canvasSettings, screens, { time: 0, imageCache });
  drawVideoFrame(output, frameCanvas, canvasSettings);
  if (!output.captureStream) throw new Error("Browser belum mendukung capture canvas untuk export MP4.");
  const stream = output.captureStream(fps);
  const chunks: BlobPart[] = [];
  let timer: number | undefined;
  try {
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 });
    recorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data); };
    await new Promise<void>((resolve, reject) => {
      let failed = false;
      const fail = (error: unknown) => {
        failed = true;
        window.clearTimeout(timer);
        if (recorder.state !== "inactive") recorder.stop();
        reject(error instanceof Error ? error : new Error("Video encoder failed."));
      };
      recorder.onerror = () => fail(new Error("Video encoder failed."));
      recorder.onstop = () => { if (!failed) resolve(); };
      recorder.start();
      const started = performance.now();
      const tick = async () => {
        try {
          // Follow elapsed recording time so slow frames don't extend the clip duration.
          const elapsed = (performance.now() - started) / 1000;
          if (elapsed >= duration) { recorder.stop(); return; }
          const frame = Math.min(totalFrames - 1, Math.floor(elapsed * fps));
          await renderEditorFrame(canvasSettings, screens, { time: frame / fps, imageCache, output: frameCanvas });
          if (failed) return;
          drawVideoFrame(output, frameCanvas, canvasSettings);
          onProgress({ frame: frame + 1, totalFrames, percent: Math.round((frame + 1) / totalFrames * 100) });
          const next = (frame + 1) / fps * 1000 - (performance.now() - started);
          timer = window.setTimeout(() => void tick(), Math.max(0, next));
        } catch (error) { fail(error); }
      };
      void tick();
    });
  } finally {
    window.clearTimeout(timer);
    stream.getTracks().forEach(track => track.stop());
  }
  if (!chunks.length) throw new Error("Video encoder returned an empty file.");
  onProgress({ frame: totalFrames, totalFrames, percent: 100 });

  const safeSuffix = encodeSettings.padded ? `-safe-${encodeSettings.width}x${encodeSettings.height}` : "";
  downloadBlob(new Blob(chunks, { type: mimeType }), `pixelmapvjm-${canvasSettings.width}x${canvasSettings.height}${safeSuffix}.mp4`);
}
