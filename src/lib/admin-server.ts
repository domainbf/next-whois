import { one } from "@/lib/db-query";
import { ADMIN_EMAIL } from "@/lib/admin-shared";

export { ADMIN_EMAIL };

export async function getAdminEmail(): Promise<string> {
  try {
    const row = await one<{ value: string }>(
      "SELECT value FROM site_settings WHERE key = 'admin_email'"
    );
    if (row?.value?.trim()) return row.value.trim().toLowerCase();
  } catch {}
  return ADMIN_EMAIL.toLowerCase().trim();
}

export async function isAdminEmail(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const adminEmail = await getAdminEmail();
  return email.toLowerCase().trim() === adminEmail;
}
