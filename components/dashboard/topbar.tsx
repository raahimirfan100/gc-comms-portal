"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { Tables } from "@/lib/supabase/types";
import { formatEstimatedDate } from "@/lib/ramadan-dates";

export function Topbar() {
  const [activeSeason, setActiveSeason] = useState<Tables<"seasons"> | null>(
    null,
  );

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

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center gap-4">
        <div className="rounded-md bg-card/60 px-4 py-2">
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
      <div className="flex items-center gap-4">
        <ThemeSwitcher />
        <LogoutButton />
      </div>
    </header>
  );
}
