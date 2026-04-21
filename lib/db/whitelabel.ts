/**
 * lib/db/whitelabel.ts
 *
 * Database operations for whitelabel branding overrides.
 * Institutional tier feature.
 */

import { getDb } from "./index";

function rowToObject(columns: string[], values: any[]): Record<string, unknown> {
  return Object.fromEntries(columns.map((c, i) => [c, values[i]]));
}

export interface WhitelabelConfig {
  id: number;
  wallet_address: string;
  logo_url: string | null;
  accent_color: string | null;
  app_name: string | null;
  custom_domain: string | null;
  updated_at: string;
}

export async function getWhitelabelConfig(walletAddress: string): Promise<WhitelabelConfig | null> {
  const db = await getDb();
  const results = await db.query(
    "SELECT * FROM whitelabel_config WHERE wallet_address = ?",
    [walletAddress],
  );
  if (!results.length || !results[0].rows.length) return null;
  const cols = results[0].columns;
  return rowToObject(cols, results[0].rows[0]) as unknown as WhitelabelConfig;
}

export async function upsertWhitelabelConfig(
  walletAddress: string,
  config: {
    logoUrl?: string | null;
    accentColor?: string | null;
    appName?: string | null;
    customDomain?: string | null;
  },
): Promise<WhitelabelConfig> {
  const db = await getDb();

  const existing = await getWhitelabelConfig(walletAddress);

  if (existing) {
    const logoUrl = config.logoUrl !== undefined ? config.logoUrl : existing.logo_url;
    const accentColor = config.accentColor !== undefined ? config.accentColor : existing.accent_color;
    const appName = config.appName !== undefined ? config.appName : existing.app_name;
    const customDomain = config.customDomain !== undefined ? config.customDomain : existing.custom_domain;

    await db.execute(
      `UPDATE whitelabel_config
       SET logo_url = ?, accent_color = ?, app_name = ?, custom_domain = ?, updated_at = datetime('now')
       WHERE wallet_address = ?`,
      [logoUrl, accentColor, appName, customDomain, walletAddress],
    );
  } else {
    await db.execute(
      `INSERT INTO whitelabel_config (wallet_address, logo_url, accent_color, app_name, custom_domain)
       VALUES (?, ?, ?, ?, ?)`,
      [
        walletAddress,
        config.logoUrl ?? null,
        config.accentColor ?? null,
        config.appName ?? null,
        config.customDomain ?? null,
      ],
    );
  }

  return (await getWhitelabelConfig(walletAddress))!;
}
