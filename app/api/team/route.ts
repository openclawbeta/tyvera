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

  let body: { memberAddress?: string; role?: "admin" | "member"; label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { memberAddress, role, label } = body;
  if (!memberAddress) {
    return NextResponse.json({ error: "memberAddress is required" }, { status: 400 });
  }

  if (memberAddress === address) {
    return NextResponse.json({ error: "Cannot add yourself as a team member" }, { status: 400 });
  }

  try {
    const member = await addTeamMember(address, memberAddress, role ?? "member", label);
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

  let body: { memberAddress?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.memberAddress) {
    return NextResponse.json({ error: "memberAddress is required" }, { status: 400 });
  }

  await removeTeamMember(address, body.memberAddress);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const auth = await requireWalletAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const address = auth.address!;

  const tier = await resolveWalletTier(address);
  const denied = requireTeamTier(tier);
  if (denied) return denied;

  let body: { memberAddress?: string; role?: "admin" | "member" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { memberAddress, role } = body;
  if (!memberAddress || !role) {
    return NextResponse.json({ error: "memberAddress and role are required" }, { status: 400 });
  }

  if (!["admin", "member"].includes(role)) {
    return NextResponse.json({ error: "role must be 'admin' or 'member'" }, { status: 400 });
  }

  await updateMemberRole(address, memberAddress, role);
  return NextResponse.json({ ok: true });
}
