"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/lib/supabase/types";

export function Topbar() {
  const [seasons, setSeasons] = useState<Tables<"seasons">[]>([]);
  const [activeSeason, setActiveSeason] = useState<string>("");

  useEffect(() => {
    async function loadSeasons() {
      const supabase = createClient();
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .order("start_date", { ascending: false });
      if (data) {
        setSeasons(data);
        const active = data.find((s) => s.is_active);
        if (active) setActiveSeason(active.id);
      }
    }
    loadSeasons();
  }, []);

  async function handleSeasonChange(seasonId: string) {
    setActiveSeason(seasonId);
    const supabase = createClient();
    // Deactivate all, activate selected
    await supabase.from("seasons").update({ is_active: false }).neq("id", "");
    await supabase
      .from("seasons")
      .update({ is_active: true })
      .eq("id", seasonId);
  }

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center gap-4">
        {seasons.length > 0 && (
          <Select value={activeSeason} onValueChange={handleSeasonChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((season) => (
                <SelectItem key={season.id} value={season.id}>
                  {season.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex items-center gap-4">
        <ThemeSwitcher />
        <LogoutButton />
      </div>
    </header>
  );
}
