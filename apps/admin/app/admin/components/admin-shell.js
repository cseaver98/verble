"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Phrases" },
];

export default function AdminShell({ children }) {
  const pathname = usePathname();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <p className="admin-brand">Verble</p>
        <p className="admin-subtle">Admin</p>
        <nav className="admin-nav" aria-label="Game curation tabs">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link key={tab.href} href={tab.href} className={`admin-nav-link${isActive ? " active" : ""}`}>
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
}
