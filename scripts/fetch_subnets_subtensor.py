#!/usr/bin/env python3
"""
scripts/fetch_subnets_subtensor.py
===================================
Phase 3 / 5 / 5.1 / 5.2 — Tyvera canonical subnet ingestion pipeline.

Reads all live subnets directly from the Bittensor blockchain via
bittensor.core.subtensor.Subtensor, normalizes the data into the
shape Tyvera's UI layer expects, and writes a JSON snapshot to:

    public/data/subnets.json

The Next.js route handler (app/api/subnets/route.ts) serves this file
as its highest-priority data source — ahead of TaoStats and the static
TypeScript snapshot.

Phase 5.2 changes — emission and staker fixes
---------------------------------------------
ROOT CAUSE (emissions all zero):
  The resolved storage key "Emission" exists in the SubtensorModule pallet, but
  it is a StorageValue<Vec<u64>> — a plain Vec of 128+ u64 values indexed by
  netuid position — NOT a StorageMap<netuid, u64>.  Calling substrate.query_map()
  on a plain StorageValue returns an empty iterator, which our batch_query_map()
  silently discards, leaving all subnets with emission_rao_per_block=0.

FIX — three-layer emission fallback (in priority order):
  1. StorageValue plain-Vec query: substrate.query("SubtensorModule", "Emission")
     returns the full Vec<u64>; index by position = netuid.
  2. SDK object attribute: DynamicInfo.emission (populated by the SDK's own RPC
     calls, independent of any storage key name assumption).
  3. TaoIn-proportional split: each subnet's fraction of total SubnetAlphaIn
     pool × DAILY_NETWORK_TAO — a reasonable proxy when no emission source works.

STAKER COUNT (SubnetworkN = 256):
  SubnetworkN[netuid] is the actual registered neuron count.  256 is the standard
  cap for most Bittensor subnets and IS the correct count — mature subnets fill up.
  Phase 5.2 adds a secondary attempt via "Active" (Vec<bool> per subnet) to count
  truly active neurons, which may be smaller than 256 for less active subnets.

NAMES:
  No on-chain name StorageMap was found.  The SDK's DynamicInfo objects often carry
  a subnet_name attribute (bytes → str); Phase 5.2 extracts this in the same pass
  as SDK emissions.  Curated metadata (45 subnets) remains the primary name source.

Usage
-----
    python scripts/fetch_subnets_subtensor.py
    python scripts/fetch_subnets_subtensor.py --network ws://127.0.0.1:9944
    python scripts/fetch_subnets_subtensor.py --inspect       # dump first SDK object attrs
    python scripts/fetch_subnets_subtensor.py --list-storage  # dump all pallet storage names
    python scripts/fetch_subnets_subtensor.py --explain       # print field provenance

Environment variables
---------------------
    BITTENSOR_NETWORK   override --network

Setup
-----
    pip install -r scripts/requirements.txt   # bittensor>=8.5.0
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ── Output path ────────────────────────────────────────────────────────────────

SCRIPT_DIR   = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_OUT  = PROJECT_ROOT / "public" / "data" / "subnets.json"

# ── Constants ──────────────────────────────────────────────────────────────────

BLOCKS_PER_DAY    = 7200       # ~12 s per block on Bittensor mainnet
DAILY_NETWORK_TAO = 7200.0     # approx total TAO emitted per day across all subnets
RAO_PER_TAO       = 1_000_000_000  # 1 TAO = 1e9 RAO

# ── Storage key candidates (tried in priority order) ───────────────────────────
#
# Phase 5.1: resolved from runtime metadata at startup.
# Phase 5.2: Emission moved to top after confirming it's a Vec, not a Map.

TAO_IN_CANDIDATES = [
    "SubnetAlphaIn",   # dTAO alpha-pool era (confirmed working)
    "AlphaIn",
    "TaoIn",
    "SubnetTaoIn",
    "SubnetTaoInPool",
    "SubnetAlpha",
    "AlphaValues",
    "SubnetPoolTao",
    "TotalStake",
    "TotalIssuance",
]

EMISSION_CANDIDATES = [
    # Phase 5.2: Emission is a StorageValue<Vec<u64>>, NOT a StorageMap.
    # We keep it in this list so it resolves, then query it as a plain Vec.
    "Emission",
    "EmissionValues",
    "SubnetEmission",
    "PendingEmission",
    "EmissionValue",
    "SubnetEmissionValues",
]

NAME_CANDIDATES = [
    "NetworkName",
    "SubnetName",
    "SubnetNames",
    "Name",
    "SubnetIdentity",
]

SYMBOL_CANDIDATES = [
    "TokenSymbol",     # confirmed resolving in Phase 5.1
    "NetworkSymbol",
    "SubnetSymbol",
    "Symbol",
    "SubnetAlphaSymbol",
    "Alpha",
]

# Known-stable keys (verified working):
STAKERS_KEY = "SubnetworkN"
REG_AT_KEY  = "NetworkRegisteredAt"
ACTIVE_KEY  = "Active"   # Vec<bool> per subnet — attempt for active-neuron count


# ── Derivation helpers (mirrors lib/data/subnets-real-helpers.ts) ─────────────

def derive_risk(liquidity: float, stakers: int, yield_delta_7d: float) -> str:
    absd = abs(yield_delta_7d)
    if liquidity >= 8000 and stakers >= 500:                           return "LOW"
    if liquidity >= 3000 and stakers >= 150 and absd < 5:             return "MODERATE"
    if liquidity < 1500  or  stakers < 80   or  absd >= 8:            return "SPECULATIVE"
    return "HIGH"


def derive_score(liquidity: float, yield_pct: float, stakers: int, yield_delta_7d: float) -> int:
    liq_score   = min(100.0, (liquidity / 15000.0) * 100.0) * 0.40
    yield_score = min(100.0, (yield_pct  /    35.0) * 100.0) * 0.30
    stake_score = min(100.0, (stakers    /  2000.0) * 100.0) * 0.20
    stability   = max(0.0,   100.0 - abs(yield_delta_7d) * 5.0) * 0.10
    return round(liq_score + yield_score + stake_score + stability)


def derive_yield(emissions_per_day: float, tao_in: float) -> float:
    if not tao_in or tao_in <= 0:
        return 0.0
    return round((emissions_per_day / tao_in) * 365.0 * 100.0, 2)


def derive_breakeven(yield_pct: float) -> int:
    if yield_pct <= 0:
        return 999
    return round(0.001 / (yield_pct / 100.0 / 365.0))


def build_momentum(base_yield: float, delta_7d: float) -> list[float]:
    result = []
    for i in range(14):
        progress = i / 13.0
        trend    = delta_7d * (1.0 - progress)
        jitter   = math.sin(i * 1.4) * 0.15
        result.append(round(max(0.0, base_yield - trend + jitter), 1))
    return result


# ── Curated metadata (mirrors lib/data/subnets-curated-metadata.ts) ───────────

CURATED: dict[int, dict[str, str]] = {
    1:  {"name": "Apex",                "symbol": "APEX",    "category": "Language",        "description": "The original Bittensor text-inference subnet. Miners compete to produce best responses to LLM queries using state-of-the-art open-source models. Established, high-liquidity, and a benchmark for subnet performance across the network."},
    3:  {"name": "Templar",             "symbol": "TMPL",    "category": "Language",        "description": "Decentralized distributed training for large language models. Miners contribute GPU compute and compete to produce useful training gradients, while validators score update quality. One of Bittensor's most active on-chain LLM training subnets."},
    4:  {"name": "Targon",              "symbol": "TARG",    "category": "Multi-Modal",     "description": "Deterministic verification framework for OpenAI-compatible AI inference, developed by Manifold Labs. Miners operate high-performance GPU endpoints serving both synthetic and organic AI queries. Known as Bittensor's 'industrial hub' for enterprise-grade verifiable compute."},
    8:  {"name": "Taoshi",              "symbol": "PTN",     "category": "Finance",         "description": "Proprietary Trading Network (PTN) by Taoshi. Decentralized AI/ML models analyze data across multiple asset classes to deliver sophisticated trading signals and predictions. Democratizes access to institutional-grade algorithmic trading intelligence via Bittensor incentives."},
    9:  {"name": "Pretrain",            "symbol": "PT",      "category": "Language",        "description": "Pretraining subnet incentivizing miners to train foundation-model weights from scratch. Validators evaluate model quality via standardised benchmarks. A core research subnet for open-source foundation model development."},
    11: {"name": "Transcription",       "symbol": "STAO",    "category": "Language",        "description": "Decentralized audio-to-text transcription using state-of-the-art speech recognition models. Miners compete to provide accurate, low-latency transcription across diverse languages, accents, and audio quality levels."},
    13: {"name": "Data Universe",       "symbol": "DATA",    "category": "Data",            "description": "Bittensor's decentralized data layer by Macrocosmos. Miners collect and store fresh, high-value data from across the web for use by other subnets. Built with a focus on decentralization, scalability, and data freshness."},
    14: {"name": "LLM Defender",        "symbol": "LLMD",    "category": "Developer Tools", "description": "Security-focused subnet for detecting prompt injection attacks and adversarial inputs targeting large language models. Miners build and serve specialized defense models evaluated on adversarial benchmarks."},
    15: {"name": "Blockchain Insights", "symbol": "BITS",    "category": "Data",            "description": "On-chain analytics and blockchain data intelligence subnet. Miners process and serve structured blockchain data, enabling downstream AI applications to query verified on-chain information."},
    16: {"name": "Audio Transcription", "symbol": "AUD",     "category": "Language",        "description": "Specialised audio processing and transcription subnet. Miners run high-accuracy speech recognition across multiple languages and domains, competing on accuracy, latency, and vocabulary coverage."},
    17: {"name": "3D Generation",       "symbol": "3DG",     "category": "Creative",        "description": "Decentralized 3D asset generation and model synthesis. Miners produce high-quality 3D meshes and textures from text or image prompts, scored by validators on geometric fidelity and prompt adherence."},
    18: {"name": "Cortex.t",            "symbol": "CORT",    "category": "Multi-Modal",     "description": "High-performance multi-modal inference subnet built by the Opentensor Foundation. Provides access to advanced open-source models for text, image, and structured-data workloads with deep validator participation."},
    19: {"name": "Nineteen",            "symbol": "NIN",     "category": "Language",        "description": "Leading decentralized AI inference API subnet by Nineteen.ai. Provides scalable access to frontier open-source models including LLaMA 3, Stable Diffusion derivatives, and others. API-ready for enterprise integration."},
    20: {"name": "BitAgent",            "symbol": "AGENT",   "category": "Developer Tools", "description": "Autonomous AI agent subnet. Miners build and serve goal-directed agents capable of tool use, web browsing, and multi-step task completion. Evaluated on real-world task benchmarks."},
    21: {"name": "OMEGA",               "symbol": "OMEGA",   "category": "Multi-Modal",     "description": "World's largest decentralized multimodal dataset network by OMEGA Labs. Miners curate diverse video, audio, and text data — over 1M hours of footage — to power any-to-any AGI model training."},
    22: {"name": "Meta-Search",         "symbol": "META",    "category": "Data",            "description": "Decentralized AI-powered search and information retrieval. Miners index and serve web content through AI ranking models, competing on relevance and freshness of results."},
    23: {"name": "NicheImage",          "symbol": "NIMG",    "category": "Creative",        "description": "High-quality image generation subnet with fine-grained quality scoring. Miners generate images from detailed prompts, evaluated by validators using state-of-the-art image quality metrics and prompt adherence models."},
    24: {"name": "Omega",               "symbol": "OMG",     "category": "Multi-Modal",     "description": "Decentralized video understanding and multimodal AI subnet. Miners process video streams for content understanding, summarization, and semantic search applications."},
    25: {"name": "Mainframe",           "symbol": "MF",      "category": "Science",         "description": "Decentralized scientific compute subnet. Mainframe uses Bittensor incentives to distribute high-complexity protein folding and molecular simulation workloads across a global network of compute providers."},
    26: {"name": "Image Alchemy",       "symbol": "ALCH",    "category": "Creative",        "description": "Advanced image manipulation and transformation subnet. Miners apply specialised AI models for inpainting, outpainting, style transfer, and super-resolution, evaluated on perceptual quality benchmarks."},
    27: {"name": "Compute",             "symbol": "COMP",    "category": "Infrastructure",  "description": "Verifiable distributed supercomputing by NeuralInternet. Miners provide GPU and CPU compute resources with cryptographic verification of task execution. A general-purpose decentralized compute layer for Bittensor."},
    28: {"name": "Foundational Voices", "symbol": "VOICE",   "category": "Creative",        "description": "Text-to-speech and voice synthesis subnet. Miners produce natural, expressive speech across languages and speaking styles, evaluated on intelligibility, naturalness, and speaker diversity."},
    29: {"name": "Fractal",             "symbol": "FRAC",    "category": "Infrastructure",  "description": "Decentralized IT infrastructure management and anomaly detection. Miners monitor and analyze system metrics to surface optimization opportunities and security anomalies across distributed infrastructure."},
    30: {"name": "TemporalFlow",        "symbol": "TFLOW",   "category": "Finance",         "description": "Time series forecasting and temporal reasoning subnet. Miners develop models for multi-horizon prediction across financial, scientific, and operational domains, evaluated on held-out forecasting benchmarks."},
    32: {"name": "ItsAI",               "symbol": "ITSAI",   "category": "Developer Tools", "description": "AI-generated content detection and verification subnet. Miners train and serve models that classify text as human-written or AI-generated, enabling authenticity tools for platforms, publishers, and enterprises."},
    33: {"name": "ReadyPlayerMine",     "symbol": "RPM",     "category": "Creative",        "description": "Gaming AI and character intelligence subnet. Miners develop and serve AI models for non-player characters, procedural game content generation, and game state analysis."},
    34: {"name": "BitMind",             "symbol": "BMIND",   "category": "Developer Tools", "description": "AI-generated content detection at scale by BitMind. Miners run multimodal deepfake and synthetic media detection models, providing authenticity verification for images, video, and audio content."},
    35: {"name": "LogicNet",            "symbol": "LOGIC",   "category": "Science",         "description": "Mathematical reasoning and formal logic subnet. Miners produce verified solutions to mathematical problems, theorem proving tasks, and structured reasoning benchmarks using specialised LLM fine-tunes."},
    36: {"name": "Automata",            "symbol": "AUTO",    "category": "Developer Tools", "description": "Workflow automation and code generation subnet. Miners build AI agents that generate, execute, and verify automation scripts and software, evaluated on real-world task completion benchmarks."},
    37: {"name": "FinAgent",            "symbol": "FIN",     "category": "Finance",         "description": "Financial analysis and reporting AI subnet. Miners produce structured financial summaries, earnings analyses, and investment research from unstructured financial text and data streams."},
    38: {"name": "Distributed Training","symbol": "DTRAIN",  "category": "Language",        "description": "Decentralized neural network training using federated learning techniques. Miners contribute gradient updates across shared model architectures, enabling large-scale collaborative model training without centralisation."},
    39: {"name": "Basilica",            "symbol": "BSLC",    "category": "Developer Tools", "description": "Multi-modal content moderation and safety subnet by Basilica. Miners run classification models for harmful content detection across text, image, and video, supporting platform trust and safety applications."},
    40: {"name": "Chunking",            "symbol": "CHUNK",   "category": "Developer Tools", "description": "Token-optimization and text-chunking subnet for Retrieval-Augmented Generation (RAG) pipelines. Miners produce optimal chunk boundaries and embedding strategies that maximize retrieval accuracy."},
    41: {"name": "Sportstensor",        "symbol": "SPORT",   "category": "Finance",         "description": "Sports prediction and analytics subnet by Sportstensor. Miners develop AI models for match outcome prediction across major sports leagues, evaluated on calibrated probabilistic accuracy."},
    42: {"name": "Gen42",               "symbol": "GEN42",   "category": "Language",        "description": "Productivity AI and knowledge management subnet. Miners build assistants for document summarization, meeting intelligence, and enterprise knowledge extraction, evaluated on real-world productivity benchmarks."},
    43: {"name": "Graphite",            "symbol": "GRPH",    "category": "Creative",        "description": "Text-to-video generation subnet. Miners produce short video clips from text prompts using diffusion-based models, evaluated on temporal consistency, visual quality, and prompt faithfulness."},
    44: {"name": "Pippa",               "symbol": "PIPPA",   "category": "Language",        "description": "Social AI and conversational intelligence subnet. Miners serve personality-consistent AI companions and conversation agents, evaluated on engagement, coherence, and safety benchmarks."},
    45: {"name": "Wildcards",           "symbol": "WILD",    "category": "Creative",        "description": "Creative image generation with fine-grained style control. Miners specialize in artistic and illustrative image synthesis, evaluated on aesthetic quality and stylistic diversity metrics."},
    47: {"name": "Condense-AI",         "symbol": "COND",    "category": "Language",        "description": "Long-document summarization and compression subnet. Miners produce high-fidelity summaries of long-form content including research papers, legal documents, and technical reports."},
    49: {"name": "Hivetrain",           "symbol": "HIVE",    "category": "Science",         "description": "Automated Machine Learning (AutoML) subnet by Hivetrain. Miners run distributed hyperparameter optimization and neural architecture search, providing a decentralized platform for ML engineering automation."},
    50: {"name": "Celium",              "symbol": "CEL",     "category": "Infrastructure",  "description": "Decentralized compute marketplace subnet. Miners provide GPU resources for AI workloads with verifiable execution guarantees, targeting latency-sensitive inference and fine-tuning jobs."},
    52: {"name": "DatAgent",            "symbol": "DAGT",    "category": "Data",            "description": "Data-driven AI agent subnet for structured data interaction. Miners build agents capable of querying databases, APIs, and data streams to answer natural language questions with verifiable accuracy."},
    56: {"name": "Gradients",           "symbol": "GRAD",    "category": "Language",        "description": "Gradient-based model optimization and fine-tuning subnet. Miners specialize in efficient parameter-efficient fine-tuning (PEFT) methods, enabling task-specific model adaptation at scale."},
    57: {"name": "Gaia",                "symbol": "GAIA",    "category": "Science",         "description": "Environmental and climate data AI subnet. Miners process geospatial and environmental datasets to power prediction models for weather, climate, and ecological monitoring applications."},
    64: {"name": "Chutes",              "symbol": "CHUTES",  "category": "Infrastructure",  "description": "Decentralized AI compute platform by Chutes. Runs over 100 billion tokens per day across a distributed GPU network. Provides scalable, low-cost inference and fine-tuning for open-source AI models."},
}


def build_fallback_meta(netuid: int, chain_name: str = "", chain_symbol: str = "") -> dict[str, str]:
    name   = chain_name.strip()   or f"SN{netuid}"
    symbol = chain_symbol.strip() or f"SN{netuid}"
    return {
        "name":     name,
        "symbol":   symbol,
        "description": (
            f"Bittensor subnet {name} (SN{netuid}). Metrics sourced directly from "
            f"the Bittensor blockchain via Subtensor. No curated description available "
            f"— visit taostats.io/subnets/{netuid} for details."
        ),
        "category": "Infrastructure",
    }


# ── Runtime metadata introspection ────────────────────────────────────────────

def get_subtensor_module_storage(substrate, verbose: bool = True) -> set[str]:
    """
    Enumerate all storage function names in SubtensorModule from runtime metadata.
    Returns empty set if enumeration fails; callers fall back to probe-querying.
    """
    names: set[str] = set()
    try:
        meta     = substrate.get_metadata()
        meta_val = meta.value if hasattr(meta, "value") else meta

        pallet_list: list | None = None
        for vkey in ("V14", "V15", "V13", "V12"):
            if isinstance(meta_val, dict) and vkey in meta_val:
                pallet_list = meta_val[vkey].get("pallets", [])
                break
        if pallet_list is None and isinstance(meta_val, dict):
            pallet_list = meta_val.get("pallets", [])

        if pallet_list:
            for pallet in pallet_list:
                if pallet.get("name") == "SubtensorModule":
                    storage = pallet.get("storage") or {}
                    for item in storage.get("items", []):
                        n = item.get("name")
                        if n:
                            names.add(n)
                    break

    except Exception as exc:
        if verbose:
            print(f"  [discover] metadata parse error: {exc}", file=sys.stderr)

    if not names:
        try:
            probe = substrate.get_metadata_storage_function("SubtensorModule", "SubnetworkN")
            if probe is None and verbose:
                print(
                    "  [discover] WARNING: SubnetworkN probe returned None; "
                    "metadata probing may be unreliable.",
                    file=sys.stderr,
                )
        except Exception as exc:
            if verbose:
                print(f"  [discover] probe check failed: {exc}", file=sys.stderr)

    if verbose:
        if names:
            print(
                f"  [discover] SubtensorModule: {len(names)} storage functions enumerated",
                flush=True,
            )
        else:
            print(
                "  [discover] metadata enumeration returned no names; "
                "will probe candidates directly",
                file=sys.stderr,
            )

    return names


def resolve_storage_fn(
    substrate,
    available: set[str],
    candidates: list[str],
    label: str = "",
    verbose: bool = True,
) -> str | None:
    """
    Pick the first candidate that is present in the available set (from metadata).
    Falls back to probe-querying via get_metadata_storage_function() if available is empty.
    """
    if available:
        for c in candidates:
            if c in available:
                if verbose:
                    print(f"  [resolve] {label:12s} → {c}", flush=True)
                return c
        if verbose:
            print(
                f"  [resolve] {label:12s} → NOT FOUND  (tried: {candidates})",
                file=sys.stderr,
            )
        return None

    for c in candidates:
        try:
            entry = substrate.get_metadata_storage_function("SubtensorModule", c)
            if entry is not None:
                if verbose:
                    print(f"  [resolve] {label:12s} → {c}  (probe)", flush=True)
                return c
        except Exception:
            pass

    if verbose:
        print(
            f"  [resolve] {label:12s} → NOT FOUND  (tried: {candidates})",
            file=sys.stderr,
        )
    return None


def list_all_pallet_storage(subtensor, verbose: bool = True) -> None:
    """Print every storage function in every pallet. Called by --list-storage."""
    sub = subtensor.substrate
    try:
        meta     = sub.get_metadata()
        meta_val = meta.value if hasattr(meta, "value") else meta

        pallet_list: list | None = None
        for vkey in ("V14", "V15", "V13", "V12"):
            if isinstance(meta_val, dict) and vkey in meta_val:
                pallet_list = meta_val[vkey].get("pallets", [])
                break
        if pallet_list is None and isinstance(meta_val, dict):
            pallet_list = meta_val.get("pallets", [])

        if not pallet_list:
            print("Could not locate pallet list in metadata.", file=sys.stderr)
            return

        print(f"\n{'═' * 70}")
        print(f"  Live runtime substrate storage — {len(pallet_list)} pallets")
        print(f"{'═' * 70}")
        for pallet in sorted(pallet_list, key=lambda p: p.get("name", "")):
            pname   = pallet.get("name", "?")
            storage = pallet.get("storage") or {}
            items   = storage.get("items", [])
            if not items:
                continue
            print(f"\n  [{pname}]  ({len(items)} storage functions)")
            for item in sorted(items, key=lambda i: i.get("name", "")):
                iname = item.get("name", "?")
                itype = item.get("type", {})
                if "Map" in itype:
                    m    = itype["Map"]
                    ktyp = m.get("key", "?")
                    vtyp = m.get("value", "?")
                    desc = f"Map<{ktyp}, {vtyp}>"
                elif "Plain" in itype:
                    desc = f"Plain<{itype['Plain']}>"
                else:
                    desc = str(itype)[:60]
                print(f"    {iname:40s}  {desc}")

        print(f"\n{'═' * 70}\n")

    except Exception as exc:
        print(f"Error listing storage: {exc}", file=sys.stderr)


# ── Substrate storage helpers ─────────────────────────────────────────────────

def _scalar_value(raw: Any) -> Any:
    """Unwrap substrate ScaleType / codec objects to a plain Python value."""
    if hasattr(raw, "value"):
        return raw.value
    return raw


def _decode_bytes(raw: Any) -> str:
    """Decode substrate bytes (Vec<u8> or bytes) to a UTF-8 string."""
    val = _scalar_value(raw)
    if isinstance(val, (bytes, bytearray)):
        return val.decode("utf-8", errors="replace").strip("\x00").strip()
    if isinstance(val, list):
        try:
            return bytes(val).decode("utf-8", errors="replace").strip("\x00").strip()
        except Exception:
            return ""
    return str(val or "").strip()


def batch_query_map(
    substrate,
    storage_function: str,
    transform=None,
    verbose: bool = True,
) -> dict[int, Any]:
    """
    Query SubtensorModule.<storage_function> as a StorageMap(netuid → value).
    Returns {} if the storage function is not a Map type (e.g. Plain).
    """
    if transform is None:
        transform = lambda v: int(v or 0)

    result: dict[int, Any] = {}
    try:
        entries = substrate.query_map(
            module="SubtensorModule",
            storage_function=storage_function,
            params=[],
            page_size=512,
        )
        for key, value in entries:
            try:
                raw_key = key[0] if isinstance(key, (list, tuple)) else key
                netuid  = int(_scalar_value(raw_key))
                raw_val = _scalar_value(value)
                result[netuid] = transform(raw_val)
            except Exception:
                pass
    except Exception as exc:
        if verbose:
            print(
                f"  [storage] SubtensorModule.{storage_function}: {exc}",
                file=sys.stderr,
            )
    return result


def query_plain_vec_as_map(
    substrate,
    storage_function: str,
    transform=None,
    verbose: bool = True,
) -> dict[int, Any]:
    """
    Query SubtensorModule.<storage_function> as a StorageValue<Vec<T>> and
    return {position_index: transformed_value}.

    Used when the storage function is a plain Vec (not a StorageMap) where
    position in the Vec corresponds to netuid.  This is common in Bittensor's
    pallet for per-subnet values that are stored as a bounded Vec.

    Phase 5.2 root-cause fix: "Emission" is StorageValue<Vec<u64>>, not a Map.
    """
    if transform is None:
        transform = lambda v: int(v or 0)

    result: dict[int, Any] = {}
    try:
        raw = substrate.query(
            module="SubtensorModule",
            storage_function=storage_function,
        )
        vec = _scalar_value(raw)
        if isinstance(vec, list):
            for idx, item in enumerate(vec):
                try:
                    result[idx] = transform(_scalar_value(item))
                except Exception:
                    pass
            if verbose:
                n_nonzero = sum(1 for v in result.values() if v)
                print(
                    f"  [storage] {storage_function} as Vec[{len(vec)}]: "
                    f"{n_nonzero} non-zero entries",
                    flush=True,
                )
        else:
            # Scalar — not the expected Vec type
            if verbose:
                print(
                    f"  [storage] {storage_function} returned scalar "
                    f"(not Vec): {repr(vec)[:60]}",
                    file=sys.stderr,
                )
    except Exception as exc:
        if verbose:
            print(
                f"  [storage] {storage_function} plain-Vec query failed: {exc}",
                file=sys.stderr,
            )
    return result


def batch_query_double_map(
    substrate,
    storage_function: str,
    outer_key: int,
    transform=None,
    verbose: bool = True,
) -> dict[int, Any]:
    """Query SubtensorModule.<fn> as a DoubleMap(outer → inner → value)."""
    if transform is None:
        transform = lambda v: int(v or 0)

    result: dict[int, Any] = {}
    try:
        entries = substrate.query_map(
            module="SubtensorModule",
            storage_function=storage_function,
            params=[outer_key],
            page_size=512,
        )
        for key, value in entries:
            try:
                raw_key = key[0] if isinstance(key, (list, tuple)) else key
                inner   = int(_scalar_value(raw_key))
                raw_val = _scalar_value(value)
                result[inner] = transform(raw_val)
            except Exception:
                pass
    except Exception as exc:
        if verbose:
            print(
                f"  [storage] SubtensorModule.{storage_function}[{outer_key}]: {exc}",
                file=sys.stderr,
            )
    return result


# ── SDK object emission / name extraction ─────────────────────────────────────

def extract_sdk_data(info_by_netuid: dict, verbose: bool = True) -> dict[int, dict]:
    """
    Extract per-subnet data from SDK SubnetInfo / DynamicInfo objects.

    In bittensor 9.x with dTAO, get_all_subnets_info() returns DynamicInfo objects
    that carry:
      emission    — per-subnet emission in RAO/block (or TAO/block as float)
      subnet_name — UTF-8 name bytes or string
      symbol      — token symbol
      tao_in      — TAO in AMM pool (duplicate of SubnetAlphaIn, useful cross-check)

    Returns {netuid: {"sdk_emission_rao": int, "sdk_name": str, "sdk_symbol": str}}
    """
    result: dict[int, dict] = {}

    EMISSION_ATTRS = ("emission", "tao_emission", "emission_value")
    NAME_ATTRS     = ("subnet_name", "name")
    SYMBOL_ATTRS   = ("symbol", "token_symbol", "alpha_token_symbol")

    n_with_emission = 0
    n_with_name     = 0

    for nuid, obj in info_by_netuid.items():
        if obj is None:
            continue
        entry: dict = {}

        # ── Emission ──────────────────────────────────────────────────────────
        for attr in EMISSION_ATTRS:
            val = getattr(obj, attr, None)
            if val is None or isinstance(val, (list, tuple)):
                continue
            try:
                emi = float(val)
                if emi < 0:
                    continue
                # Detect units:
                #   ≥ 1e6 → likely RAO (integer, large)
                #   < 1   → likely fraction of network emission (normalize to RAO)
                #   1–1e6 → ambiguous; treat as TAO/block → convert to RAO
                if emi >= 1e6:
                    entry["sdk_emission_rao"] = int(emi)
                elif 0 < emi < 1:
                    # Fraction: multiply by total network emission rate (1 TAO/block = 1e9 RAO)
                    entry["sdk_emission_rao"] = int(emi * RAO_PER_TAO)
                elif emi >= 1:
                    # TAO/block — convert to RAO
                    entry["sdk_emission_rao"] = int(emi * RAO_PER_TAO)
                else:
                    entry["sdk_emission_rao"] = 0
                n_with_emission += 1
                break
            except (TypeError, ValueError):
                pass

        # ── Name ──────────────────────────────────────────────────────────────
        for attr in NAME_ATTRS:
            val = getattr(obj, attr, None)
            if val is None:
                continue
            s = _decode_bytes(val) if isinstance(val, (bytes, bytearray, list)) else str(val).strip()
            if s and s not in ("None", ""):
                entry["sdk_name"] = s
                n_with_name += 1
                break

        # ── Symbol (SDK cross-check for non-resolving TokenSymbol) ────────────
        for attr in SYMBOL_ATTRS:
            val = getattr(obj, attr, None)
            if val is None:
                continue
            s = _decode_bytes(val) if isinstance(val, (bytes, bytearray, list)) else str(val).strip()
            if s and s not in ("None", ""):
                entry["sdk_symbol"] = s
                break

        if entry:
            result[nuid] = entry

    if verbose:
        print(
            f"  [sdk]    extracted from SDK objects: "
            f"{n_with_emission} with emission, {n_with_name} with name",
            flush=True,
        )
    return result


# ── Active neuron count (better participation metric than SubnetworkN) ─────────

def fetch_active_neuron_counts(
    substrate, known_netuids: list[int], verbose: bool = True
) -> dict[int, int]:
    """
    Attempt to count truly active neurons per subnet via the 'Active' storage.

    In the Bittensor pallet, Active[netuid] is a Vec<bool> where each position
    corresponds to a UID.  Counting True values gives active neuron count, which
    may be less than SubnetworkN (registered count) for subnets with inactive UIDs.

    Falls back gracefully — if Active doesn't exist or the query fails, returns {}.

    NOTE: This requires one RPC call per netuid.  We cap at ACTIVE_SAMPLE_CAP
    subnets and merge with SubnetworkN values (prefer active count if available).
    """
    ACTIVE_SAMPLE_CAP = 60  # limit RPC calls for active counts; rest use SubnetworkN

    result: dict[int, int] = {}
    sampled = known_netuids[:ACTIVE_SAMPLE_CAP]
    ok_count = 0

    for nuid in sampled:
        try:
            raw = substrate.query("SubtensorModule", ACTIVE_KEY, [nuid])
            vec = _scalar_value(raw)
            if isinstance(vec, list) and len(vec) > 0:
                active_count    = sum(1 for v in vec if v)
                result[nuid]    = active_count
                ok_count       += 1
        except Exception:
            pass  # ACTIVE_KEY doesn't exist or wrong params — skip

    if verbose:
        if ok_count > 0:
            print(
                f"  [active]  {ok_count}/{len(sampled)} subnets have Active neuron data "
                f"(capped at {ACTIVE_SAMPLE_CAP})",
                flush=True,
            )
        else:
            print(
                f"  [active]  Active neuron count unavailable; "
                f"using SubnetworkN for all subnets",
                file=sys.stderr,
            )

    return result


# ── Chain metrics fetch (self-discovering, multi-fallback) ────────────────────

def fetch_chain_metrics(
    subtensor,
    sdk_info: dict | None = None,
    verbose: bool = True,
) -> tuple[dict[int, dict], dict]:
    """
    Batch-query all per-subnet numeric metrics from chain storage.

    Phase 5.2 additions:
      - sdk_info: the {netuid: DynamicInfo} dict from get_all_subnets_info(),
        used as a second-pass fallback for emission and name extraction.
      - Emission is now tried as both a StorageMap AND as a plain Vec<u64>.
      - Active neuron counts are attempted as a participation metric.

    Returns:
        metrics:  {netuid: {tao_in_tao, emissions_per_day, subnetwork_n,
                            age_days, chain_name, chain_symbol,
                            emission_source: str}}
        resolved: {field_alias: resolved_storage_fn_name | None}
    """
    sub = subtensor.substrate

    # ── Step 1: enumerate actual storage functions from runtime metadata ──────
    if verbose:
        print("[discover] enumerating SubtensorModule storage from runtime metadata …",
              flush=True)

    available = get_subtensor_module_storage(sub, verbose=verbose)

    # ── Step 2: resolve each needed field ─────────────────────────────────────
    if verbose:
        print("[resolve]  mapping fields to storage functions …", flush=True)

    resolved = {
        "tao_in":   resolve_storage_fn(sub, available, TAO_IN_CANDIDATES,   "tao_in",   verbose),
        "emission": resolve_storage_fn(sub, available, EMISSION_CANDIDATES,  "emission", verbose),
        "name":     resolve_storage_fn(sub, available, NAME_CANDIDATES,      "name",     verbose),
        "symbol":   resolve_storage_fn(sub, available, SYMBOL_CANDIDATES,    "symbol",   verbose),
        "stakers":  STAKERS_KEY if (STAKERS_KEY in available or not available) else None,
        "reg_at":   REG_AT_KEY  if (REG_AT_KEY  in available or not available) else None,
    }

    if not available:
        resolved.setdefault("stakers") or resolved.update({"stakers": STAKERS_KEY})
        resolved.setdefault("reg_at")  or resolved.update({"reg_at":  REG_AT_KEY})

    if verbose:
        for field, key in resolved.items():
            status = key or "NOT FOUND"
            print(f"  [resolve] {field:12s} → {status}", flush=True)

    # ── Step 3: storage queries ───────────────────────────────────────────────
    if verbose:
        print("[storage]  querying substrate storage maps …", flush=True)

    metrics: dict[int, dict] = {}

    # ── TAO in pool (liquidity) ───────────────────────────────────────────────
    if resolved["tao_in"]:
        tao_in_map = batch_query_map(
            sub, resolved["tao_in"], transform=lambda v: int(v or 0), verbose=verbose
        )
        for nuid, rao in tao_in_map.items():
            metrics.setdefault(nuid, {})["tao_in_rao"] = rao

    # ── Emission — Layer 1: try as StorageMap ─────────────────────────────────
    emission_source = "none"
    if resolved["emission"]:
        emi_map = batch_query_map(
            sub, resolved["emission"], transform=lambda v: int(v or 0), verbose=verbose
        )
        n_nonzero = sum(1 for v in emi_map.values() if v > 0)
        if n_nonzero > 0:
            for nuid, rao in emi_map.items():
                metrics.setdefault(nuid, {})["emission_rao_per_block"] = rao
            emission_source = f"StorageMap:{resolved['emission']}"
            if verbose:
                print(
                    f"  [emission] Layer 1 (StorageMap) OK: "
                    f"{n_nonzero} non-zero ({resolved['emission']})",
                    flush=True,
                )

    # ── Emission — Layer 2: try as plain Vec<u64> (Phase 5.2 root-cause fix) ──
    if emission_source == "none" and resolved["emission"]:
        if verbose:
            print(
                f"  [emission] Layer 1 (StorageMap) returned all zeros — "
                f"trying as plain Vec<u64> …",
                flush=True,
            )
        vec_map = query_plain_vec_as_map(
            sub, resolved["emission"], transform=lambda v: int(v or 0), verbose=verbose
        )
        n_nonzero = sum(1 for v in vec_map.values() if v > 0)
        if n_nonzero > 0:
            for nuid, rao in vec_map.items():
                if nuid > 0:  # skip index 0 (root subnet)
                    metrics.setdefault(nuid, {})["emission_rao_per_block"] = rao
            emission_source = f"PlainVec:{resolved['emission']}"
            if verbose:
                print(
                    f"  [emission] Layer 2 (plain Vec) OK: "
                    f"{n_nonzero} non-zero ({resolved['emission']})",
                    flush=True,
                )

    # ── Emission — Layer 3: SDK object attribute (DynamicInfo.emission) ───────
    if emission_source == "none" and sdk_info:
        if verbose:
            print(
                "  [emission] Layer 2 (plain Vec) also zero — "
                "trying SDK object attributes …",
                flush=True,
            )
        sdk_data = extract_sdk_data(sdk_info, verbose=verbose)
        n_nonzero = sum(1 for d in sdk_data.values() if d.get("sdk_emission_rao", 0) > 0)
        if n_nonzero > 0:
            for nuid, d in sdk_data.items():
                rao = d.get("sdk_emission_rao", 0)
                metrics.setdefault(nuid, {})["emission_rao_per_block"] = rao
                if d.get("sdk_name"):
                    metrics[nuid].setdefault("chain_name", d["sdk_name"])
                if d.get("sdk_symbol"):
                    metrics[nuid].setdefault("chain_symbol", d["sdk_symbol"])
            emission_source = "sdk_object"
            if verbose:
                print(
                    f"  [emission] Layer 3 (SDK objects) OK: {n_nonzero} non-zero",
                    flush=True,
                )
        else:
            # Merge SDK names/symbols even if emission is unavailable
            for nuid, d in sdk_data.items():
                if d.get("sdk_name"):
                    metrics.setdefault(nuid, {}).setdefault("chain_name", d["sdk_name"])
                if d.get("sdk_symbol"):
                    metrics.setdefault(nuid, {}).setdefault("chain_symbol", d["sdk_symbol"])

    # ── Emission — Layer 4: TaoIn-proportional split (last resort) ───────────
    if emission_source == "none":
        total_tao_in_rao = sum(m.get("tao_in_rao", 0) for m in metrics.values())
        if total_tao_in_rao > 0:
            total_network_rao_per_block = RAO_PER_TAO  # 1 TAO/block total
            for nuid, m in metrics.items():
                share = m.get("tao_in_rao", 0) / total_tao_in_rao
                m["emission_rao_per_block"] = int(share * total_network_rao_per_block)
            emission_source = "tao_in_proportional"
            if verbose:
                print(
                    "  [emission] Layer 4 (TaoIn-proportional) — approximate; "
                    "no authoritative emission source found",
                    file=sys.stderr,
                )

    # ── Stakers: SubnetworkN (registered count, often at cap = 256) ──────────
    staker_source = "none"
    n_map: dict[int, int] = {}
    if resolved["stakers"]:
        n_map = batch_query_map(
            sub, resolved["stakers"], transform=lambda v: int(v or 0), verbose=verbose
        )
        for nuid, n in n_map.items():
            metrics.setdefault(nuid, {})["subnetwork_n"] = n
        if n_map:
            staker_source = f"StorageMap:{resolved['stakers']}"

    # ── Stakers: Active neuron count (better participation metric) ────────────
    if n_map:
        known_netuids = sorted(n_map.keys())
        active_counts = fetch_active_neuron_counts(sub, known_netuids, verbose=verbose)
        for nuid, active_n in active_counts.items():
            # Replace SubnetworkN with active count ONLY if active_n > 0
            # and meaningfully smaller than the registered count (not just 0 due to query error)
            registered = metrics.get(nuid, {}).get("subnetwork_n", 0)
            if 0 < active_n <= registered:
                metrics[nuid]["subnetwork_n"] = active_n
        if active_counts:
            staker_source = f"Active+{staker_source}"

    # ── Subnet registration block (age) ──────────────────────────────────────
    current_block = 0
    try:
        current_block = subtensor.get_current_block()
    except Exception:
        pass

    if resolved["reg_at"]:
        reg_map = batch_query_map(
            sub, resolved["reg_at"], transform=lambda v: int(v or 0), verbose=verbose
        )
        for nuid, reg_block in reg_map.items():
            if current_block > 0 and reg_block > 0:
                age_days = max(1, (current_block - reg_block) // BLOCKS_PER_DAY)
            else:
                age_days = 180
            metrics.setdefault(nuid, {})["age_days"] = age_days

    # ── Chain name from storage (if resolved) ─────────────────────────────────
    if resolved["name"]:
        name_map = batch_query_map(
            sub, resolved["name"], transform=_decode_bytes, verbose=verbose
        )
        for nuid, name in name_map.items():
            if name:
                metrics.setdefault(nuid, {})["chain_name"] = name

    # ── Chain symbol from storage (if resolved) ───────────────────────────────
    if resolved["symbol"]:
        symbol_map = batch_query_map(
            sub, resolved["symbol"], transform=_decode_bytes, verbose=verbose
        )
        for nuid, sym in symbol_map.items():
            if sym:
                metrics.setdefault(nuid, {})["chain_symbol"] = sym

    # ── SDK names/symbols (if not already set by storage) ─────────────────────
    # Run SDK extract if it wasn't already triggered by emission Layer 3 failure
    if emission_source not in ("sdk_object", "none") and sdk_info:
        sdk_data = extract_sdk_data(sdk_info, verbose=False)
        for nuid, d in sdk_data.items():
            if d.get("sdk_name"):
                metrics.setdefault(nuid, {}).setdefault("chain_name", d["sdk_name"])
            if d.get("sdk_symbol"):
                metrics.setdefault(nuid, {}).setdefault("chain_symbol", d["sdk_symbol"])

    # ── Normalize emissions ───────────────────────────────────────────────────
    total_emission_rao = sum(
        v.get("emission_rao_per_block", 0) for v in metrics.values()
    )
    for nuid, m in metrics.items():
        raw_rao = m.get("emission_rao_per_block", 0)
        if total_emission_rao > 0 and raw_rao > 0:
            emission_frac          = raw_rao / total_emission_rao
            m["emissions_per_day"] = round(emission_frac * DAILY_NETWORK_TAO, 4)
        elif raw_rao > 0:
            m["emissions_per_day"] = round((raw_rao / RAO_PER_TAO) * BLOCKS_PER_DAY, 4)
        else:
            m["emissions_per_day"] = 0.0

        m["tao_in_tao"] = round(m.get("tao_in_rao", 0) / RAO_PER_TAO, 2)
        m["emission_source"] = emission_source

    if verbose:
        covered  = len(metrics)
        with_tao = sum(1 for m in metrics.values() if m.get("tao_in_tao", 0) > 0)
        with_emi = sum(1 for m in metrics.values() if m.get("emissions_per_day", 0) > 0)
        print(
            f"[storage]  {covered} subnets: "
            f"{with_tao} with tao_in, {with_emi} with emissions "
            f"(source: {emission_source})",
            flush=True,
        )

    resolved["emission_source"] = emission_source
    resolved["staker_source"]   = staker_source
    return metrics, resolved


# ── Inspect helpers ────────────────────────────────────────────────────────────

def inspect_object(obj: Any, label: str = "SubnetInfo object") -> None:
    """Print all non-callable, non-private attributes of an SDK object."""
    print(f"\n[inspect] {label} — type: {type(obj).__name__}")
    attrs = {}
    for attr in sorted(dir(obj)):
        if attr.startswith("_"):
            continue
        try:
            val = getattr(obj, attr, None)
            if callable(val):
                continue
            attrs[attr] = repr(val)[:80]
        except Exception:
            pass
    for k, v in attrs.items():
        print(f"  {k} = {v}")
    print()


# ── Single subnet assembly ─────────────────────────────────────────────────────

def build_subnet(netuid: int, chain_metrics: dict[int, dict], info_obj: Any = None) -> dict:
    """Assemble one normalized Subnet record."""
    m = chain_metrics.get(netuid, {})

    tao_in            = m.get("tao_in_tao", 0.0)
    emissions_per_day = m.get("emissions_per_day", 0.0)
    stakers           = m.get("subnetwork_n", 0)
    age               = m.get("age_days", 180)

    chain_name   = m.get("chain_name", "")
    chain_symbol = m.get("chain_symbol", "")

    # SDK object attribute fallback for name/symbol
    if info_obj is not None and not chain_name:
        for attr in ("subnet_name", "name"):
            val = getattr(info_obj, attr, None)
            if val is None:
                continue
            s = _decode_bytes(val) if isinstance(val, (bytes, bytearray, list)) else str(val).strip()
            if s and s not in ("None", ""):
                chain_name = s
                break
    if info_obj is not None and not chain_symbol:
        for attr in ("symbol", "token_symbol", "alpha_token_symbol"):
            val = getattr(info_obj, attr, None)
            if val is None:
                continue
            s = _decode_bytes(val) if isinstance(val, (bytes, bytearray, list)) else str(val).strip()
            if s and s not in ("None", ""):
                chain_symbol = s
                break

    # Validator take
    validator_take = 18
    if info_obj is not None:
        raw_take = getattr(info_obj, "max_take", None)
        if raw_take is not None:
            try:
                t = float(raw_take)
                validator_take = round(t * 100) if t <= 1.0 else round(t)
                validator_take = max(0, min(100, validator_take))
            except (TypeError, ValueError):
                pass

    meta      = CURATED.get(netuid) or build_fallback_meta(netuid, chain_name, chain_symbol)

    yield_pct      = derive_yield(emissions_per_day, tao_in)
    yield_delta_7d = 0.0
    momentum       = build_momentum(yield_pct, yield_delta_7d)
    risk           = derive_risk(tao_in, stakers, yield_delta_7d)
    score          = derive_score(tao_in, yield_pct, stakers, yield_delta_7d)
    breakeven      = derive_breakeven(yield_pct)

    return {
        "id":            f"sn{netuid}",
        "netuid":        netuid,
        "name":          meta["name"],
        "symbol":        meta["symbol"],
        "score":         score,
        "yield":         yield_pct,
        "yieldDelta7d":  yield_delta_7d,
        "inflow":        0,
        "inflowPct":     0.0,
        "risk":          risk,
        "liquidity":     round(tao_in, 1),
        "stakers":       stakers,
        "emissions":     round(emissions_per_day, 3),
        "validatorTake": validator_take,
        "description":   meta["description"],
        "category":      meta["category"],
        "momentum":      momentum,
        "isWatched":     False,
        "breakeven":     breakeven,
        "age":           age,
    }


# ── Main pipeline ──────────────────────────────────────────────────────────────

def fetch_and_write(
    network: str,
    out_path: Path,
    verbose: bool = True,
    inspect: bool = False,
    list_storage: bool = False,
) -> int:
    """Connect to Subtensor, fetch all subnet data, write JSON."""
    try:
        from bittensor.core.subtensor import Subtensor
    except ImportError as exc:
        print(
            f"ERROR: bittensor not installed. "
            f"Run: pip install -r scripts/requirements.txt\n({exc})",
            file=sys.stderr,
        )
        sys.exit(1)

    if verbose:
        print(f"[subtensor] connecting to {network!r} …", flush=True)

    t0        = time.perf_counter()
    subtensor = Subtensor(network=network)

    if verbose:
        print(f"[subtensor] connected in {time.perf_counter() - t0:.1f}s", flush=True)

    if list_storage:
        list_all_pallet_storage(subtensor, verbose=True)
        return 0

    # ── Layer 1: SDK subnet list + DynamicInfo objects ────────────────────────
    info_by_netuid: dict[int, Any] = {}

    try:
        if verbose:
            print("[subtensor] get_all_subnets_info() …", flush=True)
        all_info = subtensor.get_all_subnets_info()
        for obj in all_info:
            try:
                nid = int(getattr(obj, "netuid", -1))
                if nid > 0:
                    info_by_netuid[nid] = obj
            except Exception:
                pass
        if inspect and all_info:
            inspect_object(all_info[0], "get_all_subnets_info()[0]")
    except Exception as exc:
        if verbose:
            print(
                f"[subtensor] get_all_subnets_info() failed ({exc}); "
                "falling back to get_subnets()",
                file=sys.stderr,
            )

    if not info_by_netuid:
        try:
            netuids = subtensor.get_subnets()
            for nid in netuids:
                if nid > 0:
                    info_by_netuid[nid] = None
        except Exception as exc:
            print(f"ERROR: cannot get subnet list: {exc}", file=sys.stderr)
            sys.exit(1)

    if verbose:
        print(
            f"[subtensor] found {len(info_by_netuid)} active subnets "
            f"in {time.perf_counter() - t0:.1f}s",
            flush=True,
        )

    # ── Layer 2: discover keys + batch-query + SDK fallbacks ─────────────────
    chain_metrics, resolved_keys = fetch_chain_metrics(
        subtensor,
        sdk_info=info_by_netuid,
        verbose=verbose,
    )

    all_netuids = sorted(
        (set(info_by_netuid.keys()) | set(chain_metrics.keys())) - {0}
    )

    if verbose:
        print(f"[subtensor] assembling {len(all_netuids)} subnets …", flush=True)

    # ── Layer 3: assemble normalized records ──────────────────────────────────
    subnets: list[dict] = []
    skipped = 0

    for netuid in all_netuids:
        if netuid == 0:
            continue
        try:
            record = build_subnet(
                netuid,
                chain_metrics,
                info_obj=info_by_netuid.get(netuid),
            )
            subnets.append(record)
        except Exception as exc:
            skipped += 1
            if verbose:
                print(f"  [warn] SN{netuid}: {exc}", file=sys.stderr)

    subnets.sort(key=lambda s: s["netuid"])

    if verbose and subnets:
        _print_distribution_summary(subnets, resolved_keys)

    # ── Write output ──────────────────────────────────────────────────────────
    out_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "_meta": {
            "source":         "subtensor",
            "network":        network,
            "fetched_at":     datetime.now(timezone.utc).isoformat(),
            "subnet_count":   len(subnets),
            "skipped":        skipped,
            "schema_version": 5,
            "phase":          "Phase 5.2 — emission Vec fix + SDK fallbacks",
            "resolved_keys":  resolved_keys,
        },
        "subnets": subnets,
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        f.write("\n")

    elapsed = time.perf_counter() - t0
    if verbose:
        print(f"\n✓ Wrote {len(subnets)} subnets → {out_path}  ({elapsed:.1f}s)")
        if skipped:
            print(f"  ({skipped} skipped due to extraction errors)")

    return len(subnets)


def _print_distribution_summary(subnets: list[dict], resolved: dict | None = None) -> None:
    """Print a compact verification table of key metric distributions."""
    from collections import Counter

    risks       = Counter(s["risk"]     for s in subnets)
    liquidities = [s["liquidity"]       for s in subnets]
    emissions   = [s["emissions"]       for s in subnets]
    stakers_lst = [s["stakers"]         for s in subnets]
    yields      = [s["yield"]           for s in subnets]
    ages        = [s["age"]             for s in subnets]

    def stats(lst: list) -> str:
        nonzero  = [x for x in lst if x > 0]
        if not nonzero:
            return "all zero ← FIX NEEDED"
        lo, hi   = min(nonzero), max(nonzero)
        distinct = len(set(round(x, 1) for x in nonzero))
        median   = sorted(nonzero)[len(nonzero) // 2]
        return (
            f"min={lo:.1f}  median={median:.1f}  max={hi:.1f}  "
            f"({distinct} distinct, {len(nonzero)}/{len(lst)} non-zero)"
        )

    print("\n" + "─" * 72)
    print("  Distribution summary (Phase 5.2 verification)")
    print("─" * 72)
    print(f"  Risk:       {dict(risks)}")
    print(f"  Liquidity:  {stats(liquidities)}")
    print(f"  Emissions:  {stats(emissions)}")
    print(f"  Stakers:    {stats(stakers_lst)}")
    print(f"  Yield:      {stats(yields)}")
    print(f"  Age:        {stats(ages)}")
    if resolved:
        print(f"  Sources:    emission={resolved.get('emission_source','?')}  "
              f"stakers={resolved.get('staker_source','?')}")
    print("─" * 72 + "\n")


# ── Field provenance (--explain) ───────────────────────────────────────────────

EXPLAIN = f"""
Field provenance — Tyvera Phase 5.2 (emission Vec fix + SDK fallbacks)
=======================================================================

EMISSION — three-layer fallback (in order):
  Layer 1  StorageMap query  — batch_query_map("Emission")
           Works if Emission is StorageMap<netuid, u64>.
  Layer 2  Plain Vec query   — substrate.query("Emission")
           ROOT-CAUSE FIX: "Emission" is StorageValue<Vec<u64>> indexed by netuid.
           batch_query_map() returned empty iterator; plain query() returns the Vec.
  Layer 3  SDK DynamicInfo   — getattr(obj, "emission")
           DynamicInfo.emission in bittensor 9.x carries per-subnet emission.
           Units detected by magnitude (≥1e6 → RAO, <1 → fraction, else TAO/block).
  Layer 4  TaoIn-proportional — each subnet's TAO pool share × {DAILY_NETWORK_TAO} TAO/day
           Approximate proxy; used only when no authoritative source works.

Resolved emission source is printed in the distribution summary and stored in
_meta.resolved_keys.emission_source in the JSON output.

STAKERS (SubnetworkN):
  SubnetworkN[netuid] = number of REGISTERED neurons (miners + validators).
  256 = subnet at full capacity — this IS the correct count for mature subnets.
  Phase 5.2 additionally attempts the Active[netuid] Vec<bool> storage to count
  truly active neurons, which may be smaller than 256 for less active subnets.
  If Active is unavailable, SubnetworkN is used (correct but ceiling-capped).

NAMES:
  No on-chain name StorageMap was found in the live runtime.
  Phase 5.2 extracts subnet_name from DynamicInfo SDK objects as a secondary
  source. Curated metadata (45 subnets) remains the primary name source.
  Subnets not in CURATED use the chain symbol as name, else SN{{netuid}}.

LIQUIDITY:     SubtensorModule.SubnetAlphaIn[netuid]  RAO ÷ 1e9 = TAO
STAKERS:       SubtensorModule.SubnetworkN[netuid] (or Active count if available)
AGE:           SubtensorModule.NetworkRegisteredAt[netuid]
SYMBOL:        SubtensorModule.TokenSymbol[netuid]

DERIVED:
  yield, risk, score, momentum, breakeven  (from source-backed inputs)
  yieldDelta7d, inflow, inflowPct           0.0 — Phase 6 work
"""


# ── CLI ────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch all Bittensor subnets from Subtensor and write "
                    "public/data/subnets.json for Tyvera.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--network", "-n",
        default=os.environ.get("BITTENSOR_NETWORK", "finney"),
        help="Subtensor network or ws:// endpoint URL (default: finney)",
    )
    parser.add_argument(
        "--out",
        default=str(DEFAULT_OUT),
        help=f"Output JSON path (default: {DEFAULT_OUT})",
    )
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Suppress progress output",
    )
    parser.add_argument(
        "--inspect",
        action="store_true",
        help="Print all attributes of the first SDK object (debug mode)",
    )
    parser.add_argument(
        "--list-storage",
        action="store_true",
        dest="list_storage",
        help="Print all storage functions in all pallets and exit",
    )
    parser.add_argument(
        "--explain",
        action="store_true",
        help="Print field provenance table and exit",
    )
    args = parser.parse_args()

    if args.explain:
        print(EXPLAIN)
        sys.exit(0)

    count = fetch_and_write(
        network=args.network,
        out_path=Path(args.out),
        verbose=not args.quiet,
        inspect=args.inspect,
        list_storage=args.list_storage,
    )
    sys.exit(0 if count > 0 else 1)


if __name__ == "__main__":
    main()
