"use client";

import type {
  EditorCanvasSettings,
  EditorScreen,
  ScreenPatternSettings
} from "@/features/editor/types";
import { defaultScreenPattern } from "@/features/editor/types";

type RenderOptions = {
  time?: number;
  includeLabels?: boolean;
};

type ImageCache = Map<string, HTMLImageElement>;

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
  const logoScreens = screens.filter((screen) => typeof screen.metadata.logoDataUrl === "string");

  await Promise.all(
    logoScreens.map(async (screen) => {
      const dataUrl = String(screen.metadata.logoDataUrl);
      if (!cache.has(dataUrl)) {
        cache.set(dataUrl, await loadImage(dataUrl));
      }
    })
  );

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
  ctx.lineWidth = Math.max(1, screen.cabinet.cabinetLineThickness ?? pattern.cabinetGridThickness);
  ctx.strokeStyle = pattern.cabinetGridColor;
  ctx.globalAlpha = screen.cabinet.cabinetLineOpacity ?? 0.72;

  if (screen.cabinet.showCabinetGrid) {
    for (let x = screen.cabinet.pixelWidth; x < screen.width; x += screen.cabinet.pixelWidth) {
      drawLine(ctx, [x, 0, x, screen.height]);
    }
    for (let y = screen.cabinet.pixelHeight; y < screen.height; y += screen.cabinet.pixelHeight) {
      drawLine(ctx, [0, y, screen.width, y]);
    }
  }

  if (screen.cabinet.showModuleGrid) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(50,213,131,0.42)";
    for (let x = screen.cabinet.modulePixelWidth; x < screen.width; x += screen.cabinet.modulePixelWidth) {
      drawLine(ctx, [x, 0, x, screen.height]);
    }
    for (let y = screen.cabinet.modulePixelHeight; y < screen.height; y += screen.cabinet.modulePixelHeight) {
      drawLine(ctx, [0, y, screen.width, y]);
    }
  }
  ctx.globalAlpha = 1;
}

function drawPattern(ctx: CanvasRenderingContext2D, screen: EditorScreen, canvas: EditorCanvasSettings, time: number) {
  const pattern = { ...defaultScreenPattern, ...(screen.pattern as Partial<ScreenPatternSettings>) };
  const calibration = pattern.type === "mapper-calibration" || pattern.type === "calibration";
  const globalOffsetX = pattern.mode === "global" ? screen.x : 0;
  const globalOffsetY = pattern.mode === "global" ? screen.y : 0;
  const grid = Math.max(4, pattern.gridSize);
  const startX = -(((globalOffsetX % grid) + grid) % grid);
  const startY = -(((globalOffsetY % grid) + grid) % grid);

  ctx.fillStyle = pattern.backgroundColor;
  ctx.fillRect(0, 0, screen.width, screen.height);

  if (pattern.type === "solid") {
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
    for (let y = startY; y < screen.height; y += grid) {
      for (let x = startX; x < screen.width; x += grid) {
        if ((Math.floor((x + globalOffsetX) / grid) + Math.floor((y + globalOffsetY) / grid)) % 2 === 0) {
          ctx.fillStyle =
            pattern.type === "checkerboard"
              ? (Math.floor((x + globalOffsetX) / grid) + Math.floor((y + globalOffsetY) / grid)) % 4 === 0
                ? "#F4F4F4"
                : "#111111"
              : "rgba(50,213,131,0.12)";
          ctx.fillRect(x, y, grid, grid);
        }
      }
    }
  }

  if (pattern.type === "grid" || calibration) {
    ctx.strokeStyle = pattern.type === "grid" ? pattern.primaryColor : "rgba(244,244,244,0.18)";
    ctx.lineWidth = pattern.lineWidth;
    for (let x = startX; x < screen.width; x += grid) {
      drawLine(ctx, [x, 0, x, screen.height]);
    }
    for (let y = startY; y < screen.height; y += grid) {
      drawLine(ctx, [0, y, screen.width, y]);
    }
  }

  if (pattern.type === "diagonal-lines" || calibration) {
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

  if (pattern.showCabinetInfo || calibration) {
    drawCabinetGrid(ctx, screen, pattern);
  }

  if (screen.cabinet.showPixelDots) {
    const stepX = Math.max(8, Math.ceil(screen.width / 90));
    const stepY = Math.max(8, Math.ceil(screen.height / 58));
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    for (let y = stepY / 2; y < screen.height; y += stepY) {
      for (let x = stepX / 2; x < screen.width; x += stepX) {
        ctx.fillRect(x, y, Math.max(1, stepX * 0.12), Math.max(1, stepY * 0.12));
      }
    }
  }

  drawAnimation(ctx, screen, time);
}

function drawAnimation(ctx: CanvasRenderingContext2D, screen: EditorScreen, time: number) {
  const animation = screen.animation;
  if (animation.type === "none") {
    return;
  }

  const rawProgress = ((time * animation.speed) % 1 + 1) % 1;
  const progress = 0.5 - Math.cos(rawProgress * Math.PI * 2) / 2;
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = animation.primaryColor;

  if (animation.type === "gradient-wipe") {
    const horizontal = animation.direction === "left-to-right" || animation.direction === "right-to-left";
    const length = horizontal ? screen.width : screen.height;
    const band = Math.max(120, length * 0.26);
    const head = (animation.direction === "right-to-left" || animation.direction === "bottom-to-top" ? 1 - progress : progress) * (length + band) - band;
    const gradient = horizontal
      ? ctx.createLinearGradient(head, 0, head + band, 0)
      : ctx.createLinearGradient(0, head, 0, head + band);

    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.18, animation.secondaryColor);
    gradient.addColorStop(0.5, animation.primaryColor);
    gradient.addColorStop(0.82, animation.secondaryColor);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = animation.primaryColor;
    ctx.fillRect(0, 0, screen.width, screen.height);
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = gradient;
    ctx.fillRect(horizontal ? head : 0, horizontal ? 0 : head, horizontal ? band : screen.width, horizontal ? screen.height : band);
  } else if (animation.type === "horizontal-wipe") {
    const width = Math.max(1, screen.width * progress);
    ctx.fillRect(animation.direction === "right-to-left" ? screen.width - width : 0, 0, width, screen.height);
  } else if (animation.type === "vertical-wipe") {
    const height = Math.max(1, screen.height * progress);
    ctx.fillRect(0, animation.direction === "bottom-to-top" ? screen.height - height : 0, screen.width, height);
  } else if (animation.type === "scanner") {
    ctx.fillStyle = animation.secondaryColor;
    const horizontal = animation.direction === "left-to-right" || animation.direction === "right-to-left";
    const barSize = horizontal ? Math.max(18, screen.width * 0.08) : Math.max(18, screen.height * 0.08);
    const pos = horizontal
      ? (animation.direction === "right-to-left" ? 1 - progress : progress) * (screen.width + barSize) - barSize
      : (animation.direction === "bottom-to-top" ? 1 - progress : progress) * (screen.height + barSize) - barSize;
    ctx.fillRect(horizontal ? pos : 0, horizontal ? 0 : pos, horizontal ? barSize : screen.width, horizontal ? screen.height : barSize);
  } else if (animation.type === "radial-wave") {
    const maxRadius = Math.hypot(screen.width, screen.height);
    const baseRadius = progress * maxRadius;
    ctx.globalAlpha = 1;
    for (let index = 0; index < 5; index += 1) {
      const radius = (baseRadius + index * maxRadius * 0.18) % maxRadius;
      ctx.beginPath();
      ctx.strokeStyle = index % 2 === 0 ? animation.primaryColor : animation.secondaryColor;
      ctx.lineWidth = Math.max(3, screen.width * 0.004);
      ctx.globalAlpha = 0.75 - index * 0.11;
      ctx.arc(screen.width / 2, screen.height / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (animation.type === "pulse") {
    ctx.globalAlpha = 0.25 + Math.sin(time * animation.speed * Math.PI * 2) * 0.2 + 0.2;
    ctx.fillRect(0, 0, screen.width, screen.height);
  } else if (animation.type === "blink" && progress < 0.5) {
    ctx.fillStyle = animation.secondaryColor;
    ctx.fillRect(0, 0, screen.width, screen.height);
  }

  ctx.restore();
}

function drawLabel(ctx: CanvasRenderingContext2D, screen: EditorScreen) {
  const pattern = { ...defaultScreenPattern, ...(screen.pattern as Partial<ScreenPatternSettings>) };
  if (!pattern.showScreenName && !pattern.showResolution && !pattern.showCoordinates) {
    return;
  }

  const lines = [
    pattern.showScreenName ? screen.name : "",
    pattern.showSize || pattern.showResolution ? `SIZE: ${Math.round(screen.width)} x ${Math.round(screen.height)}` : "",
    pattern.showPosition || pattern.showCoordinates ? `X: ${Math.round(screen.x)} Y: ${Math.round(screen.y)}` : ""
  ].filter(Boolean);

  if (lines.length === 0) {
    return;
  }

  const fontSize = pattern.labelSize;
  const padding = Math.max(10, fontSize * 0.48);
  const lineHeight = fontSize * 1.22;
  ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
  const width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + padding * 2;
  const height = lines.length * lineHeight + padding * 1.4;
  const x = (screen.width - width) / 2;
  const y = (screen.height - height) / 2;

  ctx.fillStyle = `rgba(8,8,8,${pattern.labelBackgroundOpacity})`;
  ctx.strokeStyle = pattern.primaryColor;
  ctx.lineWidth = 2;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = "#F4F4F4";
  lines.forEach((line, index) => {
    ctx.fillText(line, x + padding, y + padding + fontSize + index * lineHeight * 0.95);
  });
}

export async function renderEditorFrame(
  canvasSettings: EditorCanvasSettings,
  screens: EditorScreen[],
  options: RenderOptions = {}
) {
  const output = document.createElement("canvas");
  output.width = canvasSettings.width;
  output.height = canvasSettings.height;
  const ctx = output.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D is not available.");
  }

  const imageCache = await buildImageCache(screens);
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
      ctx.beginPath();
      ctx.rect(0, 0, screen.width, screen.height);
      ctx.clip();

      drawPattern(ctx, screen, canvasSettings, options.time ?? 0);

      const logoDataUrl = typeof screen.metadata.logoDataUrl === "string" ? screen.metadata.logoDataUrl : "";
      const logo = logoDataUrl ? imageCache.get(logoDataUrl) : null;
      if (logo) {
        ctx.drawImage(logo, 0, 0, screen.width, screen.height);
      }

      if (screen.type !== "logo") {
        drawLabel(ctx, screen);
      }
      ctx.restore();

      ctx.save();
      ctx.translate(screen.x, screen.y);
      ctx.rotate((screen.rotation * Math.PI) / 180);
      ctx.strokeStyle = screen.borderColor;
      ctx.lineWidth = screen.borderWidth;
      ctx.strokeRect(0, 0, screen.width, screen.height);
      ctx.restore();
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
    { time: 0 }
  );
  if (output.width !== canvasSettings.width || output.height !== canvasSettings.height) {
    throw new Error("Image output resolution does not match composition.");
  }
  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) => {
    output.toBlob((result) => (result ? resolve(result) : reject(new Error("Image export failed."))), mimeType, 0.94);
  });
  downloadBlob(blob, `pixelmapvjm-${canvasSettings.width}x${canvasSettings.height}.${format === "png" ? "png" : "jpg"}`);
}

export async function exportWebm(
  canvasSettings: EditorCanvasSettings,
  screens: EditorScreen[],
  onProgress: (progress: { frame: number; totalFrames: number; percent: number }) => void,
  options: { fps?: number; duration?: number } = {}
) {
  const fps = options.fps ?? Math.max(60, canvasSettings.fps);
  const duration = Math.min(options.duration ?? canvasSettings.duration, 30);
  const totalFrames = Math.max(1, Math.round(fps * duration));
  if (!window.MediaRecorder) {
    throw new Error("Browser belum mendukung export WebM MediaRecorder di canvas ini.");
  }

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";

  if (!MediaRecorder.isTypeSupported(mimeType)) {
    throw new Error("Browser belum mendukung export WebM MediaRecorder di canvas ini.");
  }

  const output = await renderEditorFrame(canvasSettings, screens, { time: 0 });
  if (!output.captureStream) {
    throw new Error("Browser belum mendukung capture canvas untuk export WebM.");
  }
  const stream = output.captureStream(fps);
  const videoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 });
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  await new Promise<void>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Video encoder failed."));
    recorder.onstop = () => resolve();
    recorder.start();

    let frame = 0;
    const tick = async () => {
      const frameCanvas = await renderEditorFrame(canvasSettings, screens, { time: frame / fps });
      const ctx = output.getContext("2d");
      ctx?.clearRect(0, 0, output.width, output.height);
      ctx?.drawImage(frameCanvas, 0, 0);
      videoTrack?.requestFrame?.();
      frame += 1;
      onProgress({ frame, totalFrames, percent: Math.round((frame / totalFrames) * 100) });

      if (frame >= totalFrames) {
        recorder.stop();
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      window.setTimeout(tick, 1000 / fps);
    };

    void tick();
  });

  downloadBlob(new Blob(chunks, { type: mimeType }), `pixelmapvjm-${canvasSettings.width}x${canvasSettings.height}.webm`);
}
