"use client";

import dynamic from "next/dynamic";
import type { EditorInitialDocument } from "@/features/editor/types";

const EditorWorkspace = dynamic(() => import("@/components/editor/editor-workspace").then((mod) => mod.EditorWorkspace), {
  ssr: false,
  loading: () => (
    <main className="grid h-screen place-items-center bg-pf-bg text-pf-text">
      <div className="border border-pf-border bg-pf-panel p-6 font-mono text-xs uppercase text-pf-muted">
        Loading local canvas engine
      </div>
    </main>
  )
});

export function EditorClient({ initialDocument }: { initialDocument: EditorInitialDocument }) {
  return <EditorWorkspace initialDocument={initialDocument} />;
}
