import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "clear" | "warning" | "issue";

export function Badge({
  children,
  tone = "neutral",
  className,
  title,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  title?: string;
}) {
  const tones: Record<Tone, string> = {
    neutral: "bg-foreground/5 text-foreground/70",
    clear: "bg-status-clear/10 text-status-clear",
    warning: "bg-status-warning/10 text-status-warning",
    issue: "bg-status-issue/10 text-status-issue",
  };
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
