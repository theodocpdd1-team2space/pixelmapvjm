"use client";

import { useEffect, useRef, useState } from "react";

export function NumericField({
  label,
  value,
  min,
  step = 1,
  onCommit,
  onPreview
}: {
  label: string;
  value: number;
  min?: number;
  step?: number;
  onPreview: (value: number) => void;
  onCommit: () => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) {
      setDraft(String(value));
    }
  }, [value]);

  function commitDraft() {
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) {
      const next = min === undefined ? parsed : Math.max(min, parsed);
      setDraft(String(next));
      onPreview(next);
    } else {
      setDraft(String(value));
    }
    editingRef.current = false;
    onCommit();
  }

  return (
    <label className="block space-y-1">
      <span className="technical-label">{label}</span>
      <input
        className="technical-input h-9 min-w-0 px-2 py-1 text-xs"
        inputMode="decimal"
        value={draft}
        min={min}
        step={step}
        type="text"
        onFocus={(event) => {
          editingRef.current = true;
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          const next = Number(nextDraft);
          if (nextDraft.trim() !== "" && Number.isFinite(next)) {
            onPreview(next);
          }
        }}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            setDraft(String(value));
            editingRef.current = false;
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
