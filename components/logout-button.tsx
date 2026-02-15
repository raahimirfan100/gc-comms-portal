"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function LogoutButton({
  className,
  variant = "default",
  size,
  children,
}: {
  className?: string;
  variant?: "default" | "ghost" | "outline" | "secondary" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg" | "icon-xs" | "xs";
  children?: React.ReactNode;
}) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button onClick={logout} variant={variant} size={size} className={cn(className)}>
      {children ?? "Logout"}
    </Button>
  );
}
