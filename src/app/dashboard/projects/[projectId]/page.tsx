import Link from "next/link";
import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { prisma } from "@/db/prisma";
import { isAdminUser, requireUser } from "@/features/auth/session";
import {
  createPageAction,
  deletePageAction,
  duplicatePageAction,
  movePageAction,
  renamePageAction,
  renameProjectAction
} from "@/features/projects/actions";
import { formatDateTime } from "@/lib/format";

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await requireUser();
  const { projectId } = await params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    include: {
      pages: {
        orderBy: { sortOrder: "asc" }
      }
    }
  });

  if (!project) {
    notFound();
  }

  return (
    <WorkspaceShell active="dashboard" userName={user.name} isAdmin={isAdminUser(user)}>
      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 xl:grid-cols-[320px_1fr]">
        <aside className="border-b border-pf-border bg-pf-sidebar p-5 xl:border-b-0 xl:border-r">
          <SectionHeading code="01" title="Project" />
          <form action={renameProjectAction} className="mt-5 space-y-4">
            <input type="hidden" name="projectId" value={project.id} />
            <label className="block space-y-2">
              <span className="technical-label">Project Name</span>
              <input className="technical-input" name="name" defaultValue={project.name} />
            </label>
            <Button type="submit" className="w-full">
              RENAME PROJECT
            </Button>
          </form>
          <div className="mt-6 font-mono text-xs uppercase text-pf-muted">
            <p>Created: {formatDateTime(project.createdAt)}</p>
            <p className="mt-2">Updated: {formatDateTime(project.updatedAt)}</p>
          </div>
          <ButtonLink href="/dashboard" variant="ghost" className="mt-6 w-full">
            BACK TO DASHBOARD
          </ButtonLink>
        </aside>
        <section className="p-5 lg:p-8">
          <div className="border-b border-pf-border pb-6">
            <p className="font-mono text-xs uppercase text-pf-red">PROJECT / PAGE CONTROL</p>
            <h1 className="mt-2 font-brand text-3xl uppercase">{project.name}</h1>
          </div>
          <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_360px]">
            <section className="technical-panel p-5">
              <SectionHeading code="02" title="Pages" />
              <div className="mt-5 space-y-3">
                {project.pages.map((page, index) => (
                  <div key={page.id} className="grid gap-3 border border-pf-border bg-black/25 p-3 lg:grid-cols-[1fr_auto]">
                    <div>
                      <form action={renamePageAction} className="grid gap-2 md:grid-cols-[1fr_auto]">
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="pageId" value={page.id} />
                        <input className="technical-input" name="name" defaultValue={page.name} />
                        <Button type="submit">RENAME</Button>
                      </form>
                      <div className="mt-2 flex flex-wrap gap-3 font-mono text-xs uppercase text-pf-muted">
                        <span>{page.width} x {page.height}</span>
                        <span>{page.fps} FPS</span>
                        <span>{page.duration} SEC</span>
                        <span>ORDER {index + 1}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      <ButtonLink href={`/editor/${project.id}/${page.id}`} variant="primary">
                        OPEN
                      </ButtonLink>
                      <form action={movePageAction}>
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="pageId" value={page.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button className="grid h-10 w-10 place-items-center border border-pf-border bg-pf-panel hover:border-pf-red" aria-label="Move up">
                          <ArrowUp size={15} />
                        </button>
                      </form>
                      <form action={movePageAction}>
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="pageId" value={page.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button className="grid h-10 w-10 place-items-center border border-pf-border bg-pf-panel hover:border-pf-red" aria-label="Move down">
                          <ArrowDown size={15} />
                        </button>
                      </form>
                      <form action={duplicatePageAction}>
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="pageId" value={page.id} />
                        <button className="grid h-10 w-10 place-items-center border border-pf-border bg-pf-panel hover:border-pf-red" aria-label="Duplicate page">
                          <Copy size={15} />
                        </button>
                      </form>
                      <form action={deletePageAction}>
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="pageId" value={page.id} />
                        <ConfirmSubmitButton
                          message={`Delete page ${page.name}?`}
                          className="grid h-10 w-10 place-items-center border border-pf-darkRed bg-pf-darkRed/50 hover:border-pf-red"
                        >
                          <Trash2 size={15} />
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="technical-panel p-5">
              <SectionHeading code="NEW" title="Create Page" />
              <form action={createPageAction} className="mt-5 grid gap-4">
                <input type="hidden" name="projectId" value={project.id} />
                <label className="block space-y-2">
                  <span className="technical-label">Page Name</span>
                  <input className="technical-input" name="name" defaultValue="Main Stage" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-2">
                    <span className="technical-label">Width</span>
                    <input className="technical-input" name="width" type="number" defaultValue={1920} min={64} />
                  </label>
                  <label className="block space-y-2">
                    <span className="technical-label">Height</span>
                    <input className="technical-input" name="height" type="number" defaultValue={1080} min={64} />
                  </label>
                  <label className="block space-y-2">
                    <span className="technical-label">FPS</span>
                    <input className="technical-input" name="fps" type="number" defaultValue={30} min={1} max={120} />
                  </label>
                  <label className="block space-y-2">
                    <span className="technical-label">Duration</span>
                    <input className="technical-input" name="duration" type="number" defaultValue={10} min={1} />
                  </label>
                </div>
                <Button type="submit" variant="primary">
                  CREATE PAGE
                </Button>
              </form>
              <Link href={`/api/projects/${project.id}/export`} className="mt-5 block border border-pf-border p-3 text-center font-mono text-xs uppercase text-pf-muted hover:border-pf-red hover:text-pf-text">
                Export .pixelmap
              </Link>
            </section>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
