import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusPill } from "@/components/ui/status-pill";
import { prisma } from "@/db/prisma";
import { isAdminUser, requireUser } from "@/features/auth/session";
import { formatDateTime } from "@/lib/format";

export default async function LicensePage() {
  const user = await requireUser();
  const [license, deviceCount] = await Promise.all([
    prisma.license.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" }
    }),
    prisma.device.count({ where: { userId: user.id } })
  ]);

  return (
    <WorkspaceShell active="license" userName={user.name} isAdmin={isAdminUser(user)}>
      <section className="mx-auto max-w-5xl p-5 lg:p-8">
        <div className="border-b border-pf-border pb-6">
          <p className="font-mono text-xs uppercase text-pf-red">LICENSE / LIFETIME ACCESS</p>
          <h1 className="mt-2 font-brand text-3xl uppercase">PixelMapVJM License</h1>
        </div>
        <section className="technical-panel mt-6 p-5">
          <SectionHeading code="PLAN" title="Activation" />
          <div className="mt-5 grid gap-4 font-mono text-xs uppercase text-pf-muted md:grid-cols-2">
            <div className="border border-pf-border bg-black/25 p-4">
              <p>Plan</p>
              <p className="mt-2 text-lg text-pf-text">{license?.type ?? "UNASSIGNED"}</p>
            </div>
            <div className="border border-pf-border bg-black/25 p-4">
              <p>Status</p>
              <div className="mt-2">
                <StatusPill tone={license?.status === "ACTIVE" ? "success" : "warning"}>
                  {license?.status ?? "PENDING"}
                </StatusPill>
              </div>
            </div>
            <div className="border border-pf-border bg-black/25 p-4">
              <p>License Key</p>
              <p className="mt-2 text-pf-text">{license?.licenseKey ?? "NO KEY"}</p>
            </div>
            <div className="border border-pf-border bg-black/25 p-4">
              <p>Devices</p>
              <p className="mt-2 text-pf-text">
                {deviceCount} / {license?.maxDevices ?? 3}
              </p>
            </div>
            <div className="border border-pf-border bg-black/25 p-4">
              <p>Activated</p>
              <p className="mt-2 text-pf-text">
                {license?.activatedAt ? formatDateTime(license.activatedAt) : "NOT ACTIVATED"}
              </p>
            </div>
            <div className="border border-pf-border bg-black/25 p-4">
              <p>Expires</p>
              <p className="mt-2 text-pf-text">{license?.expiresAt ? formatDateTime(license.expiresAt) : "LIFETIME"}</p>
            </div>
          </div>
        </section>
      </section>
    </WorkspaceShell>
  );
}
