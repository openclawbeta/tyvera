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
 * Last reviewed: 2026-04-05
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

function createSubnetMeta(
  netuid: number,
  name: string,
  symbol: string,
  category: string,
  description: string,
  links?: SubnetMeta["links"],
  thesis?: string[],
  useCases?: string[],
): SubnetMeta {
  const summary = `${name} is a ${category.toLowerCase()} subnet in Bittensor. Tyvera frames it through live emissions, liquidity, age, and operator narrative so allocators can quickly decide whether it deserves deeper research.`;

  return {
    name,
    symbol,
    category,
    description,
    summary,
    thesis: thesis ?? [
      `${name} should be compared against other ${category.toLowerCase()} subnets on liquidity depth, emissions efficiency, and maturity rather than judged on yield alone.`,
      `If stake is flowing into ${name}, the key question is whether the product story and on-chain metrics still line up.`,
      `Use ${name} inside a portfolio context: risk, concentration, and category exposure matter as much as raw APR.`,
    ],
    useCases: useCases ?? [
      `${category} subnet research`,
      "Allocator watchlist triage",
      "Subnet-to-subnet comparison",
    ],
    links,
  };
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
    category: "Infrastructure",
  };
}

/**
 * Curated metadata map: netuid → SubnetMeta.
 *
 * For now this aims for high coverage with practical investor-facing guidance.
 * Known/important subnets get stronger links and more specific framing; the rest
 * still receive enough structure to make the detail page useful.
 */
export const CURATED_METADATA: Record<number, SubnetMeta> = {
  1: createSubnetMeta(
    1,
    "Apex",
    "APEX",
    "Language",
    "The original Bittensor text-inference subnet. Miners compete to produce best responses to LLM queries using state-of-the-art open-source models. Established, high-liquidity, and a benchmark for subnet performance across the network.",
    {
      website: "https://apex.opentensor.ai",
      docs: "https://docs.bittensor.com",
      explorer: "https://taostats.io/subnets/1",
    },
    [
      "Apex is a benchmark subnet for judging the maturity of the wider network.",
      "It is more useful as a reference point than as a hype-driven narrative play.",
      "Allocator trust here often comes from longevity and baseline relevance.",
    ],
    ["Text inference", "Benchmarking subnet maturity", "Allocator baseline comparison"],
  ),
  3: createSubnetMeta(
    3,
    "Templar",
    "TMPL",
    "Language",
    "Decentralized distributed training for large language models. Miners contribute GPU compute and compete to produce useful training gradients, while validators score update quality. One of Bittensor's most active on-chain LLM training subnets.",
    { explorer: "https://taostats.io/subnets/3" },
  ),
  4: createSubnetMeta(
    4,
    "Targon",
    "TARG",
    "Multi-Modal",
    "Deterministic verification framework for OpenAI-compatible AI inference, developed by Manifold Labs. Miners operate high-performance GPU endpoints serving both synthetic and organic AI queries. Known as Bittensor's industrial hub for enterprise-grade verifiable compute.",
    { explorer: "https://taostats.io/subnets/4" },
  ),
  8: createSubnetMeta(
    8,
    "Taoshi",
    "PTN",
    "Finance",
    "Proprietary Trading Network (PTN) by Taoshi. Decentralized AI/ML models analyze data across multiple asset classes to deliver sophisticated trading signals and predictions. Democratizes access to institutional-grade algorithmic trading intelligence via Bittensor incentives.",
    {
      website: "https://taoshi.io",
      github: "https://github.com/taoshidev/time-series-prediction-subnet",
      explorer: "https://taostats.io/subnets/8",
    },
    [
      "Taoshi is one of the clearest finance-native subnet stories in Bittensor.",
      "It should be judged as a sector bet, not just as a generic yield source.",
      "Narrative durability matters here because allocators need to believe the product category is sticky.",
    ],
    ["Trading signals", "Market prediction", "Finance subnet comparison"],
  ),
  9: createSubnetMeta(9, "Pretrain", "PT", "Language", "Pretraining subnet incentivizing miners to train foundation-model weights from scratch. Validators evaluate model quality via standardised benchmarks. A core research subnet for open-source foundation model development.", { explorer: "https://taostats.io/subnets/9" }),
  11: createSubnetMeta(11, "Transcription", "STAO", "Language", "Decentralized audio-to-text transcription using state-of-the-art speech recognition models. Miners compete to provide accurate, low-latency transcription across diverse languages, accents, and audio quality levels.", { explorer: "https://taostats.io/subnets/11" }),
  13: createSubnetMeta(
    13,
    "Data Universe",
    "DATA",
    "Data",
    "Bittensor's decentralized data layer by Macrocosmos. Miners collect and store fresh, high-value data from across the web for use by other subnets. Built with a focus on decentralization, scalability, and data freshness.",
    {
      github: "https://github.com/macrocosm-os/data-universe",
      explorer: "https://taostats.io/subnets/13",
    },
    [
      "Fresh data infrastructure can be more durable than trend-driven AI narratives.",
      "This subnet matters because many downstream models depend on data quality and recency.",
      "If the operator story weakens, the data metrics should show it before the narrative does.",
    ],
    ["Web-scale data collection", "Dataset freshness pipelines", "Data subnet benchmarking"],
  ),
  14: createSubnetMeta(14, "LLM Defender", "LLMD", "Developer Tools", "Security-focused subnet for detecting prompt injection attacks and adversarial inputs targeting large language models. Miners build and serve specialized defense models evaluated on adversarial benchmarks.", { explorer: "https://taostats.io/subnets/14" }),
  15: createSubnetMeta(15, "Blockchain Insights", "BITS", "Data", "On-chain analytics and blockchain data intelligence subnet. Miners process and serve structured blockchain data, enabling downstream AI applications to query verified on-chain information.", { explorer: "https://taostats.io/subnets/15" }),
  16: createSubnetMeta(16, "Audio Transcription", "AUD", "Language", "Specialised audio processing and transcription subnet. Miners run high-accuracy speech recognition across multiple languages and domains, competing on accuracy, latency, and vocabulary coverage.", { explorer: "https://taostats.io/subnets/16" }),
  17: createSubnetMeta(17, "3D Generation", "3DG", "Creative", "Decentralized 3D asset generation and model synthesis. Miners produce high-quality 3D meshes and textures from text or image prompts, scored by validators on geometric fidelity and prompt adherence.", { explorer: "https://taostats.io/subnets/17" }),
  18: createSubnetMeta(18, "Cortex.t", "CORT", "Multi-Modal", "High-performance multi-modal inference subnet built by the Opentensor Foundation. Provides access to advanced open-source models for text, image, and structured-data workloads with deep validator participation.", { website: "https://cortex.t.opentensor.ai", docs: "https://docs.bittensor.com", explorer: "https://taostats.io/subnets/18" }),
  19: createSubnetMeta(19, "Nineteen", "NIN", "Language", "Leading decentralized AI inference API subnet by Nineteen.ai. Provides scalable access to frontier open-source models including LLaMA 3, Stable Diffusion derivatives, and others. API-ready for enterprise integration.", { website: "https://nineteen.ai", explorer: "https://taostats.io/subnets/19" }),
  20: createSubnetMeta(20, "BitAgent", "AGENT", "Developer Tools", "Autonomous AI agent subnet. Miners build and serve goal-directed agents capable of tool use, web browsing, and multi-step task completion. Evaluated on real-world task benchmarks.", { explorer: "https://taostats.io/subnets/20" }),
  21: createSubnetMeta(21, "OMEGA", "OMEGA", "Multi-Modal", "World's largest decentralized multimodal dataset network by OMEGA Labs. Miners curate diverse video, audio, and text data — over 1M hours of footage — to power any-to-any AGI model training.", { github: "https://github.com/omegalabsinc/omegalabs-bittensor-subnet", explorer: "https://taostats.io/subnets/21" }),
  22: createSubnetMeta(22, "Meta-Search", "META", "Data", "Decentralized AI-powered search and information retrieval. Miners index and serve web content through AI ranking models, competing on relevance and freshness of results.", { explorer: "https://taostats.io/subnets/22" }),
  23: createSubnetMeta(23, "NicheImage", "NIMG", "Creative", "High-quality image generation subnet with fine-grained quality scoring. Miners generate images from detailed prompts, evaluated by validators using state-of-the-art image quality metrics and prompt adherence models.", { explorer: "https://taostats.io/subnets/23" }),
  24: createSubnetMeta(24, "Omega", "OMG", "Multi-Modal", "Decentralized video understanding and multimodal AI subnet. Miners process video streams for content understanding, summarization, and semantic search applications.", { explorer: "https://taostats.io/subnets/24" }),
  25: createSubnetMeta(25, "Mainframe", "MF", "Science", "Decentralized scientific compute subnet. Mainframe uses Bittensor incentives to distribute high-complexity protein folding and molecular simulation workloads across a global network of compute providers.", { explorer: "https://taostats.io/subnets/25" }),
  26: createSubnetMeta(26, "Image Alchemy", "ALCH", "Creative", "Advanced image manipulation and transformation subnet. Miners apply specialised AI models for inpainting, outpainting, style transfer, and super-resolution, evaluated on perceptual quality benchmarks.", { explorer: "https://taostats.io/subnets/26" }),
  27: createSubnetMeta(27, "Compute", "COMP", "Infrastructure", "Verifiable distributed supercomputing by NeuralInternet. Miners provide GPU and CPU compute resources with cryptographic verification of task execution. A general-purpose decentralized compute layer for Bittensor.", { github: "https://github.com/neuralinternet/compute-subnet", explorer: "https://taostats.io/subnets/27" }),
  28: createSubnetMeta(28, "Foundational Voices", "VOICE", "Creative", "Text-to-speech and voice synthesis subnet. Miners produce natural, expressive speech across languages and speaking styles, evaluated on intelligibility, naturalness, and speaker diversity.", { explorer: "https://taostats.io/subnets/28" }),
  29: createSubnetMeta(29, "Fractal", "FRAC", "Infrastructure", "Decentralized IT infrastructure management and anomaly detection. Miners monitor and analyze system metrics to surface optimization opportunities and security anomalies across distributed infrastructure.", { explorer: "https://taostats.io/subnets/29" }),
  30: createSubnetMeta(30, "TemporalFlow", "TFLOW", "Finance", "Time series forecasting and temporal reasoning subnet. Miners develop models for multi-horizon prediction across financial, scientific, and operational domains, evaluated on held-out forecasting benchmarks.", { explorer: "https://taostats.io/subnets/30" }),
  32: createSubnetMeta(32, "ItsAI", "ITSAI", "Developer Tools", "AI-generated content detection and verification subnet. Miners train and serve models that classify text as human-written or AI-generated, enabling authenticity tools for platforms, publishers, and enterprises.", { explorer: "https://taostats.io/subnets/32" }),
  33: createSubnetMeta(33, "ReadyPlayerMine", "RPM", "Creative", "Gaming AI and character intelligence subnet. Miners develop and serve AI models for non-player characters, procedural game content generation, and game state analysis.", { explorer: "https://taostats.io/subnets/33" }),
  34: createSubnetMeta(34, "BitMind", "BMIND", "Developer Tools", "AI-generated content detection at scale by BitMind. Miners run multimodal deepfake and synthetic media detection models, providing authenticity verification for images, video, and audio content.", { explorer: "https://taostats.io/subnets/34" }),
  35: createSubnetMeta(35, "LogicNet", "LOGIC", "Science", "Mathematical reasoning and formal logic subnet. Miners produce verified solutions to mathematical problems, theorem proving tasks, and structured reasoning benchmarks using specialised LLM fine-tunes.", { explorer: "https://taostats.io/subnets/35" }),
  36: createSubnetMeta(36, "Automata", "AUTO", "Developer Tools", "Workflow automation and code generation subnet. Miners build AI agents that generate, execute, and verify automation scripts and software, evaluated on real-world task completion benchmarks.", { explorer: "https://taostats.io/subnets/36" }),
  37: createSubnetMeta(37, "FinAgent", "FIN", "Finance", "Financial analysis and reporting AI subnet. Miners produce structured financial summaries, earnings analyses, and investment research from unstructured financial text and data streams.", { explorer: "https://taostats.io/subnets/37" }),
  38: createSubnetMeta(38, "Distributed Training", "DTRAIN", "Language", "Decentralized neural network training using federated learning techniques. Miners contribute gradient updates across shared model architectures, enabling large-scale collaborative model training without centralisation.", { explorer: "https://taostats.io/subnets/38" }),
  39: createSubnetMeta(39, "Basilica", "BSLC", "Developer Tools", "Multi-modal content moderation and safety subnet by Basilica. Miners run classification models for harmful content detection across text, image, and video, supporting platform trust and safety applications.", { explorer: "https://taostats.io/subnets/39" }),
  40: createSubnetMeta(40, "Chunking", "CHUNK", "Developer Tools", "Token-optimization and text-chunking subnet for Retrieval-Augmented Generation (RAG) pipelines. Miners produce optimal chunk boundaries and embedding strategies that maximize retrieval accuracy.", { explorer: "https://taostats.io/subnets/40" }),
  41: createSubnetMeta(41, "Sportstensor", "SPORT", "Finance", "Sports prediction and analytics subnet by Sportstensor. Miners develop AI models for match outcome prediction across major sports leagues, evaluated on calibrated probabilistic accuracy.", { explorer: "https://taostats.io/subnets/41" }),
  42: createSubnetMeta(42, "Gen42", "GEN42", "Language", "Productivity AI and knowledge management subnet. Miners build assistants for document summarization, meeting intelligence, and enterprise knowledge extraction, evaluated on real-world productivity benchmarks.", { explorer: "https://taostats.io/subnets/42" }),
  43: createSubnetMeta(43, "Graphite", "GRPH", "Creative", "Text-to-video generation subnet. Miners produce short video clips from text prompts using diffusion-based models, evaluated on temporal consistency, visual quality, and prompt faithfulness.", { explorer: "https://taostats.io/subnets/43" }),
  44: createSubnetMeta(44, "Pippa", "PIPPA", "Language", "Social AI and conversational intelligence subnet. Miners serve personality-consistent AI companions and conversation agents, evaluated on engagement, coherence, and safety benchmarks.", { explorer: "https://taostats.io/subnets/44" }),
  45: createSubnetMeta(45, "Wildcards", "WILD", "Creative", "Creative image generation with fine-grained style control. Miners specialize in artistic and illustrative image synthesis, evaluated on aesthetic quality and stylistic diversity metrics.", { explorer: "https://taostats.io/subnets/45" }),
  47: createSubnetMeta(47, "Condense-AI", "COND", "Language", "Long-document summarization and compression subnet. Miners produce high-fidelity summaries of long-form content including research papers, legal documents, and technical reports.", { explorer: "https://taostats.io/subnets/47" }),
  49: createSubnetMeta(49, "Hivetrain", "HIVE", "Science", "Automated Machine Learning (AutoML) subnet by Hivetrain. Miners run distributed hyperparameter optimization and neural architecture search, providing a decentralized platform for ML engineering automation.", { explorer: "https://taostats.io/subnets/49" }),
  50: createSubnetMeta(50, "Celium", "CEL", "Infrastructure", "Decentralized compute marketplace subnet. Miners provide GPU resources for AI workloads with verifiable execution guarantees, targeting latency-sensitive inference and fine-tuning jobs.", { explorer: "https://taostats.io/subnets/50" }),
  52: createSubnetMeta(52, "DatAgent", "DAGT", "Data", "Data-driven AI agent subnet for structured data interaction. Miners build agents capable of querying databases, APIs, and data streams to answer natural language questions with verifiable accuracy.", { explorer: "https://taostats.io/subnets/52" }),
  56: createSubnetMeta(56, "Gradients", "GRAD", "Language", "Gradient-based model optimization and fine-tuning subnet. Miners specialize in efficient parameter-efficient fine-tuning (PEFT) methods, enabling task-specific model adaptation at scale.", { explorer: "https://taostats.io/subnets/56" }),
  57: createSubnetMeta(57, "Gaia", "GAIA", "Science", "Environmental and climate data AI subnet. Miners process geospatial and environmental datasets to power prediction models for weather, climate, and ecological monitoring applications.", { explorer: "https://taostats.io/subnets/57" }),
  64: createSubnetMeta(64, "Chutes", "CHUTES", "Infrastructure", "Decentralized AI compute platform by Chutes. Runs over 100 billion tokens per day across a distributed GPU network. Provides scalable, low-cost inference and fine-tuning for open-source AI models.", { website: "https://chutes.ai", explorer: "https://taostats.io/subnets/64" }),
};

/** All netuid values with curated metadata. */
export const CURATED_NETUIDS = new Set(
  Object.keys(CURATED_METADATA).map(Number),
);
