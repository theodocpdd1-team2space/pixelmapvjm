"use client";

import { useEffect, useRef, useState } from "react";
import { visualTemplates, type VisualTemplate } from "@/features/editor/visual-templates";
import { defaultScreenPattern, type AnimationType } from "@/features/editor/types";
import { createRectangleScreen } from "@/features/editor/screen-factory";
import { drawStageCard, drawStageLabel } from "@/features/editor/stage-visuals";
import { useEditorStore } from "@/stores/editor-store";

function Swatch({ template }: { template: VisualTemplate }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const screen = createRectangleScreen(useEditorStore.getState().canvas, 0);
    Object.assign(screen, { width: 320, height: 180, name: "MAIN SCREEN", x: 0, y: 0, cabinet: { ...screen.cabinet, pixelWidth: 40, pixelHeight: 36 }, pattern: { ...defaultScreenPattern, ...template.pattern, gridSize: 36, labelSize: 16 } });
    drawStageCard(ctx, screen, { ...defaultScreenPattern, ...screen.pattern });
    drawStageLabel(ctx, screen);
  }, [template]);
  return <canvas ref={ref} width={320} height={180} className="mb-2 aspect-video w-full" aria-hidden="true" />;
}

const effects: [AnimationType, string][] = [["gradient-wipe", "Silk Wipe"], ["radial-wave", "Radial Halo"], ["wire-tunnel", "Wire Tunnel"], ["neon-flow", "Neon Flow"], ["digital-glitch", "Digital Glitch"], ["slice-chase", "Slice Chase"], ["slice-bounce", "Slice Bounce"]];

export function VisualLibrary() {
  const [scope, setScope] = useState("all");
  const screens = useEditorStore(s => s.screens);
  const selectedIds = useEditorStore(s => s.selectedIds);
  const targets = screens.filter(s => s.type !== "logo" && (scope === "all" || selectedIds.includes(s.id)));
  function apply(template?: VisualTemplate, effect?: AnimationType) {
    const store = useEditorStore.getState();
    store.beginTransform();
    targets.forEach((screen, index) => store.updateScreen(screen.id, template ? {
      fillColor: template.fillColor, borderColor: template.borderColor,
      pattern: { ...defaultScreenPattern, ...screen.pattern, ...template.pattern, badgeText: String(index + 1) },
      animation: { ...screen.animation, ...template.animation }
    } : {
      animation: { ...screen.animation, type: effect!, opacity: screen.animation.opacity ?? 0.45, speed: 0.6 }
    }));
    store.commitTransform();
    if (effect && !store.previewPlaying) store.togglePreview();
    if (template && store.previewPlaying) store.togglePreview();
  }
  return <div className="space-y-3">
    {!targets.length && <p className="text-xs text-pf-muted">Tambahkan screen atau impor XML, lalu pilih target preset.</p>}
    <label className="block space-y-1"><span className="technical-label">Apply to</span><select className="technical-input" value={scope} onChange={e => setScope(e.target.value)}><option value="all">All screens</option><option value="selected">Selected screens</option></select></label>
    <div className="grid grid-cols-2 gap-2">{visualTemplates.filter(t => ["festival-card", "badge-card", "coordinate-card"].includes(t.pattern.type ?? "")).map(template => <button key={template.id} disabled={!targets.length} onClick={() => apply(template)} className="border border-pf-border bg-black/30 p-2 text-left text-[10px] leading-4 text-pf-muted hover:border-pf-red disabled:opacity-40"><Swatch template={template} />{template.label}</button>)}</div>
    <p className="technical-label">Video overlays</p>
    <div className="grid grid-cols-2 gap-2">{effects.map(([type, label]) => <button key={type} disabled={!targets.length} onClick={() => apply(undefined, type)} className="border border-pf-border p-2 text-xs text-pf-muted hover:border-pf-red disabled:opacity-40">{label}</button>)}</div>
    <p className="text-xs leading-5 text-pf-muted">Efek bergerak di atas test card. Atur Overlay Opacity di inspector; logo dan nama screen tetap di depan.</p>
  </div>;
}
