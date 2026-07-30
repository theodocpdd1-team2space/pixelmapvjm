"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { getStrobeAnimationState } from "@/features/editor/animation";
import {
  adaptiveLabelSize,
  animationRenderConstants,
  colorWithAlpha,
  patternRenderConstants,
  pulseAnimationOpacity
} from "@/features/editor/color";
import { snapRectToCanvas } from "@/features/editor/geometry";
import { drawMaskPath, isMaskActive, maskAbsolutePoints, normalizeScreenMask } from "@/features/editor/mask";
import { defaultScreenPattern } from "@/features/editor/types";
import type { EditorScreen, MaskPoint, ScreenPatternSettings } from "@/features/editor/types";
import { useEditorStore } from "@/stores/editor-store";

function useElementSize(onChange: (size: { width: number; height: number }) => void) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(1, Math.floor(entry.contentRect.width));
      const height = Math.max(1, Math.floor(entry.contentRect.height));
      onChange({ width, height });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onChange]);

  return ref;
}

function GridLines() {
  const canvas = useEditorStore((state) => state.canvas);

  return useMemo(() => {
    if (!canvas.gridVisible) {
      return null;
    }

    const lines = [];
    const grid = Math.max(canvas.gridSize, 8);

    for (let x = 0; x <= canvas.width; x += grid) {
      lines.push(
        <Line key={`v-${x}`} points={[x, 0, x, canvas.height]} stroke="rgba(255,48,48,0.16)" strokeWidth={1} listening={false} />
      );
    }

    for (let y = 0; y <= canvas.height; y += grid) {
      lines.push(
        <Line key={`h-${y}`} points={[0, y, canvas.width, y]} stroke="rgba(255,48,48,0.16)" strokeWidth={1} listening={false} />
      );
    }

    lines.push(
      <Line key="center-v" points={[canvas.width / 2, 0, canvas.width / 2, canvas.height]} stroke="rgba(50,213,131,0.34)" strokeWidth={1} listening={false} />,
      <Line key="center-h" points={[0, canvas.height / 2, canvas.width, canvas.height / 2]} stroke="rgba(50,213,131,0.34)" strokeWidth={1} listening={false} />
    );

    return lines;
  }, [canvas.gridSize, canvas.gridVisible, canvas.height, canvas.width]);
}

function Checkerboard({ width, height }: { width: number; height: number }) {
  const tile = 48;
  const cells = [];

  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      const dark = (x / tile + y / tile) % 2 === 0;
      cells.push(
        <Rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={tile}
          height={tile}
          fill={dark ? "#050505" : "#0c0c0c"}
          listening={false}
        />
      );
    }
  }

  return <>{cells}</>;
}

function useHtmlImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      return;
    }

    const next = new Image();
    next.onload = () => setImage(next);
    next.onerror = () => setImage(null);
    next.src = src;
  }, [src]);

  return src ? image : null;
}

function maskClipFunc(screen: EditorScreen) {
  return (context: { beginPath: () => void; moveTo: (x: number, y: number) => void; lineTo: (x: number, y: number) => void; closePath: () => void; rect?: (x: number, y: number, width: number, height: number) => void }) => {
    drawMaskPath(context, normalizeScreenMask(screen.mask), screen.width, screen.height);
  };
}

function MaskEditorHandles({ screen }: { screen: EditorScreen }) {
  const beginTransform = useEditorStore((state) => state.beginTransform);
  const commitTransform = useEditorStore((state) => state.commitTransform);
  const updateScreen = useEditorStore((state) => state.updateScreen);
  const mask = normalizeScreenMask(screen.mask);
  const points = maskAbsolutePoints(mask, screen.width, screen.height);

  if (!isMaskActive(mask) || mask.type === "rectangle" || screen.locked) {
    return null;
  }

  function updatePoint(index: number, point: MaskPoint) {
    const nextPoints = mask.points.map((item, pointIndex) => (pointIndex === index ? point : item));
    updateScreen(screen.id, {
      mask: {
        type: "custom",
        points: nextPoints
      }
    });
  }

  return (
    <Group x={screen.x} y={screen.y} rotation={screen.rotation}>
      <Line
        points={points.flatMap((point) => [point.x, point.y])}
        closed
        stroke="#32D583"
        strokeWidth={2}
        dash={[10, 6]}
        listening={false}
      />
      {points.map((point, index) => (
        <Circle
          key={`${screen.id}-mask-${index}`}
          x={point.x}
          y={point.y}
          radius={7}
          fill="#050505"
          stroke="#32D583"
          strokeWidth={2}
          draggable
          onDragStart={beginTransform}
          onDragMove={(event) => {
            const x = Math.min(screen.width, Math.max(0, event.target.x()));
            const y = Math.min(screen.height, Math.max(0, event.target.y()));
            event.target.position({ x, y });
            updatePoint(index, { x: x / screen.width, y: y / screen.height });
          }}
          onDragEnd={commitTransform}
        />
      ))}
    </Group>
  );
}

function MaskBorder({ screen, selected }: { screen: EditorScreen; selected: boolean }) {
  const mask = normalizeScreenMask(screen.mask);

  if (!isMaskActive(mask) || mask.type === "rectangle") {
    return null;
  }

  return (
    <Group x={screen.x} y={screen.y} rotation={screen.rotation} opacity={screen.opacity} listening={false}>
      <Line
        points={maskAbsolutePoints(mask, screen.width, screen.height).flatMap((point) => [point.x, point.y])}
        closed
        stroke={selected ? "#FF3030" : screen.borderColor}
        strokeWidth={selected ? Math.max(screen.borderWidth, 4) : screen.borderWidth}
      />
    </Group>
  );
}

function screenUsesPolygonMask(screen: EditorScreen) {
  const mask = normalizeScreenMask(screen.mask);
  return isMaskActive(mask) && mask.type !== "rectangle";
}

function StaticPatternOverlay({ screen }: { screen: EditorScreen }) {
  const pattern = { ...defaultScreenPattern, ...(screen.pattern as Partial<ScreenPatternSettings>) };
  const calibration = pattern.type === "mapper-calibration" || pattern.type === "calibration";
  const elements = [];
  const grid = Math.max(4, pattern.gridSize);
  const globalOffsetX = pattern.mode === "global" ? screen.x : 0;
  const globalOffsetY = pattern.mode === "global" ? screen.y : 0;
  const startX = -(((globalOffsetX % grid) + grid) % grid);
  const startY = -(((globalOffsetY % grid) + grid) % grid);

  elements.push(<Rect key="pattern-bg" width={screen.width} height={screen.height} fill={pattern.backgroundColor} listening={false} />);

  if (pattern.type === "solid") {
    return <>{elements}</>;
  }

  if (pattern.type === "rgb-bars") {
    const bars = ["#ff1f1f", "#18d85f", "#2b68ff", "#ffffff", "#ffff00", "#00ffff", "#ff00ff", "#111111"];
    bars.forEach((color, index) => {
      elements.push(
        <Rect
          key={`bar-${color}`}
          x={(screen.width / bars.length) * index}
          y={0}
          width={screen.width / bars.length + 1}
          height={screen.height}
          fill={color}
          listening={false}
        />
      );
    });
  }

  if (pattern.type === "checkerboard" || calibration) {
    for (let y = startY; y < screen.height; y += grid) {
      for (let x = startX; x < screen.width; x += grid) {
        if ((Math.floor((x + globalOffsetX) / grid) + Math.floor((y + globalOffsetY) / grid)) % 2 === 0) {
          const checkerTone =
            pattern.type === "checkerboard"
              ? (Math.floor((x + globalOffsetX) / grid) + Math.floor((y + globalOffsetY) / grid)) % 4 === 0
                ? pattern.primaryColor
                : pattern.secondaryColor
              : colorWithAlpha(pattern.secondaryColor, patternRenderConstants.calibrationCheckerAlpha);
          elements.push(
            <Rect
              key={`checker-${x}-${y}`}
              x={x}
              y={y}
              width={grid}
              height={grid}
              fill={checkerTone}
              listening={false}
            />
          );
        }
      }
    }
  }

  if (pattern.type === "grid" || calibration) {
    for (let x = startX; x < screen.width; x += grid) {
      elements.push(
        <Line key={`pattern-v-${x}`} points={[x, 0, x, screen.height]} stroke={calibration ? colorWithAlpha(pattern.gridColor, patternRenderConstants.calibrationGridAlpha) : pattern.gridColor} strokeWidth={pattern.lineWidth} listening={false} />
      );
    }
    for (let y = startY; y < screen.height; y += grid) {
      elements.push(
        <Line key={`pattern-h-${y}`} points={[0, y, screen.width, y]} stroke={calibration ? colorWithAlpha(pattern.gridColor, patternRenderConstants.calibrationGridAlpha) : pattern.gridColor} strokeWidth={pattern.lineWidth} listening={false} />
      );
    }
  }

  if (pattern.type === "diagonal-lines" || calibration) {
    elements.push(
      <Line key="diag-a" points={[0, 0, screen.width, screen.height]} stroke={pattern.primaryColor} strokeWidth={calibration ? pattern.lineThickness : pattern.lineWidth} listening={false} />,
      <Line key="diag-b" points={[screen.width, 0, 0, screen.height]} stroke={pattern.primaryColor} strokeWidth={calibration ? pattern.lineThickness : pattern.lineWidth} listening={false} />
    );
  }

  if (pattern.type === "crosshair" || (calibration && pattern.showCenterCrosshair)) {
    const cx = screen.width / 2;
    const cy = screen.height / 2;
    elements.push(
      <Line key="cross-v" points={[cx, 0, cx, screen.height]} stroke={pattern.secondaryColor} strokeWidth={pattern.lineThickness} dash={[pattern.dashedLineLength, pattern.dashedLineGap]} listening={false} />,
      <Line key="cross-h" points={[0, cy, screen.width, cy]} stroke={pattern.secondaryColor} strokeWidth={pattern.lineThickness} dash={[pattern.dashedLineLength, pattern.dashedLineGap]} listening={false} />
    );
  }

  if (pattern.type === "concentric-circles" || (calibration && pattern.showCircle)) {
    const cx = screen.width / 2;
    const cy = screen.height / 2;
    const maxRadius = Math.hypot(screen.width, screen.height);
    const circleStep = maxRadius / Math.max(1, pattern.circleCount);
    for (let radius = circleStep; radius < maxRadius; radius += circleStep) {
      elements.push(
        <Circle key={`circle-${radius}`} x={cx} y={cy} radius={radius} stroke={pattern.primaryColor} strokeWidth={pattern.lineThickness} opacity={0.86} listening={false} />
      );
    }
  }

  return <>{elements}</>;
}

function ScreenPixelOverlay({
  screen,
  screens,
  animationTime,
  previewPlaying
}: {
  screen: EditorScreen;
  screens: EditorScreen[];
  animationTime: number;
  previewPlaying: boolean;
}) {
  const elements = [];
  const cabinet = screen.cabinet;
  const pattern = { ...defaultScreenPattern, ...(screen.pattern as Partial<ScreenPatternSettings>) };

  if (cabinet.showPixelDots) {
    const dotStepX = Math.max(8, Math.ceil(screen.width / patternRenderConstants.pixelDotStepXDivisor));
    const dotStepY = Math.max(8, Math.ceil(screen.height / patternRenderConstants.pixelDotStepYDivisor));

    for (let y = dotStepY / 2; y < screen.height; y += dotStepY) {
      for (let x = dotStepX / 2; x < screen.width; x += dotStepX) {
        elements.push(
          <Rect
            key={`dot-${x}-${y}`}
            x={x}
            y={y}
            width={Math.max(1.4, dotStepX * 0.12)}
            height={Math.max(1.4, dotStepY * 0.12)}
            fill={colorWithAlpha(pattern.pixelDotColor, patternRenderConstants.pixelDotAlpha)}
            listening={false}
          />
        );
      }
    }
  }

  if (cabinet.showModuleGrid) {
    for (let x = cabinet.modulePixelWidth; x < screen.width; x += cabinet.modulePixelWidth) {
      elements.push(
        <Line key={`module-v-${x}`} points={[x, 0, x, screen.height]} stroke={colorWithAlpha(pattern.moduleGridColor, patternRenderConstants.moduleGridAlpha)} strokeWidth={1} listening={false} />
      );
    }
    for (let y = cabinet.modulePixelHeight; y < screen.height; y += cabinet.modulePixelHeight) {
      elements.push(
        <Line key={`module-h-${y}`} points={[0, y, screen.width, y]} stroke={colorWithAlpha(pattern.moduleGridColor, patternRenderConstants.moduleGridAlpha)} strokeWidth={1} listening={false} />
      );
    }
  }

  if (cabinet.showCabinetGrid) {
    for (let x = cabinet.pixelWidth; x < screen.width; x += cabinet.pixelWidth) {
      elements.push(<Line key={`cab-v-${x}`} points={[x, 0, x, screen.height]} stroke={pattern.cabinetGridColor} opacity={cabinet.cabinetLineOpacity} strokeWidth={cabinet.cabinetLineThickness} listening={false} />);
    }
    for (let y = cabinet.pixelHeight; y < screen.height; y += cabinet.pixelHeight) {
      elements.push(<Line key={`cab-h-${y}`} points={[0, y, screen.width, y]} stroke={pattern.cabinetGridColor} opacity={cabinet.cabinetLineOpacity} strokeWidth={cabinet.cabinetLineThickness} listening={false} />);
    }
  }

  if (!previewPlaying) {
    return (
      <Group
        x={screen.x}
        y={screen.y}
        rotation={screen.rotation}
        opacity={screen.opacity}
        clipX={0}
        clipY={0}
        clipWidth={screen.width}
        clipHeight={screen.height}
        listening={false}
      >
        {elements}
      </Group>
    );
  }

  const animation = screen.animation;
  const rawProgress = ((animationTime * animation.speed) % 1 + 1) % 1;
  const progress = 0.5 - Math.cos(rawProgress * Math.PI * 2) / 2;
  const pulse = pulseAnimationOpacity(animationTime, animation.speed);

  if (animation.type === "gradient-wipe") {
    const horizontal = animation.direction === "left-to-right" || animation.direction === "right-to-left";
    const length = horizontal ? screen.width : screen.height;
    const band = Math.max(120, length * 0.26);
    const head = (animation.direction === "right-to-left" || animation.direction === "bottom-to-top" ? 1 - progress : progress) * (length + band) - band;

    elements.push(
      <Rect
        key="anim-gradient-base"
        x={0}
        y={0}
        width={screen.width}
        height={screen.height}
        fill={animation.primaryColor}
        opacity={animationRenderConstants.gradientBaseOpacity}
        listening={false}
      />,
      <Rect
        key="anim-gradient-head"
        x={horizontal ? head : 0}
        y={horizontal ? 0 : head}
        width={horizontal ? band : screen.width}
        height={horizontal ? screen.height : band}
        fillLinearGradientStartPoint={{ x: horizontal ? 0 : 0, y: horizontal ? 0 : 0 }}
        fillLinearGradientEndPoint={{ x: horizontal ? band : 0, y: horizontal ? 0 : band }}
        fillLinearGradientColorStops={[
          0,
          "rgba(0,0,0,0)",
          0.18,
          animation.secondaryColor,
          0.5,
          animation.primaryColor,
          0.82,
          animation.secondaryColor,
          1,
          "rgba(0,0,0,0)"
        ]}
        opacity={animationRenderConstants.gradientHeadOpacity}
        listening={false}
      />
    );
  } else if (animation.type === "horizontal-wipe") {
    const width = Math.max(1, screen.width * progress);
    elements.push(
      <Rect
        key="anim-horizontal"
        x={animation.direction === "right-to-left" ? screen.width - width : 0}
        y={0}
        width={width}
        height={screen.height}
        fill={animation.primaryColor}
        opacity={animationRenderConstants.horizontalWipeOpacity}
        listening={false}
      />
    );
  } else if (animation.type === "vertical-wipe") {
    const height = Math.max(1, screen.height * progress);
    elements.push(
      <Rect
        key="anim-vertical"
        x={0}
        y={animation.direction === "bottom-to-top" ? screen.height - height : 0}
        width={screen.width}
        height={height}
        fill={animation.primaryColor}
        opacity={animationRenderConstants.verticalWipeOpacity}
        listening={false}
      />
    );
  } else if (animation.type === "scanner") {
    const horizontal = animation.direction === "left-to-right" || animation.direction === "right-to-left";
    const barSize = horizontal ? Math.max(18, screen.width * 0.08) : Math.max(18, screen.height * 0.08);
    const pos = horizontal
      ? (animation.direction === "right-to-left" ? 1 - progress : progress) * (screen.width + barSize) - barSize
      : (animation.direction === "bottom-to-top" ? 1 - progress : progress) * (screen.height + barSize) - barSize;

    elements.push(
      <Rect
        key="anim-scanner"
        x={horizontal ? pos : 0}
        y={horizontal ? 0 : pos}
        width={horizontal ? barSize : screen.width}
        height={horizontal ? screen.height : barSize}
        fill={animation.secondaryColor}
        opacity={animationRenderConstants.scannerOpacity}
        listening={false}
      />
    );
  } else if (animation.type === "radial-wave") {
    const maxRadius = Math.hypot(screen.width, screen.height);
    const baseRadius = progress * maxRadius;
    for (let index = 0; index < 5; index += 1) {
      const radius = (baseRadius + index * maxRadius * 0.18) % maxRadius;
      elements.push(
        <Circle
          key={`anim-wave-${index}`}
          x={screen.width / 2}
          y={screen.height / 2}
          radius={radius}
          stroke={index % 2 === 0 ? animation.primaryColor : animation.secondaryColor}
          strokeWidth={Math.max(3, screen.width * 0.004)}
          opacity={0.75 - index * 0.11}
          listening={false}
        />
      );
    }
  } else if (animation.type === "fade-gradient-circle") {
    const maxRadius = Math.hypot(screen.width, screen.height) * 0.52;
    const radius = maxRadius * (0.72 + progress * 0.16);
    const breathe = 0.58 + Math.sin(rawProgress * Math.PI * 2) * 0.08;

    elements.push(
      <Circle
        key="anim-fade-gradient-circle"
        x={screen.width / 2}
        y={screen.height / 2}
        radius={radius}
        fillRadialGradientStartPoint={{ x: 0, y: 0 }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndRadius={radius}
        fillRadialGradientColorStops={[
          0,
          colorWithAlpha(animation.secondaryColor, 0.92),
          0.34,
          colorWithAlpha(animation.secondaryColor, 0.7),
          0.62,
          colorWithAlpha(animation.primaryColor, 0.28),
          1,
          "rgba(0,0,0,0)"
        ]}
        opacity={breathe}
        listening={false}
      />
    );
  } else if (animation.type === "pulse") {
    elements.push(
      <Rect key="anim-pulse" width={screen.width} height={screen.height} fill={animation.primaryColor} opacity={pulse} listening={false} />
    );
  } else if (animation.type === "blink" && progress < 0.5) {
    elements.push(
      <Rect
        key="anim-blink"
        width={screen.width}
        height={screen.height}
        fill={animation.secondaryColor}
        opacity={animationRenderConstants.blinkOpacity}
        listening={false}
      />
    );
  } else if (animation.type === "strobe-sequence" || animation.type === "strobe-random") {
    const strobe = getStrobeAnimationState(screen, screens, animationTime);
    if (strobe.active) {
      elements.push(
        <Rect
          key="anim-strobe"
          width={screen.width}
          height={screen.height}
          fill={animation.secondaryColor}
          opacity={strobe.opacity}
          listening={false}
        />
      );
    }
  }

  return (
    <Group
      x={screen.x}
      y={screen.y}
      rotation={screen.rotation}
      opacity={screen.opacity}
      clipFunc={maskClipFunc(screen)}
      listening={false}
    >
      {elements}
    </Group>
  );
}

function ScreenNode({
  screen,
  selected,
  animationTime,
  previewPlaying,
  registerNode
}: {
  screen: EditorScreen;
  selected: boolean;
  animationTime: number;
  previewPlaying: boolean;
  registerNode: (id: string, node: Konva.Rect | null) => void;
}) {
  const canvas = useEditorStore((state) => state.canvas);
  const screens = useEditorStore((state) => state.screens);
  const tool = useEditorStore((state) => state.tool);
  const beginTransform = useEditorStore((state) => state.beginTransform);
  const commitTransform = useEditorStore((state) => state.commitTransform);
  const selectScreen = useEditorStore((state) => state.selectScreen);
  const updateScreen = useEditorStore((state) => state.updateScreen);
  const logoImage = useHtmlImage(typeof screen.metadata.logoDataUrl === "string" ? screen.metadata.logoDataUrl : null);
  const polygonMask = screenUsesPolygonMask(screen);

  if (!screen.visible) {
    return null;
  }

  return (
    <Group>
      <Rect
        ref={(node) => registerNode(screen.id, node)}
        id={screen.id}
        x={screen.x}
        y={screen.y}
        width={screen.width}
        height={screen.height}
        rotation={screen.rotation}
        fill="rgba(0,0,0,0)"
        stroke={polygonMask ? "rgba(0,0,0,0)" : selected ? "#FF3030" : screen.borderColor}
        strokeWidth={polygonMask ? 0 : selected ? Math.max(screen.borderWidth, 4) : screen.borderWidth}
        dash={screen.locked ? [12, 8] : undefined}
        draggable={tool === "select" && !screen.locked}
        onClick={(event) => {
          event.cancelBubble = true;
          selectScreen(screen.id, event.evt.shiftKey || event.evt.metaKey || event.evt.ctrlKey);
        }}
        onTap={(event) => {
          event.cancelBubble = true;
          selectScreen(screen.id);
        }}
        onDragStart={beginTransform}
        onDragMove={(event) => {
          const snapped = snapRectToCanvas(
            {
              x: event.target.x(),
              y: event.target.y(),
              width: screen.width,
              height: screen.height
            },
            canvas,
            { zoom: useEditorStore.getState().zoom, otherScreens: screens.filter((item) => item.id !== screen.id && item.visible) }
          );
          event.target.position({ x: snapped.x, y: snapped.y });
          updateScreen(
            screen.id,
            {
              x: snapped.x,
              y: snapped.y,
              width: snapped.width,
              height: snapped.height
            },
            { snap: false }
          );
        }}
        onDragEnd={(event) => {
          const snapped = snapRectToCanvas(
            {
              x: event.target.x(),
              y: event.target.y(),
              width: screen.width,
              height: screen.height
            },
            canvas,
            { zoom: useEditorStore.getState().zoom, otherScreens: screens.filter((item) => item.id !== screen.id && item.visible) }
          );
          event.target.position({ x: snapped.x, y: snapped.y });
          updateScreen(screen.id, {
            x: snapped.x,
            y: snapped.y,
            width: snapped.width,
            height: snapped.height
          });
          commitTransform();
        }}
      />
      <Group
        x={screen.x}
        y={screen.y}
        rotation={screen.rotation}
        opacity={screen.opacity}
        clipFunc={maskClipFunc(screen)}
        listening={false}
      >
        {screen.type === "logo" && logoImage ? (
          <KonvaImage image={logoImage} width={screen.width} height={screen.height} listening={false} />
        ) : (
          <StaticPatternOverlay screen={screen} />
        )}
        {screen.type !== "logo" && patternForScreen(screen).showLogo && logoImage ? (
          <KonvaImage image={logoImage} x={screen.width * 0.36} y={screen.height * 0.28} width={screen.width * 0.28} height={screen.height * 0.44} opacity={0.96} listening={false} />
        ) : null}
        {screen.type !== "logo" ? <ScreenLabel screen={screen} /> : null}
      </Group>
      <ScreenPixelOverlay screen={screen} screens={screens} animationTime={animationTime} previewPlaying={previewPlaying} />
      <MaskBorder screen={screen} selected={selected} />
      {selected ? <MaskEditorHandles screen={screen} /> : null}
    </Group>
  );
}

function patternForScreen(screen: EditorScreen) {
  return { ...defaultScreenPattern, ...(screen.pattern as Partial<ScreenPatternSettings>) };
}

function labelLinesForScreen(screen: EditorScreen) {
  const pattern = patternForScreen(screen);
  return [
    pattern.showScreenName ? screen.name : "",
    pattern.showSize || pattern.showResolution ? `SIZE: ${Math.round(screen.width)} x ${Math.round(screen.height)}` : "",
    pattern.showPosition || pattern.showCoordinates ? `X ${Math.round(screen.x)} Y ${Math.round(screen.y)}` : ""
  ].filter(Boolean);
}

function ScreenLabel({ screen }: { screen: EditorScreen }) {
  const pattern = patternForScreen(screen);
  const lines = labelLinesForScreen(screen);

  if (lines.length === 0) {
    return null;
  }

  const fontSize = adaptiveLabelSize(pattern.labelSize, screen.width, screen.height);
  const padding = Math.max(10, fontSize * 0.48);
  const lineHeight = fontSize * 1.22;
  const longest = Math.max(...lines.map((line) => line.length));
  const width = longest * fontSize * 0.64 + padding * 2;
  const height = lines.length * lineHeight + padding * 1.4;
  const x = (screen.width - width) / 2;
  const y = (screen.height - height) / 2;

  return (
    <Group x={x} y={y} listening={false}>
      <Rect
        width={width}
        height={height}
        fill={colorWithAlpha(pattern.labelBackgroundColor, pattern.labelBackgroundOpacity)}
        stroke={pattern.primaryColor}
        strokeWidth={2}
        listening={false}
      />
      {lines.map((line, index) => (
        <Text
          key={`${line}-${index}`}
          x={padding}
          y={padding * 0.7 + index * lineHeight}
          text={line}
          fill={pattern.labelTextColor}
          fontSize={fontSize}
          fontStyle="700"
          fontFamily="JetBrains Mono"
          listening={false}
        />
      ))}
    </Group>
  );
}

export function EditorCanvas({ onViewportChange }: { onViewportChange: (size: { width: number; height: number }) => void }) {
  const [size, setSize] = useState({ width: 1000, height: 700 });
  const [panning, setPanning] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [animationTime, setAnimationTime] = useState(0);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const nodeRefs = useRef(new Map<string, Konva.Rect>());
  const viewportRef = useElementSize((nextSize) => {
    setSize(nextSize);
    onViewportChange(nextSize);
  });

  const canvas = useEditorStore((state) => state.canvas);
  const screens = useEditorStore((state) => state.screens);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const tool = useEditorStore((state) => state.tool);
  const zoom = useEditorStore((state) => state.zoom);
  const pan = useEditorStore((state) => state.pan);
  const previewPlaying = useEditorStore((state) => state.previewPlaying);
  const setZoom = useEditorStore((state) => state.setZoom);
  const setPan = useEditorStore((state) => state.setPan);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const updateScreen = useEditorStore((state) => state.updateScreen);
  const beginTransform = useEditorStore((state) => state.beginTransform);
  const commitTransform = useEditorStore((state) => state.commitTransform);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) {
      return;
    }

    const nodes = selectedIds
      .filter((id) => {
        const screen = screens.find((item) => item.id === id);
        return screen && !screen.locked;
      })
      .map((id) => nodeRefs.current.get(id))
      .filter((node): node is Konva.Rect => Boolean(node));
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [screens, selectedIds]);

  useEffect(() => {
    if (!previewPlaying) {
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      setAnimationTime((now - startedAt) / 1000);
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [previewPlaying]);

  function registerNode(id: string, node: Konva.Rect | null) {
    if (!node) {
      nodeRefs.current.delete(id);
      return;
    }

    nodeRefs.current.set(id, node);
  }

  function handleWheel(event: KonvaEventObject<WheelEvent>) {
    event.evt.preventDefault();
    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();

    if (!pointer) {
      return;
    }

    const direction = event.evt.deltaY > 0 ? -1 : 1;
    const nextZoom = Math.min(Math.max(zoom + direction * 0.06, 0.05), 4);
    const pointTo = {
      x: (pointer.x - pan.x) / zoom,
      y: (pointer.y - pan.y) / zoom
    };

    setZoom(nextZoom);
    setPan({
      x: pointer.x - pointTo.x * nextZoom,
      y: pointer.y - pointTo.y * nextZoom
    });
  }

  function handlePointerDown(event: KonvaEventObject<MouseEvent | TouchEvent>) {
    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();

    if (!pointer) {
      return;
    }

    if (tool === "hand") {
      setPanning({ x: pointer.x, y: pointer.y, panX: pan.x, panY: pan.y });
      return;
    }

    if (event.target === stage) {
      clearSelection();
    }
  }

  function handlePointerMove(event: KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!panning) {
      return;
    }

    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();

    if (!pointer) {
      return;
    }

    setPan({
      x: panning.panX + pointer.x - panning.x,
      y: panning.panY + pointer.y - panning.y
    });
  }

  function applyNodeTransform(shouldSnap: boolean) {
    selectedIds.forEach((id) => {
      const node = nodeRefs.current.get(id);
      if (!node) {
        return;
      }

      const width = Math.max(8, node.width() * node.scaleX());
      const height = Math.max(8, node.height() * node.scaleY());
      node.scaleX(1);
      node.scaleY(1);
      const geometry = {
        x: node.x(),
        y: node.y(),
        width,
        height
      };
      const next = shouldSnap
        ? snapRectToCanvas(geometry, canvas, { zoom, otherScreens: screens.filter((item) => !selectedIds.includes(item.id) && item.visible) })
        : geometry;

      if (shouldSnap) {
        node.position({ x: next.x, y: next.y });
        node.width(next.width);
        node.height(next.height);
      }

      updateScreen(id, {
        x: next.x,
        y: next.y,
        width: next.width,
        height: next.height,
        rotation: node.rotation()
      });
    });
  }

  function handleTransform() {
    applyNodeTransform(false);
  }

  function handleTransformEnd() {
    applyNodeTransform(true);
    commitTransform();
  }

  return (
    <div ref={viewportRef} className="min-h-0 min-w-0 bg-[#050505]">
      <Stage
        width={size.width}
        height={size.height}
        onWheel={handleWheel}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        onMouseUp={() => setPanning(null)}
        onTouchEnd={() => setPanning(null)}
        className={tool === "hand" ? "cursor-grab" : "cursor-crosshair"}
      >
        <Layer>
          <Rect width={size.width} height={size.height} fill="#050505" listening={false} />
          <Group x={pan.x} y={pan.y} scaleX={zoom} scaleY={zoom}>
            <Rect x={-24} y={-24} width={canvas.width + 48} height={canvas.height + 48} fill="#030303" listening={false} />
            <Checkerboard width={canvas.width} height={canvas.height} />
            <Rect
              width={canvas.width}
              height={canvas.height}
              fill={canvas.backgroundTransparent ? "rgba(0,0,0,0)" : canvas.backgroundColor}
              stroke="#292929"
              strokeWidth={2}
              listening={false}
            />
            <GridLines />
            {screens
              .slice()
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((screen) => (
                <ScreenNode
                  key={screen.id}
                  screen={screen}
                  selected={selectedIds.includes(screen.id)}
                  animationTime={previewPlaying ? animationTime : 0}
                  previewPlaying={previewPlaying}
                  registerNode={registerNode}
                />
              ))}
            <Transformer
              ref={transformerRef}
              rotateEnabled
              ignoreStroke
              borderStroke="#FF3030"
              anchorStroke="#FF3030"
              anchorFill="#070707"
              anchorSize={12}
              enabledAnchors={[
                "top-left",
                "top-center",
                "top-right",
                "middle-left",
                "middle-right",
                "bottom-left",
                "bottom-center",
                "bottom-right"
              ]}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 8 || newBox.height < 8) {
                  return oldBox;
                }

                return newBox;
              }}
              onTransformStart={beginTransform}
              onTransform={handleTransform}
              onTransformEnd={handleTransformEnd}
            />
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}
