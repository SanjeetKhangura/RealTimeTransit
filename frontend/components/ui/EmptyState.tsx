export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-foreground/15 p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-xs text-foreground/60">{hint}</p>}
    </div>
  );
}
