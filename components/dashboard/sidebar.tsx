"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  Megaphone,
  ChevronDown,
  Moon,
  MoonStar,
} from "lucide-react";

const navigation = [
  { name: "Seasons", href: "/seasons", icon: MoonStar },
  { name: "Drives", href: "/drives", icon: CalendarDays },
  { name: "Volunteers", href: "/volunteers", icon: Users },
  { name: "Duties", href: "/duties", icon: ClipboardList },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const settingsNav = [
  { name: "Assignment", href: "/settings/assignment" },
  { name: "Sign-up Form", href: "/settings/signup-form" },
  { name: "WhatsApp", href: "/settings/whatsapp" },
  { name: "Google Sheets", href: "/settings/sheets" },
  { name: "AI Calling", href: "/settings/calling" },
  { name: "Reminders", href: "/settings/reminders" },
  { name: "Alerts", href: "/settings/alerts" },
];

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isSeasonsPage = pathname === "/seasons";
  const isSettingsOpen = pathname.startsWith("/settings") && !isSeasonsPage;

  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Moon className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">Grand Citizens</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              data-active={isActive}
              className={cn(
                "nav-item flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="nav-icon h-4 w-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}

        <div className="pt-4">
          <Link
            href="/settings/assignment"
            onClick={onNavigate}
            data-active={isSettingsOpen}
            className={cn(
              "nav-item flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              isSettingsOpen
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Settings className="nav-icon h-4 w-4 shrink-0" />
            Settings
            <ChevronDown
              className={cn(
                "nav-icon ml-auto h-4 w-4 transition-transform duration-200 ease-out",
                isSettingsOpen && "rotate-180",
              )}
            />
          </Link>
          {isSettingsOpen && (
            <div className="nav-settings-expand ml-7 mt-1 space-y-1">
              {settingsNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "nav-settings-item block rounded-md px-3 py-1.5 text-sm",
                      isActive
                        ? "font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden h-full w-64 flex-col border-r bg-card lg:flex">
      <SidebarInner />
    </aside>
  );
}

export function MobileSidebar({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col border-r bg-card">
      <SidebarInner onNavigate={onNavigate} />
    </div>
  );
}
