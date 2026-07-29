import Link from "next/link";
import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { PresenceHeartbeat } from "@/components/auth/presence-heartbeat";

export function WorkspaceShell({
  children,
  active,
  userName,
  isAdmin = false
}: {
  children: React.ReactNode;
  active: "dashboard" | "account" | "license" | "editor";
  userName: string;
  isAdmin?: boolean;
}) {
  const nav = [
    { href: "/dashboard", label: "DASHBOARD", key: "dashboard" },
    { href: "/account", label: "ACCOUNT", key: "account" },
    { href: "/license", label: "LICENSE", key: "license" }
  ];

  return (
    <main className="min-h-screen bg-pf-bg text-pf-text">
      <PresenceHeartbeat />
      <header className="flex min-h-16 items-center justify-between border-b border-pf-border bg-pf-sidebar px-5">
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="font-brand text-xl font-bold uppercase">
            Pixel<span className="text-pf-red">MapVJM</span>
          </Link>
          <StatusPill tone="success">LOCAL READY</StatusPill>
        </div>
        <div className="flex items-center gap-5">
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`border px-3 py-2 font-mono text-xs uppercase ${
                  active === item.key
                    ? "border-pf-red text-pf-red"
                    : "border-transparent text-pf-muted hover:border-pf-border hover:text-pf-text"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin ? <Link href="/admin" className="border border-transparent px-3 py-2 font-mono text-xs uppercase text-pf-red hover:border-pf-red">ADMIN</Link> : null}
          </nav>
          <span className="hidden font-mono text-xs uppercase text-pf-muted lg:inline">{userName}</span>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost">
              LOGOUT
            </Button>
          </form>
        </div>
      </header>
      {children}
    </main>
  );
}
