"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ArcadeIcon, { type ArcadeIconName } from "./ArcadeIcon";

const items: Array<{ href: string; label: string; icon: ArcadeIconName }> = [
  { href: "/", label: "Today", icon: "ticket" },
  { href: "/archive", label: "Past Days", icon: "calendar" },
  { href: "/account/stats", label: "Stats", icon: "stats" },
  { href: "/account", label: "Profile", icon: "profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (!(pathname === "/" || pathname.startsWith("/archive") || pathname.startsWith("/account"))) return null;

  return <nav className="arcade-bottom-nav" aria-label="Main navigation">
    {items.map((item) => {
      const active = item.href === "/" ? pathname === "/" : item.href === "/archive" ? pathname.startsWith("/archive") : pathname === item.href;
      return <Link href={item.href} key={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
        <ArcadeIcon name={item.icon} />
        <span>{item.label}</span>
      </Link>;
    })}
  </nav>;
}
