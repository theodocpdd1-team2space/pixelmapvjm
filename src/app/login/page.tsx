import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { getCurrentUser } from "@/features/auth/session";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell title="Login Console" subtitle="Masuk untuk membuka dashboard project dan sinkronisasi cloud.">
      <AuthForm />
      <p className="font-mono text-xs uppercase text-pf-muted">
        Akses PixelMapVJM diberikan oleh admin. Gunakan link undangan untuk membuat password.
      </p>
    </AuthShell>
  );
}
