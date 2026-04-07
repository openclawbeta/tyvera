"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui-custom/glass-card";
import { fetchSubnetsFromApi } from "@/lib/api/subnets";
import {
  analyzeQuery,
  QUICK_ASKS,
  type ChatResponse,
  type ChatResponseType,
} from "@/lib/ai/subnet-intelligence";
import type { SubnetDetailModel } from "@/lib/types/subnets";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  data?: ChatResponse;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [subnets, setSubnets] = useState<SubnetDetailModel[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load subnets on mount
  useEffect(() => {
    fetchSubnetsFromApi().then((data) => {
      setSubnets(data);
      setIsLoading(false);

      // Show welcome message
      setMessages([
        {
          role: "assistant",
          content: `I have live data on ${data.length} Bittensor subnets. Ask me anything — yields, risks, comparisons, or staking calculations.`,
          timestamp: new Date(),
        },
      ]);
    });
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (query: string) => {
    if (!query.trim() || isProcessing) return;

    // Add user message
    const userMsg: ChatMessage = {
      role: "user",
      content: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    // Simulate processing
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 200));

    // Analyze query
    const response = analyzeQuery(query, subnets);
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: response.summary,
      data: response,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setIsProcessing(false);

    // Focus input
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-52px)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800">
        <PageHeader
          title="AI Intelligence"
          subtitle="Ask anything about Bittensor subnets"
        />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-500 text-sm">Loading subnet data...</div>
            </div>
          )}

          {!isLoading && messages.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <div className="text-sm">No messages yet. Start by asking a question below.</div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-4 animate-fade-in",
                msg.role === "user" && "flex-row-reverse",
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
                  msg.role === "user"
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-slate-700/50 text-slate-400",
                )}
              >
                {msg.role === "user" ? "U" : "AI"}
              </div>

              {/* Message Bubble */}
              <div
                className={cn(
                  "max-w-2xl",
                  msg.role === "user" ? "flex-row-reverse" : "",
                )}
              >
                {msg.role === "user" ? (
                  <div className="bg-cyan-500/15 border border-cyan-400/30 rounded-2xl px-4 py-3 text-sm text-slate-100">
                    {msg.content}
                  </div>
                ) : (
                  <GlassCard padding="md" glow="cyan">
                    <div className="text-sm text-slate-300 mb-4">{msg.content}</div>

                    {/* Structured Response Rendering */}
                    {msg.data && (
                      <ResponseRenderer response={msg.data} />
                    )}
                  </GlassCard>
                )}
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex gap-4 animate-fade-in">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-slate-700/50 text-slate-400 text-xs font-bold">
                AI
              </div>
              <GlassCard padding="md" glow="cyan">
                <div className="flex gap-2 items-center">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: "0.2s" }} />
                </div>
              </GlassCard>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-800 bg-slate-950/50 backdrop-blur px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Quick Asks */}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 pb-2">
              {QUICK_ASKS.map((ask) => (
                <button
                  key={ask}
                  onClick={() => handleSendMessage(ask)}
                  className="px-3 py-1.5 text-xs rounded-full border border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                >
                  {ask}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about yields, risks, comparisons..."
              className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
              rows={2}
            />

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isProcessing}
                className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                disabled
                className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-600 cursor-not-allowed opacity-50"
                aria-label="Voice (coming soon)"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Response Renderer ────────────────────────────────────────────────────

interface ResponseRendererProps {
  response: ChatResponse;
}

function ResponseRenderer({ response }: ResponseRendererProps) {
  if (response.type === "list" && response.data) {
    return (
      <div className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-2 py-2 font-semibold text-slate-400">Rank</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-400">Name</th>
                <th className="text-right px-2 py-2 font-semibold text-slate-400">Yield</th>
                <th className="text-right px-2 py-2 font-semibold text-slate-400">Score</th>
                <th className="text-center px-2 py-2 font-semibold text-slate-400">Risk</th>
              </tr>
            </thead>
            <tbody>
              {response.data.slice(0, 8).map((subnet, idx) => (
                <tr key={subnet.netuid} className="border-b border-slate-800/50">
                  <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                  <td className="px-2 py-2 text-cyan-300 font-medium">{subnet.name}</td>
                  <td className="text-right px-2 py-2 text-emerald-400 font-semibold">
                    {subnet.yield.toFixed(2)}%
                  </td>
                  <td className="text-right px-2 py-2 text-slate-400">{subnet.score}</td>
                  <td className="text-center px-2 py-2">
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full",
                        subnet.risk === "LOW"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : subnet.risk === "MODERATE"
                            ? "bg-amber-500/20 text-amber-400"
                            : subnet.risk === "HIGH"
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-red-500/20 text-red-400",
                      )}
                    >
                      {subnet.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {response.suggestion && (
          <div className="text-xs text-slate-500 italic pt-2">{response.suggestion}</div>
        )}
      </div>
    );
  }

  if (response.type === "comparison" && response.data && response.data.length === 2) {
    const [s1, s2] = response.data;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[s1, s2].map((subnet) => (
            <GlassCard key={subnet.netuid} padding="sm" glow={false}>
              <div className="space-y-2">
                <div className="font-semibold text-cyan-300 text-sm">{subnet.name}</div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Yield:</span>
                    <span className="text-emerald-400 font-semibold">{subnet.yield.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Risk:</span>
                    <span
                      className={cn(
                        "font-semibold",
                        subnet.risk === "LOW"
                          ? "text-emerald-400"
                          : subnet.risk === "MODERATE"
                            ? "text-amber-400"
                            : "text-orange-400",
                      )}
                    >
                      {subnet.risk}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Liquidity:</span>
                    <span className="text-slate-300">
                      {(subnet.liquidity / 1000).toFixed(0)}k τ
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stakers:</span>
                    <span className="text-slate-300">{subnet.stakers}</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
        {response.suggestion && (
          <div className="text-xs text-slate-500 italic pt-2">{response.suggestion}</div>
        )}
      </div>
    );
  }

  if (response.type === "calculation" && response.metrics) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(response.metrics).map(([key, value]) => (
            <div key={key} className="bg-slate-800/50 rounded-lg px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{key}</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                {typeof value === "number" ? value.toFixed(2) : value}
                {key.includes("yield") ? " τ" : ""}
              </div>
            </div>
          ))}
        </div>
        {response.suggestion && (
          <div className="text-xs text-slate-500 italic pt-2">{response.suggestion}</div>
        )}
      </div>
    );
  }

  if (response.type === "insight") {
    return (
      <div className="space-y-3">
        {response.data && response.data.length > 0 && (
          <div className="space-y-2">
            {response.data.map((subnet) => (
              <div key={subnet.netuid} className="flex justify-between items-start text-xs px-2 py-1 bg-slate-800/30 rounded">
                <div className="text-cyan-300 font-medium flex-1">{subnet.name}</div>
                <div className="text-emerald-400 font-semibold">{subnet.yield.toFixed(2)}%</div>
              </div>
            ))}
          </div>
        )}
        {response.suggestion && (
          <div className="text-xs text-slate-500 italic">{response.suggestion}</div>
        )}
      </div>
    );
  }

  if (response.type === "error") {
    return (
      <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
        {response.summary}
      </div>
    );
  }

  return null;
}
