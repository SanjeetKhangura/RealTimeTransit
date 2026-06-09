import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-foreground/10">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold">
          Real-Time Transit
        </Link>
        <span className="text-xs text-foreground/50">TransLink</span>
      </div>
    </header>
  );
}
