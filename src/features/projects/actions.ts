"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/db/prisma";
import { requireUser } from "@/features/auth/session";
import { createDefaultProjectJson, projectPageJsonSchema, toPrismaJson } from "@/types/project";

const idSchema = z.string().min(1);
const nameSchema = z.string().min(1).max(120);
const canvasSchema = z.object({
  name: nameSchema,
  width: z.coerce.number().int().min(64).max(16384),
  height: z.coerce.number().int().min(64).max(16384),
  fps: z.coerce.number().int().min(1).max(120),
  duration: z.coerce.number().int().min(1).max(3600)
});

async function getOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      pages: {
        orderBy: { sortOrder: "asc" }
      }
    }
  });
}

export async function createProjectAction(formData: FormData) {
  const user = await requireUser();
  const name = nameSchema.parse(formData.get("name") || "Untitled Project");

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name,
      pages: {
        create: {
          name: "Main Stage",
          width: 1920,
          height: 1080,
          fps: 30,
          duration: 10,
          sortOrder: 0,
          projectJson: toPrismaJson(createDefaultProjectJson("Main Stage"))
        }
      }
    },
    include: { pages: true }
  });

  revalidatePath("/dashboard");
  redirect(`/editor/${project.id}/${project.pages[0]?.id}`);
}

export async function renameProjectAction(formData: FormData) {
  const user = await requireUser();
  const projectId = idSchema.parse(formData.get("projectId"));
  const name = nameSchema.parse(formData.get("name"));

  await prisma.project.updateMany({
    where: {
      id: projectId,
      userId: user.id
    },
    data: { name }
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function duplicateProjectAction(formData: FormData) {
  const user = await requireUser();
  const projectId = idSchema.parse(formData.get("projectId"));
  const project = await getOwnedProject(projectId, user.id);

  if (!project) {
    redirect("/dashboard");
  }

  const duplicate = await prisma.project.create({
    data: {
      userId: user.id,
      name: `${project.name} Copy`,
      thumbnail: project.thumbnail,
      pages: {
        create: project.pages.map((page) => ({
          name: page.name,
          width: page.width,
          height: page.height,
          fps: page.fps,
          duration: page.duration,
          sortOrder: page.sortOrder,
          projectJson: toPrismaJson(projectPageJsonSchema.parse(page.projectJson))
        }))
      }
    }
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/projects/${duplicate.id}`);
}

export async function deleteProjectAction(formData: FormData) {
  const user = await requireUser();
  const projectId = idSchema.parse(formData.get("projectId"));

  await prisma.project.deleteMany({
    where: {
      id: projectId,
      userId: user.id
    }
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function createPageAction(formData: FormData) {
  const user = await requireUser();
  const projectId = idSchema.parse(formData.get("projectId"));
  const payload = canvasSchema.parse({
    name: formData.get("name") || "New Page",
    width: formData.get("width") || 1920,
    height: formData.get("height") || 1080,
    fps: formData.get("fps") || 30,
    duration: formData.get("duration") || 10
  });

  const project = await getOwnedProject(projectId, user.id);

  if (!project) {
    redirect("/dashboard");
  }

  const page = await prisma.projectPage.create({
    data: {
      projectId: project.id,
      name: payload.name,
      width: payload.width,
      height: payload.height,
      fps: payload.fps,
      duration: payload.duration,
      sortOrder: project.pages.length,
      projectJson: toPrismaJson(createDefaultProjectJson(payload.name, payload.width, payload.height))
    }
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/editor/${projectId}/${page.id}`);
}

export async function renamePageAction(formData: FormData) {
  const user = await requireUser();
  const projectId = idSchema.parse(formData.get("projectId"));
  const pageId = idSchema.parse(formData.get("pageId"));
  const name = nameSchema.parse(formData.get("name"));
  const project = await getOwnedProject(projectId, user.id);

  if (!project || !project.pages.some((page) => page.id === pageId)) {
    redirect("/dashboard");
  }

  const page = project.pages.find((item) => item.id === pageId);
  const parsedJson = projectPageJsonSchema.parse(page?.projectJson);

  await prisma.projectPage.update({
    where: { id: pageId },
    data: {
      name,
      projectJson: toPrismaJson({
        ...parsedJson,
        page: {
          ...parsedJson.page,
          name
        }
      })
    }
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath(`/editor/${projectId}/${pageId}`);
}

export async function duplicatePageAction(formData: FormData) {
  const user = await requireUser();
  const projectId = idSchema.parse(formData.get("projectId"));
  const pageId = idSchema.parse(formData.get("pageId"));
  const project = await getOwnedProject(projectId, user.id);
  const source = project?.pages.find((page) => page.id === pageId);

  if (!project || !source) {
    redirect("/dashboard");
  }

  const pageJson = projectPageJsonSchema.parse(source.projectJson);
  const nextName = `${source.name} Copy`;

  await prisma.projectPage.create({
    data: {
      projectId,
      name: nextName,
      width: source.width,
      height: source.height,
      fps: source.fps,
      duration: source.duration,
      sortOrder: project.pages.length,
      projectJson: toPrismaJson({
        ...pageJson,
        page: {
          ...pageJson.page,
          name: nextName
        }
      })
    }
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function deletePageAction(formData: FormData) {
  const user = await requireUser();
  const projectId = idSchema.parse(formData.get("projectId"));
  const pageId = idSchema.parse(formData.get("pageId"));
  const project = await getOwnedProject(projectId, user.id);

  if (!project || project.pages.length <= 1) {
    redirect(`/dashboard/projects/${projectId}`);
  }

  await prisma.projectPage.delete({ where: { id: pageId } });

  await Promise.all(
    project.pages
      .filter((page) => page.id !== pageId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((page, index) =>
        prisma.projectPage.update({
          where: { id: page.id },
          data: { sortOrder: index }
        })
      )
  );

  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function movePageAction(formData: FormData) {
  const user = await requireUser();
  const projectId = idSchema.parse(formData.get("projectId"));
  const pageId = idSchema.parse(formData.get("pageId"));
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));
  const project = await getOwnedProject(projectId, user.id);

  if (!project) {
    redirect("/dashboard");
  }

  const pages = [...project.pages].sort((a, b) => a.sortOrder - b.sortOrder);
  const index = pages.findIndex((page) => page.id === pageId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= pages.length) {
    return;
  }

  const current = pages[index];
  const target = pages[targetIndex];

  await prisma.$transaction([
    prisma.projectPage.update({ where: { id: current.id }, data: { sortOrder: target.sortOrder } }),
    prisma.projectPage.update({ where: { id: target.id }, data: { sortOrder: current.sortOrder } })
  ]);

  revalidatePath(`/dashboard/projects/${projectId}`);
}
