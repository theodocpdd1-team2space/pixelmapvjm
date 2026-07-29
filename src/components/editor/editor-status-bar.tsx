"use client";

import { useEditorStore } from "@/stores/editor-store";

export function EditorStatusBar() {
  const canvas = useEditorStore((state) => state.canvas);
  const zoom = useEditorStore((state) => state.zoom);
  const screens = useEditorStore((state) => state.screens);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const previewPlaying = useEditorStore((state) => state.previewPlaying);

  return (
    <footer className="flex min-w-0 items-center justify-between border-t border-pf-border bg-pf-sidebar px-3 font-mono text-[0.68rem] uppercase text-pf-muted">
      <div className="flex items-center gap-4">
        <span>CANVAS {canvas.width}x{canvas.height}</span>
        <span>ZOOM {Math.round(zoom * 100)}%</span>
        <span>SCREENS {screens.length}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className={saveStatus.includes("FAILED") ? "text-pf-warning" : "text-pf-success"}>{saveStatus}</span>
        <span>{previewPlaying ? "PREVIEW RUNNING" : "ENGINE READY"}</span>
      </div>
    </footer>
  );
}
