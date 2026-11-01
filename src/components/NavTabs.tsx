"use client";

import { BookOpen, Play } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Visualizer", icon: Play, alwaysLabel: false },
  { href: "/learn", label: "Learn DSA", icon: BookOpen, alwaysLabel: true },
];

/** "Visualizer | Learn DSA" switch shown in both page headers. */
export function NavTabs({ compactOnMobile = false }: { compactOnMobile?: boolean }) {
  const path = usePathname();
  return (
    <nav className="flex shrink-0 items-center gap-0.5 rounded-full bg-black/30 p-1 ring-1 ring-white/[0.08]" aria-label="Sections">
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            title={t.label}
            className={`relative flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
              active ? "text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {active && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500/40 to-indigo-500/40 ring-1 ring-violet-300/30"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <Icon className="relative size-3.5" />
            <span className={`relative ${t.alwaysLabel && !compactOnMobile ? "" : "hidden sm:inline"}`}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
