import Link from "next/link";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<ButtonVariant, string> = {
  primary: "border-pf-red bg-pf-red text-black hover:bg-red-400",
  secondary: "border-pf-border bg-pf-panel text-pf-text hover:border-pf-red",
  ghost: "border-transparent bg-transparent text-pf-muted hover:text-pf-text hover:border-pf-border",
  danger: "border-pf-darkRed bg-pf-darkRed text-pf-text hover:border-pf-red"
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ className, variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 border px-4 text-sm font-semibold uppercase tracking-normal transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
};

export function ButtonLink({ className, variant = "secondary", ...props }: ButtonLinkProps) {
  return (
    <Link
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 border px-4 text-sm font-semibold uppercase tracking-normal transition-colors",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
