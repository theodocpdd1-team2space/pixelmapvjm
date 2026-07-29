"use client";

import { useEffect, useRef } from "react";
import { loadLocalPage, saveLocalPage } from "@/db/local-project-repository";
import type { EditorInitialDocument } from "@/features/editor/types";
import { useEditorStore } from "@/stores/editor-store";

export function useLocalPageAutosave(initialDocument: EditorInitialDocument) {
  const loadedLocalRef = useRef(false);
  const projectId = useEditorStore((state) => state.projectId);
  const pageId = useEditorStore((state) => state.pageId);
  const projectName = useEditorStore((state) => state.projectName);
  const pages = useEditorStore((state) => state.pages);
  const canvas = useEditorStore((state) => state.canvas);
  const screens = useEditorStore((state) => state.screens);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const loadDocument = useEditorStore((state) => state.loadDocument);
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus);

  useEffect(() => {
    if (loadedLocalRef.current) {
      return;
    }

    loadedLocalRef.current = true;
    void loadLocalPage(initialDocument.pageId).then((localPage) => {
      if (!localPage || localPage.updatedAt <= initialDocument.serverUpdatedAt) {
        return;
      }

      loadDocument({
        ...initialDocument,
        canvas: localPage.projectJson.page.canvas,
        screens: localPage.projectJson.page.screens,
        serverUpdatedAt: localPage.updatedAt
      });
      setSaveStatus("LOCAL SAVED");
    });
  }, [initialDocument, loadDocument, setSaveStatus]);

  useEffect(() => {
    if (!projectId || !pageId || saveStatus !== "EDITING") {
      return;
    }

    const timer = window.setTimeout(() => {
      setSaveStatus("SAVING LOCAL");
      void saveLocalPage(
        {
          id: pageId,
          projectId,
          name: canvas.name,
          width: canvas.width,
          height: canvas.height,
          fps: canvas.fps,
          duration: canvas.duration,
          projectJson: {
            app: "PixelMapVJM",
            format: "pixelmapvjm-project",
            schemaVersion: 1,
            version: 1,
            page: {
              name: canvas.name,
              canvas,
              screens,
              animationSettings: { pattern: "none" }
            }
          },
          updatedAt: new Date().toISOString()
        },
        projectName,
        pages.length
      )
        .then(() => setSaveStatus("LOCAL SAVED"))
        .catch(() => setSaveStatus("SYNC FAILED - LOCAL COPY SAFE"));
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [canvas, pageId, pages.length, projectId, projectName, saveStatus, screens, setSaveStatus]);
}
