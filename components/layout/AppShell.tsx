"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Briefcase,
  Compass,
  LayoutGrid,
  Menu,
  Search,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import type { Breadcrumb } from "@/components/ui/PageHeader";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { name: "Overview", href: "/dashboard", icon: LayoutGrid },
      { name: "Recruitment", href: "/recruitment", icon: Briefcase },
      { name: "Candidates", href: "/candidates", icon: Users },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { name: "Career", href: "/career-intelligence", icon: Compass },
      { name: "Companies", href: "/insights", icon: Building2 },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

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
  const rootItem = ALL_NAV_ITEMS.find((n) => n.href === `/${root}`);
  crumbs.push({ label: rootItem?.name ?? pretty(root), href: `/${root}` });

  if (root === "career-intelligence" && segments[1]) {
    crumbs.push({ label: pretty(segments[1]) });
  } else if (root === "recruitment") {
    if (segments[1] === "new") crumbs.push({ label: "New screening" });
    else if (segments[1]) {
      crumbs.push({ label: "Screening" });
      if (segments[2] === "candidate" && segments[3]) {
        crumbs.push({ label: "Candidate review" });
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
    // Cmd/Ctrl + K focuses the global search.
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
    setMobileMenuOpen(false);
    const query = searchQuery.trim();
    router.push(query ? `/candidates?q=${encodeURIComponent(query)}` : "/candidates");
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

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
          "fixed inset-0 z-40 bg-nirman-dark/40 transition-opacity lg:hidden",
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-nirman-border bg-nirman-sidebar transition-transform duration-200 ease-out-quint lg:static lg:z-auto lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Primary"
      >
        {/* Brand */}
        <div className="flex h-14 items-center justify-between px-4">
          <Link
            href="/dashboard"
            onClick={closeMobileMenu}
            className="flex items-center gap-2 rounded-md focus-visible:outline-none"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-nirman-dark text-[12px] font-semibold text-white">
              R
            </span>
            <span className="text-[14px] font-semibold tracking-tight text-nirman-dark">
              Role Fit
            </span>
          </Link>
          <button
            type="button"
            className="rounded-md p-1.5 text-nirman-text-muted transition-colors hover:bg-black/[0.05] hover:text-nirman-dark lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {NAV_GROUPS.map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && "mt-6")}>
              <div className="px-2 pb-1.5 text-[12px] font-medium text-nirman-text-muted">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={closeMobileMenu}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
                        isActive
                          ? "bg-black/[0.05] text-nirman-dark"
                          : "text-nirman-text-secondary hover:bg-black/[0.035] hover:text-nirman-dark"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-nirman-dark" : "text-nirman-text-muted"
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer: settings + account */}
        <div className="border-t border-nirman-border p-3">
          <Link
            href="/settings"
            onClick={closeMobileMenu}
            aria-current={pathname.startsWith("/settings") ? "page" : undefined}
            className={cn(
              "mb-1 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
              pathname.startsWith("/settings")
                ? "bg-black/[0.05] text-nirman-dark"
                : "text-nirman-text-secondary hover:bg-black/[0.035] hover:text-nirman-dark"
            )}
          >
            <Settings className="h-4 w-4 shrink-0 text-nirman-text-muted" aria-hidden />
            Settings
          </Link>

          <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
            <Avatar name="Rashmin Shrestha" tone="dark" size="sm" />
            <div className="min-w-0">
              <span className="block truncate text-[13px] font-medium leading-tight text-nirman-dark">
                Rashmin Shrestha
              </span>
              <span className="block truncate text-[12px] leading-tight text-nirman-text-muted">
                Apex Engineering
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-nirman-border bg-nirman-bg/85 px-4 backdrop-blur-md lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="-ml-1.5 rounded-md p-1.5 text-nirman-text-secondary transition-colors hover:bg-black/[0.05] hover:text-nirman-dark lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
              <ol className="flex items-center gap-1.5 text-[13px]">
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <li
                      key={`${crumb.label}-${index}`}
                      className="flex items-center gap-1.5"
                    >
                      {crumb.href && !isLast ? (
                        <Link
                          href={crumb.href}
                          className="rounded-sm text-nirman-text-muted transition-colors hover:text-nirman-text-primary"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="truncate font-medium text-nirman-dark">
                          {crumb.label}
                        </span>
                      )}
                      {!isLast && (
                        <span className="text-nirman-text-muted/60" aria-hidden>
                          /
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
            <span className="text-[13px] font-semibold text-nirman-dark sm:hidden">
              Role Fit
            </span>
          </div>

          {pathname !== "/candidates" && (
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
                placeholder="Search candidates or roles…"
                aria-label="Global search"
                className="h-8 w-56 rounded-md border border-nirman-border bg-white pl-8 pr-14 text-[13px] text-nirman-dark placeholder:text-nirman-text-muted transition-colors focus:border-nirman-accent focus:outline-none focus:ring-2 focus:ring-nirman-accent/20 lg:w-72"
              />
              <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center rounded border border-nirman-border bg-nirman-inset px-1.5 py-0.5 font-mono text-[12px] text-nirman-text-muted lg:inline-flex">
                ⌘K
              </kbd>
            </form>
          )}
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
