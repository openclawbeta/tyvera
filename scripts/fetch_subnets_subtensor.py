#!/usr/bin/env python3
"""
scripts/fetch_subnets_subtensor.py
===================================
Phase 3 — Tao Navigator canonical subnet ingestion pipeline.

Reads all live subnets directly from the Bittensor blockchain via
bittensor.core.subtensor.Subtensor, normalizes the data into the
shape Tao Navigator's UI layer expects, and writes a JSON snapshot to:

    public/data/subnets.json

The Next.js route handler (app/api/subnets/route.ts) serves this file
as its highest-priority data source — ahead of TaoStats and the static
TypeScript snapshot.

Usage
-----
    # Basic (mainnet, public endpoint):
    python scripts/fetch_subnets_subtensor.py

    # Custom endpoint (your own node or local lite-node):
    python scripts/fetch_subnets_subtensor.py --network ws://127.0.0.1:9944

    # Output to a different file:
    python scripts/fetch_subnets_subtensor.py --out public/data/subnets.json

    # Regenerate and restart dev server in one shot:
    python scripts/fetch_subnets_subtensor.py && npm run dev

Environment variables
---------------------
    BITTENSOR_NETWORK  override --network without a flag
    BITTENSOR_ENDPOINT ws:// URL of a Subtensor node (alternative to --network)

Setup
-----
    pip install bittensor>=9.0.0
    # or with version pin:
    pip install -r scripts/requirements.txt

Python ≥ 3.10 recommended.

Field classification
--------------------
SOURCE-BACKED (read directly from chain):
    netuid, stakers (subnetwork_n), emissions (emission_values × blocks/day),
    validatorTake (max_take), age (registration block estimate), taoIn (dTAO pool)

DERIVED (computed from source-backed values using shared helper logic):
    yield, risk, score, momentum, breakeven, yieldDelta7d, inflow, inflowPct

CURATED OVERLAY (human-researched; applied on top of chain data):
    name, symbol, description, category

Architecture note
-----------------
This script is intentionally self-contained — it does not import TypeScript
modules. The derivation helpers and curated metadata are duplicated here in
Python. The TypeScript versions (lib/data/subnets-real-helpers.ts and
lib/data/subnets-curated-metadata.ts) remain the UI-layer originals.

If you change a derivation threshold or curated entry, update both sides.
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

SCRIPT_DIR  = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_OUT  = PROJECT_ROOT / "public" / "data" / "subnets.json"

# ── Derivation helpers (mirrors lib/data/subnets-real-helpers.ts) ─────────────
#
# Keep these in sync with the TypeScript originals.
# If a threshold changes here, update the .ts file too.

RISK_LOW         = ("LOW",         lambda liq, stk, dlt: liq >= 8000 and stk >= 500)
RISK_MODERATE    = ("MODERATE",    lambda liq, stk, dlt: liq >= 3000 and stk >= 150 and abs(dlt) < 5)
RISK_SPECULATIVE = ("SPECULATIVE", lambda liq, stk, dlt: liq < 1500 or stk < 80 or abs(dlt) >= 8)
RISK_HIGH        = ("HIGH",        lambda liq, stk, dlt: True)  # catch-all


def derive_risk(liquidity: float, stakers: int, yield_delta_7d: float) -> str:
    for label, pred in [RISK_LOW, RISK_MODERATE, RISK_SPECULATIVE, RISK_HIGH]:
        if pred(liquidity, stakers, yield_delta_7d):
            return label
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
    move_fee_rate    = 0.001          # 0.1 % of moved stake (on-chain default)
    daily_yield_rate = yield_pct / 100.0 / 365.0
    return round(move_fee_rate / daily_yield_rate)


def build_momentum(base_yield: float, delta_7d: float) -> list[float]:
    result = []
    for i in range(14):
        progress = i / 13.0
        trend    = delta_7d * (1.0 - progress)
        jitter   = math.sin(i * 1.4) * 0.15
        result.append(round(max(0.0, base_yield - trend + jitter), 1))
    return result


# ── Curated metadata (mirrors lib/data/subnets-curated-metadata.ts) ───────────
#
# Keep this in sync with the TypeScript original.
# Add new entries here and in the .ts file simultaneously.

CURATED: dict[int, dict[str, str]] = {
    1:  {"name": "Apex",               "symbol": "APEX",    "category": "Language",        "description": "The original Bittensor text-inference subnet. Miners compete to produce best responses to LLM queries using state-of-the-art open-source models. Established, high-liquidity, and a benchmark for subnet performance across the network."},
    3:  {"name": "Templar",            "symbol": "TMPL",    "category": "Language",        "description": "Decentralized distributed training for large language models. Miners contribute GPU compute and compete to produce useful training gradients, while validators score update quality. One of Bittensor's most active on-chain LLM training subnets."},
    4:  {"name": "Targon",             "symbol": "TARG",    "category": "Multi-Modal",     "description": "Deterministic verification framework for OpenAI-compatible AI inference, developed by Manifold Labs. Miners operate high-performance GPU endpoints serving both synthetic and organic AI queries. Known as Bittensor's 'industrial hub' for enterprise-grade verifiable compute."},
    8:  {"name": "Taoshi",             "symbol": "PTN",     "category": "Finance",         "description": "Proprietary Trading Network (PTN) by Taoshi. Decentralized AI/ML models analyze data across multiple asset classes to deliver sophisticated trading signals and predictions. Democratizes access to institutional-grade algorithmic trading intelligence via Bittensor incentives."},
    9:  {"name": "Pretrain",           "symbol": "PT",      "category": "Language",        "description": "Pretraining subnet incentivizing miners to train foundation-model weights from scratch. Validators evaluate model quality via standardised benchmarks. A core research subnet for open-source foundation model development."},
    11: {"name": "Transcription",      "symbol": "STAO",    "category": "Language",        "description": "Decentralized audio-to-text transcription using state-of-the-art speech recognition models. Miners compete to provide accurate, low-latency transcription across diverse languages, accents, and audio quality levels."},
    13: {"name": "Data Universe",      "symbol": "DATA",    "category": "Data",            "description": "Bittensor's decentralized data layer by Macrocosmos. Miners collect and store fresh, high-value data from across the web for use by other subnets. Built with a focus on decentralization, scalability, and data freshness."},
    14: {"name": "LLM Defender",       "symbol": "LLMD",    "category": "Developer Tools", "description": "Security-focused subnet for detecting prompt injection attacks and adversarial inputs targeting large language models. Miners build and serve specialized defense models evaluated on adversarial benchmarks."},
    15: {"name": "Blockchain Insights","symbol": "BITS",    "category": "Data",            "description": "On-chain analytics and blockchain data intelligence subnet. Miners process and serve structured blockchain data, enabling downstream AI applications to query verified on-chain information."},
    16: {"name": "Audio Transcription","symbol": "AUD",     "category": "Language",        "description": "Specialised audio processing and transcription subnet. Miners run high-accuracy speech recognition across multiple languages and domains, competing on accuracy, latency, and vocabulary coverage."},
    17: {"name": "3D Generation",      "symbol": "3DG",     "category": "Creative",        "description": "Decentralized 3D asset generation and model synthesis. Miners produce high-quality 3D meshes and textures from text or image prompts, scored by validators on geometric fidelity and prompt adherence."},
    18: {"name": "Cortex.t",           "symbol": "CORT",    "category": "Multi-Modal",     "description": "High-performance multi-modal inference subnet built by the Opentensor Foundation. Provides access to advanced open-source models for text, image, and structured-data workloads with deep validator participation."},
    19: {"name": "Nineteen",           "symbol": "NIN",     "category": "Language",        "description": "Leading decentralized AI inference API subnet by Nineteen.ai. Provides scalable access to frontier open-source models including LLaMA 3, Stable Diffusion derivatives, and others. API-ready for enterprise integration."},
    20: {"name": "BitAgent",           "symbol": "AGENT",   "category": "Developer Tools", "description": "Autonomous AI agent subnet. Miners build and serve goal-directed agents capable of tool use, web browsing, and multi-step task completion. Evaluated on real-world task benchmarks."},
    21: {"name": "OMEGA",              "symbol": "OMEGA",   "category": "Multi-Modal",     "description": "World's largest decentralized multimodal dataset network by OMEGA Labs. Miners curate diverse video, audio, and text data — over 1M hours of footage — to power any-to-any AGI model training."},
    22: {"name": "Meta-Search",        "symbol": "META",    "category": "Data",            "description": "Decentralized AI-powered search and information retrieval. Miners index and serve web content through AI ranking models, competing on relevance and freshness of results."},
    23: {"name": "NicheImage",         "symbol": "NIMG",    "category": "Creative",        "description": "High-quality image generation subnet with fine-grained quality scoring. Miners generate images from detailed prompts, evaluated by validators using state-of-the-art image quality metrics and prompt adherence models."},
    24: {"name": "Omega",              "symbol": "OMG",     "category": "Multi-Modal",     "description": "Decentralized video understanding and multimodal AI subnet. Miners process video streams for content understanding, summarization, and semantic search applications."},
    25: {"name": "Mainframe",          "symbol": "MF",      "category": "Science",         "description": "Decentralized scientific compute subnet. Mainframe uses Bittensor incentives to distribute high-complexity protein folding and molecular simulation workloads across a global network of compute providers."},
    26: {"name": "Image Alchemy",      "symbol": "ALCH",    "category": "Creative",        "description": "Advanced image manipulation and transformation subnet. Miners apply specialised AI models for inpainting, outpainting, style transfer, and super-resolution, evaluated on perceptual quality benchmarks."},
    27: {"name": "Compute",            "symbol": "COMP",    "category": "Infrastructure",  "description": "Verifiable distributed supercomputing by NeuralInternet. Miners provide GPU and CPU compute resources with cryptographic verification of task execution. A general-purpose decentralized compute layer for Bittensor."},
    28: {"name": "Foundational Voices","symbol": "VOICE",   "category": "Creative",        "description": "Text-to-speech and voice synthesis subnet. Miners produce natural, expressive speech across languages and speaking styles, evaluated on intelligibility, naturalness, and speaker diversity."},
    29: {"name": "Fractal",            "symbol": "FRAC",    "category": "Infrastructure",  "description": "Decentralized IT infrastructure management and anomaly detection. Miners monitor and analyze system metrics to surface optimization opportunities and security anomalies across distributed infrastructure."},
    30: {"name": "TemporalFlow",       "symbol": "TFLOW",   "category": "Finance",         "description": "Time series forecasting and temporal reasoning subnet. Miners develop models for multi-horizon prediction across financial, scientific, and operational domains, evaluated on held-out forecasting benchmarks."},
    32: {"name": "ItsAI",              "symbol": "ITSAI",   "category": "Developer Tools", "description": "AI-generated content detection and verification subnet. Miners train and serve models that classify text as human-written or AI-generated, enabling authenticity tools for platforms, publishers, and enterprises."},
    33: {"name": "ReadyPlayerMine",    "symbol": "RPM",     "category": "Creative",        "description": "Gaming AI and character intelligence subnet. Miners develop and serve AI models for non-player characters, procedural game content generation, and game state analysis."},
    34: {"name": "BitMind",            "symbol": "BMIND",   "category": "Developer Tools", "description": "AI-generated content detection at scale by BitMind. Miners run multimodal deepfake and synthetic media detection models, providing authenticity verification for images, video, and audio content."},
    35: {"name": "LogicNet",           "symbol": "LOGIC",   "category": "Science",         "description": "Mathematical reasoning and formal logic subnet. Miners produce verified solutions to mathematical problems, theorem proving tasks, and structured reasoning benchmarks using specialised LLM fine-tunes."},
    36: {"name": "Automata",           "symbol": "AUTO",    "category": "Developer Tools", "description": "Workflow automation and code generation subnet. Miners build AI agents that generate, execute, and verify automation scripts and software, evaluated on real-world task completion benchmarks."},
    37: {"name": "FinAgent",           "symbol": "FIN",     "category": "Finance",         "description": "Financial analysis and reporting AI subnet. Miners produce structured financial summaries, earnings analyses, and investment research from unstructured financial text and data streams."},
    38: {"name": "Distributed Training","symbol": "DTRAIN", "category": "Language",        "description": "Decentralized neural network training using federated learning techniques. Miners contribute gradient updates across shared model architectures, enabling large-scale collaborative model training without centralisation."},
    39: {"name": "Basilica",           "symbol": "BSLC",    "category": "Developer Tools", "description": "Multi-modal content moderation and safety subnet by Basilica. Miners run classification models for harmful content detection across text, image, and video, supporting platform trust and safety applications."},
    40: {"name": "Chunking",           "symbol": "CHUNK",   "category": "Developer Tools", "description": "Token-optimization and text-chunking subnet for Retrieval-Augmented Generation (RAG) pipelines. Miners produce optimal chunk boundaries and embedding strategies that maximize retrieval accuracy."},
    41: {"name": "Sportstensor",       "symbol": "SPORT",   "category": "Finance",         "description": "Sports prediction and analytics subnet by Sportstensor. Miners develop AI models for match outcome prediction across major sports leagues, evaluated on calibrated probabilistic accuracy."},
    42: {"name": "Gen42",              "symbol": "GEN42",   "category": "Language",        "description": "Productivity AI and knowledge management subnet. Miners build assistants for document summarization, meeting intelligence, and enterprise knowledge extraction, evaluated on real-world productivity benchmarks."},
    43: {"name": "Graphite",           "symbol": "GRPH",    "category": "Creative",        "description": "Text-to-video generation subnet. Miners produce short video clips from text prompts using diffusion-based models, evaluated on temporal consistency, visual quality, and prompt faithfulness."},
    44: {"name": "Pippa",              "symbol": "PIPPA",   "category": "Language",        "description": "Social AI and conversational intelligence subnet. Miners serve personality-consistent AI companions and conversation agents, evaluated on engagement, coherence, and safety benchmarks."},
    45: {"name": "Wildcards",          "symbol": "WILD",    "category": "Creative",        "description": "Creative image generation with fine-grained style control. Miners specialize in artistic and illustrative image synthesis, evaluated on aesthetic quality and stylistic diversity metrics."},
    47: {"name": "Condense-AI",        "symbol": "COND",    "category": "Language",        "description": "Long-document summarization and compression subnet. Miners produce high-fidelity summaries of long-form content including research papers, legal documents, and technical reports."},
    49: {"name": "Hivetrain",          "symbol": "HIVE",    "category": "Science",         "description": "Automated Machine Learning (AutoML) subnet by Hivetrain. Miners run distributed hyperparameter optimization and neural architecture search, providing a decentralized platform for ML engineering automation."},
    50: {"name": "Celium",             "symbol": "CEL",     "category": "Infrastructure",  "description": "Decentralized compute marketplace subnet. Miners provide GPU resources for AI workloads with verifiable execution guarantees, targeting latency-sensitive inference and fine-tuning jobs."},
    52: {"name": "DatAgent",           "symbol": "DAGT",    "category": "Data",            "description": "Data-driven AI agent subnet for structured data interaction. Miners build agents capable of querying databases, APIs, and data streams to answer natural language questions with verifiable accuracy."},
    56: {"name": "Gradients",          "symbol": "GRAD",    "category": "Language",        "description": "Gradient-based model optimization and fine-tuning subnet. Miners specialize in efficient parameter-efficient fine-tuning (PEFT) methods, enabling task-specific model adaptation at scale."},
    57: {"name": "Gaia",               "symbol": "GAIA",    "category": "Science",         "description": "Environmental and climate data AI subnet. Miners process geospatial and environmental datasets to power prediction models for weather, climate, and ecological monitoring applications."},
    64: {"name": "Chutes",             "symbol": "CHUTES",  "category": "Infrastructure",  "description": "Decentralized AI compute platform by Chutes. Runs over 100 billion tokens per day across a distributed GPU network. Provides scalable, low-cost inference and fine-tuning for open-source AI models."},
}


def build_fallback_meta(netuid: int, source_name: str = "", source_symbol: str = "") -> dict[str, str]:
    name   = source_name   or f"SN{{netuid}}"
    symbol = source_symbol or f"SN{{netuid}}"
    return {
        "name":        name,
        "symbol":      symbol,
        "description": (
            f"Bittensor subnet SN{netuid} ({name}). Metrics are sourced directly "
            f"from the Bittensor blockchain via Subtensor. No curated description "
            f"is available yet — visit taostats.io/subnets/{netuid} for details."
        ),
        "category": "Infrastructure",
    }


# ── Subtensor field extraction helpers ────────────────────────────────────────

BLOCKS_PER_DAY = 7200  # ~12 seconds per block on Bittensor mainnet


def _get(obj: Any, *attrs: str, default: Any = None) -> Any:
    """Try multiple attribute/key names; return the first non-None hit."""
    for attr in attrs:
        # dataclass / named-tuple style
        try:
            val = getattr(obj, attr, None)
            if val is not None:
                return val
        except Exception:
            pass
        # dict style
        try:
            val = obj.get(attr) if hasattr(obj, "get") else None
            if val is not None:
                return val
        except Exception:
            pass
    return default


def _rao_to_tao(raw: Any, threshold: float = 1e6) -> float:
    """Convert RAO to TAO if the value looks like it's in RAO (> threshold)."""
    val = float(raw or 0)
    return val / 1e9 if val > threshold else val


def _balance_to_tao(raw: Any) -> float:
    """Handle bittensor Balance objects and plain floats/ints."""
    if raw is None:
        return 0.0
    # bittensor Balance objects expose .tao
    tao_val = getattr(raw, "tao", None)
    if tao_val is not None:
        return float(tao_val)
    return _rao_to_tao(raw)


def extract_subnet(info: Any, netuid: int) -> dict:
    """
    Extract and normalize one subnet's data from a SubnetInfo / DynamicInfo object.

    Tries multiple attribute names to be compatible with bittensor 8.x and 9.x.
    """
    # ── Source-backed fields ─────────────────────────────────────────────────

    # Registered neurons count (miners + validators)
    stakers = int(_get(info, "subnetwork_n", "num_uids", "n", default=0))

    # Emission values: RAO per block → TAO per day
    raw_emission = _get(info, "emission_values", "emission", "emissions", default=0)
    emission_rao_per_block = float(raw_emission or 0)
    # In 9.x, emission_values is already a float in TAO fraction per block;
    # detect RAO by magnitude
    if emission_rao_per_block > 1.0:
        # Likely in RAO; convert to TAO per block then multiply by blocks/day
        emissions_per_day = (emission_rao_per_block / 1e9) * BLOCKS_PER_DAY
    else:
        # Already a TAO fraction per block (normalised 0–1 share of daily 1 TAO emission)
        # Convert to absolute TAO: total daily emission to all subnets ≈ 7200 TAO
        # (1 TAO per block average, roughly). This is a conservative estimate.
        emissions_per_day = emission_rao_per_block * BLOCKS_PER_DAY

    # Liquidity / TAO in pool (dTAO)
    # Newer SDK exposes tao_in as a Balance object on DynamicInfo
    raw_tao_in = _get(info, "tao_in", "total_stake", "total_tao_locked", default=None)
    if raw_tao_in is not None:
        tao_in = _balance_to_tao(raw_tao_in)
    else:
        # Rough proxy: no pool data available; estimate from emissions × typical ratio
        tao_in = max(emissions_per_day * 30.0, 100.0)

    # Validator take (max_take is a fraction 0–1 in bittensor SDK)
    raw_take = _get(info, "max_take", "validator_take", default=None)
    if raw_take is not None:
        validator_take = round(float(raw_take) * 100)
        # Cap sanity: max_take in older SDK is sometimes an integer already
        if validator_take > 100:
            validator_take = round(float(raw_take))
    else:
        validator_take = 18  # default on-chain

    # Age: attempt to derive from registration-related fields
    # blocks_since_last_step is NOT subnet age — it's blocks since last incentive step
    # Registration block is not in SubnetInfo directly; use immunity_period as a hint,
    # or leave as a reasonable default
    immunity = int(_get(info, "immunity_period", default=0))
    # If we have blocks_since_registration directly, use it
    reg_blocks = int(_get(info, "blocks_since_registration", "created_at_block", default=0))
    if reg_blocks > 0:
        age = max(1, round(reg_blocks / BLOCKS_PER_DAY))
    elif immunity > 0:
        # Heuristic: older subnets tend to have longer immunity periods
        age = max(30, round(immunity / 7200))
    else:
        age = 180  # safe default: ~6 months

    # Identity fields from chain (may be empty for unnamed subnets)
    chain_name   = str(_get(info, "subnet_name", "name", default="") or "")
    chain_symbol = str(_get(info, "token_symbol", "symbol", "alpha_token_symbol", default="") or "")

    # ── Curated overlay ──────────────────────────────────────────────────────
    meta = CURATED.get(netuid) or build_fallback_meta(netuid, chain_name, chain_symbol)

    # ── Derived fields ───────────────────────────────────────────────────────
    yield_pct      = derive_yield(emissions_per_day, tao_in)
    yield_delta_7d = 0.0   # ESTIMATED: needs historical data (Phase 4)
    inflow         = 0     # ESTIMATED: needs flow endpoint (Phase 4)
    inflow_pct     = 0.0   # ESTIMATED: derived from inflow (Phase 4)
    momentum       = build_momentum(yield_pct, yield_delta_7d)
    risk           = derive_risk(tao_in, stakers, yield_delta_7d)
    score          = derive_score(tao_in, yield_pct, stakers, yield_delta_7d)
    breakeven      = derive_breakeven(yield_pct)

    return {
        "id":           f"sn{netuid}",
        "netuid":       netuid,
        "name":         meta["name"],
        "symbol":       meta["symbol"],
        "score":        score,
        "yield":        yield_pct,
        "yieldDelta7d": yield_delta_7d,
        "inflow":       inflow,
        "inflowPct":    inflow_pct,
        "risk":         risk,
        "liquidity":    round(tao_in, 1),
        "stakers":      stakers,
        "emissions":    round(emissions_per_day, 3),
        "validatorTake":validator_take,
        "description":  meta["description"],
        "category":     meta["category"],
        "momentum":     momentum,
        "isWatched":    False,
        "breakeven":    breakeven,
        "age":          age,
    }


# ── Main pipeline ──────────────────────────────────────────────────────────────

def fetch_and_write(network: str, out_path: Path, verbose: bool = True) -> int:
    """
    Connect to Subtensor, fetch all subnets, write JSON.
    Returns the number of subnets written.
    """
    try:
        import bittensor  # noqa: F401 — verify install
        from bittensor.core.subtensor import Subtensor
    except ImportError as exc:
        print(f"ERROR: bittensor package not installed.\n"
              f"  Run: pip install -r scripts/requirements.txt\n"
              f"  ({exc})", file=sys.stderr)
        sys.exit(1)

    if verbose:
        print(f"[subtensor] connecting to {network!r} …", flush=True)

    t0 = time.perf_counter()
    subtensor = Subtensor(network=network)

    if verbose:
        print(f"[subtensor] connected in {time.perf_counter() - t0:.1f}s", flush=True)
        print(f"[subtensor] fetching all subnet info …", flush=True)

    t1 = time.perf_counter()

    # Primary call: get all subnet info in one RPC round-trip.
    # Returns a list of SubnetInfo (bittensor 8.x) or DynamicInfo (bittensor 9.x)
    # objects for all registered subnets, sorted by netuid.
    try:
        all_info = subtensor.get_all_subnets_info()
    except AttributeError:
        # Older SDK fallback: get netuid list then fetch individually
        if verbose:
            print("[subtensor] get_all_subnets_info() not available; "
                  "falling back to per-netuid fetches …", flush=True)
        netuids  = subtensor.get_subnets()
        all_info = []
        for nuid in netuids:
            try:
                info = subtensor.get_subnet_info(nuid)
                if info:
                    all_info.append(info)
            except Exception as e:
                if verbose:
                    print(f"  [warn] SN{nuid}: {e}", file=sys.stderr)

    if verbose:
        print(f"[subtensor] received {len(all_info)} subnet records "
              f"in {time.perf_counter() - t1:.1f}s", flush=True)

    subnets: list[dict] = []
    skipped = 0

    for info in all_info:
        try:
            netuid = int(_get(info, "netuid", default=-1))
            if netuid < 0:
                continue
            if netuid == 0:
                # Skip SN0 (root network) — not a real incentive subnet
                continue
            subnet = extract_subnet(info, netuid)
            subnets.append(subnet)
        except Exception as e:
            skipped += 1
            if verbose:
                nid = getattr(info, "netuid", "?")
                print(f"  [warn] SN{nid}: extraction failed — {e}", file=sys.stderr)

    # Sort by netuid ascending (matches UI default display)
    subnets.sort(key=lambda s: s["netuid"])

    # ── Write output ─────────────────────────────────────────────────────────
    out_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "_meta": {
            "source":        "subtensor",
            "network":       network,
            "fetched_at":    datetime.now(timezone.utc).isoformat(),
            "subnet_count":  len(subnets),
            "skipped":       skipped,
            "schema_version": 3,
        },
        "subnets": subnets,
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        f.write("\n")

    if verbose:
        print(f"\n✓ Wrote {len(subnets)} subnets → {out_path}")
        if skipped:
            print(f"  ({skipped} skipped due to extraction errors)")
        print(f"  Total time: {time.perf_counter() - t0:.1f}s")

    return len(subnets)


# ── Field provenance summary (printed with --explain) ─────────────────────────

EXPLAIN = """
Field provenance for Tao Navigator Phase 3 (Subtensor pipeline)
================================================================

SOURCE-BACKED (read directly from Subtensor chain):
  netuid            → info.netuid
  stakers           → info.subnetwork_n  (total registered neurons: miners + validators)
  emissions         → info.emission_values × 7200 blocks/day (RAO → TAO/day)
  validatorTake     → info.max_take × 100  (fraction → percentage)
  age               → blocks_since_registration ÷ 7200  (if field exists on info object)
  liquidity         → info.tao_in  (dTAO pool TAO side; available on DynamicInfo in bt 9.x)

DERIVED (computed from source-backed values; Python mirrors lib/data/subnets-real-helpers.ts):
  yield             → (emissions / liquidity) × 365 × 100  [APR %]
  risk              → threshold rules on (liquidity, stakers, yieldDelta7d)
  score             → weighted sum: liquidity 40% + yield 30% + stakers 20% + stability 10%
  momentum          → 14-point sparkline seeded from (yield, yieldDelta7d)
  breakeven         → move_fee_rate (0.1%) / daily_yield_rate
  yieldDelta7d      → 0.0  (ESTIMATED — needs historical data; Phase 4)
  inflow            → 0    (ESTIMATED — needs flow endpoint; Phase 4)
  inflowPct         → 0.0  (ESTIMATED — derived from inflow; Phase 4)

CURATED OVERLAY (human-researched; applied on top of chain data):
  name              → CURATED dict or fallback "SN{{netuid}}"
  symbol            → CURATED dict or fallback "SN{{netuid}}"
  description       → CURATED dict or generic placeholder
  category          → CURATED dict or "Infrastructure"

  Curated entries:  {curated_count}
  Fallback applied: all remaining subnets
""".format(curated_count=len(CURATED))


# ── CLI ────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch all Bittensor subnets from Subtensor and write "
                    "public/data/subnets.json for Tao Navigator.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/fetch_subnets_subtensor.py
  python scripts/fetch_subnets_subtensor.py --network ws://127.0.0.1:9944
  python scripts/fetch_subnets_subtensor.py --network test
  python scripts/fetch_subnets_subtensor.py --explain
        """,
    )
    parser.add_argument(
        "--network",
        default=os.environ.get("BITTENSOR_NETWORK", "finney"),
        help="Subtensor network or ws:// endpoint URL (default: finney / env BITTENSOR_NETWORK)",
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
    )
    sys.exit(0 if count > 0 else 1)


if __name__ == "__main__":
    main()
