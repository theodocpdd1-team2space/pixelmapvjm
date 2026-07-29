import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { hashAccessToken } from "@/features/auth/access-utils";
import { prisma } from "@/db/prisma";

export default async function PasswordResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const accessToken = await prisma.accessToken.findFirst({ where: { tokenHash: hashAccessToken(token), kind: "PASSWORD_RESET", usedAt: null, expiresAt: { gt: new Date() } } });
  return (
    <AuthShell title="Reset Password" subtitle="Buat password baru untuk akun PixelMapVJM Anda.">
      {!accessToken ? <div className="border border-pf-darkRed bg-pf-darkRed/20 p-4 font-mono text-xs uppercase leading-6 text-pf-red">Link reset sudah expired atau sudah digunakan. Minta link baru dari admin.</div> : <PasswordResetForm token={token} />}
    </AuthShell>
  );
}
