import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { getCurrentUser } from "@/features/auth/session";
import { projectPageJsonSchema } from "@/types/project";

function sanitizeFilename(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "pixelmapvjm-project";
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  const { projectId } = await params;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: {
      pages: {
        orderBy: { sortOrder: "asc" }
      }
    }
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const payload = {
    app: "PixelMapVJM",
    format: "pixelmapvjm-project",
    schemaVersion: 1,
    version: 1,
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      thumbnail: project.thumbnail
    },
    pages: project.pages.map((page) => ({
      id: page.id,
      name: page.name,
      canvas: {
        width: page.width,
        height: page.height,
        fps: page.fps,
        duration: page.duration
      },
      projectJson: projectPageJsonSchema.parse(page.projectJson)
    }))
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="pixelmapvjm-${sanitizeFilename(project.name)}.pixelmap"`
    }
  });
}
