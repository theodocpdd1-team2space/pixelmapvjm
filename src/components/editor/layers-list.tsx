"use client";
import { Copy, Eye, EyeOff, Lock, Trash2, Unlock } from "lucide-react";
import type { EditorScreen } from "@/features/editor/types";
import { useEditorStore } from "@/stores/editor-store";

function LayerNameInput({ screen }: { screen: EditorScreen }) {
  const renameScreen = useEditorStore((state) => state.renameScreen);

  return (
    <input
      key={screen.name}
      className="min-w-0 flex-1 bg-transparent font-mono text-xs uppercase text-pf-text outline-none"
      defaultValue={screen.name}
      onBlur={(event) => {
        const next = event.currentTarget.value.trim();
        if (next && next !== screen.name) {
          renameScreen(screen.id, next);
        } else {
          event.currentTarget.value = screen.name;
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export function LayersList() {
  const screens = useEditorStore((state) => state.screens);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const selectScreen = useEditorStore((state) => state.selectScreen);
  const toggleVisibility = useEditorStore((state) => state.toggleVisibility);
  const toggleLock = useEditorStore((state) => state.toggleLock);
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);

  const ordered = screens.slice().sort((a, b) => b.zIndex - a.zIndex);

  if (ordered.length === 0) {
    return (
      <div className="border border-pf-border bg-black/25 p-3 font-mono text-xs uppercase leading-6 text-pf-muted">
        Layer stack empty. Add a rectangle screen to begin.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {ordered.map((screen) => {
        const selected = selectedIds.includes(screen.id);
        return (
          <div
            key={screen.id}
            className={`flex items-center gap-2 border bg-black/25 p-2 ${
              selected ? "border-pf-red" : "border-pf-border"
            } ${screen.visible ? "" : "opacity-55"}`}
            onClick={(event) => {
              const additive = event.shiftKey || event.metaKey || event.ctrlKey;
              selectScreen(screen.id, additive);
            }}
          >
            <button
              className="grid h-7 w-7 place-items-center border border-pf-border text-pf-muted hover:border-pf-red hover:text-pf-text"
              aria-label="Toggle visibility"
              onClick={(event) => {
                event.stopPropagation();
                toggleVisibility(screen.id);
              }}
            >
              {screen.visible ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
            <button
              className="grid h-7 w-7 place-items-center border border-pf-border text-pf-muted hover:border-pf-red hover:text-pf-text"
              aria-label="Toggle lock"
              onClick={(event) => {
                event.stopPropagation();
                toggleLock(screen.id);
              }}
            >
              {screen.locked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
            <span className="h-3 w-3 border border-pf-red bg-pf-darkRed" />
            <LayerNameInput screen={screen} />
            {selected ? (
              <div className="flex items-center gap-1">
                <button
                  className="grid h-7 w-7 place-items-center border border-pf-border text-pf-muted hover:border-pf-red hover:text-pf-text"
                  aria-label="Duplicate layer"
                  onClick={(event) => {
                    event.stopPropagation();
                    duplicateSelected();
                  }}
                >
                  <Copy size={13} />
                </button>
                <button
                  className="grid h-7 w-7 place-items-center border border-pf-darkRed text-pf-muted hover:border-pf-red hover:text-pf-text"
                  aria-label="Delete layer"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteSelected();
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
