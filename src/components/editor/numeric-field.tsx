"use client";

import { useEffect, useRef, useState } from "react";

export function NumericField({
  label,
  value,
  min,
  step = 1,
  integer = false,
  onCommit,
  onPreview
}: {
  label: string;
  value: number;
  min?: number;
  step?: number;
  integer?: boolean;
  onPreview: (value: number) => void;
  onCommit: (value?: number) => void;
}) {
  const [draft, setDraft] = useState(formatValue(value, integer));
  const editingRef = useRef(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) {
      setDraft(formatValue(value, integer));
    }
  }, [integer, value]);

  function normalizeValue(nextValue: number) {
    const rounded = integer ? Math.round(nextValue) : nextValue;
    return min === undefined ? rounded : Math.max(min, rounded);
  }

  function commitDraft() {
    if (cancelRef.current) {
      cancelRef.current = false;
      editingRef.current = false;
      setDraft(formatValue(value, integer));
      return;
    }

    const parsed = Number(draft);
    if (Number.isFinite(parsed)) {
      const next = normalizeValue(parsed);
      setDraft(formatValue(next, integer));
      onPreview(next);
      onCommit(next);
    } else {
      setDraft(formatValue(value, integer));
      onCommit();
    }
    editingRef.current = false;
  }

  return (
    <label className="block space-y-1">
      <span className="technical-label">{label}</span>
      <input
        className="technical-input h-9 min-w-0 px-2 py-1 text-xs"
        inputMode={integer ? "numeric" : "decimal"}
        value={draft}
        min={min}
        step={step}
        type="text"
        onFocus={(event) => {
          editingRef.current = true;
          cancelRef.current = false;
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          const next = Number(nextDraft);
          if (nextDraft.trim() !== "" && Number.isFinite(next)) {
            onPreview(normalizeValue(next));
          }
        }}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            cancelRef.current = true;
            setDraft(formatValue(value, integer));
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function formatValue(value: number, integer: boolean) {
  return String(integer ? Math.round(value) : value);
}
