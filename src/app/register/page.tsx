import { redirect } from "next/navigation";
import { AuthShell } from "@/components/layout/auth-shell";
import { getCurrentUser } from "@/features/auth/session";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell title="Access Required" subtitle="PixelMapVJM hanya tersedia melalui akses yang diberikan oleh admin.">
      <p className="border border-pf-border bg-black/30 p-4 font-mono text-xs uppercase leading-6 text-pf-muted">
        Jika Anda sudah membeli akses, tunggu invitation link dari admin. Buka link tersebut untuk membuat password.
      </p>
    </AuthShell>
  );
}
