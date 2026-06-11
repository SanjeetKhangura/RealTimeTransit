"use client";

export type SortKey = "number-asc" | "number-desc" | "name" | "region";

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "number-asc", label: "Route number (low to high)" },
  { value: "number-desc", label: "Route number (high to low)" },
  { value: "name", label: "Name (A to Z)" },
  { value: "region", label: "Area" },
];

export function RouteSort({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (value: SortKey) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-foreground/60">
      Sort
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-xs text-foreground outline-none focus:border-foreground/40"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
