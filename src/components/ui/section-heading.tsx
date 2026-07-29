export function SectionHeading({ code, title }: { code: string; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-pf-border pb-3">
      <span className="font-mono text-xs text-pf-red">{code}</span>
      <h2 className="font-brand text-sm uppercase text-pf-text">{title}</h2>
    </div>
  );
}
