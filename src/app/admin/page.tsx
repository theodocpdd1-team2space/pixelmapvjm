import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { AdminManager } from "@/components/admin/admin-manager";
import { requireAdmin } from "@/features/auth/session";
import { isActiveNow } from "@/features/auth/access-utils";
import { prisma } from "@/db/prisma";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({ where: { role: "USER" }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, accessStatus: true, lastActiveAt: true, createdAt: true, licenses: { select: { activatedAt: true }, orderBy: { createdAt: "desc" }, take: 1 }, projects: { select: { id: true, _count: { select: { pages: true } } } } } });
  const [invitations, totalProjects, totalPages, invitationDates] = await Promise.all([
    prisma.accessInvitation.findMany({ where: { status: { in: ["PENDING", "EXPIRED"] } }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, email: true, name: true, status: true, expiresAt: true, createdAt: true } }),
    prisma.project.count(),
    prisma.projectPage.count(),
    prisma.accessInvitation.findMany({ where: { email: { in: users.map((user) => user.email) } }, orderBy: { createdAt: "desc" }, select: { email: true, createdAt: true } })
  ]);
  const pendingCount = await prisma.accessInvitation.count({ where: { status: { in: ["PENDING", "EXPIRED"] } } });
  const summary = { total: users.length, invited: pendingCount, active: users.filter((user) => user.accessStatus === "ACTIVE").length, suspended: users.filter((user) => user.accessStatus === "SUSPENDED").length, revoked: users.filter((user) => user.accessStatus === "REVOKED").length, activeNow: users.filter((user) => isActiveNow(user.lastActiveAt)).length };
  const rows = users.map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role, accessStatus: user.accessStatus, projectCount: user.projects.length, pageCount: user.projects.reduce((sum, project) => sum + project._count.pages, 0), lastActiveAt: user.lastActiveAt?.toISOString() ?? null, activeNow: isActiveNow(user.lastActiveAt), invitationDate: invitationDates.find((invitation) => invitation.email === user.email)?.createdAt.toISOString() ?? null, activationDate: user.licenses[0]?.activatedAt.toISOString() ?? null }));
  return <WorkspaceShell active="dashboard" userName={admin.name} isAdmin><div className="mx-auto max-w-[1600px] space-y-6 p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase text-pf-red">ADMIN / ACCESS CONTROL</p><h1 className="mt-2 font-brand text-3xl uppercase">PixelMapVJM Users</h1><p className="mt-2 text-sm text-pf-muted">Kelola akses manual customer dari pembelian Lynk.id.</p></div><div className="text-right font-mono text-xs uppercase text-pf-muted">CLOUD PROJECTS {totalProjects} / PAGES {totalPages}</div></div><div className="grid grid-cols-2 gap-px border border-pf-border bg-pf-border md:grid-cols-6">{[["USERS",summary.total], ["INVITED",summary.invited], ["ACTIVE",summary.active], ["SUSPENDED",summary.suspended], ["REVOKED",summary.revoked], ["ACTIVE NOW",summary.activeNow]].map(([label,value]) => <div key={label} className="bg-pf-panel p-4"><p className="font-mono text-[0.65rem] uppercase text-pf-muted">{label}</p><p className="mt-2 font-brand text-2xl text-pf-text">{value}</p></div>)}</div><AdminManager users={rows} invitations={invitations.map((item) => ({ ...item, expiresAt: item.expiresAt.toISOString(), createdAt: item.createdAt.toISOString() }))} /></div></WorkspaceShell>;
}
