import { Button } from "./Button";

export function ErrorPanel({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-status-issue/30 bg-status-issue/5 p-6 text-center"
    >
      <p className="text-sm font-medium text-status-issue">Something went wrong</p>
      <p className="text-xs text-foreground/60">{error.message}</p>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
