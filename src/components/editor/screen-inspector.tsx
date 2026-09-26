"use client";

import { Copy, Lock, Plus, Sparkles, Trash2, Unlock } from "lucide-react";
import { CenterLogoControls } from "./center-logo-controls";
import { NumericField } from "@/components/editor/numeric-field";
import { Button } from "@/components/ui/button";
import { getCabinetLayout } from "@/features/editor/cabinet-layout";
import { geometryPrecision, rotateSliceAroundCenter } from "@/features/editor/slice-geometry";
import { isStrobeAnimation } from "@/features/editor/animation";
import { cabinetPresets, cabinetSettingsFromPreset } from "@/features/editor/cabinet-presets";
import { labelSizeLimits } from "@/features/editor/color";
import { animationColorTemplates } from "@/features/editor/color-templates";
import { addMaskPoint, maskPresetPoints, normalizeScreenMask, removeMaskPoint } from "@/features/editor/mask";
import { visualTemplates } from "@/features/editor/visual-templates";
import { defaultScreenPattern } from "@/features/editor/types";
import type {
  AnimationType,
  CabinetPresetId,
  PatternMode,
  ScreenMaskSettings,
  ScreenMaskType,
  ScreenPatternSettings,
  StaticPatternType
} from "@/features/editor/types";
import { useEditorStore } from "@/stores/editor-store";

export function ScreenInspector() {
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const screens = useEditorStore((state) => state.screens);
  const beginTransform = useEditorStore((state) => state.beginTransform);
  const commitTransform = useEditorStore((state) => state.commitTransform);
  const updateScreen = useEditorStore((state) => state.updateScreen);
  const renameScreen = useEditorStore((state) => state.renameScreen);
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const toggleLock = useEditorStore((state) => state.toggleLock);
  const addCabinetArray = useEditorStore((state) => state.addCabinetArray);
  const applyScreenAnimationToAll = useEditorStore((state) => state.applyScreenAnimationToAll);
  const screen = screens.find((item) => item.id === selectedIds[0]);

  if (selectedIds.length === 0 || !screen) {
    return (
      <div className="border border-pf-border bg-black/25 p-3 font-mono text-xs uppercase leading-6 text-pf-muted">
        No screen selected. Click a layer or canvas screen.
      </div>
    );
  }

  if (selectedIds.length > 1) {
    const sourceScreen = screens.find((item) => item.id === selectedIds[0]);
    return (
      <div className="space-y-3">
        <div className="border border-pf-border bg-black/25 p-3 font-mono text-xs uppercase text-pf-muted">
          {selectedIds.length} screens selected
        </div>
        {sourceScreen && sourceScreen.type !== "logo" ? (
          <Button type="button" className="w-full" onClick={() => applyScreenAnimationToAll(sourceScreen.id)}>
            <Sparkles size={14} />
            APPLY FIRST ANIMATION TO ALL
          </Button>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={duplicateSelected}>
            <Copy size={14} />
            DUP
          </Button>
          <Button type="button" variant="danger" onClick={deleteSelected}>
            <Trash2 size={14} />
            DEL
          </Button>
        </div>
      </div>
    );
  }

  const selectedScreen = screen;
  const pattern = { ...defaultScreenPattern, ...(screen.pattern as Partial<ScreenPatternSettings>) };
  const mask = normalizeScreenMask(screen.mask);
  const cabinetLayout = getCabinetLayout(screen);

  function commitGeometry(key: "x" | "y" | "width" | "height", value?: number) {
    if (value !== undefined) {
      updateScreen(selectedScreen.id, {
        [key]: key === "width" || key === "height" ? Math.max(1, geometryPrecision(value)) : geometryPrecision(value)
      });
    }
    commitTransform();
  }

  function updateMask(nextMask: ScreenMaskSettings) {
    updateScreen(selectedScreen.id, { mask: normalizeScreenMask(nextMask) });
  }

  function updateMaskPoint(index: number, axis: "x" | "y", value: number) {
    const nextPoints = mask.points.map((point, pointIndex) =>
      pointIndex === index ? { ...point, [axis]: Math.min(1, Math.max(0, value / 100)) } : point
    );
    updateMask({ type: "custom", points: nextPoints });
  }

  function updateTitleTextSize(value: number) {
    updateScreen(selectedScreen.id, {
      pattern: {
        ...pattern,
        labelSize: Math.min(labelSizeLimits.max, Math.max(labelSizeLimits.min, Math.round(value)))
      }
    });
  }

  return (
    <div className="min-w-0 space-y-4">
      <label className="block space-y-2">
        <span className="technical-label">Screen Name</span>
        <input
          className="technical-input"
          defaultValue={screen.name}
          onBlur={(event) => {
            if (event.target.value.trim() && event.target.value !== screen.name) {
              renameScreen(screen.id, event.target.value.trim());
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
      </label>
      {screen.type !== "logo" ? (
        <NumericField
          label="Title Text Size"
          value={pattern.labelSize}
          min={labelSizeLimits.min}
          max={labelSizeLimits.max}
          integer
          onPreview={updateTitleTextSize}
          onCommit={() => undefined}
        />
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <NumericField
          label="X"
          value={screen.x}
          step={0.1}
          onPreview={(value) => {
            beginTransform();
            updateScreen(screen.id, { x: value });
          }}
          onCommit={(value) => commitGeometry("x", value)}
        />
        <NumericField
          label="Y"
          value={screen.y}
          step={0.1}
          onPreview={(value) => {
            beginTransform();
            updateScreen(screen.id, { y: value });
          }}
          onCommit={(value) => commitGeometry("y", value)}
        />
        <NumericField
          label="W"
          value={screen.width}
          min={1}
          step={0.1}
          onPreview={(value) => {
            beginTransform();
            updateScreen(screen.id, { width: Math.max(1, value) });
          }}
          onCommit={(value) => commitGeometry("width", value)}
        />
        <NumericField
          label="H"
          value={screen.height}
          min={1}
          step={0.1}
          onPreview={(value) => {
            beginTransform();
            updateScreen(screen.id, { height: Math.max(1, value) });
          }}
          onCommit={(value) => commitGeometry("height", value)}
        />
        <NumericField
          label="Rotation"
          value={screen.rotation}
          step={0.1}
          onPreview={(value) => {
            beginTransform();
            updateScreen(screen.id, rotateSliceAroundCenter(screen, value));
          }}
          onCommit={commitTransform}
        />
        <NumericField
          label="Opacity"
          value={screen.opacity}
          min={0}
          step={0.05}
          onPreview={(value) => {
            beginTransform();
            updateScreen(screen.id, { opacity: Math.min(Math.max(value, 0), 1) });
          }}
          onCommit={commitTransform}
        />
      </div>
      <p className="text-xs leading-5 text-pf-muted">W/H follow the slice edges. Rotation turns the card, cabinet grid, logo, and label together around the slice center.</p>
      <div className="space-y-3 border border-pf-border bg-black/20 p-3">
        <p className="font-mono text-xs uppercase text-pf-red">Mask Shape</p>
        <label className="block space-y-2">
          <span className="technical-label">Shape</span>
          <select
            className="technical-input h-9 text-xs"
            value={mask.type}
            onChange={(event) => {
              const type = event.target.value as ScreenMaskType;
              updateMask({
                type,
                points: type === "custom" ? maskPresetPoints("trapezoid") : maskPresetPoints(type)
              });
            }}
          >
            <option value="none">No Mask</option>
            <option value="rectangle">Rectangle</option>
            <option value="triangle">Triangle</option>
            <option value="trapezoid">Trapezoid</option>
            <option value="custom">Custom Shape</option>
          </select>
        </label>
        {mask.type !== "none" && mask.type !== "rectangle" ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" className="h-9 text-xs" onClick={() => updateMask(addMaskPoint(mask))}>
                <Plus size={14} />
                POINT
              </Button>
              <Button
                type="button"
                className="h-9 text-xs"
                onClick={() => updateMask({ type: mask.type, points: maskPresetPoints(mask.type) })}
              >
                RESET
              </Button>
            </div>
            <div className="space-y-2">
              {mask.points.map((point, index) => (
                <div key={`${screen.id}-mask-point-${index}`} className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2">
                  <span className="pb-2 font-mono text-[0.68rem] uppercase text-pf-muted">P{index + 1}</span>
                  <label className="block space-y-1">
                    <span className="technical-label">X%</span>
                    <input
                      className="technical-input h-8 text-xs"
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(point.x * 100)}
                      onChange={(event) => updateMaskPoint(index, "x", Number(event.target.value) || 0)}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="technical-label">Y%</span>
                    <input
                      className="technical-input h-8 text-xs"
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(point.y * 100)}
                      onChange={(event) => updateMaskPoint(index, "y", Number(event.target.value) || 0)}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="danger"
                    className="h-8 w-8 p-0"
                    disabled={mask.points.length <= 3}
                    onClick={() => updateMask(removeMaskPoint(mask, index))}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="space-y-3 border border-pf-border bg-black/20 p-3">
        <p className="font-mono text-xs uppercase text-pf-red">Cabinet Engine</p>
        <label className="block space-y-2">
          <span className="technical-label">Cabinet Preset</span>
          <select
            className="technical-input h-10 min-w-0 truncate pr-7 text-[0.68rem]"
            value={screen.cabinet.presetId}
            onChange={(event) => {
              const nextCabinet = cabinetSettingsFromPreset(event.target.value as CabinetPresetId);
              beginTransform();
              updateScreen(screen.id, {
                cabinet: nextCabinet
              });
              commitTransform();
            }}
          >
            {cabinetPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <NumericField
            label="Cab W PX"
            value={screen.cabinet.pixelWidth}
            min={1}
            onPreview={(value) => {
              const pixelWidth = Math.max(1, Math.round(value));
              beginTransform();
              updateScreen(screen.id, {
                cabinet: { ...screen.cabinet, presetId: "custom", manualOverride: true, pixelWidth }
              });
            }}
            onCommit={commitTransform}
          />
          <NumericField
            label="Cab H PX"
            value={screen.cabinet.pixelHeight}
            min={1}
            onPreview={(value) => {
              beginTransform();
              updateScreen(screen.id, {
                cabinet: { ...screen.cabinet, presetId: "custom", manualOverride: true, pixelHeight: Math.max(1, Math.round(value)) }
              });
            }}
            onCommit={commitTransform}
          />
        </div>
        <div className="grid min-w-0 grid-cols-3 gap-2">
          <NumericField
            label="Cab W MM"
            value={screen.cabinet.physicalWidthMm}
            min={0.1}
            step={0.01}
            onPreview={(value) => {
              beginTransform();
              const physicalWidthMm = Math.max(0.1, value);
              updateScreen(screen.id, {
                cabinet: {
                  ...screen.cabinet,
                  presetId: "custom",
                  manualOverride: false,
                  physicalWidthMm,
                  pixelWidth: Math.max(1, Math.round(physicalWidthMm / screen.cabinet.pixelPitchMm)),
                  pixelHeight: Math.max(1, Math.round(screen.cabinet.physicalHeightMm / screen.cabinet.pixelPitchMm))
                }
              });
            }}
            onCommit={commitTransform}
          />
          <NumericField
            label="Cab H MM"
            value={screen.cabinet.physicalHeightMm}
            min={0.1}
            step={0.01}
            onPreview={(value) => {
              beginTransform();
              const physicalHeightMm = Math.max(0.1, value);
              updateScreen(screen.id, {
                cabinet: {
                  ...screen.cabinet,
                  presetId: "custom",
                  manualOverride: false,
                  physicalHeightMm,
                  pixelWidth: Math.max(1, Math.round(screen.cabinet.physicalWidthMm / screen.cabinet.pixelPitchMm)),
                  pixelHeight: Math.max(1, Math.round(physicalHeightMm / screen.cabinet.pixelPitchMm))
                }
              });
            }}
            onCommit={commitTransform}
          />
          <NumericField
            label="Pitch MM"
            value={screen.cabinet.pixelPitchMm}
            min={0.1}
            step={0.01}
            onPreview={(value) => {
              beginTransform();
              const pixelPitchMm = Math.max(0.1, value);
              updateScreen(screen.id, {
                cabinet: {
                  ...screen.cabinet,
                  presetId: "custom",
                  manualOverride: false,
                  pixelPitchMm,
                  pixelWidth: Math.max(1, Math.round(screen.cabinet.physicalWidthMm / pixelPitchMm)),
                  pixelHeight: Math.max(1, Math.round(screen.cabinet.physicalHeightMm / pixelPitchMm))
                }
              });
            }}
            onCommit={commitTransform}
          />
        </div>
        <div className="min-w-0 break-words border border-pf-border bg-black/30 p-3 font-mono text-[0.68rem] uppercase leading-5 text-pf-muted">
          <p>CALCULATED CABINET: <span className="text-pf-text">{Math.round(screen.cabinet.physicalWidthMm / screen.cabinet.pixelPitchMm)} × {Math.round(screen.cabinet.physicalHeightMm / screen.cabinet.pixelPitchMm)} PX</span></p>
          <p>NATIVE ARRAY: <span className="text-pf-text">{cabinetLayout.nativeWidth} × {cabinetLayout.nativeHeight} PX</span></p>
          <p>FULL CABINETS: <span className="text-pf-text">{cabinetLayout.columns} × {cabinetLayout.rows}</span></p>
          <p className="mt-1 text-[0.6rem] normal-case">Jumlah kabinet dihitung dari ukuran screen dan preset. Columns/Rows mengubah ukuran screen ke kelipatan kabinet utuh.</p>
          {cabinetLayout.scaled && <p role="note" className="mt-2 text-pf-warning normal-case">Ukuran slice {screen.width} × {screen.height} px berbeda dari native {cabinetLayout.nativeWidth} × {cabinetLayout.nativeHeight} px. Grid menampilkan {cabinetLayout.columns} × {cabinetLayout.rows} kabinet utuh yang diskalakan; periksa jumlah fisik kabinet.</p>}
          {cabinetLayout.columns * cabinetLayout.rows > 12000 && <p className="mt-2 normal-case">Detail sel disembunyikan di atas 12.000 kabinet.</p>}
        </div>
        {cabinetLayout.scaled && <Button className="w-full" onClick={() => {
          beginTransform();
          updateScreen(screen.id, { width: cabinetLayout.nativeWidth, height: cabinetLayout.nativeHeight });
          commitTransform();
        }}>USE NATIVE CABINET SIZE</Button>}
        <div className="grid grid-cols-2 gap-3">
          <NumericField label="Columns" value={cabinetLayout.columns} integer min={1} onPreview={(value) => { beginTransform(); updateScreen(screen.id, { width: screen.cabinet.pixelWidth * Math.max(1, Math.round(value)) }); }} onCommit={commitTransform} />
          <NumericField label="Rows" value={cabinetLayout.rows} integer min={1} onPreview={(value) => { beginTransform(); updateScreen(screen.id, { height: screen.cabinet.pixelHeight * Math.max(1, Math.round(value)) }); }} onCommit={commitTransform} />
        </div>
        <label className="flex min-w-0 items-center gap-2 border border-pf-border bg-black/30 p-2 font-mono text-[0.68rem] uppercase text-pf-muted"><input type="checkbox" checked={screen.cabinet.manualOverride} onChange={(event) => updateScreen(screen.id, { cabinet: { ...screen.cabinet, manualOverride: event.target.checked } })} /> <span className="min-w-0 break-words">Manual pixel override</span></label>
        <Button type="button" className="w-full min-w-0 text-xs" onClick={() => addCabinetArray({ ...screen.cabinet, cabinetColumns: cabinetLayout.columns, cabinetRows: cabinetLayout.rows })}><Copy size={14} /> <span className="truncate">CREATE ARRAY SCREEN</span></Button>
        <div className="grid min-w-0 grid-cols-3 gap-2 font-mono text-[0.68rem] uppercase text-pf-muted">
          <label className="flex min-w-0 items-center gap-2 border border-pf-border bg-black/30 p-2">
            <input
              type="checkbox"
              checked={screen.cabinet.showCabinetGrid}
              onChange={(event) => {
                beginTransform();
                updateScreen(screen.id, { cabinet: { ...screen.cabinet, showCabinetGrid: event.target.checked } });
                commitTransform();
              }}
            />
            Cab
          </label>
          <label className="flex min-w-0 items-center gap-2 border border-pf-border bg-black/30 p-2">
            <input
              type="checkbox"
              checked={screen.cabinet.showModuleGrid}
              onChange={(event) => {
                beginTransform();
                updateScreen(screen.id, { cabinet: { ...screen.cabinet, showModuleGrid: event.target.checked } });
                commitTransform();
              }}
            />
            Mod
          </label>
          <label className="flex min-w-0 items-center gap-2 border border-pf-border bg-black/30 p-2">
            <input
              type="checkbox"
              checked={screen.cabinet.showPixelDots}
              onChange={(event) => {
                beginTransform();
                updateScreen(screen.id, { cabinet: { ...screen.cabinet, showPixelDots: event.target.checked } });
                commitTransform();
              }}
            />
            Dots
          </label>
        </div>
      </div>
      {screen.type !== "logo" ? (
        <div className="space-y-3 border border-pf-border bg-black/20 p-3">
          <p className="font-mono text-xs uppercase text-pf-red">Test Pattern</p>
          <label className="block space-y-2">
            <span className="technical-label">Visual Template</span>
            <select
              className="technical-input h-9 min-w-0 truncate pr-7 text-xs"
              defaultValue=""
              onChange={(event) => {
                const template = visualTemplates.find((item) => item.id === event.target.value);
                event.currentTarget.value = "";
                if (!template) return;
                updateScreen(screen.id, {
                  fillColor: template.fillColor,
                  borderColor: template.borderColor,
                  pattern: { ...pattern, ...template.pattern },
                  animation: { ...screen.animation, ...template.animation }
                });
              }}
            >
              <option value="">Apply visual template...</option>
              {visualTemplates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="technical-label">Pattern Type</span>
            <select
              className="technical-input h-9 text-xs"
              value={pattern.type}
              onChange={(event) =>
                updateScreen(screen.id, {
                  pattern: { ...pattern, type: event.target.value as StaticPatternType }
                })
              }
            >
              <option value="festival-card">Festival Test Card</option>
              <option value="badge-card">LED Hex Badge</option>
              <option value="coordinate-card">Coordinate Grid</option>
              <option value="mapper-calibration">Mapper Calibration</option>
              <option value="calibration">Calibration Card</option>
              <option value="grid">Grid</option>
              <option value="checkerboard">Checkerboard</option>
              <option value="crosshair">Crosshair</option>
              <option value="concentric-circles">Concentric Circle</option>
              <option value="diagonal-lines">Diagonal Lines</option>
              <option value="rgb-bars">RGB Bars</option>
              <option value="screen-label">Screen Label</option>
              <option value="solid">Solid</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="technical-label">Grid Source</span>
            <select className="technical-input h-9 text-xs" value={pattern.gridSource} onChange={event => {
              beginTransform();
              updateScreen(screen.id, { pattern: { ...pattern, gridSource: event.target.value as ScreenPatternSettings["gridSource"] } });
              commitTransform();
            }}><option value="cabinet">Cabinet • full cells per screen</option><option value="custom">Custom graphic grid</option></select>
          </label>
          {pattern.gridSource === "custom" ? <label className="block space-y-2">
            <span className="technical-label">Pattern Mode</span>
            <select
              className="technical-input h-9 text-xs"
              value={pattern.mode}
              onChange={(event) =>
                updateScreen(screen.id, {
                  pattern: { ...pattern, mode: event.target.value as PatternMode }
                })
              }
            >
              <option value="global">Global Pattern</option>
              <option value="local">Local Pattern</option>
            </select>
          </label> : <p className="text-xs text-pf-muted">Grid mengikuti kabinet dari sudut kiri atas setiap screen. Geser screen tidak memotong sel kabinet.</p>}
          <div className="grid grid-cols-2 gap-3">
            {([
              ["BG", "backgroundColor"],
              ["Primary", "primaryColor"],
              ["Secondary", "secondaryColor"],
              ["Accent", "accentColor"],
              ["Grid", "gridColor"],
              ["Cabinet", "cabinetGridColor"],
              ["Module", "moduleGridColor"],
              ["Dots", "pixelDotColor"],
              ["Label BG", "labelBackgroundColor"],
              ["Label Text", "labelTextColor"]
            ] as const).map(([label, key]) => (
              <label key={key} className="block space-y-2">
                <span className="technical-label">{label}</span>
                <input
                  className="h-9 w-full border border-pf-border bg-black"
                  type="color"
                  value={String(pattern[key])}
                  onChange={(event) => updateScreen(screen.id, { pattern: { ...pattern, [key]: event.target.value } })}
                />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {pattern.gridSource === "custom" && <NumericField
              label="Graphic Grid Size"
              value={pattern.gridSize}
              min={4}
              onPreview={(value) =>
                updateScreen(screen.id, { pattern: { ...pattern, gridSize: Math.max(4, Math.round(value)) } })
              }
              onCommit={() => undefined}
            />}
            <NumericField
              label="Title Size"
              value={pattern.labelSize}
              min={labelSizeLimits.min}
              max={labelSizeLimits.max}
              integer
              onPreview={updateTitleTextSize}
              onCommit={() => undefined}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumericField label="Line Thickness" value={pattern.lineThickness} min={1} step={0.5} onPreview={(value) => updateScreen(screen.id, { pattern: { ...pattern, lineThickness: Math.max(1, value) } })} onCommit={() => undefined} />
            <NumericField label="Edge Thickness" value={pattern.edgeThickness} min={1} step={0.5} onPreview={(value) => updateScreen(screen.id, { pattern: { ...pattern, edgeThickness: Math.max(1, value) } })} onCommit={() => undefined} />
            <NumericField label="Circle Count" value={pattern.circleCount} min={1} onPreview={(value) => updateScreen(screen.id, { pattern: { ...pattern, circleCount: Math.min(20, Math.max(1, Math.round(value))) } })} onCommit={() => undefined} />
            <NumericField label="Label Opacity" value={pattern.labelBackgroundOpacity} min={0} step={0.05} onPreview={(value) => updateScreen(screen.id, { pattern: { ...pattern, labelBackgroundOpacity: Math.min(1, Math.max(0, value)) } })} onCommit={() => undefined} />
          </div>
          <Button className="w-full" onClick={() => {
            beginTransform();
            screens.filter(item => item.type !== "logo").forEach(item => updateScreen(item.id, {
              pattern: { ...pattern, badgeText: String(item.pattern.badgeText ?? pattern.badgeText) }
            }));
            commitTransform();
          }}>APPLY TEST CARD TO ALL</Button>
          <label className="block space-y-1"><span className="technical-label">Center Badge Text</span><input className="technical-input" maxLength={8} value={pattern.badgeText} onFocus={beginTransform} onChange={(event) => updateScreen(screen.id, { pattern: { ...pattern, badgeText: event.target.value } })} onBlur={commitTransform} /></label>
          <div className="grid grid-cols-2 gap-2 font-mono text-[0.68rem] uppercase text-pf-muted">
            {[
              ["Cell A1", "showCellLabels"],
              ["Name", "showScreenName"],
              ["Res", "showResolution"],
              ["XY", "showCoordinates"],
              ["Cab Info", "showCabinetInfo"],
              ["Circle", "showCircle"],
              ["Diagonal", "showDiagonal"],
              ["Crosshair", "showCenterCrosshair"],
              ["Size", "showSize"],
              ["Position", "showPosition"],
              ["Center Badge", "showScreenIndex"],
              ["Logo", "showLogo"]
            ].map(([label, key]) => (
              <label key={key} className="flex items-center gap-2 border border-pf-border bg-black/30 p-2">
                <input
                  type="checkbox"
                  checked={Boolean(pattern[key as keyof ScreenPatternSettings])}
                  onChange={(event) =>
                    updateScreen(screen.id, {
                      pattern: { ...pattern, [key]: event.target.checked }
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      {screen.type !== "logo" && <CenterLogoControls key={screen.id} screen={screen} />}
      <div className="space-y-3 border border-pf-border bg-black/20 p-3">
        <p className="font-mono text-xs uppercase text-pf-red">Video Overlay & Colors</p>
        <label className="block space-y-1"><span className="technical-label">Overlay Opacity • {Math.round((screen.animation.opacity ?? 0.45) * 100)}%</span>
          <input aria-label="Overlay Opacity" className="w-full" type="range" min={0} max={100} value={Math.round((screen.animation.opacity ?? 0.45) * 100)} onPointerDown={beginTransform} onFocus={beginTransform} onChange={e => { beginTransform(); updateScreen(screen.id, { animation: { ...screen.animation, opacity: Number(e.target.value) / 100 } }); }} onPointerUp={commitTransform} onBlur={commitTransform} onKeyUp={commitTransform} />
        </label>
        <p className="text-xs leading-5 text-pf-muted">0% menyembunyikan efek video. Test card, logo, dan label tetap terlihat.</p>
        <label className="block space-y-2">
          <span className="technical-label">Color Template</span>
          <select
            className="technical-input h-9 text-xs"
            defaultValue=""
            onChange={(event) => {
              const template = animationColorTemplates.find((item) => item.id === event.target.value);
              event.currentTarget.value = "";
              if (!template) {
                return;
              }
              updateScreen(screen.id, {
                fillColor: template.fillColor,
                borderColor: template.borderColor,
                animation: {
                  ...screen.animation,
                  primaryColor: template.primaryColor,
                  secondaryColor: template.secondaryColor
                },
                pattern: {
                  ...pattern,
                  primaryColor: template.primaryColor,
                  secondaryColor: template.secondaryColor
                }
              });
            }}
          >
            <option value="">Apply template...</option>
            {animationColorTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-2">
            <span className="technical-label">Fill</span>
            <input
              className="h-9 w-full border border-pf-border bg-black"
              type="color"
              value={screen.fillColor}
              onChange={(event) =>
                updateScreen(screen.id, {
                  fillColor: event.target.value,
                  pattern: screen.type === "logo" ? pattern : { ...pattern, backgroundColor: event.target.value }
                })
              }
            />
          </label>
          <label className="block space-y-2">
            <span className="technical-label">Border</span>
            <input
              className="h-9 w-full border border-pf-border bg-black"
              type="color"
              value={screen.borderColor}
              onChange={(event) => updateScreen(screen.id, { borderColor: event.target.value })}
            />
          </label>
          <label className="block space-y-2">
            <span className="technical-label">Primary</span>
            <input
              className="h-9 w-full border border-pf-border bg-black"
              type="color"
              value={screen.animation.primaryColor}
              onChange={(event) =>
                updateScreen(screen.id, { animation: { ...screen.animation, primaryColor: event.target.value } })
              }
            />
          </label>
          <label className="block space-y-2">
            <span className="technical-label">Secondary</span>
            <input
              className="h-9 w-full border border-pf-border bg-black"
              type="color"
              value={screen.animation.secondaryColor}
              onChange={(event) =>
                updateScreen(screen.id, { animation: { ...screen.animation, secondaryColor: event.target.value } })
              }
            />
          </label>
        </div>
        <label className="block space-y-2">
          <span className="technical-label">Animation</span>
          <select
            className="technical-input h-9 text-xs"
            value={screen.animation.type}
            onChange={(event) =>
              updateScreen(screen.id, {
                animation: { ...screen.animation, type: event.target.value as AnimationType }
              })
            }
          >
            <option value="none">None</option>
            <option value="wire-tunnel">Wire Tunnel</option>
            <option value="neon-flow">Neon Flow</option>
            <option value="digital-glitch">Digital Glitch</option>
            <option value="slice-chase">Slice Chase</option>
            <option value="slice-bounce">Slice Bounce</option>
            <option value="gradient-wipe">Smooth Gradient Wipe</option>
            <option value="horizontal-wipe">Horizontal Wipe</option>
            <option value="vertical-wipe">Vertical Wipe</option>
            <option value="scanner">Scanner</option>
            <option value="radial-wave">Radial Wave</option>
            <option value="fade-gradient-circle">Fade Gradient Circle</option>
            <option value="pulse">Pulse</option>
            <option value="blink">Blink</option>
            <option value="strobe-sequence">Screen Strobe Sequence</option>
            <option value="strobe-random">Screen Strobe Random</option>
          </select>
        </label>
        {!isStrobeAnimation(screen.animation.type) ? (
          <label className="block space-y-2">
            <span className="technical-label">Direction</span>
            <select
              className="technical-input h-9 text-xs"
              value={screen.animation.direction}
              onChange={(event) =>
                updateScreen(screen.id, {
                  animation: {
                    ...screen.animation,
                    direction: event.target.value as typeof screen.animation.direction
                  }
                })
              }
            >
              <option value="left-to-right">Left to Right</option>
              <option value="right-to-left">Right to Left</option>
              <option value="top-to-bottom">Top to Bottom</option>
              <option value="bottom-to-top">Bottom to Top</option>
            </select>
          </label>
        ) : null}
        <NumericField
          label="Speed"
          value={screen.animation.speed}
          min={0.1}
          step={0.1}
          onPreview={(value) =>
            updateScreen(screen.id, { animation: { ...screen.animation, speed: Math.max(0.1, value) } })
          }
          onCommit={() => undefined}
        />
        {screen.type !== "logo" ? (
          <Button type="button" className="h-10 w-full" onClick={() => applyScreenAnimationToAll(screen.id)}>
            <Sparkles size={14} />
            APPLY EFFECT TO ALL
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button type="button" onClick={() => toggleLock(screen.id)}>
          {screen.locked ? <Unlock size={14} /> : <Lock size={14} />}
          {screen.locked ? "UNLOCK" : "LOCK"}
        </Button>
        <Button type="button" onClick={duplicateSelected}>
          <Copy size={14} />
          DUP
        </Button>
        <Button type="button" variant="danger" onClick={deleteSelected}>
          <Trash2 size={14} />
          DEL
        </Button>
      </div>
    </div>
  );
}
