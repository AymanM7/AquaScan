"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const links = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/automation", label: "Automation" },
  { href: "/onboarding", label: "Onboarding" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <header className="flex items-center justify-between border-b border-edge bg-bg-surface/80 px-4 py-3 text-sm backdrop-blur">
      <Link href="/" className="font-display text-lg font-semibold tracking-tight text-accent-teal">
        RainUSE Nexus
      </Link>
      <nav className="flex flex-wrap items-center gap-3 text-content-secondary">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-md px-2 py-1 hover:text-content-primary",
              pathname === l.href && "bg-bg-surface-2 text-accent-teal",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
