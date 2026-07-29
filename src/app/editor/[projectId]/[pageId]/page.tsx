import { notFound } from "next/navigation";
import { EditorClient } from "@/components/editor/editor-client";
import { prisma } from "@/db/prisma";
import { requireUser } from "@/features/auth/session";
import type { EditorInitialDocument } from "@/features/editor/types";
import { projectPageJsonSchema } from "@/types/project";

export default async function EditorPage({
  params
}: {
  params: Promise<{ projectId: string; pageId: string }>;
}) {
  const user = await requireUser();
  const { projectId, pageId } = await params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: {
      pages: {
        orderBy: { sortOrder: "asc" }
      }
    }
  });
  const page = project?.pages.find((item) => item.id === pageId);

  if (!project || !page) {
    notFound();
  }

  const pageJson = projectPageJsonSchema.parse(page.projectJson);
  const initialDocument: EditorInitialDocument = {
    projectId: project.id,
    pageId: page.id,
    projectName: project.name,
    pages: project.pages.map((item) => ({
      id: item.id,
      name: item.name,
      width: item.width,
      height: item.height
    })),
    canvas: {
      name: page.name,
      width: page.width,
      height: page.height,
      fps: page.fps,
      duration: page.duration,
      backgroundColor: pageJson.page.canvas.backgroundColor,
      backgroundTransparent: pageJson.page.canvas.backgroundTransparent,
      gridSize: pageJson.page.canvas.gridSize,
      snappingEnabled: pageJson.page.canvas.snappingEnabled,
      gridVisible: pageJson.page.canvas.gridVisible
    },
    screens: pageJson.page.screens,
    serverUpdatedAt: page.updatedAt.toISOString()
  };

  return <EditorClient initialDocument={initialDocument} />;
}
