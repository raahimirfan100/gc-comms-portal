import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("03")) {
    cleaned = "+92" + cleaned.slice(1);
  } else if (cleaned.startsWith("92")) {
    cleaned = "+" + cleaned;
  } else if (cleaned.startsWith("0092")) {
    cleaned = "+" + cleaned.slice(2);
  } else if (!cleaned.startsWith("+")) {
    cleaned = "+92" + cleaned;
  }
  return cleaned;
}

export function formatPhone(phone: string): string {
  if (phone.startsWith("+92") && phone.length === 13) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  }
  return phone;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(timeStr: string | null): string {
  if (!timeStr) return "—";
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 hover:bg-gray-200/90 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/90",
    open: "bg-blue-100 text-blue-800 hover:bg-blue-200/90 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/70",
    in_progress: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200/90 dark:bg-yellow-950/60 dark:text-yellow-300 dark:hover:bg-yellow-900/70",
    completed: "bg-green-100 text-green-800 hover:bg-green-200/90 dark:bg-green-950/60 dark:text-green-300 dark:hover:bg-green-900/70",
    cancelled: "bg-red-100 text-red-800 hover:bg-red-200/90 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/70",
    assigned: "bg-blue-100 text-blue-800 hover:bg-blue-200/90 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/70",
    confirmed: "bg-green-100 text-green-800 hover:bg-green-200/90 dark:bg-green-950/60 dark:text-green-300 dark:hover:bg-green-900/70",
    en_route: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200/90 dark:bg-yellow-950/60 dark:text-yellow-300 dark:hover:bg-yellow-900/70",
    arrived: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200/90 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/70",
    no_show: "bg-red-100 text-red-800 hover:bg-red-200/90 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/70",
    waitlisted: "bg-orange-100 text-orange-800 hover:bg-orange-200/90 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/70",
  };
  return colors[status] || "bg-gray-100 text-gray-800 hover:bg-gray-200/90 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/90";
}
