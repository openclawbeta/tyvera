#!/usr/bin/env python3
"""
scripts/discover_subtensor_storage.py
=======================================
One-shot debug tool: connect to Subtensor and print everything about the
live runtime's storage layout, then make sample queries to show real values.

Run this when the main pipeline prints "storage function not found" to find
the correct pallet/storage-function names for the current runtime.

Usage
-----
    python scripts/discover_subtensor_storage.py
    python scripts/discover_subtensor_storage.py --network ws://127.0.0.1:9944
    python scripts/discover_subtensor_storage.py --pallet SubtensorModule
    python scripts/discover_subtensor_storage.py --sample 1 19 64  # netuid samples

Output sections
---------------
  1. All pallets + storage function names
  2. SubtensorModule storage functions with type info
  3. Sample queries for netuid-keyed maps using the provided --sample netuids

This file is intentionally standalone — no imports from the rest of the repo.
"""

from __future__ import annotations

import argparse
import os
import sys
from typing import Any


def scalar(raw: Any) -> Any:
    if hasattr(raw, "value"):
        return raw.value
    return raw


def decode_bytes(raw: Any) -> str:
    val = scalar(raw)
    if isinstance(val, (bytes, bytearray)):
        return val.decode("utf-8", errors="replace").strip("\x00").strip()
    if isinstance(val, list):
        try:
            return bytes(val).decode("utf-8", errors="replace").strip("\x00").strip()
        except Exception:
            return ""
    return str(val or "").strip()


def get_pallets(substrate) -> list[dict]:
    meta     = substrate.get_metadata()
    meta_val = meta.value if hasattr(meta, "value") else meta
    for vk in ("V14", "V15", "V13", "V12"):
        if isinstance(meta_val, dict) and vk in meta_val:
            return meta_val[vk].get("pallets", [])
    if isinstance(meta_val, dict):
        return meta_val.get("pallets", [])
    return []


def describe_type(itype: dict) -> str:
    if "Map" in itype:
        m    = itype["Map"]
        ktyp = m.get("key", "?")
        vtyp = m.get("value", "?")
        hmod = m.get("hashers", [""])[0] if m.get("hashers") else ""
        return f"Map({hmod})  {ktyp} → {vtyp}"
    if "DoubleMap" in itype:
        dm   = itype["DoubleMap"]
        k1   = dm.get("key1", "?")
        k2   = dm.get("key2", "?")
        vtyp = dm.get("value", "?")
        return f"DoubleMap  ({k1}, {k2}) → {vtyp}"
    if "Plain" in itype:
        return f"Plain  {itype['Plain']}"
    if "NMap" in itype:
        nm   = itype["NMap"]
        keys = nm.get("keys", [])
        vtyp = nm.get("value", "?")
        return f"NMap  {keys} → {vtyp}"
    return str(itype)[:80]


def section(title: str) -> None:
    bar = "═" * 72
    print(f"\n{bar}")
    print(f"  {title}")
    print(bar)


def try_query_map(substrate, pallet: str, fn: str, sample_netuids: list[int]) -> None:
    """Attempt a query_map and print a few sample values."""
    print(f"\n    → sample query_map({pallet}.{fn}):")
    try:
        entries = substrate.query_map(
            module=pallet,
            storage_function=fn,
            params=[],
            page_size=5,
        )
        count = 0
        for key, value in entries:
            raw_key = key[0] if isinstance(key, (list, tuple)) else key
            nuid    = scalar(raw_key)
            val     = scalar(value)
            print(f"      netuid={nuid}  value={repr(val)[:60]}")
            count += 1
            if count >= 5:
                break
        if count == 0:
            print("      (no entries)")
    except Exception as exc:
        print(f"      FAILED: {exc}")


def try_query_single(substrate, pallet: str, fn: str, netuid: int) -> None:
    """Query a single netuid and print the result."""
    try:
        result = substrate.query(pallet, fn, [netuid])
        val    = scalar(result)
        print(f"      query({pallet}.{fn}[{netuid}]) = {repr(val)[:80]}")
    except Exception as exc:
        print(f"      query({pallet}.{fn}[{netuid}]) FAILED: {exc}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Dump Subtensor runtime storage layout for debugging.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--network", "-n",
        default=os.environ.get("BITTENSOR_NETWORK", "finney"),
        help="Subtensor network or ws:// endpoint (default: finney)",
    )
    parser.add_argument(
        "--pallet", "-p",
        default="SubtensorModule",
        help="Pallet to focus on for detailed output (default: SubtensorModule)",
    )
    parser.add_argument(
        "--sample",
        nargs="+",
        type=int,
        default=[1, 19, 64],
        metavar="NETUID",
        help="Netuid(s) to use for sample queries (default: 1 19 64)",
    )
    parser.add_argument(
        "--no-samples",
        action="store_true",
        help="Skip sample queries (faster; just dump storage names)",
    )
    args = parser.parse_args()

    try:
        from bittensor.core.subtensor import Subtensor
    except ImportError as exc:
        print(f"ERROR: bittensor not installed — {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"Connecting to {args.network!r} …", flush=True)
    subtensor = Subtensor(network=args.network)
    sub       = subtensor.substrate
    print("Connected.\n", flush=True)

    # ── Section 1: All pallets summary ────────────────────────────────────────
    section("All pallets in this runtime")
    pallets = get_pallets(sub)
    if not pallets:
        print("  Could not enumerate pallets from metadata.")
    else:
        for p in sorted(pallets, key=lambda x: x.get("name", "")):
            pname   = p.get("name", "?")
            storage = p.get("storage") or {}
            n_items = len(storage.get("items", []))
            print(f"  {pname:40s}  {n_items:3d} storage items")

    # ── Section 2: Focused pallet storage detail ──────────────────────────────
    section(f"{args.pallet} — full storage listing")

    target_items: list[dict] = []
    for p in pallets:
        if p.get("name") == args.pallet:
            storage      = p.get("storage") or {}
            target_items = storage.get("items", [])
            break

    if not target_items:
        print(f"  Pallet {args.pallet!r} not found or has no storage items.")
    else:
        for item in sorted(target_items, key=lambda i: i.get("name", "")):
            name  = item.get("name", "?")
            itype = item.get("type", {})
            desc  = describe_type(itype)
            mod   = item.get("modifier", "")
            print(f"  {name:42s}  [{mod:8s}]  {desc}")

    # ── Section 3: Sample queries for known-useful fields ─────────────────────
    if not args.no_samples and target_items:
        section(f"Sample queries — netuids {args.sample}")

        # Try to identify map-type storage functions (likely netuid-keyed)
        map_items = []
        for item in sorted(target_items, key=lambda i: i.get("name", "")):
            itype = item.get("type", {})
            if "Map" in itype or "DoubleMap" in itype or "NMap" in itype:
                map_items.append(item.get("name", ""))

        print(f"\n  {len(map_items)} Map/DoubleMap/NMap storage functions found.")
        print("  Attempting a page_size=5 query_map on each to identify netuid-keyed ones.\n")

        # Priority: probe fields we care about first
        priority = [
            "SubnetAlphaIn", "AlphaIn", "TaoIn", "SubnetTaoIn",
            "EmissionValues", "SubnetEmission", "PendingEmission",
            "NetworkName", "SubnetName",
            "NetworkSymbol", "SubnetSymbol",
            "SubnetworkN", "NetworkRegisteredAt",
        ]
        ordered = [f for f in priority if f in map_items] + \
                  [f for f in map_items if f not in priority]

        for fn in ordered[:40]:  # cap at 40 to avoid very long runs
            print(f"\n  [{fn}]")
            try_query_map(sub, args.pallet, fn, args.sample)

        # ── Point queries for each sample netuid ──────────────────────────────
        section(f"Point queries for sample netuids {args.sample}")
        important = [
            "SubnetAlphaIn", "AlphaIn", "TaoIn",
            "EmissionValues", "SubnetEmission",
            "SubnetworkN", "NetworkRegisteredAt",
            "NetworkName", "SubnetName",
            "NetworkSymbol", "SubnetSymbol",
        ]
        for netuid in args.sample:
            print(f"\n  netuid = {netuid}")
            for fn in important:
                if fn in map_items:
                    try_query_single(sub, args.pallet, fn, netuid)

    print("\nDone.")


if __name__ == "__main__":
    main()
