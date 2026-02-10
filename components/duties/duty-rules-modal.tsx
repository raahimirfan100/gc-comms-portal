"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { Tables } from "@/lib/supabase/types";

type Props = {
  dutyId: string | null;
  dutyName: string | null;
  open: boolean;
  onClose: () => void;
};

export function DutyRulesModal({
  dutyId,
  dutyName,
  open,
  onClose,
}: Props) {
  const supabase = createClient();
  const [rules, setRules] = useState<Tables<"duty_capacity_rules">[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && dutyId) {
      setLoading(true);
      loadData();
    }
  }, [open, dutyId]);

  async function loadData() {
    if (!dutyId) return;
    const { data } = await supabase
      .from("duty_capacity_rules")
      .select("*")
      .eq("duty_id", dutyId)
      .order("created_at");
    if (data) setRules(data);
    setLoading(false);
  }

  async function saveLinearRule(rule: Tables<"duty_capacity_rules">) {
    setSaving(true);
    const { error } = await supabase
      .from("duty_capacity_rules")
      .update({
        base_count: rule.base_count,
        per_daig_count: rule.per_daig_count,
      })
      .eq("id", rule.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Rule saved");
  }

  async function addTieredRule() {
    if (!dutyId) return;
    const { error } = await supabase.from("duty_capacity_rules").insert({
      duty_id: dutyId,
      capacity_mode: "tiered" as const,
      tier_min_daigs: 0,
      tier_max_daigs: 10,
      tier_capacity: 5,
    });
    if (error) toast.error(error.message);
    else loadData();
  }

  async function updateTierRule(
    id: string,
    field: string,
    value: number | null,
  ) {
    await supabase
      .from("duty_capacity_rules")
      .update({ [field]: value })
      .eq("id", id);
    loadData();
  }

  async function deleteRule(id: string) {
    await supabase.from("duty_capacity_rules").delete().eq("id", id);
    toast.success("Rule deleted");
    loadData();
  }

  function calculatePreview(daigs: number): number {
    const linearRule = rules.find((r) => r.capacity_mode === "linear");
    if (linearRule) {
      return (
        (linearRule.base_count || 0) +
        Math.ceil((linearRule.per_daig_count || 0) * daigs)
      );
    }
    const tieredRules = rules.filter((r) => r.capacity_mode === "tiered");
    const matched = tieredRules.find(
      (r) =>
        (r.tier_min_daigs || 0) <= daigs &&
        (r.tier_max_daigs === null || (r.tier_max_daigs || 0) >= daigs),
    );
    return matched?.tier_capacity || 0;
  }

  const linearRule = rules.find((r) => r.capacity_mode === "linear");
  const tieredRules = rules.filter((r) => r.capacity_mode === "tiered");

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] flex flex-col max-w-2xl">
        <DialogHeader>
          <DialogTitle>Capacity rules: {dutyName ?? "Duty"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Configure how volunteer capacity is calculated from daig count
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4 -mr-4 min-h-0">
            <div className="pb-4">
              {linearRule && (
                <>
                  <section className="py-4">
                    <h3 className="text-base font-semibold">Linear mode</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      capacity = base + ceil(per_daig × daig_count)
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Base count</Label>
                        <Input
                          type="number"
                          value={linearRule.base_count || 0}
                          onChange={(e) => {
                            const updated = {
                              ...linearRule,
                              base_count: parseInt(e.target.value) || 0,
                            };
                            setRules(
                              rules.map((r) =>
                                r.id === linearRule.id ? updated : r,
                              ),
                            );
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Per daig count</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={linearRule.per_daig_count || 0}
                          onChange={(e) => {
                            const updated = {
                              ...linearRule,
                              per_daig_count: parseFloat(e.target.value) || 0,
                            };
                            setRules(
                              rules.map((r) =>
                                r.id === linearRule.id ? updated : r,
                              ),
                            );
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => saveLinearRule(linearRule)}
                      disabled={saving}
                      size="sm"
                      className="mt-4"
                    >
                      {saving && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save linear rule
                    </Button>
                  </section>
                  <Separator />
                </>
              )}

              <section className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold">Tiered mode</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Fixed capacities for daig count ranges
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addTieredRule}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add tier
                  </Button>
                </div>
                {tieredRules.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-4">
                    No tiered rules. Add one to use tiered capacity.
                  </p>
                ) : (
                  <div className="space-y-3 mt-4">
                    {tieredRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-end gap-3 flex-wrap"
                      >
                        <div className="space-y-1">
                          <Label className="text-xs">Min daigs</Label>
                          <Input
                            type="number"
                            className="w-24"
                            value={rule.tier_min_daigs || 0}
                            onChange={(e) =>
                              updateTierRule(
                                rule.id,
                                "tier_min_daigs",
                                parseInt(e.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Max daigs</Label>
                          <Input
                            type="number"
                            className="w-24"
                            value={rule.tier_max_daigs ?? ""}
                            onChange={(e) =>
                              updateTierRule(
                                rule.id,
                                "tier_max_daigs",
                                e.target.value
                                  ? parseInt(e.target.value)
                                  : null,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Capacity</Label>
                          <Input
                            type="number"
                            className="w-24"
                            value={rule.tier_capacity || 0}
                            onChange={(e) =>
                              updateTierRule(
                                rule.id,
                                "tier_capacity",
                                parseInt(e.target.value),
                              )
                            }
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <Separator />

              <section className="py-4">
                <h3 className="text-base font-semibold">Preview</h3>
                <div className="grid grid-cols-5 gap-2 text-sm mt-4">
                  {[5, 10, 15, 20, 30].map((daigs) => (
                    <div
                      key={daigs}
                      className="rounded-md bg-muted/50 px-3 py-2.5 text-center"
                    >
                      <div className="text-muted-foreground text-xs">
                        {daigs} daigs
                      </div>
                      <div className="font-bold">
                        {calculatePreview(daigs)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
