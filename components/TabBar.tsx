"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today", glyph: "◉" },
  { href: "/workout", label: "Train", glyph: "▟" },
  { href: "/nutrition", label: "Eat", glyph: "◍" },
  { href: "/body", label: "Body", glyph: "◭" },
  { href: "/week", label: "Week", glyph: "▤" },
];

export default function TabBar() {
  const path = usePathname();
  if (path.startsWith("/login") || path.startsWith("/auth")) return null;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`tap flex flex-1 flex-col items-center gap-0.5 py-2.5 ${
                active ? "text-ember" : "text-faint"
              }`}
            >
              <span className="text-base leading-none">{t.glyph}</span>
              <span className="display text-[11px] font-semibold uppercase tracking-[0.12em]">
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
