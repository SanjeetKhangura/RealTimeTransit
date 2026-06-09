import { cn } from "@/lib/utils/cn";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
