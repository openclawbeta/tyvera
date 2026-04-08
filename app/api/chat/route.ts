/* ─────────────────────────────────────────────────────────────────── */
/* /api/chat — AI chat endpoint powered by OpenAI (gpt-4o-mini)       */
/*                                                                     */
/* POST /api/chat { message, subnets?, history? }                      */
/* Returns structured ChatResponse + natural language summary          */
/*                                                                     */
/* Falls back to the pattern-matcher engine when OPENAI_API_KEY        */
/* is not set, so local dev still works.                               */
/* ─────────────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import type { SubnetDetailModel } from "@/lib/types/subnets";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface ChatRequestBody {
  message: string;
  subnets?: SubnetDetailModel[];
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

function buildSystemPrompt(subnets: SubnetDetailModel[]): string {
  // Build a concise data table for the LLM
  const subnetRows = subnets
    .sort((a, b) => a.netuid - b.netuid)
    .map((s) => {
      const price = s.alphaPrice ?? 0;
      const mcap = s.marketCap ?? 0;
      const change = s.change24h ?? 0;
      return `SN${s.netuid} "${s.name}" | yield=${s.yield.toFixed(2)}% | price=${price.toFixed(4)}τ | mcap=${(mcap / 1000).toFixed(0)}kτ | emission=${s.emissions.toFixed(2)}% | stakers=${s.stakers} | risk=${s.risk} | score=${s.score} | 24h_change=${change.toFixed(2)}%`;
    })
    .join("\n");

  return `You are the Tyvera AI Intelligence assistant — an expert analyst for the Bittensor network.

Your role is to help users understand subnets, yields, risks, and staking strategies using real on-chain data.

## Current Subnet Data (live)
${subnetRows}

## Response Guidelines
- Be concise and data-driven. Reference specific subnet numbers (SN1, SN13, etc.).
- When comparing subnets, use actual metrics from the data above.
- For yield calculations, show your math: amount × (APR/100) / 365 × days.
- For risk assessment, consider: yield volatility, liquidity depth, staker count, and momentum.
- When recommending, always mention risk alongside yield — never recommend purely on APR.
- If asked about something not in the data, say you don't have that data rather than guessing.
- Keep responses focused — 2-4 short paragraphs max for most questions.
- Use τ (tau) as the symbol for TAO.

## Important Notes
- You are NOT a financial advisor. Include brief disclaimers when giving investment-related guidance.
- "Root staking" refers to staking directly on the root network (SN0) which provides stable but lower returns.
- "Alpha staking" means staking on individual subnets for potentially higher but riskier returns.
- Emission share determines how much TAO a subnet receives from the network.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { message, subnets = [], history = [] } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: "Message too long (max 5000 characters)" }, { status: 400 });
    }

    // If no API key, fall back to pattern matcher
    if (!OPENAI_API_KEY) {
      const { analyzeQuery } = await import("@/lib/ai/subnet-intelligence");
      const response = analyzeQuery(message, subnets);
      return NextResponse.json({
        content: response.summary,
        structured: response,
        source: "pattern-matcher",
      });
    }

    // Build messages array for OpenAI
    const chatMessages = [
      { role: "system" as const, content: buildSystemPrompt(subnets) },
      ...history.slice(-10).map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Call OpenAI API directly (no SDK dependency needed)
    const resp = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: chatMessages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "Unknown error");
      console.error(`[Chat] OpenAI API error ${resp.status}:`, errText);

      // Fall back to pattern matcher on API error
      const { analyzeQuery } = await import("@/lib/ai/subnet-intelligence");
      const response = analyzeQuery(message, subnets);
      return NextResponse.json({
        content: response.summary,
        structured: response,
        source: "pattern-matcher-fallback",
      });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "I wasn't able to generate a response. Please try again.";

    return NextResponse.json({
      content,
      source: "openai",
    });
  } catch (err) {
    console.error("[Chat] Error:", err);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 },
    );
  }
}
