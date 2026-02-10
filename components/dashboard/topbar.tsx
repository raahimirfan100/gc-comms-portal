"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { Tables } from "@/lib/supabase/types";
import { formatEstimatedDate } from "@/lib/ramadan-dates";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileSidebar } from "@/components/dashboard/sidebar";
import { ArrowLeft, Menu } from "lucide-react";

export function Topbar() {
  const router = useRouter();
  const [activeSeason, setActiveSeason] = useState<Tables<"seasons"> | null>(
    null,
  );
  const [isNavOpen, setIsNavOpen] = useState(false);

  async function loadSeasons() {
    const supabase = createClient();
    const { data } = await supabase
      .from("seasons")
      .select("*")
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setActiveSeason(data[0]);
    } else {
      setActiveSeason(null);
    }
  }

  useEffect(() => {
    // Initial load
    loadSeasons();

    // Listen for custom events from elsewhere in the app
    function handleSeasonsUpdated() {
      loadSeasons();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("seasons-updated", handleSeasonsUpdated);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("seasons-updated", handleSeasonsUpdated);
      }
    };
  }, []);

  function handleBackClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/drives");
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b px-4 sm:px-6">
      <div className="flex flex-1 items-center gap-3">
        <button
          type="button"
          onClick={handleBackClick}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center lg:hidden">
          <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
            <SheetTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <MobileSidebar onNavigate={() => setIsNavOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
        <div className="min-w-0 rounded-md bg-card/60 px-3 py-2 sm:px-4">
          {activeSeason ? (
            <>
              <p className="text-sm font-semibold leading-tight">
                {activeSeason.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {activeSeason.hijri_year
                  ? `${activeSeason.hijri_year} AH • `
                  : null}
                {formatEstimatedDate(activeSeason.start_date)} –{" "}
                {formatEstimatedDate(activeSeason.end_date)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active seasons
            </p>
          )}
        </div>
      </div>
      <div className="ml-4 flex flex-shrink-0 items-center gap-3 sm:gap-4">
        <ThemeSwitcher />
        <LogoutButton />
      </div>
    </header>
  );
}
