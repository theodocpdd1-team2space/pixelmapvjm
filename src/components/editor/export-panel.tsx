"use client";

import { useState } from "react";
import { Download, Film, ImageDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportImage, exportMp4 } from "@/features/editor/render-service";
import { useEditorStore } from "@/stores/editor-store";

export function ExportPanel() {
  const canvas = useEditorStore((state) => state.canvas);
  const screens = useEditorStore((state) => state.screens);
  const [status, setStatus] = useState("READY");
  const [busy, setBusy] = useState(false);
  const [fps, setFps] = useState(60);
  const [duration, setDuration] = useState(Math.min(canvas.duration, 10));

  async function runExport(kind: "png" | "jpeg" | "mp4") {
    setBusy(true);
    setStatus(kind === "mp4" ? "ENCODING MP4 FRAME 0000" : "RENDERING IMAGE");

    try {
      if (kind === "mp4") {
        await exportMp4(canvas, screens, ({ frame, totalFrames, percent }) => {
          setStatus(`ENCODING FRAME ${String(frame).padStart(4, "0")} / ${String(totalFrames).padStart(4, "0")} - ${percent}%`);
        }, { fps, duration });
      } else {
        await exportImage(canvas, screens, kind);
        setStatus(`${kind.toUpperCase()} EXPORTED`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "EXPORT FAILED");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" disabled={busy} onClick={() => void runExport("png")}>
          <ImageDown size={14} />
          PNG
        </Button>
        <Button type="button" disabled={busy} onClick={() => void runExport("jpeg")}>
          <Download size={14} />
          JPEG
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="technical-label">Video FPS</span>
          <select
            className="technical-input h-9 text-xs"
            value={fps}
            onChange={(event) => setFps(Number(event.target.value))}
          >
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="technical-label">Duration</span>
          <input
            className="technical-input h-9 text-xs"
            type="number"
            min={1}
            max={30}
            value={duration}
            onChange={(event) => setDuration(Math.min(30, Math.max(1, Number(event.target.value) || 1)))}
          />
        </label>
      </div>
      <Button type="button" disabled={busy} variant="primary" className="w-full" onClick={() => void runExport("mp4")}>
        <Film size={14} />
        MP4 VIDEO
      </Button>
      <p className="border border-pf-border bg-black/25 p-2 font-mono text-[0.68rem] uppercase leading-5 text-pf-muted">
        {status}
      </p>
    </div>
  );
}
