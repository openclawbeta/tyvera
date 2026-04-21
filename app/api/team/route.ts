/**
 * /api/team
 *
 * Team management. Institutional tier only.
 * Members inherit the owner's subscription tier.
 *
 * GET    — list team members
 * POST   { memberAddress, role?, label? } — add a member
 * DELETE { memberAddress } — remove a member
 * PUT    { memberAddress, role } — update a member's role
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWalletAuth } from "@/lib/api/wallet-auth";
import { resolveWalletTier } from "@/lib/api/require-entitlement";
import { tierHasFeature } from "@/lib/types/tiers";
import {
  listTeamMembers,
  addTeamMember,
  removeTeamMember,
  updateMemberRole,
} from "@/lib/db/teams";
import { parseAddTeamMemberBody, parseSs58, safeParse } from "@/lib/api/validation";

function requireTeamTier(tier: string) {
  if (!tierHasFeature(tier, "team_access")) {
    return NextResponse.json(
      {
        error: "Team access requires Institutional tier",
        currentTier: tier,
        requiredTier: "institutional",
        upgrade_url: "/pricing",
      },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await requireWalletAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const tier = await resolveWalletTier(address);
  const denied = requireTeamTier(tier);
  if (denied) return denied;

  const members = await listTeamMembers(address);
  return NextResponse.json({
    owner: address,
    members,
    count: members.length,
    maxSize: 25,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireWalletAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const tier = await resolveWalletTier(address);
  const denied = requireTeamTier(tier);
  if (denied) return denied;

  const raw = await req.json().catch(() => null);
  const parsed = parseAddTeamMemberBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { memberAddress, label } = parsed.value;
  const roleRaw = (raw as { role?: unknown })?.role;
  const role: "admin" | "member" = roleRaw === "admin" ? "admin" : "member";

  if (memberAddress === address) {
    return NextResponse.json({ error: "Cannot add yourself as a team member" }, { status: 400 });
  }

  try {
    const member = await addTeamMember(address, memberAddress, role, label);
    return NextResponse.json(member, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireWalletAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const tier = await resolveWalletTier(address);
  const denied = requireTeamTier(tier);
  if (denied) return denied;

  const raw = await req.json().catch(() => null);
  const parsed = safeParse(() => {
    if (typeof raw !== "object" || raw === null) throw new Error("request body must be an object");
    return { memberAddress: parseSs58((raw as Record<string, unknown>).memberAddress, "memberAddress") };
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await removeTeamMember(address, parsed.value.memberAddress);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const auth = await requireWalletAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const tier = await resolveWalletTier(address);
  const denied = requireTeamTier(tier);
  if (denied) return denied;

  const raw = await req.json().catch(() => null);
  const parsed = safeParse<{ memberAddress: string; role: "admin" | "member" }>(() => {
    if (typeof raw !== "object" || raw === null) throw new Error("request body must be an object");
    const obj = raw as Record<string, unknown>;
    const role = obj.role;
    if (role !== "admin" && role !== "member") {
      throw new Error("'role' must be 'admin' or 'member'");
    }
    return {
      memberAddress: parseSs58(obj.memberAddress, "memberAddress"),
      role,
    };
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await updateMemberRole(address, parsed.value.memberAddress, parsed.value.role);
  return NextResponse.json({ ok: true });
}
