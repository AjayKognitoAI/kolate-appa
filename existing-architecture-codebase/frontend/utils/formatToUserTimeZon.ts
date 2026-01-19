// utils/timezoneUtils.ts
import { DateTime } from "luxon";

/**
 * Normalize ISO timestamp:
 * - truncate microseconds to milliseconds
 * - append Z if timestamp is UTC but missing timezone
 */
const normalizeISO = (iso: string) => {
  if (!iso) return "";
  // truncate microseconds to milliseconds
  let fixed = iso.replace(/(\.\d{3})\d+/, "$1");
  // append Z if no timezone info present (assume UTC)
  if (!/[zZ]|[+\-]\d{2}:?\d{2}$/.test(fixed)) {
    fixed += "Z";
  }
  return fixed;
};

/**
 * Show absolute local time in user's timezone
 */
export const formatToUserLocalTime = (iso: string): string => {
  if (!iso) return "";
  const userZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const normalized = normalizeISO(iso);
  const dt = DateTime.fromISO(normalized).setZone(userZone);
  return dt.toFormat("dd-MMM-yyyy, HH:mm:ss z");
};

/**
 * Show relative time correctly in user's timezone
 */
export const formatRelativeToUser = (iso: string): string => {
  if (!iso) return "";
  const userZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const normalized = normalizeISO(iso);

  const dt = DateTime.fromISO(normalized).setZone(userZone);
  const now = DateTime.now().setZone(userZone);

  const diffInSeconds = now.toSeconds() - dt.toSeconds();

  if (diffInSeconds < 0) return "just now"; // future timestamps
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};
