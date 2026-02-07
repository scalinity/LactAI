import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale/es";
import { useAppStore } from "@/stores/useAppStore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getDateLocale() {
  const locale = useAppStore.getState().locale;
  return locale === "es" ? { locale: es } : undefined;
}

export function formatDate(date: Date): string {
  return format(date, "MMM d, yyyy", getDateLocale());
}

export function formatTime(date: Date): string {
  return format(date, "h:mm a", getDateLocale());
}

export function formatDateTime(date: Date): string {
  return format(date, "MMM d, h:mm a", getDateLocale());
}

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, ...getDateLocale() });
}

export function formatDayHeader(date: Date): string {
  return format(date, "EEE, MMM d", getDateLocale());
}
