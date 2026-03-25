import { one } from "@/lib/db-query";
import { ADMIN_EMAIL } from "@/lib/admin-shared";

export { ADMIN_EMAIL };

let _adminEmailCache: { email: string; ts: number } | null = null;
const ADMIN_EMAIL_TTL = 60_000;

export async function getAdminEmail(): Promise<string> {
  const now = Date.now();
  if (_adminEmailCache && now - _adminEmailCache.ts < ADMIN_EMAIL_TTL) {
    return _adminEmailCache.email;
  }
  try {
    const row = await one<{ value: string }>(
      "SELECT value FROM site_settings WHERE key = 'admin_email'"
    );
    const email = row?.value?.trim()
      ? row.value.trim().toLowerCase()
      : ADMIN_EMAIL.toLowerCase().trim();
    _adminEmailCache = { email, ts: now };
    return email;
  } catch {
    return ADMIN_EMAIL.toLowerCase().trim();
  }
}

export function invalidateAdminEmailCache() {
  _adminEmailCache = null;
}

export async function isAdminEmail(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const adminEmail = await getAdminEmail();
  return email.toLowerCase().trim() === adminEmail;
}
