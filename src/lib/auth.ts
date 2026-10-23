import { AccessRole } from "@/types/attendance";

export interface AuthSession {
  userId: string;
  employeeCode: string;
  fullName: string;
  role: AccessRole;
  branchId: string;
  allowOffsiteTimeout: boolean;
  pinChanged: boolean;
}

export const AUTH_STORAGE_KEY = "jats_auth_session_v1";

/**
 * Format internal virtual email from employee code:
 * Avoids requiring real personal emails for senior or field staff.
 */
export function formatInternalEmail(employeeCode: string): string {
  const clean = employeeCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${clean}@jats.internal`;
}

/**
 * Read current session from local storage.
 */
export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

/**
 * Save active session to local storage for long-lived PWA retention.
 */
export function saveSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Clear session on sign out.
 */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
