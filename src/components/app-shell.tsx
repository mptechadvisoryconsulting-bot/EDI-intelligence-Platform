"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BrainCircuit,
  Database,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Workspaces", icon: FolderKanban },
  { href: "/account/erp-layout", label: "ERP layout", icon: Database },
  { href: "/knowledge", label: "Knowledge", icon: Search },
];

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="ai-mesh-bg flex min-h-screen">
      <aside className="glass-panel-strong flex w-64 shrink-0 flex-col border-r border-slate-800/80">
        <div className="border-b border-slate-800/80 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <BrainCircuit className="h-5 w-5 text-white" />
              <Sparkles className="absolute -right-0.5 -top-0.5 h-3 w-3 text-cyan-300 ai-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">EDI Intelligence</p>
              <p className="text-[10px] uppercase tracking-wider text-indigo-400/80">AI implementation</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800/80 p-4">
          <div className="mb-3 px-1">
            <p className="text-sm font-medium text-slate-200">{user.name ?? user.username}</p>
            <p className="text-xs capitalize text-slate-500">{user.role}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800/50 hover:text-slate-200"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
