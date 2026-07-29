"use client";

import { Grid2X2, Hand, Loader2, Magnet, Maximize2, MousePointer2, Play, Save, ZoomIn, ZoomOut } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";

export function EditorToolbar({ viewport, onSave }: { viewport: { width: number; height: number }; onSave: () => void }) {
  const tool = useEditorStore((state) => state.tool);
  const zoom = useEditorStore((state) => state.zoom);
  const gridVisible = useEditorStore((state) => state.canvas.gridVisible);
  const snappingEnabled = useEditorStore((state) => state.canvas.snappingEnabled);
  const previewPlaying = useEditorStore((state) => state.previewPlaying);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const setTool = useEditorStore((state) => state.setTool);
  const zoomBy = useEditorStore((state) => state.zoomBy);
  const fitCanvas = useEditorStore((state) => state.fitCanvas);
  const toggleGrid = useEditorStore((state) => state.toggleGrid);
  const toggleSnap = useEditorStore((state) => state.toggleSnap);
  const togglePreview = useEditorStore((state) => state.togglePreview);
  const isSaving = saveStatus === "SAVING LOCAL" || saveStatus === "SYNCING CLOUD";

  const iconButton =
    "grid h-8 w-8 place-items-center border bg-pf-panel text-pf-muted hover:border-pf-red hover:text-pf-text";
  const active = "border-pf-red text-pf-red";
  const idle = "border-pf-border";

  return (
    <header className="flex min-w-0 items-center justify-between border-b border-pf-border bg-pf-sidebar px-3">
      <div className="flex items-center gap-2">
        <button
          className={`${iconButton} ${tool === "select" ? active : idle}`}
          title="Select"
          aria-label="Select tool"
          onClick={() => setTool("select")}
        >
          <MousePointer2 size={15} />
        </button>
        <button
          className={`${iconButton} ${tool === "hand" ? active : idle}`}
          title="Hand"
          aria-label="Hand tool"
          onClick={() => setTool("hand")}
        >
          <Hand size={15} />
        </button>
        <span className="mx-2 h-5 border-l border-pf-border" />
        <button className={`${iconButton} ${idle}`} title="Zoom out" aria-label="Zoom out" onClick={() => zoomBy(-0.05)}>
          <ZoomOut size={15} />
        </button>
        <span className="min-w-16 border border-pf-border bg-black px-2 py-1 text-center font-mono text-xs text-pf-text">
          {Math.round(zoom * 100)}%
        </span>
        <button className={`${iconButton} ${idle}`} title="Zoom in" aria-label="Zoom in" onClick={() => zoomBy(0.05)}>
          <ZoomIn size={15} />
        </button>
        <button
          className={`${iconButton} ${idle}`}
          title="Fit canvas"
          aria-label="Fit canvas"
          onClick={() => fitCanvas(viewport.width, viewport.height)}
        >
          <Maximize2 size={15} />
        </button>
        <span className="mx-2 h-5 border-l border-pf-border" />
        <button
          className={`${iconButton} ${gridVisible ? active : idle}`}
          title="Grid"
          aria-label="Toggle grid"
          onClick={toggleGrid}
        >
          <Grid2X2 size={15} />
        </button>
        <button
          className={`${iconButton} ${snappingEnabled ? active : idle}`}
          title="Snap"
          aria-label="Toggle snap"
          onClick={toggleSnap}
        >
          <Magnet size={15} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="inline-flex h-8 min-w-20 items-center justify-center gap-2 border border-pf-red bg-pf-red px-3 font-mono text-xs uppercase text-black hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          title="Save"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
        <button
          className={`inline-flex h-8 items-center gap-2 border bg-black px-3 font-mono text-xs uppercase hover:border-pf-red hover:text-pf-text ${
            previewPlaying ? "border-pf-red text-pf-red" : "border-pf-border text-pf-muted"
          }`}
          title="Preview"
          onClick={togglePreview}
        >
          <Play size={14} />
          Preview
        </button>
      </div>
    </header>
  );
}
