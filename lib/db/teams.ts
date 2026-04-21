/**
 * lib/db/teams.ts
 *
 * Database operations for team/org management.
 * Institutional tier feature.
 *
 * Team members inherit the org owner's subscription tier.
 * The owner is always implicitly a member with role "owner".
 */

import { getDb } from "./index";

function rowToObject(columns: string[], values: any[]): Record<string, unknown> {
  return Object.fromEntries(columns.map((c, i) => [c, values[i]]));
}

export interface TeamMember {
  id: number;
  owner_address: string;
  member_address: string;
  role: "owner" | "admin" | "member";
  label: string | null;
  added_at: string;
}

const MAX_TEAM_SIZE = 25;

/* ── CRUD ─────────────────────────────────────────────────────────── */

export async function listTeamMembers(ownerAddress: string): Promise<TeamMember[]> {
  const db = await getDb();
  const results = await db.query(
    "SELECT * FROM team_members WHERE owner_address = ? ORDER BY added_at",
    [ownerAddress],
  );
  if (!results.length || !results[0].rows.length) return [];
  const cols = results[0].columns;
  return results[0].rows.map((row) => rowToObject(cols, row) as unknown as TeamMember);
}

export async function addTeamMember(
  ownerAddress: string,
  memberAddress: string,
  role: "admin" | "member" = "member",
  label?: string,
): Promise<TeamMember> {
  const db = await getDb();

  // Check team size limit
  const existing = await listTeamMembers(ownerAddress);
  if (existing.length >= MAX_TEAM_SIZE) {
    throw new Error(`Team size limit reached (${MAX_TEAM_SIZE})`);
  }

  // Check duplicate
  const dup = existing.find((m) => m.member_address === memberAddress);
  if (dup) {
    throw new Error("Member already on team");
  }

  await db.execute(
    `INSERT INTO team_members (owner_address, member_address, role, label)
     VALUES (?, ?, ?, ?)`,
    [ownerAddress, memberAddress, role, label ?? null],
  );

  const results = await db.query(
    "SELECT * FROM team_members WHERE owner_address = ? AND member_address = ?",
    [ownerAddress, memberAddress],
  );
  const cols = results[0].columns;
  return rowToObject(cols, results[0].rows[0]) as unknown as TeamMember;
}

export async function removeTeamMember(
  ownerAddress: string,
  memberAddress: string,
): Promise<boolean> {
  const db = await getDb();
  await db.execute(
    "DELETE FROM team_members WHERE owner_address = ? AND member_address = ?",
    [ownerAddress, memberAddress],
  );
  return true;
}

export async function updateMemberRole(
  ownerAddress: string,
  memberAddress: string,
  role: "admin" | "member",
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE team_members SET role = ? WHERE owner_address = ? AND member_address = ?",
    [role, ownerAddress, memberAddress],
  );
}

/**
 * Resolve the team owner for a given address.
 * If the address is a team member, returns the owner's address.
 * If the address is an owner or not on any team, returns null.
 * This allows team members to inherit the owner's tier.
 */
export async function resolveTeamOwner(memberAddress: string): Promise<string | null> {
  const db = await getDb();
  const results = await db.query(
    "SELECT owner_address FROM team_members WHERE member_address = ? LIMIT 1",
    [memberAddress],
  );
  if (!results.length || !results[0].rows.length) return null;
  return results[0].rows[0][0] as string;
}
