import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return format(date, "MMM d, yyyy");
}

export function formatTime(date: Date): string {
  return format(date, "h:mm a");
}

export function formatDateTime(date: Date): string {
  return format(date, "MMM d, h:mm a");
}

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function generateId(): string {
  return crypto.randomUUID();
}
