import { Plus } from "lucide-react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { ProjectCard } from "@/components/dashboard/project-card";
import { LocalProjectsPanel } from "@/components/dashboard/local-projects-panel";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusPill } from "@/components/ui/status-pill";
import { prisma } from "@/db/prisma";
import { requireUser } from "@/features/auth/session";
import { createProjectAction } from "@/features/projects/actions";
import { formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  const user = await requireUser();
  const [projects, license] = await Promise.all([
    prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        pages: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            width: true,
            height: true
          }
        }
      }
    }),
    prisma.license.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" }
    })
  ]);

  return (
    <WorkspaceShell active="dashboard" userName={user.name} isAdmin={user.role === "ADMIN"}>
      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 xl:grid-cols-[320px_1fr]">
        <aside className="border-b border-pf-border bg-pf-sidebar p-5 xl:border-b-0 xl:border-r">
          <SectionHeading code="01" title="Project" />
          <form action={createProjectAction} className="mt-5 space-y-4">
            <label className="block space-y-2">
              <span className="technical-label">New Project Name</span>
              <input className="technical-input" name="name" defaultValue="Concert Mapping 2026" />
            </label>
            <Button type="submit" variant="primary" className="w-full">
              <Plus size={16} />
              NEW PROJECT
            </Button>
          </form>
          <div className="mt-8 space-y-4">
            <SectionHeading code="LICENSE" title="Status" />
            <div className="space-y-3 font-mono text-xs uppercase text-pf-muted">
              <div className="flex items-center justify-between">
                <span>Plan</span>
                <span className="text-pf-text">{license?.type ?? "UNASSIGNED"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status</span>
                <StatusPill tone={license?.status === "ACTIVE" ? "success" : "warning"}>
                  {license?.status ?? "PENDING"}
                </StatusPill>
              </div>
              <div className="flex items-center justify-between">
                <span>Cloud records</span>
                <span className="text-pf-text">{projects.length}</span>
              </div>
            </div>
          </div>
        </aside>
        <section className="p-5 lg:p-8">
          <div className="flex flex-col gap-4 border-b border-pf-border pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-xs uppercase text-pf-red">COMMAND CENTER / DASHBOARD</p>
              <h1 className="mt-2 font-brand text-3xl uppercase">Project Grid</h1>
              <p className="mt-2 max-w-2xl text-sm text-pf-muted">
                Kelola pekerjaan LED mapping, page composition, export project JSON, dan cloud metadata.
              </p>
            </div>
            <p className="font-mono text-xs uppercase text-pf-muted">Operator: {user.email}</p>
          </div>
          <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_320px]">
            <section>
              <SectionHeading code="RECENT" title="Recent Projects" />
              <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {projects.length > 0 ? (
                  projects.map((project) => <ProjectCard key={project.id} project={project} />)
                ) : (
                  <div className="technical-panel p-6 font-mono text-xs uppercase text-pf-muted">
                    No project records yet. Create a project from the left control rail.
                  </div>
                )}
              </div>
            </section>
            <div className="space-y-5">
              <LocalProjectsPanel />
              <section className="technical-panel p-5">
                <SectionHeading code="CLOUD" title="Cloud Synced Projects" />
                <div className="mt-4 space-y-3 font-mono text-xs uppercase text-pf-muted">
                  {projects.slice(0, 5).map((project) => (
                    <div key={project.id} className="flex items-center justify-between border-b border-pf-border pb-3">
                      <span>{project.name}</span>
                      <span>{formatDateTime(project.updatedAt)}</span>
                    </div>
                  ))}
                  {projects.length === 0 ? <p>No cloud project metadata.</p> : null}
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
