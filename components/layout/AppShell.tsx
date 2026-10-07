"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Users,
  Briefcase,
  Layers,
  Settings,
  Building2,
  Menu,
  X,
  Search,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: Layers,
  },
  {
    name: "Career Intelligence",
    href: "/career-intelligence",
    icon: Compass,
    badge: "Market",
  },
  {
    name: "Recruitment",
    href: "/recruitment",
    icon: Briefcase,
    badge: "Active",
  },
  {
    name: "Candidates",
    href: "/candidates",
    icon: Users,
  },
  {
    name: "Company Intelligence",
    href: "/insights",
    icon: Building2,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const getPageTitle = () => {
    if (pathname.startsWith("/career-intelligence")) return "Career Intelligence";
    if (pathname.startsWith("/recruitment/new")) return "Recruitment / New Screening";
    if (pathname.startsWith("/recruitment")) return "Recruitment Intelligence";
    if (pathname.startsWith("/candidates")) return "Candidates Directory";
    if (pathname.startsWith("/insights")) return "Company Intelligence";
    if (pathname.startsWith("/settings")) return "Platform Settings";
    return "Dashboard Overview";
  };

  return (
    <div className="min-h-screen bg-nirman-bg text-nirman-dark flex">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Persistent Sidebar (240px) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 bg-nirman-sidebar text-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="h-7 w-7 rounded bg-nirman-accent flex items-center justify-center text-white font-semibold text-sm tracking-wider">
              N
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-white group-hover:text-nirman-accent-light transition-colors">
                NIRMAN
              </span>
              <span className="text-[10px] text-nirman-text-muted uppercase tracking-wider font-mono -mt-0.5">
                Intelligence
              </span>
            </div>
          </Link>
          <button
            type="button"
            className="lg:hidden text-nirman-text-muted hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Identifier */}
        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-nirman-success" />
              <span className="text-xs font-medium text-white/90">Apex Engineering</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-mono">
              PROD
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors group",
                  isActive
                    ? "bg-white/10 text-white font-semibold"
                    : "text-nirman-text-muted hover:text-white hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-nirman-accent" : "text-nirman-text-muted group-hover:text-white"
                    )}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded font-mono",
                      isActive
                        ? "bg-nirman-accent text-white"
                        : "bg-white/10 text-white/60"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Engine Status / Transparency Footer */}
        <div className="p-3 border-t border-white/10 bg-white/[0.02]">
          <div className="p-2.5 rounded-md bg-white/[0.04] border border-white/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-white/80">Deterministic Engine</span>
              <span className="h-1.5 w-1.5 rounded-full bg-nirman-success" />
            </div>
            <p className="text-[10px] text-white/50 leading-relaxed">
              Rules & scoring compute strictly in application logic.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-nirman-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-1.5 text-nirman-text-secondary hover:text-nirman-dark rounded-md hover:bg-nirman-bg"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-nirman-text-secondary">
              <span className="font-medium text-nirman-dark">{getPageTitle()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Context / Search */}
            <div className="relative hidden md:block w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-nirman-text-muted" />
              <input
                type="text"
                placeholder="Search candidates, skills, roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full pl-8 pr-3 text-xs bg-nirman-bg rounded-md border border-nirman-border focus:border-nirman-accent focus:bg-white focus:outline-none"
              />
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-nirman-border">
              <div className="h-7 w-7 rounded-full bg-nirman-dark text-white flex items-center justify-center text-xs font-medium">
                R
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-nirman-dark leading-tight">
                  Rashmin
                </span>
                <span className="text-[10px] text-nirman-text-secondary leading-tight">
                  Lead Evaluator
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
