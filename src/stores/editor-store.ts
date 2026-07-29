"use client";

import { create } from "zustand";
import type {
  EditorCanvasSettings,
  EditorInitialDocument,
  EditorScreen,
  ScreenPatternSettings,
  ScreenAnimationSettings,
  EditorTool,
  HistorySnapshot,
  SaveStatus
} from "@/features/editor/types";
import { duplicateScreen, createCabinetScreen, createLogoScreen, createRectangleScreen } from "@/features/editor/screen-factory";
import { clamp, fitZoom, snapRectToCanvas } from "@/features/editor/geometry";
import { defaultCabinetSettings } from "@/features/editor/cabinet-presets";
import { defaultScreenPattern } from "@/features/editor/types";

const HISTORY_LIMIT = 100;
const defaultAnimationSettings: ScreenAnimationSettings = {
  type: "gradient-wipe",
  primaryColor: "#32D583",
  secondaryColor: "#FF3030",
  speed: 1.25,
  direction: "left-to-right"
};

type EditorStore = {
  projectId: string;
  pageId: string;
  projectName: string;
  pages: EditorInitialDocument["pages"];
  serverUpdatedAt: string;
  canvas: EditorCanvasSettings;
  screens: EditorScreen[];
  selectedIds: string[];
  tool: EditorTool;
  zoom: number;
  pan: { x: number; y: number };
  saveStatus: SaveStatus;
  previewPlaying: boolean;
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];
  transformStart: HistorySnapshot | null;
  loadDocument: (document: EditorInitialDocument) => void;
  getSnapshot: () => HistorySnapshot;
  restoreSnapshot: (snapshot: HistorySnapshot) => void;
  pushHistory: () => void;
  beginTransform: () => void;
  commitTransform: () => void;
  markEditing: () => void;
  setSaveStatus: (status: SaveStatus) => void;
  setTool: (tool: EditorTool) => void;
  setZoom: (zoom: number) => void;
  zoomBy: (delta: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  fitCanvas: (viewportWidth: number, viewportHeight: number) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  togglePreview: () => void;
  addRectangle: () => void;
  addCabinetArray: (cabinet: Parameters<typeof createCabinetScreen>[2]) => void;
  addLogo: (payload: { dataUrl: string; fileName: string; naturalWidth: number; naturalHeight: number }) => void;
  selectScreen: (id: string, additive?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  moveSelected: (dx: number, dy: number) => void;
  updateScreen: (id: string, patch: Partial<EditorScreen>, options?: { snap?: boolean }) => void;
  updateSelected: (patch: Partial<EditorScreen>, options?: { snap?: boolean }) => void;
  renameScreen: (id: string, name: string) => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  toggleLock: (id: string) => void;
  toggleVisibility: (id: string) => void;
  undo: () => void;
  redo: () => void;
};

const emptyCanvas: EditorCanvasSettings = {
  name: "Untitled Page",
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 10,
  backgroundColor: "#000000",
  backgroundTransparent: false,
  gridSize: 64,
  snappingEnabled: true,
  gridVisible: true
};

function cloneSnapshot(snapshot: HistorySnapshot): HistorySnapshot {
  return {
    canvas: { ...snapshot.canvas },
    screens: snapshot.screens.map((screen) => ({ ...screen })),
    selectedIds: [...snapshot.selectedIds]
  };
}

function sameSnapshot(a: HistorySnapshot, b: HistorySnapshot) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeScreenOrder(screens: EditorScreen[]) {
  return screens
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((screen, index) => ({
      ...screen,
      cabinet: screen.cabinet ?? { ...defaultCabinetSettings },
      animation: { ...defaultAnimationSettings, ...screen.animation },
      pattern: { ...defaultScreenPattern, ...(screen.pattern as Partial<ScreenPatternSettings>) },
      zIndex: index
    }));
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  projectId: "",
  pageId: "",
  projectName: "",
  pages: [],
  serverUpdatedAt: "",
  canvas: emptyCanvas,
  screens: [],
  selectedIds: [],
  tool: "select",
  zoom: 0.35,
  pan: { x: 80, y: 80 },
  saveStatus: "LOCAL SAVED",
  previewPlaying: false,
  historyPast: [],
  historyFuture: [],
  transformStart: null,

  loadDocument: (document) =>
    set({
      projectId: document.projectId,
      pageId: document.pageId,
      projectName: document.projectName,
      pages: document.pages,
      serverUpdatedAt: document.serverUpdatedAt,
      canvas: document.canvas,
      screens: normalizeScreenOrder(document.screens),
      selectedIds: [],
      tool: "select",
      saveStatus: "LOCAL SAVED",
      previewPlaying: false,
      historyPast: [],
      historyFuture: [],
      transformStart: null
    }),

  getSnapshot: () => {
    const state = get();
    return cloneSnapshot({
      canvas: state.canvas,
      screens: state.screens,
      selectedIds: state.selectedIds
    });
  },

  restoreSnapshot: (snapshot) =>
    set({
      canvas: { ...snapshot.canvas },
      screens: normalizeScreenOrder(snapshot.screens),
      selectedIds: [...snapshot.selectedIds],
      saveStatus: "EDITING"
    }),

  pushHistory: () =>
    set((state) => ({
      historyPast: [...state.historyPast, cloneSnapshot(get().getSnapshot())].slice(-HISTORY_LIMIT),
      historyFuture: []
    })),

  beginTransform: () =>
    set((state) => ({
      transformStart: state.transformStart ?? cloneSnapshot(get().getSnapshot()),
      saveStatus: "EDITING"
    })),

  commitTransform: () => {
    const state = get();
    if (!state.transformStart) {
      return;
    }

    const current = state.getSnapshot();
    if (sameSnapshot(state.transformStart, current)) {
      set({ transformStart: null });
      return;
    }

    set((existing) => ({
      historyPast: [...existing.historyPast, cloneSnapshot(existing.transformStart as HistorySnapshot)].slice(-HISTORY_LIMIT),
      historyFuture: [],
      transformStart: null,
      saveStatus: "EDITING"
    }));
  },

  markEditing: () => set({ saveStatus: "EDITING" }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setTool: (tool) => set({ tool }),
  setZoom: (zoom) => set({ zoom: clamp(zoom, 0.05, 4) }),
  zoomBy: (delta) => set((state) => ({ zoom: clamp(state.zoom + delta, 0.05, 4) })),
  setPan: (pan) => set({ pan }),
  fitCanvas: (viewportWidth, viewportHeight) =>
    set((state) => {
      const zoom = fitZoom(viewportWidth, viewportHeight, state.canvas);
      return {
        zoom,
        pan: {
          x: Math.round((viewportWidth - state.canvas.width * zoom) / 2),
          y: Math.round((viewportHeight - state.canvas.height * zoom) / 2)
        }
      };
    }),
  toggleGrid: () =>
    set((state) => ({
      canvas: { ...state.canvas, gridVisible: !state.canvas.gridVisible },
      saveStatus: "EDITING"
    })),
  toggleSnap: () =>
    set((state) => ({
      canvas: { ...state.canvas, snappingEnabled: !state.canvas.snappingEnabled },
      saveStatus: "EDITING"
    })),
  togglePreview: () => set((state) => ({ previewPlaying: !state.previewPlaying })),

  addRectangle: () => {
    get().pushHistory();
    set((state) => {
      const screen = createRectangleScreen(state.canvas, state.screens.length);
      return {
        screens: [...state.screens, screen],
        selectedIds: [screen.id],
        saveStatus: "EDITING"
      };
    });
  },

  addCabinetArray: (cabinet) => {
    get().pushHistory();
    set((state) => {
      const screen = createCabinetScreen(state.canvas, state.screens.length, cabinet);
      return { screens: [...state.screens, screen], selectedIds: [screen.id], saveStatus: "EDITING" };
    });
  },

  addLogo: (payload) => {
    get().pushHistory();
    set((state) => {
      const screen = createLogoScreen(
        state.canvas,
        state.screens.length,
        payload.dataUrl,
        payload.fileName,
        payload.naturalWidth,
        payload.naturalHeight
      );
      return {
        screens: [...state.screens, screen],
        selectedIds: [screen.id],
        saveStatus: "EDITING"
      };
    });
  },

  selectScreen: (id, additive = false) =>
    set((state) => {
      if (additive) {
        return {
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((selectedId) => selectedId !== id)
            : [...state.selectedIds, id]
        };
      }

      return { selectedIds: [id] };
    }),
  selectAll: () => set((state) => ({ selectedIds: state.screens.filter((screen) => screen.visible).map((screen) => screen.id) })),
  clearSelection: () => set({ selectedIds: [] }),
  moveSelected: (dx, dy) => {
    const state = get();
    const movableIds = state.selectedIds.filter((id) => {
      const screen = state.screens.find((item) => item.id === id);
      return screen && !screen.locked && screen.visible;
    });

    if (movableIds.length === 0) {
      return;
    }

    get().pushHistory();
    set((current) => ({
      screens: current.screens.map((screen) => {
        if (!movableIds.includes(screen.id)) {
          return screen;
        }

        const snapped = snapRectToCanvas(
          {
            x: screen.x + dx,
            y: screen.y + dy,
            width: screen.width,
            height: screen.height
          },
          current.canvas
        );

        return {
          ...screen,
          x: snapped.x,
          y: snapped.y,
          width: snapped.width,
          height: snapped.height
        };
      }),
      saveStatus: "EDITING"
    }));
  },

  updateScreen: (id, patch, options) =>
    set((state) => ({
      screens: state.screens.map((screen) => {
        if (screen.id !== id) {
          return screen;
        }

        const next = { ...screen, ...patch };
        if (options?.snap) {
          const snapped = snapRectToCanvas(next, state.canvas);
          next.x = snapped.x;
          next.y = snapped.y;
          next.width = Math.max(state.canvas.gridSize, snapped.width);
          next.height = Math.max(state.canvas.gridSize, snapped.height);
        }

        return next;
      }),
      saveStatus: "EDITING"
    })),

  updateSelected: (patch, options) => {
    const selectedIds = get().selectedIds;
    selectedIds.forEach((id) => get().updateScreen(id, patch, options));
  },

  renameScreen: (id, name) => {
    get().pushHistory();
    get().updateScreen(id, { name });
  },

  duplicateSelected: () => {
    const state = get();
    const selected = state.screens.filter((screen) => state.selectedIds.includes(screen.id));
    if (selected.length === 0) {
      return;
    }

    get().pushHistory();
    set((current) => {
      const duplicates = selected.map((screen, index) => duplicateScreen(screen, current.screens.length + index));
      return {
        screens: normalizeScreenOrder([...current.screens, ...duplicates]),
        selectedIds: duplicates.map((screen) => screen.id),
        saveStatus: "EDITING"
      };
    });
  },

  deleteSelected: () => {
    const state = get();
    if (state.selectedIds.length === 0) {
      return;
    }

    get().pushHistory();
    set((current) => ({
      screens: normalizeScreenOrder(current.screens.filter((screen) => !current.selectedIds.includes(screen.id))),
      selectedIds: [],
      saveStatus: "EDITING"
    }));
  },

  toggleLock: (id) => {
    get().pushHistory();
    set((state) => ({
      screens: state.screens.map((screen) =>
        screen.id === id ? { ...screen, locked: !screen.locked } : screen
      ),
      saveStatus: "EDITING"
    }));
  },

  toggleVisibility: (id) => {
    get().pushHistory();
    set((state) => ({
      screens: state.screens.map((screen) =>
        screen.id === id ? { ...screen, visible: !screen.visible } : screen
      ),
      selectedIds: state.selectedIds.filter((selectedId) => {
        const target = state.screens.find((screen) => screen.id === id);
        return selectedId !== id || target?.visible === false;
      }),
      saveStatus: "EDITING"
    }));
  },

  undo: () => {
    const state = get();
    const previous = state.historyPast.at(-1);
    if (!previous) {
      return;
    }

    const current = state.getSnapshot();
    set({
      canvas: previous.canvas,
      screens: previous.screens,
      selectedIds: previous.selectedIds,
      historyPast: state.historyPast.slice(0, -1),
      historyFuture: [current, ...state.historyFuture].slice(0, HISTORY_LIMIT),
      saveStatus: "EDITING"
    });
  },

  redo: () => {
    const state = get();
    const next = state.historyFuture[0];
    if (!next) {
      return;
    }

    const current = state.getSnapshot();
    set({
      canvas: next.canvas,
      screens: next.screens,
      selectedIds: next.selectedIds,
      historyPast: [...state.historyPast, current].slice(-HISTORY_LIMIT),
      historyFuture: state.historyFuture.slice(1),
      saveStatus: "EDITING"
    });
  }
}));
