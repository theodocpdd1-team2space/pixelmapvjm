"use client";

import Dexie, { type Table } from "dexie";
import type { EditorCanvasSettings, EditorScreen } from "@/features/editor/types";

export type LocalProjectRecord = {
  id: string;
  name: string;
  updatedAt: string;
  pageCount: number;
  mode: "LOCAL_ONLY" | "CLOUD_SYNCED";
};

export type LocalPageRecord = {
  id: string;
  projectId: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  projectJson: {
    app: "PixelMapVJM";
    format: "pixelmapvjm-project";
    schemaVersion: number;
    version: 1;
    page: {
      name: string;
      canvas: EditorCanvasSettings;
      screens: EditorScreen[];
      animationSettings: Record<string, unknown>;
    };
  };
  updatedAt: string;
};

export type LocalAssetRecord = {
  id: string;
  projectId: string;
  pageId?: string;
  kind: string;
  blob: Blob;
  createdAt: string;
};

export type RenderJobRecord = {
  id: string;
  projectId: string;
  pageId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PreferenceRecord = {
  key: string;
  value: unknown;
};

export type AutosaveSnapshotRecord = {
  id: string;
  projectId: string;
  pageId: string;
  projectJson: LocalPageRecord["projectJson"];
  createdAt: string;
};

class PixelMapVjmLocalDb extends Dexie {
  localProjects!: Table<LocalProjectRecord, string>;
  localPages!: Table<LocalPageRecord, string>;
  localAssets!: Table<LocalAssetRecord, string>;
  renderJobs!: Table<RenderJobRecord, string>;
  preferences!: Table<PreferenceRecord, string>;
  autosaveSnapshots!: Table<AutosaveSnapshotRecord, string>;

  constructor() {
    super("pixelmapvjm");
    this.version(1).stores({
      localProjects: "id, updatedAt, mode",
      localPages: "id, projectId, updatedAt",
      localAssets: "id, projectId, pageId, kind, createdAt",
      renderJobs: "id, projectId, pageId, status, updatedAt",
      preferences: "key",
      autosaveSnapshots: "id, projectId, pageId, createdAt"
    });
  }
}

export const localDb = new PixelMapVjmLocalDb();

export async function saveLocalPage(record: LocalPageRecord, projectName: string, pageCount: number) {
  const updatedAt = new Date().toISOString();
  const nextRecord = { ...record, updatedAt };

  await localDb.transaction("rw", localDb.localProjects, localDb.localPages, localDb.autosaveSnapshots, async () => {
    await localDb.localProjects.put({
      id: record.projectId,
      name: projectName,
      updatedAt,
      pageCount,
      mode: "CLOUD_SYNCED"
    });
    await localDb.localPages.put(nextRecord);
    await localDb.autosaveSnapshots.put({
      id: `${record.id}:${updatedAt}`,
      projectId: record.projectId,
      pageId: record.id,
      projectJson: record.projectJson,
      createdAt: updatedAt
    });
  });

  const indexRaw = window.localStorage.getItem("pixelmapvjm.localProjects");
  const index = indexRaw ? JSON.parse(indexRaw) : [];
  const list = Array.isArray(index) ? index.filter((project) => project.id !== record.projectId) : [];
  list.unshift({
    id: record.projectId,
    name: projectName,
    updatedAt,
    pageCount
  });
  window.localStorage.setItem("pixelmapvjm.localProjects", JSON.stringify(list.slice(0, 20)));
}

export async function loadLocalPage(pageId: string) {
  return localDb.localPages.get(pageId);
}
