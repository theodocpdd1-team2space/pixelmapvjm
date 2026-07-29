"use client";

import { useState } from "react";
import { SectionHeading } from "@/components/ui/section-heading";

type LocalProject = {
  id: string;
  name: string;
  updatedAt?: string;
  pageCount?: number;
};

export function LocalProjectsPanel() {
  const [projects] = useState<LocalProject[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = window.localStorage.getItem("pixelmapvjm.localProjects");

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  return (
    <section className="technical-panel p-5">
      <SectionHeading code="LOCAL" title="Local Projects" />
      <div className="mt-4 space-y-3">
        {projects.length > 0 ? (
          projects.map((project) => (
            <div key={project.id} className="border border-pf-border bg-black/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold uppercase">{project.name}</p>
                <span className="font-mono text-xs text-pf-muted">{project.pageCount ?? 0} PAGE</span>
              </div>
              <p className="mt-2 font-mono text-xs text-pf-muted">{project.updatedAt ?? "LOCAL INDEX"}</p>
            </div>
          ))
        ) : (
          <p className="font-mono text-xs uppercase leading-6 text-pf-muted">
            No browser-local project index detected yet. Cloud records remain available below.
          </p>
        )}
      </div>
    </section>
  );
}
