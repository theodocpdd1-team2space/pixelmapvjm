import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { prisma } from "@/db/prisma";
import { renameAccountAction } from "@/features/auth/actions";
import { isAdminUser, requireUser } from "@/features/auth/session";
import { formatDateTime } from "@/lib/format";

export default async function AccountPage() {
  const user = await requireUser();
  const devices = await prisma.device.findMany({
    where: { userId: user.id },
    orderBy: { lastSeenAt: "desc" }
  });

  return (
    <WorkspaceShell active="account" userName={user.name} isAdmin={isAdminUser(user)}>
      <section className="mx-auto max-w-5xl p-5 lg:p-8">
        <div className="border-b border-pf-border pb-6">
          <p className="font-mono text-xs uppercase text-pf-red">ACCOUNT / OPERATOR</p>
          <h1 className="mt-2 font-brand text-3xl uppercase">{user.name}</h1>
          <p className="mt-2 font-mono text-xs uppercase text-pf-muted">{user.email}</p>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="technical-panel p-5">
            <SectionHeading code="USER" title="Profile" />
            <form action={renameAccountAction} className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="technical-label">Display Name</span>
                <input className="technical-input" name="name" defaultValue={user.name} />
              </label>
              <Button type="submit" variant="primary">
                UPDATE PROFILE
              </Button>
            </form>
          </section>
          <section className="technical-panel p-5">
            <SectionHeading code="DEVICE" title="Active Devices" />
            <div className="mt-5 space-y-3">
              {devices.map((device) => (
                <div key={device.id} className="border border-pf-border bg-black/25 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold uppercase">{device.deviceName}</p>
                    <span className="font-mono text-xs text-pf-muted">{formatDateTime(device.lastSeenAt)}</span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-pf-muted">{device.deviceHash}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </WorkspaceShell>
  );
}
