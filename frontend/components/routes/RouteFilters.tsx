"use client";

import { cn } from "@/lib/utils/cn";
import type { StatusLevel } from "@/types/domain";

const STATUSES: { level: StatusLevel; label: string }[] = [
  { level: "clear", label: "On time" },
  { level: "warning", label: "Minor delays" },
  { level: "issue", label: "Disrupted" },
];

export function RouteFilters({
  active,
  onToggle,
  savedOnly,
  onSavedOnlyChange,
  savedCount,
}: {
  active: StatusLevel[];
  onToggle: (level: StatusLevel) => void;
  savedOnly: boolean;
  onSavedOnlyChange: (value: boolean) => void;
  savedCount: number;
}) {
  const chip = (selected: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs transition",
      selected
        ? "border-foreground/40 bg-foreground/10"
        : "border-foreground/15 hover:bg-foreground/5",
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUSES.map((s) => (
        <button
          key={s.level}
          type="button"
          aria-pressed={active.includes(s.level)}
          onClick={() => onToggle(s.level)}
          className={chip(active.includes(s.level))}
        >
          {s.label}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={savedOnly}
        onClick={() => onSavedOnlyChange(!savedOnly)}
        className={chip(savedOnly)}
      >
        Saved ({savedCount})
      </button>
    </div>
  );
}
