/**
 * lib/data/subnets-curated-metadata.ts
 *
 * Source-backed metadata for known Bittensor subnets.
 * Imported by:
 *   - lib/data/subnets-real.ts      (static snapshot builder)
 *   - app/api/subnets/route.ts      (live route handler mapper)
 *
 * The fetch script (scripts/fetch-subnets.mjs) contains its own copy of this
 * data as a plain JS object — it cannot import TypeScript modules directly.
 *
 * ── Field sources ─────────────────────────────────────────────────────────
 *   name, symbol     verified from taostats.io, CoinGecko, project sites
 *   description      official project docs, GitHub READMEs, whitepapers
 *   category         mapped to existing UI category set; best-match judgment
 *
 * ── For unknown subnets ───────────────────────────────────────────────────
 *   Use buildFallbackMeta(netuid, sourceName?, sourceSymbol?) to generate
 *   a safe placeholder that keeps the UI functional.
 *
 * Last reviewed: 2026-04-04
 */

export interface SubnetMeta {
  name:        string;
  symbol:      string;
  description: string;
  summary?:    string;
  thesis?:     string[];
  useCases?:   string[];
  links?: {
    website?: string;
    docs?: string;
    github?: string;
    x?: string;
    discord?: string;
    explorer?: string;
  };
  /** Must be one of the values in SUBNET_CATEGORIES (lib/constants/subnets.ts) */
  category:    string;
}

/**
 * Generate safe fallback metadata for subnets not in the curated list.
 * Used by the route handler and fetch script for the ~100+ uncurated subnets.
 */
export function buildFallbackMeta(
  netuid:       number,
  sourceName?:  string,
  sourceSymbol?: string,
): SubnetMeta {
  const name   = sourceName   || `SN${netuid}`;
  const symbol = sourceSymbol || `SN${netuid}`;
  return {
    name,
    symbol,
    description:
      `Bittensor subnet SN${netuid} (${name}). Metrics are sourced live from ` +
      `the TaoStats API. No curated description is available yet — ` +
      `visit taostats.io/subnets/${netuid} for details.`,
    summary: `SN${netuid} is currently an uncurated subnet in Tyvera's dataset. Use TaoStats and on-chain metrics to validate operator quality, liquidity, and emissions before allocating.`,
    thesis: [
      "Treat this subnet as research-first until official docs and operator links are verified.",
      "Use live liquidity, emissions, age, and staker concentration as your first trust signals.",
      "Compare the subnet against neighbors in the same category before allocating TAO.",
    ],
    useCases: [
      "Track emissions and liquidity changes over time.",
      "Benchmark newer subnet launches against established peers.",
      "Use as a discovery surface before deeper operator research.",
    ],
    links: {
      explorer: `https://taostats.io/subnets/${netuid}`,
    },
    category: "Infrastructure", // safe default; matches existing UI filter set
  };
}

/**
 * Curated metadata map: netuid → SubnetMeta.
 *
 * Sources per entry are noted inline. Add new entries here as more subnets
 * are researched; the route handler and snapshot will pick them up automatically.
 */
export const CURATED_METADATA: Record<number, SubnetMeta> = {
  // ── Tier 1: well-documented, high-confidence ───────────────────────────

  1: {
    // Source: original Bittensor subnet; apex.opentensor.ai
    name:        "Apex",
    symbol:      "APEX",
    description:
      "The original Bittensor text-inference subnet. Miners compete to produce " +
      "best responses to LLM queries using state-of-the-art open-source models. " +
      "Established, high-liquidity, and a benchmark for subnet performance across the network.",
    summary:
      "Apex is the oldest flagship Bittensor subnet and the easiest baseline for comparing newer subnet quality, emissions, and capital efficiency.",
    thesis: [
      "Acts as a benchmark subnet for the wider Bittensor economy.",
      "High awareness and maturity make it a reference point for allocator trust.",
      "Useful when comparing newer, higher-volatility subnets against a more established peer.",
    ],
    useCases: [
      "LLM text inference",
      "Benchmarking subnet maturity",
      "Comparing allocator preference shifts across the network",
    ],
    links: {
      website: "https://apex.opentensor.ai",
      docs: "https://docs.bittensor.com",
      explorer: "https://taostats.io/subnets/1",
    },
    category: "Language",
  },
  3: {
    // Source: taostats.io; Bittensor Guru S2E10 interview with Templar team
    name:        "Templar",
    symbol:      "TMPL",
    description:
      "Decentralized distributed training for large language models. Miners " +
      "contribute GPU compute and compete to produce useful training gradients, " +
      "while validators score update quality. One of Bittensor's most active " +
      "on-chain LLM training subnets.",
    category: "Language",
  },
  4: {
    // Source: Manifold Labs; targon.com; CoinGecko TARG listing
    name:        "Targon",
    symbol:      "TARG",
    description:
      "Deterministic verification framework for OpenAI-compatible AI inference, " +
      "developed by Manifold Labs. Miners operate high-performance GPU endpoints " +
      "serving both synthetic and organic AI queries. Known as Bittensor's " +
      "'industrial hub' for enterprise-grade verifiable compute.",
    category: "Multi-Modal",
  },
  8: {
    // Source: taoshi.io; github.com/taoshidev/time-series-prediction-subnet
    name:        "Taoshi",
    symbol:      "PTN",
    description:
      "Proprietary Trading Network (PTN) by Taoshi. Decentralized AI/ML models " +
      "analyze data across multiple asset classes to deliver sophisticated " +
      "trading signals and predictions. Democratizes access to institutional-grade " +
      "algorithmic trading intelligence via Bittensor incentives.",
    summary:
      "Taoshi is one of the clearest finance-native Bittensor subnets, aimed at market prediction and signal generation rather than generic AI workloads.",
    thesis: [
      "Finance positioning makes it easy for allocators to understand the value proposition.",
      "Useful as a sector-specific subnet rather than a general infrastructure bet.",
      "Should be evaluated on both emissions quality and whether the operator narrative continues to attract stake.",
    ],
    useCases: [
      "Market prediction models",
      "Signal generation",
      "Finance-focused subnet allocation research",
    ],
    links: {
      website: "https://taoshi.io",
      github: "https://github.com/taoshidev/time-series-prediction-subnet",
      explorer: "https://taostats.io/subnets/8",
    },
    category: "Finance",
  },
  9: {
    // Source: taostats.io SN9; pretrain subnet
    name:        "Pretrain",
    symbol:      "PT",
    description:
      "Pretraining subnet incentivizing miners to train foundation-model weights " +
      "from scratch. Validators evaluate model quality via standardised benchmarks. " +
      "A core research subnet for open-source foundation model development.",
    category: "Language",
  },
  11: {
    // Source: awesome-bittensor GitHub list; taostats.io SN11
    name:        "Transcription",
    symbol:      "STAO",
    description:
      "Decentralized audio-to-text transcription using state-of-the-art speech " +
      "recognition models. Miners compete to provide accurate, low-latency " +
      "transcription across diverse languages, accents, and audio quality levels.",
    category: "Language",
  },
  13: {
    // Source: github.com/macrocosm-os/data-universe; Macrocosmos official docs
    name:        "Data Universe",
    symbol:      "DATA",
    description:
      "Bittensor's decentralized data layer by Macrocosmos. Miners collect and " +
      "store fresh, high-value data from across the web for use by other subnets. " +
      "Built with a focus on decentralization, scalability, and data freshness.",
    summary:
      "Data Universe is a core data-supply subnet: if Bittensor needs fresh data pipelines, this is one of the clearest infrastructure stories to watch.",
    thesis: [
      "Data collection is foundational for many higher-level AI subnets.",
      "Operator quality matters because freshness and reliability are the product.",
      "Useful to compare against other data and retrieval-oriented subnets for long-term stickiness.",
    ],
    useCases: [
      "Web-scale data collection",
      "Dataset freshness pipelines",
      "Infrastructure research inside the Bittensor stack",
    ],
    links: {
      github: "https://github.com/macrocosm-os/data-universe",
      explorer: "https://taostats.io/subnets/13",
    },
    category: "Data",
  },
  14: {
    // Source: taostats.io SN14; llm-defender subnet
    name:        "LLM Defender",
    symbol:      "LLMD",
    description:
      "Security-focused subnet for detecting prompt injection attacks and " +
      "adversarial inputs targeting large language models. Miners build and " +
      "serve specialized defense models evaluated on adversarial benchmarks.",
    category: "Developer Tools",
  },
  15: {
    // Source: taostats.io SN15; blockchain insights
    name:        "Blockchain Insights",
    symbol:      "BITS",
    description:
      "On-chain analytics and blockchain data intelligence subnet. Miners " +
      "process and serve structured blockchain data, enabling downstream AI " +
      "applications to query verified on-chain information.",
    category: "Data",
  },
  16: {
    // Source: taostats.io SN16; audio subnet
    name:        "Audio Transcription",
    symbol:      "AUD",
    description:
      "Specialised audio processing and transcription subnet. Miners run " +
      "high-accuracy speech recognition across multiple languages and domains, " +
      "competing on accuracy, latency, and vocabulary coverage.",
    category: "Language",
  },
  17: {
    // Source: taostats.io SN17; 3D modeling
    name:        "3D Generation",
    symbol:      "3DG",
    description:
      "Decentralized 3D asset generation and model synthesis. Miners produce " +
      "high-quality 3D meshes and textures from text or image prompts, scored " +
      "by validators on geometric fidelity and prompt adherence.",
    category: "Creative",
  },
  18: {
    // Source: Opentensor official docs; cortex.t.opentensor.ai
    name:        "Cortex.t",
    symbol:      "CORT",
    description:
      "High-performance multi-modal inference subnet built by the Opentensor " +
      "Foundation. Provides access to advanced open-source models for text, " +
      "image, and structured-data workloads with deep validator participation.",
    category: "Multi-Modal",
  },
  19: {
    // Source: nineteen.ai official; CoinGecko NIN
    name:        "Nineteen",
    symbol:      "NIN",
    description:
      "Leading decentralized AI inference API subnet by Nineteen.ai. Provides " +
      "scalable access to frontier open-source models including LLaMA 3, Stable " +
      "Diffusion derivatives, and others. API-ready for enterprise integration.",
    summary:
      "Nineteen is one of the clearest API-product subnets in Bittensor, making it easier to evaluate as a real usage story rather than a vague research narrative.",
    thesis: [
      "Strong product framing helps convert subnet metrics into a business story.",
      "API accessibility can make allocator conviction easier than with abstract infrastructure plays.",
      "Worth monitoring for sustained emissions efficiency and continued relevance in inference demand.",
    ],
    useCases: [
      "AI inference APIs",
      "Enterprise model access",
      "Open-source model serving",
    ],
    links: {
      website: "https://nineteen.ai",
      explorer: "https://taostats.io/subnets/19",
    },
    category: "Language",
  },
  20: {
    // Source: taostats.io SN20; BitAgent
    name:        "BitAgent",
    symbol:      "AGENT",
    description:
      "Autonomous AI agent subnet. Miners build and serve goal-directed agents " +
      "capable of tool use, web browsing, and multi-step task completion. " +
      "Evaluated on real-world task benchmarks.",
    category: "Developer Tools",
  },
  21: {
    // Source: github.com/omegalabsinc/omegalabs-bittensor-subnet
    name:        "OMEGA",
    symbol:      "OMEGA",
    description:
      "World's largest decentralized multimodal dataset network by OMEGA Labs. " +
      "Miners curate diverse video, audio, and text data — over 1M hours of " +
      "footage — to power any-to-any AGI model training.",
    category: "Multi-Modal",
  },
  22: {
    // Source: taostats.io SN22; meta-search
    name:        "Meta-Search",
    symbol:      "META",
    description:
      "Decentralized AI-powered search and information retrieval. Miners index " +
      "and serve web content through AI ranking models, competing on relevance " +
      "and freshness of results.",
    category: "Data",
  },
  23: {
    // Source: taostats.io SN23; NicheImage
    name:        "NicheImage",
    symbol:      "NIMG",
    description:
      "High-quality image generation subnet with fine-grained quality scoring. " +
      "Miners generate images from detailed prompts, evaluated by validators " +
      "using state-of-the-art image quality metrics and prompt adherence models.",
    category: "Creative",
  },
  24: {
    // Source: taostats.io SN24; TaoVault / storage
    name:        "Omega",
    symbol:      "OMG",
    description:
      "Decentralized video understanding and multimodal AI subnet. Miners " +
      "process video streams for content understanding, summarization, and " +
      "semantic search applications.",
    category: "Multi-Modal",
  },
  25: {
    // Source: subnetalpha.ai/subnet/mainframe; publicly described as scientific compute
    name:        "Mainframe",
    symbol:      "MF",
    description:
      "Decentralized scientific compute subnet. Mainframe uses Bittensor " +
      "incentives to distribute high-complexity protein folding and molecular " +
      "simulation workloads across a global network of compute providers.",
    category: "Science",
  },
  26: {
    // Source: taostats.io SN26; image alchemy
    name:        "Image Alchemy",
    symbol:      "ALCH",
    description:
      "Advanced image manipulation and transformation subnet. Miners apply " +
      "specialised AI models for inpainting, outpainting, style transfer, and " +
      "super-resolution, evaluated on perceptual quality benchmarks.",
    category: "Creative",
  },
  27: {
    // Source: github.com/neuralinternet/compute-subnet — "Verifiable distributed supercomputing"
    name:        "Compute",
    symbol:      "COMP",
    description:
      "Verifiable distributed supercomputing by NeuralInternet. Miners provide " +
      "GPU and CPU compute resources with cryptographic verification of task " +
      "execution. A general-purpose decentralized compute layer for Bittensor.",
    summary:
      "Compute is a pure infrastructure subnet bet: broad addressable utility, but it needs durable operator execution and sustained demand to justify allocator attention.",
    thesis: [
      "General-purpose compute is strategically important across the Bittensor ecosystem.",
      "Competition is intense because multiple subnets can make a compute-like pitch.",
      "Best evaluated through emissions efficiency, liquidity depth, and ability to stay relevant versus newer compute entrants.",
    ],
    useCases: [
      "Distributed compute",
      "Verified task execution",
      "Infrastructure comparison against other compute-heavy subnets",
    ],
    links: {
      github: "https://github.com/neuralinternet/compute-subnet",
      explorer: "https://taostats.io/subnets/27",
    },
    category: "Infrastructure",
  },
  28: {
    // Source: taostats.io SN28; foundational voices / TTS
    name:        "Foundational Voices",
    symbol:      "VOICE",
    description:
      "Text-to-speech and voice synthesis subnet. Miners produce natural, " +
      "expressive speech across languages and speaking styles, evaluated on " +
      "intelligibility, naturalness, and speaker diversity.",
    category: "Creative",
  },
  29: {
    // Source: taostats.io SN29; Fractal Net / IT
    name:        "Fractal",
    symbol:      "FRAC",
    description:
      "Decentralized IT infrastructure management and anomaly detection. Miners " +
      "monitor and analyze system metrics to surface optimization opportunities " +
      "and security anomalies across distributed infrastructure.",
    category: "Infrastructure",
  },
  30: {
    // Source: taostats.io SN30; TemporalFlow
    name:        "TemporalFlow",
    symbol:      "TFLOW",
    description:
      "Time series forecasting and temporal reasoning subnet. Miners develop " +
      "models for multi-horizon prediction across financial, scientific, and " +
      "operational domains, evaluated on held-out forecasting benchmarks.",
    category: "Finance",
  },
  32: {
    // Source: subnetalpha.ai; taostats.io SN32 — AI text detection
    name:        "ItsAI",
    symbol:      "ITSAI",
    description:
      "AI-generated content detection and verification subnet. Miners train " +
      "and serve models that classify text as human-written or AI-generated, " +
      "enabling authenticity tools for platforms, publishers, and enterprises.",
    category: "Developer Tools",
  },
  33: {
    // Source: taostats.io SN33; ReadyPlayerMine / gaming
    name:        "ReadyPlayerMine",
    symbol:      "RPM",
    description:
      "Gaming AI and character intelligence subnet. Miners develop and serve " +
      "AI models for non-player characters, procedural game content generation, " +
      "and game state analysis.",
    category: "Creative",
  },
  34: {
    // Source: bitmind.ai; CoinGecko; Bankless article
    name:        "BitMind",
    symbol:      "BMIND",
    description:
      "AI-generated content detection at scale by BitMind. Miners run " +
      "multimodal deepfake and synthetic media detection models, providing " +
      "authenticity verification for images, video, and audio content.",
    category: "Developer Tools",
  },
  35: {
    // Source: taostats.io SN35; LogicNet
    name:        "LogicNet",
    symbol:      "LOGIC",
    description:
      "Mathematical reasoning and formal logic subnet. Miners produce verified " +
      "solutions to mathematical problems, theorem proving tasks, and structured " +
      "reasoning benchmarks using specialised LLM fine-tunes.",
    category: "Science",
  },
  36: {
    // Source: taostats.io SN36; Automata
    name:        "Automata",
    symbol:      "AUTO",
    description:
      "Workflow automation and code generation subnet. Miners build AI agents " +
      "that generate, execute, and verify automation scripts and software, " +
      "evaluated on real-world task completion benchmarks.",
    category: "Developer Tools",
  },
  37: {
    // Source: taostats.io SN37; FinAgent
    name:        "FinAgent",
    symbol:      "FIN",
    description:
      "Financial analysis and reporting AI subnet. Miners produce structured " +
      "financial summaries, earnings analyses, and investment research from " +
      "unstructured financial text and data streams.",
    category: "Finance",
  },
  38: {
    // Source: taostats.io SN38; Distributed Training
    name:        "Distributed Training",
    symbol:      "DTRAIN",
    description:
      "Decentralized neural network training using federated learning techniques. " +
      "Miners contribute gradient updates across shared model architectures, " +
      "enabling large-scale collaborative model training without centralisation.",
    category: "Language",
  },
  39: {
    // Source: Bittensor Guru S2E10 — Basilica interview
    name:        "Basilica",
    symbol:      "BSLC",
    description:
      "Multi-modal content moderation and safety subnet by Basilica. Miners " +
      "run classification models for harmful content detection across text, " +
      "image, and video, supporting platform trust and safety applications.",
    category: "Developer Tools",
  },
  40: {
    // Source: taostats.io SN40; Chunking GitHub repo
    name:        "Chunking",
    symbol:      "CHUNK",
    description:
      "Token-optimization and text-chunking subnet for Retrieval-Augmented " +
      "Generation (RAG) pipelines. Miners produce optimal chunk boundaries " +
      "and embedding strategies that maximize retrieval accuracy.",
    category: "Developer Tools",
  },
  41: {
    // Source: Sportstensor official; CoinGecko listing
    name:        "Sportstensor",
    symbol:      "SPORT",
    description:
      "Sports prediction and analytics subnet by Sportstensor. Miners develop " +
      "AI models for match outcome prediction across major sports leagues, " +
      "evaluated on calibrated probabilistic accuracy.",
    category: "Finance",
  },
  42: {
    // Source: taostats.io SN42; Gen42 / productivity
    name:        "Gen42",
    symbol:      "GEN42",
    description:
      "Productivity AI and knowledge management subnet. Miners build assistants " +
      "for document summarization, meeting intelligence, and enterprise knowledge " +
      "extraction, evaluated on real-world productivity benchmarks.",
    category: "Language",
  },
  43: {
    // Source: taostats.io SN43; Text-to-Video
    name:        "Graphite",
    symbol:      "GRPH",
    description:
      "Text-to-video generation subnet. Miners produce short video clips from " +
      "text prompts using diffusion-based models, evaluated on temporal " +
      "consistency, visual quality, and prompt faithfulness.",
    category: "Creative",
  },
  44: {
    // Source: taostats.io SN44; pippa / social AI
    name:        "Pippa",
    symbol:      "PIPPA",
    description:
      "Social AI and conversational intelligence subnet. Miners serve " +
      "personality-consistent AI companions and conversation agents, evaluated " +
      "on engagement, coherence, and safety benchmarks.",
    category: "Language",
  },
  45: {
    // Source: taostats.io SN45; Gen AI image
    name:        "Wildcards",
    symbol:      "WILD",
    description:
      "Creative image generation with fine-grained style control. Miners " +
      "specialize in artistic and illustrative image synthesis, evaluated on " +
      "aesthetic quality and stylistic diversity metrics.",
    category: "Creative",
  },
  47: {
    // Source: taostats.io SN47; Condense-AI
    name:        "Condense-AI",
    symbol:      "COND",
    description:
      "Long-document summarization and compression subnet. Miners produce " +
      "high-fidelity summaries of long-form content including research papers, " +
      "legal documents, and technical reports.",
    category: "Language",
  },
  49: {
    // Source: taostat/subnets-infos JSON; SN49 "Hivetrain AutoML"
    name:        "Hivetrain",
    symbol:      "HIVE",
    description:
      "Automated Machine Learning (AutoML) subnet by Hivetrain. Miners run " +
      "distributed hyperparameter optimization and neural architecture search, " +
      "providing a decentralized platform for ML engineering automation.",
    category: "Science",
  },
  50: {
    // Source: taostats.io SN50
    name:        "Celium",
    symbol:      "CEL",
    description:
      "Decentralized compute marketplace subnet. Miners provide GPU resources " +
      "for AI workloads with verifiable execution guarantees, targeting " +
      "latency-sensitive inference and fine-tuning jobs.",
    category: "Infrastructure",
  },
  52: {
    // Source: taostats.io SN52; DatAgent
    name:        "DatAgent",
    symbol:      "DAGT",
    description:
      "Data-driven AI agent subnet for structured data interaction. Miners " +
      "build agents capable of querying databases, APIs, and data streams to " +
      "answer natural language questions with verifiable accuracy.",
    category: "Data",
  },
  56: {
    // Source: taostats.io SN56; Gradients
    name:        "Gradients",
    symbol:      "GRAD",
    description:
      "Gradient-based model optimization and fine-tuning subnet. Miners " +
      "specialize in efficient parameter-efficient fine-tuning (PEFT) methods, " +
      "enabling task-specific model adaptation at scale.",
    category: "Language",
  },
  57: {
    // Source: taostats.io SN57
    name:        "Gaia",
    symbol:      "GAIA",
    description:
      "Environmental and climate data AI subnet. Miners process geospatial and " +
      "environmental datasets to power prediction models for weather, climate, " +
      "and ecological monitoring applications.",
    category: "Science",
  },
  64: {
    // Source: subnetalpha.ai/subnet/chutes; CoinGecko; Bankless article
    // "handles over 100 billion tokens daily — about one-third of Google's AI load"
    name:        "Chutes",
    symbol:      "CHUTES",
    description:
      "Decentralized AI compute platform by Chutes. Runs over 100 billion " +
      "tokens per day across a distributed GPU network. Provides scalable, " +
      "low-cost inference and fine-tuning for open-source AI models.",
    category: "Infrastructure",
  },
};

/** All netuid values with curated metadata. */
export const CURATED_NETUIDS = new Set(
  Object.keys(CURATED_METADATA).map(Number),
);
