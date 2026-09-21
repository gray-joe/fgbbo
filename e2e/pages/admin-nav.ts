import { type Page } from "@playwright/test";

export type AdminSection = "Results" | "Weeks" | "Season & bakers" | "Activity";

/** The sub-tabs inside the Admin tab. */
export async function openAdminSection(page: Page, section: AdminSection) {
  await page.getByRole("navigation", { name: "Admin sections" }).getByRole("button", { name: section, exact: true }).click();
}
