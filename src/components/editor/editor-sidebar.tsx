"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { LayersList } from "@/components/editor/layers-list";
import { ExportPanel } from "@/components/editor/export-panel";
import { LogoUploader } from "@/components/editor/logo-uploader";
import { NumericField } from "@/components/editor/numeric-field";
import { ScreenInspector } from "@/components/editor/screen-inspector";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { visualTemplates } from "@/features/editor/visual-templates";
import { useEditorStore } from "@/stores/editor-store";

export function EditorSidebar({
  collapsed,
  onToggleCollapse
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const projectId = useEditorStore((state) => state.projectId);
  const pageId = useEditorStore((state) => state.pageId);
  const projectName = useEditorStore((state) => state.projectName);
  const pages = useEditorStore((state) => state.pages);
  const canvas = useEditorStore((state) => state.canvas);
  const screens = useEditorStore((state) => state.screens);
  const addRectangle = useEditorStore((state) => state.addRectangle);
  const applyVisualTemplateToPage = useEditorStore((state) => state.applyVisualTemplateToPage);
  const beginTransform = useEditorStore((state) => state.beginTransform);
  const commitTransform = useEditorStore((state) => state.commitTransform);
  const updateCanvas = useEditorStore((state) => state.updateCanvas);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const historyPast = useEditorStore((state) => state.historyPast);
  const historyFuture = useEditorStore((state) => state.historyFuture);

  if (collapsed) {
    return (
      <aside className="flex h-full flex-col items-center gap-4 py-3">
        <button
          className="grid h-8 w-8 place-items-center border border-pf-border text-pf-muted hover:border-pf-red hover:text-pf-text"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
        >
          <ChevronRight size={15} />
        </button>
        <div className="font-brand text-sm uppercase [writing-mode:vertical-rl]">
          Pixel<span className="text-pf-red">MapVJM</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex h-14 items-center justify-between border-b border-pf-border px-4">
        <Link href="/dashboard" className="font-brand text-lg font-bold uppercase">
          Pixel<span className="text-pf-red">MapVJM</span>
        </Link>
        <button
          className="grid h-8 w-8 place-items-center border border-pf-border text-pf-muted hover:border-pf-red hover:text-pf-text"
          onClick={onToggleCollapse}
          aria-label="Collapse sidebar"
        >
          <ChevronLeft size={15} />
        </button>
      </div>
      <div className="min-h-0 min-w-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto p-4">
        <section>
          <SectionHeading code="01" title="Project" />
          <div className="mt-4 space-y-3">
            <p className="font-mono text-xs uppercase text-pf-text">{projectName}</p>
            <Link
              href={`/dashboard/projects/${projectId}`}
              className="block border border-pf-border px-3 py-2 text-center font-mono text-xs uppercase text-pf-muted hover:border-pf-red hover:text-pf-text"
            >
              Manage Project
            </Link>
          </div>
        </section>

        <section>
          <SectionHeading code="02" title="Pages" />
          <select
            className="technical-input mt-4 h-10 text-xs"
            value={pageId}
            onChange={(event) => {
              window.location.href = `/editor/${projectId}/${event.target.value}`;
            }}
          >
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name} / {page.width}x{page.height}
              </option>
            ))}
          </select>
        </section>

        <section>
          <SectionHeading code="03" title="Layers" />
          <div className="mt-4">
            <LayersList />
          </div>
        </section>

        <section>
          <SectionHeading code="04" title="Canvas" />
          <div className="mt-4 space-y-3">
            <label className="block space-y-2">
              <span className="technical-label">Page Name</span>
              <input
                className="technical-input h-9 text-xs"
                value={canvas.name}
                onFocus={beginTransform}
                onChange={(event) => updateCanvas({ name: event.target.value })}
                onBlur={commitTransform}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <NumericField
                label="Width"
                value={canvas.width}
                min={1}
                onPreview={(value) => {
                  beginTransform();
                  updateCanvas({ width: value });
                }}
                onCommit={commitTransform}
              />
              <NumericField
                label="Height"
                value={canvas.height}
                min={1}
                onPreview={(value) => {
                  beginTransform();
                  updateCanvas({ height: value });
                }}
                onCommit={commitTransform}
              />
              <NumericField
                label="FPS"
                value={canvas.fps}
                min={1}
                onPreview={(value) => {
                  beginTransform();
                  updateCanvas({ fps: value });
                }}
                onCommit={commitTransform}
              />
              <NumericField
                label="Duration"
                value={canvas.duration}
                min={1}
                step={0.5}
                onPreview={(value) => {
                  beginTransform();
                  updateCanvas({ duration: value });
                }}
                onCommit={commitTransform}
              />
              <NumericField
                label="Grid"
                value={canvas.gridSize}
                min={1}
                onPreview={(value) => {
                  beginTransform();
                  updateCanvas({ gridSize: value });
                }}
                onCommit={commitTransform}
              />
              <label className="block space-y-1">
                <span className="technical-label">Background</span>
                <input
                  className="h-9 w-full border border-pf-border bg-black"
                  type="color"
                  value={canvas.backgroundColor}
                  onFocus={beginTransform}
                  onChange={(event) => updateCanvas({ backgroundColor: event.target.value })}
                  onBlur={commitTransform}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[0.68rem] uppercase text-pf-muted">
              <label className="flex items-center gap-2 border border-pf-border bg-black/30 p-2">
                <input
                  type="checkbox"
                  checked={canvas.backgroundTransparent}
                  onChange={(event) => {
                    beginTransform();
                    updateCanvas({ backgroundTransparent: event.target.checked });
                    commitTransform();
                  }}
                />
                Transparent
              </label>
              <label className="flex items-center gap-2 border border-pf-border bg-black/30 p-2">
                <input
                  type="checkbox"
                  checked={canvas.snappingEnabled}
                  onChange={(event) => {
                    beginTransform();
                    updateCanvas({ snappingEnabled: event.target.checked });
                    commitTransform();
                  }}
                />
                Snap
              </label>
              <label className="flex items-center gap-2 border border-pf-border bg-black/30 p-2">
                <input
                  type="checkbox"
                  checked={canvas.gridVisible}
                  onChange={(event) => {
                    beginTransform();
                    updateCanvas({ gridVisible: event.target.checked });
                    commitTransform();
                  }}
                />
                Grid
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["FHD", 1920, 1080],
                ["UHD", 3840, 2160],
                ["4K DCI", 4096, 2160],
                ["ULTRA WIDE", 7680, 1080]
              ].map(([label, width, height]) => (
                <button
                  key={String(label)}
                  type="button"
                  className="border border-pf-border bg-black/30 px-2 py-2 font-mono text-[0.65rem] uppercase text-pf-muted hover:border-pf-red hover:text-pf-text"
                  onClick={() => {
                    beginTransform();
                    updateCanvas({ width: Number(width), height: Number(height) });
                    commitTransform();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <SectionHeading code="05" title="Screen" />
          <div className="mt-4">
            <Button type="button" variant="primary" className="h-12 w-full" onClick={addRectangle}>
              <Plus size={16} />
              ADD SCREEN
            </Button>
          </div>
          <div className="mt-3">
            <LogoUploader />
          </div>
          <button
            type="button"
            className="mt-3 w-full border border-pf-border bg-black/30 px-3 py-2 font-mono text-xs uppercase text-pf-muted hover:border-pf-red hover:text-pf-text"
            onClick={() => applyVisualTemplateToPage(visualTemplates[0])}
          >
            Clean Output Colors
          </button>
          <div className="mt-4">
            <ScreenInspector />
          </div>
        </section>

        <section>
          <SectionHeading code="06" title="History" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button type="button" onClick={undo} disabled={historyPast.length === 0}>
              UNDO
            </Button>
            <Button type="button" onClick={redo} disabled={historyFuture.length === 0}>
              REDO
            </Button>
          </div>
        </section>

        <section className="pb-4">
          <SectionHeading code="07" title="Export" />
          <div className="mt-4">
            <ExportPanel />
          </div>
        </section>

        <section className="pb-4">
          <SectionHeading code="08" title="Engine" />
          <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs uppercase text-pf-muted">
            <div className="border border-pf-border bg-black/25 p-3">
              <span>Screens</span>
              <p className="mt-1 text-pf-text">{screens.length}</p>
            </div>
            <div className="border border-pf-border bg-black/25 p-3">
              <span>Mode</span>
              <p className="mt-1 text-pf-text">Local</p>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
