"use client";

import { useEffect, useRef, useState } from "react";
import { EditorCanvas } from "@/components/editor/editor-canvas";
import { EditorSidebar } from "@/components/editor/editor-sidebar";
import { EditorStatusBar } from "@/components/editor/editor-status-bar";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import type { EditorInitialDocument } from "@/features/editor/types";
import { useLocalPageAutosave } from "@/hooks/use-local-page-autosave";
import { useEditorStore } from "@/stores/editor-store";

export function EditorWorkspace({ initialDocument }: { initialDocument: EditorInitialDocument }) {
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [collapsed, setCollapsed] = useState(false);
  const [viewport, setViewport] = useState({ width: 1000, height: 700 });
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);
  const fittedDocumentRef = useRef<string | null>(null);
  const loadDocument = useEditorStore((state) => state.loadDocument);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const selectAll = useEditorStore((state) => state.selectAll);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const moveSelected = useEditorStore((state) => state.moveSelected);
  const fitCanvas = useEditorStore((state) => state.fitCanvas);
  const setTool = useEditorStore((state) => state.setTool);

  useEffect(() => {
    loadDocument(initialDocument);
  }, [initialDocument, loadDocument]);

  useEffect(() => {
    const documentKey = `${initialDocument.projectId}:${initialDocument.pageId}`;
    if (fittedDocumentRef.current === documentKey || viewport.width < 100 || viewport.height < 100) {
      return;
    }

    fittedDocumentRef.current = documentKey;
    window.requestAnimationFrame(() => fitCanvas(viewport.width, viewport.height));
  }, [fitCanvas, initialDocument.pageId, initialDocument.projectId, viewport.height, viewport.width]);

  const { saveNow } = useLocalPageAutosave(initialDocument);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!resizeStartRef.current) {
        return;
      }

      const delta = event.clientX - resizeStartRef.current.x;
      setSidebarWidth(Math.min(Math.max(resizeStartRef.current.width + delta, 280), 460));
    }

    function handlePointerUp() {
      resizeStartRef.current = null;
      window.requestAnimationFrame(() => fitCanvas(viewport.width, viewport.height));
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [fitCanvas, viewport.height, viewport.width]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if (isTyping) {
        return;
      }

      const mod = event.metaKey || event.ctrlKey;

      if (event.key === "v" || event.key === "V") {
        setTool("select");
      } else if (event.key === "h" || event.key === "H") {
        setTool("hand");
      } else if (event.key === "f" || event.key === "F") {
        fitCanvas(viewport.width, viewport.height);
      } else if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      } else if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveNow();
      } else if (mod && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        deleteSelected();
      } else if (mod && event.key.toLowerCase() === "a") {
        event.preventDefault();
        selectAll();
      } else if (event.key === "Escape") {
        clearSelection();
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        const amount = event.shiftKey ? 10 : 1;
        const dx = event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0;
        const dy = event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0;
        moveSelected(dx, dy);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    clearSelection,
    deleteSelected,
    duplicateSelected,
    fitCanvas,
    moveSelected,
    redo,
    saveNow,
    selectAll,
    setTool,
    undo,
    viewport.height,
    viewport.width
  ]);

  return (
    <main className="h-screen overflow-hidden bg-pf-bg text-pf-text">
      <div className="hidden h-full min-[900px]:grid" style={{ gridTemplateColumns: `${collapsed ? 48 : sidebarWidth}px 1fr` }}>
        <div className="relative min-h-0 min-w-0 overflow-hidden border-r border-pf-border bg-pf-sidebar">
          <EditorSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((value) => !value)} />
          {!collapsed ? (
            <button
              className="absolute right-[-5px] top-0 h-full w-2 cursor-col-resize border-x border-transparent hover:border-pf-red"
              aria-label="Resize sidebar"
              onPointerDown={(event) => {
                resizeStartRef.current = { x: event.clientX, width: sidebarWidth };
              }}
            />
          ) : null}
        </div>
        <section className="grid min-w-0 grid-rows-[48px_1fr_32px]">
          <EditorToolbar viewport={viewport} onSave={() => void saveNow()} />
          <EditorCanvas onViewportChange={setViewport} />
          <EditorStatusBar />
        </section>
      </div>
      <div className="grid h-full place-items-center p-6 min-[900px]:hidden">
        <div className="max-w-md border border-pf-border bg-pf-panel p-6 text-center">
          <p className="font-brand text-xl uppercase text-pf-text">PixelMapVJM Editor</p>
          <p className="mt-4 font-mono text-xs uppercase leading-6 text-pf-muted">
            Desktop or laptop viewport recommended. Mobile preview/read-only mode will be expanded after the core editor.
          </p>
        </div>
      </div>
    </main>
  );
}
