import { AccessSetupForm } from "@/components/auth/access-setup-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { hashAccessToken } from "@/features/auth/access-utils";
import { prisma } from "@/db/prisma";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

export default async function AccessSetupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await prisma.accessInvitation.findFirst({ where: { tokenHash: hashAccessToken(token), status: "PENDING", expiresAt: { gt: new Date() } } });

  return (
    <AuthShell title="Activate Access" subtitle="Buat password untuk membuka workspace PixelMapVJM.">
      {!invitation ? (
        <div className="border border-pf-darkRed bg-pf-darkRed/20 p-4 font-mono text-xs uppercase leading-6 text-pf-red">Link undangan sudah expired, sudah digunakan, atau akses ini tidak lagi tersedia. Minta link baru dari admin.</div>
      ) : (
        <AccessSetupForm token={token} email={maskEmail(invitation.email)} suggestedName={invitation.name} />
      )}
    </AuthShell>
  );
}
