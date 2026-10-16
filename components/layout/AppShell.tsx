"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Briefcase,
  ChevronRight,
  Compass,
  Layers,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import type { Breadcrumb } from "@/components/ui/PageHeader";

const NAV_ITEMS = [
  { name: "Overview", href: "/dashboard", icon: Layers },
  { name: "Career Intelligence", href: "/career-intelligence", icon: Compass },
  { name: "Recruitment", href: "/recruitment", icon: Briefcase },
  { name: "Candidates", href: "/candidates", icon: Users },
  { name: "Company Intelligence", href: "/insights", icon: Building2 },
  { name: "Settings", href: "/settings", icon: Settings },
] as const;

function pretty(segment: string) {
  return segment
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function buildBreadcrumbs(pathname: string): Breadcrumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Breadcrumb[] = [];
  const [root] = segments;
  const rootItem = NAV_ITEMS.find((n) => n.href === `/${root}`);
  crumbs.push({ label: rootItem?.name ?? pretty(root), href: `/${root}` });

  if (root === "career-intelligence" && segments[1]) {
    crumbs.push({ label: pretty(segments[1]) });
  } else if (root === "recruitment") {
    if (segments[1] === "new") crumbs.push({ label: "New Screening" });
    else if (segments[1]) {
      crumbs.push({ label: "Screening" });
      if (segments[2] === "candidate" && segments[3]) {
        crumbs.push({ label: "Candidate Review" });
      }
    }
  }

  return crumbs;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Cmd/Ctrl + K focuses the global search.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const breadcrumbs = buildBreadcrumbs(pathname);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    router.push(query ? `/candidates?q=${encodeURIComponent(query)}` : "/candidates");
  };

  return (
    <div className="flex min-h-screen bg-nirman-bg text-nirman-dark">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-nirman-dark focus:px-3 focus:py-2 focus:text-xs focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-nirman-dark/50 backdrop-blur-[2px] transition-opacity lg:hidden",
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-nirman-sidebar text-white transition-transform duration-200 ease-out-quint lg:static lg:z-auto lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Primary"
      >
        {/* Brand */}
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5 rounded-md focus-visible:outline-none"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-nirman-accent text-sm font-bold text-white shadow-subtle">
              R
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[13px] font-semibold tracking-tight text-white">
                Role Fit
              </span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
                Intelligence
              </span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-md p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace */}
        <div className="border-b border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <div className="flex items-center justify-between rounded-md">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-nirman-success shadow-[0_0_0_3px_rgba(22,131,91,0.2)]" />
              <span className="text-xs font-medium text-white/90">
                Apex Engineering
              </span>
            </div>
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white/60">
              PROD
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
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
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-white/[0.08] text-white"
                    : "text-white/55 hover:bg-white/[0.05] hover:text-white"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-nirman-accent" />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive
                      ? "text-nirman-accent"
                      : "text-white/40 group-hover:text-white/80"
                  )}
                  aria-hidden
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Engine status */}
        <div className="border-t border-white/10 p-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/80">
                <ShieldCheck className="h-3.5 w-3.5 text-nirman-success" aria-hidden />
                Deterministic Engine
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-nirman-success" />
            </div>
            <p className="text-[10px] leading-relaxed text-white/45">
              Rules and scoring compute strictly in application logic.
            </p>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-nirman-border bg-white/85 px-4 backdrop-blur-md lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="-ml-1 rounded-md p-1.5 text-nirman-text-secondary transition-colors hover:bg-nirman-bg hover:text-nirman-dark lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
              <ol className="flex items-center gap-1 text-xs">
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <li
                      key={`${crumb.label}-${index}`}
                      className="flex items-center gap-1"
                    >
                      {crumb.href && !isLast ? (
                        <Link
                          href={crumb.href}
                          className="rounded-sm text-nirman-text-secondary transition-colors hover:text-nirman-dark"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="truncate font-medium text-nirman-dark">
                          {crumb.label}
                        </span>
                      )}
                      {!isLast && (
                        <ChevronRight
                          className="h-3.5 w-3.5 text-nirman-text-muted/70"
                          aria-hidden
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
            <span className="text-sm font-semibold text-nirman-dark sm:hidden">
              Role Fit
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <form
              onSubmit={handleSearch}
              role="search"
              className="relative hidden md:block"
            >
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-nirman-text-muted"
                aria-hidden
              />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates, skills, roles…"
                aria-label="Global search"
                className="h-9 w-56 rounded-md border border-nirman-border bg-nirman-bg/60 pl-8 pr-16 text-xs text-nirman-dark placeholder:text-nirman-text-muted transition-colors focus:border-nirman-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-nirman-accent/25 lg:w-72"
              />
              <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-nirman-border bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-nirman-text-muted lg:inline-flex">
                ⌘K
              </kbd>
            </form>

            <div className="flex items-center gap-2.5 border-l border-nirman-border pl-2 sm:pl-3">
              <Avatar name="Rashmin Shrestha" tone="dark" size="sm" />
              <div className="hidden flex-col text-left sm:flex">
                <span className="text-xs font-semibold leading-tight text-nirman-dark">
                  Rashmin
                </span>
                <span className="text-[10px] leading-tight text-nirman-text-secondary">
                  Lead Evaluator
                </span>
              </div>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
