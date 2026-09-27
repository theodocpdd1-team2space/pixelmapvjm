"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Shape, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { drawPattern, drawLabel } from "@/features/editor/render-service";
import { snapRectToCanvas, snapScreenPosition } from "@/features/editor/geometry";
import { drawMaskPath, isMaskActive, maskAbsolutePoints, normalizeScreenMask } from "@/features/editor/mask";
import { defaultScreenPattern } from "@/features/editor/types";
import type { EditorScreen, MaskPoint, ScreenPatternSettings } from "@/features/editor/types";
import { useEditorStore } from "@/stores/editor-store";
import { getEditorImage, loadEditorImage } from "@/features/editor/image-assets";

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
  const [loaded, setLoaded] = useState<{ src: string; image: HTMLImageElement | null } | null>(null);
  useEffect(() => {
    if (!src) return;
    let active = true;
    void loadEditorImage(src).then(image => { if (active) setLoaded({ src, image }); }, () => { if (active) setLoaded({ src, image: null }); });
    return () => { active = false; };
  }, [src]);
  return src ? getEditorImage(src) ?? (loaded?.src === src ? loaded.image : null) : null;
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
  const centerLogoImage = useHtmlImage(typeof screen.pattern.logoDataUrl === "string" ? screen.pattern.logoDataUrl : null);
  const labelRef = useRef<Konva.Shape | null>(null);
  useEffect(() => {
    // An asynchronously decoded image must repaint even while preview is paused.
    labelRef.current?.getLayer()?.batchDraw();
  }, [centerLogoImage]);
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
          const snapped = snapScreenPosition(
            {
              x: event.target.x(),
              y: event.target.y(),
              width: screen.width,
              height: screen.height,
              rotation: screen.rotation
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
          const snapped = snapScreenPosition(
            {
              x: event.target.x(),
              y: event.target.y(),
              width: screen.width,
              height: screen.height,
              rotation: screen.rotation
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
          <Shape listening={false} sceneFunc={(context) => {
            const ctx = context._context;
            ctx.save();
            drawPattern(ctx, screen, canvas, screens, previewPlaying ? animationTime : undefined);
            ctx.restore();
          }} />
        )}
        {screen.type !== "logo" && patternForScreen(screen).showLogo && logoImage ? (
          <KonvaImage image={logoImage} x={screen.width * 0.36} y={screen.height * 0.28} width={screen.width * 0.28} height={screen.height * 0.44} opacity={0.96} listening={false} />
        ) : null}
        {screen.type !== "logo" ? <Shape ref={labelRef} listening={false} sceneFunc={(context) => { context._context.save(); drawLabel(context._context, screen, previewPlaying ? animationTime : 0, centerLogoImage ?? undefined); context._context.restore(); }} /> : null}
      </Group>
      <MaskBorder screen={screen} selected={selected} />
      {selected ? <MaskEditorHandles screen={screen} /> : null}
    </Group>
  );
}

function patternForScreen(screen: EditorScreen) {
  return { ...defaultScreenPattern, ...(screen.pattern as Partial<ScreenPatternSettings>) };
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
      // Axis-aligned size snapping distorts a rotated slice (and moves its pivot).
      const canSnapRectangle = shouldSnap && Math.abs(node.rotation() % 360) < 0.0001 && transformerRef.current?.getActiveAnchor() !== "rotater";
      const next = canSnapRectangle
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
