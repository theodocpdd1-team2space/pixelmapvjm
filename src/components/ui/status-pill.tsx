import { clsx } from "clsx";

const colorMap = {
  success: "border-pf-success text-pf-success",
  warning: "border-pf-warning text-pf-warning",
  danger: "border-pf-red text-pf-red",
  muted: "border-pf-border text-pf-muted"
};

export function StatusPill({
  children,
  tone = "muted"
}: {
  children: React.ReactNode;
  tone?: keyof typeof colorMap;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[0.68rem] uppercase",
        colorMap[tone]
      )}
    >
      <span className="status-dot" />
      {children}
    </span>
  );
}
