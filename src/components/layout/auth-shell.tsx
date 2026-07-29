import Link from "next/link";

export function AuthShell({
  children,
  title,
  subtitle
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-md border border-pf-border bg-pf-panel/95">
        <div className="border-b border-pf-border p-6">
          <Link href="/" className="font-brand text-2xl font-bold uppercase text-pf-text">
            Pixel<span className="text-pf-red">MapVJM</span>
          </Link>
          <p className="mt-2 font-mono text-xs uppercase text-pf-muted">LED PIXEL MAPPER GENERATOR</p>
        </div>
        <div className="space-y-6 p-6">
          <div>
            <p className="font-mono text-xs text-pf-red">AUTH / SECURE ACCESS</p>
            <h1 className="mt-2 font-brand text-xl uppercase">{title}</h1>
            <p className="mt-2 text-sm text-pf-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
