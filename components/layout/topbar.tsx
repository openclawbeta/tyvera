"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Bell, Settings, Menu, X, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSubnets } from "@/lib/api/subnets";
import { LiveTicker } from "@/components/ui-custom/live-ticker";
import { WalletStatusChip } from "@/components/wallet/wallet-status-chip";
import { WalletConnectModal } from "@/components/wallet/wallet-connect-modal";
import { WalletApprovalDialog } from "@/components/wallet/wallet-approval-dialog";
import { useSidebar } from "@/lib/sidebar-context";
import { useWallet } from "@/lib/wallet-context";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { severityColor, categoryIcon, alertCategory } from "@/lib/alerts/types";
import type { Alert, AlertType } from "@/lib/alerts/types";
import Link from "next/link";
import type { SubnetDetailModel } from "@/lib/types/subnets";

/** Format a created_at timestamp to relative time */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function Topbar() {
  const { toggle } = useSidebar();
  const router = useRouter();
  const { address: walletAddress } = useWallet();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [subnets, setSubnets] = useState<SubnetDetailModel[]>([]);
  const [filteredSubnets, setFilteredSubnets] = useState<SubnetDetailModel[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchModalRef = useRef<HTMLDivElement>(null);

  const [isBellOpen, setIsBellOpen] = useState(false);
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const bellDropdownRef = useRef<HTMLDivElement>(null);

  // Alert state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Load subnets on mount
  useEffect(() => {
    try {
      const allSubnets = getSubnets();
      setSubnets(allSubnets);
    } catch (error) {
      console.error("Failed to load subnets:", error);
    }
  }, []);

  // ── Alert feed ────────────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    if (!walletAddress) {
      setAlerts([]);
      setUnreadCount(0);
      return;
    }
    try {
      setAlertsLoading(true);
      const res = await fetchWithTimeout(
        `/api/alerts?address=${encodeURIComponent(walletAddress)}&limit=20`,
        { timeoutMs: 8000 },
      );
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
        setUnreadCount(data.unread ?? 0);
      }
    } catch {
      // silently fail — bell just shows 0
    } finally {
      setAlertsLoading(false);
    }
  }, [walletAddress]);

  // Fetch unread count on mount and periodically (every 60s)
  useEffect(() => {
    if (!walletAddress) {
      setAlerts([]);
      setUnreadCount(0);
      return;
    }

    // Initial count-only fetch (lightweight)
    fetchWithTimeout(
      `/api/alerts?address=${encodeURIComponent(walletAddress)}&count=1`,
      { timeoutMs: 6000 },
    )
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.unread ?? 0))
      .catch(() => {});

    const interval = setInterval(() => {
      fetchWithTimeout(
        `/api/alerts?address=${encodeURIComponent(walletAddress)}&count=1`,
        { timeoutMs: 6000 },
      )
        .then((r) => r.json())
        .then((d) => setUnreadCount(d.unread ?? 0))
        .catch(() => {});
    }, 60_000);

    return () => clearInterval(interval);
  }, [walletAddress]);

  // Fetch full alerts when dropdown opens
  useEffect(() => {
    if (isBellOpen && walletAddress) {
      fetchAlerts();
    }
  }, [isBellOpen, walletAddress, fetchAlerts]);

  const markAllRead = async () => {
    if (!walletAddress) return;
    try {
      await fetchWithTimeout("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress }),
        timeoutMs: 6000,
      });
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  // Filter subnets based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSubnets([]);
      setSelectedIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = subnets.filter(
      (subnet) =>
        subnet.name.toLowerCase().includes(query) ||
        subnet.category?.toLowerCase().includes(query) ||
        subnet.netuid.toString() === query ||
        subnet.symbol?.toLowerCase().includes(query)
    );

    setFilteredSubnets(filtered);
    setSelectedIndex(0);
  }, [searchQuery, subnets]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // Escape to close search
      else if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsBellOpen(false);
      }
      // ArrowDown/Up in search
      else if (isSearchOpen && filteredSubnets.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredSubnets.length - 1 ? prev + 1 : prev
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
        // Enter to select
        else if (e.key === "Enter") {
          e.preventDefault();
          const selected = filteredSubnets[selectedIndex];
          if (selected) {
            handleSelectSubnet(selected);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, filteredSubnets, selectedIndex]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isSearchOpen]);

  // Close search modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchModalRef.current &&
        !searchModalRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
      if (
        bellDropdownRef.current &&
        !bellDropdownRef.current.contains(e.target as Node) &&
        !bellButtonRef.current?.contains(e.target as Node)
      ) {
        setIsBellOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSubnet = (subnet: SubnetDetailModel) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    router.push(`/subnets/${subnet.netuid}`);
  };

  return (
    <>
      <header
        className="fixed top-8 right-0 left-0 lg:left-60 h-[52px] z-30 flex items-center px-4 gap-3"
        style={{
          background: "rgba(7,10,18,0.88)",
          borderBottom: "1px solid rgba(255,255,255,0.048)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        }}
      >
        {/* Hamburger — mobile only */}
        <button
          onClick={toggle}
          className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{ color: "#64748b" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLElement).style.color = "#94a3b8";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#64748b";
          }}
          aria-label="Toggle menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Live ticker */}
        <div className="flex-1 overflow-hidden min-w-0">
          <LiveTicker />
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* Search — hidden on smallest screens */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 transition-all duration-200"
            style={{
              padding: "5px 12px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#64748b",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.065)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.11)";
              (e.currentTarget as HTMLElement).style.color = "#94a3b8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
              (e.currentTarget as HTMLElement).style.color = "#64748b";
            }}
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs hidden lg:block whitespace-nowrap" style={{ letterSpacing: "-0.01em" }}>
              Search subnets…
            </span>
            <kbd
              className="hidden lg:block text-[9px] rounded px-1.5 py-0.5"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "#475569",
                fontFamily: "inherit",
              }}
            >
              ⌘K
            </kbd>
          </button>

          {/* Bell */}
          <button
            ref={bellButtonRef}
            onClick={() => setIsBellOpen(!isBellOpen)}
            className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{ color: "#64748b" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLElement).style.color = "#94a3b8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "#64748b";
            }}
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span
                className="absolute top-[5px] right-[5px] min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{
                  background: "#ef4444",
                  color: "white",
                  boxShadow: "0 0 0 2px rgba(7,10,18,1), 0 0 6px rgba(239,68,68,0.5)",
                  padding: "0 3px",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Settings link — hidden on mobile (accessible via sidebar) */}
          <Link href="/settings" className="hidden sm:block">
            <button
              className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
              style={{ color: "#64748b" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLElement).style.color = "#94a3b8";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "#64748b";
              }}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </Link>

          {/* Divider */}
          <div className="w-px h-4 mx-0.5 hidden sm:block" style={{ background: "rgba(255,255,255,0.07)" }} />

          {/* Wallet status chip */}
          <WalletStatusChip />

          {/* Divider */}
          <div className="w-px h-4 mx-0.5" style={{ background: "rgba(255,255,255,0.07)" }} />

          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white cursor-pointer transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
              boxShadow: "0 0 0 2px rgba(7,10,18,1)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 0 0 2px rgba(7,10,18,1), 0 0 0 3.5px rgba(124,58,237,0.35)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 0 0 2px rgba(7,10,18,1)";
            }}
          >
            O
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            ref={searchModalRef}
            className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div
              className="p-4 border-b"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#64748b" }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name, netuid, or category…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                  style={{ color: "white" }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                  >
                    <X className="w-4 h-4" style={{ color: "#64748b" }} />
                  </button>
                )}
              </div>
            </div>

            {/* Results List */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: "calc(8 * 3.5rem)" }}
            >
              {filteredSubnets.length > 0 ? (
                filteredSubnets.map((subnet, index) => (
                  <button
                    key={subnet.netuid}
                    onClick={() => handleSelectSubnet(subnet)}
                    className="w-full px-4 py-3 text-left transition-colors flex items-center gap-3 group"
                    style={{
                      background:
                        index === selectedIndex
                          ? "rgba(34,211,238,0.1)"
                          : "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      color: index === selectedIndex ? "#22d3ee" : "white",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(34,211,238,0.08)";
                      (e.currentTarget as HTMLElement).style.color = "#22d3ee";
                    }}
                    onMouseLeave={(e) => {
                      if (index !== selectedIndex) {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                        (e.currentTarget as HTMLElement).style.color = "white";
                      }
                    }}
                  >
                    {/* Netuid Badge */}
                    <div
                      className="px-2 py-1 rounded text-[11px] font-semibold flex-shrink-0"
                      style={{
                        background: "rgba(34,211,238,0.15)",
                        color: "#22d3ee",
                      }}
                    >
                      {subnet.netuid}
                    </div>

                    {/* Subnet Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {subnet.name}
                      </div>
                      <div
                        className="text-xs truncate"
                        style={{ color: "#94a3b8" }}
                      >
                        {subnet.category || "Uncategorized"}
                      </div>
                    </div>

                    {/* Score */}
                    <div
                      className="text-xs font-semibold flex-shrink-0"
                      style={{ color: "#22d3ee" }}
                    >
                      {subnet.score?.toFixed(1) || "—"}
                    </div>
                  </button>
                ))
              ) : searchQuery.trim() ? (
                <div
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: "#64748b" }}
                >
                  No subnets found matching "{searchQuery}"
                </div>
              ) : (
                <div
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: "#64748b" }}
                >
                  Type to search subnets
                </div>
              )}
            </div>

            {/* Footer */}
            {filteredSubnets.length > 0 && (
              <div
                className="px-4 py-2 text-[11px] text-center"
                style={{
                  color: "#64748b",
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                Press <kbd style={{ color: "#94a3b8" }}>↑↓</kbd> to navigate,{" "}
                <kbd style={{ color: "#94a3b8" }}>Enter</kbd> to select,{" "}
                <kbd style={{ color: "#94a3b8" }}>Esc</kbd> to close
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bell Notification Dropdown */}
      {isBellOpen && (
        <div
          ref={bellDropdownRef}
          className="fixed top-[calc(2rem+52px+0.75rem)] right-4 w-80 rounded-xl z-50"
          style={{
            background: "rgba(15,23,42,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <span className="font-medium text-sm" style={{ color: "white" }}>
              Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-colors"
                  style={{ color: "#22d3ee", background: "rgba(34,211,238,0.1)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(34,211,238,0.18)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(34,211,238,0.1)";
                  }}
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: "360px" }}>
            {!walletAddress ? (
              <div className="px-4 py-8 text-center">
                <div className="text-sm mb-2" style={{ color: "#94a3b8" }}>
                  Connect your wallet
                </div>
                <div className="text-xs" style={{ color: "#64748b" }}>
                  Alerts are personalized to your staked subnets
                </div>
              </div>
            ) : alertsLoading && alerts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-sm" style={{ color: "#64748b" }}>Loading alerts…</div>
              </div>
            ) : alerts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-sm mb-2" style={{ color: "#94a3b8" }}>
                  No alerts yet
                </div>
                <div className="text-xs" style={{ color: "#64748b" }}>
                  Configure your alert thresholds in{" "}
                  <button
                    onClick={() => { setIsBellOpen(false); router.push("/alerts"); }}
                    className="underline"
                    style={{ color: "#22d3ee" }}
                  >
                    Alert Settings
                  </button>
                </div>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="px-4 py-3 transition-colors cursor-default"
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: alert.read ? "transparent" : "rgba(34,211,238,0.04)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = alert.read
                      ? "transparent"
                      : "rgba(34,211,238,0.04)";
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Severity dot + Category icon */}
                    <div className="flex items-center gap-1.5 pt-0.5 flex-shrink-0">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          background: severityColor(alert.severity),
                          boxShadow: `0 0 4px ${severityColor(alert.severity)}50`,
                        }}
                      />
                      <span className="text-sm">
                        {categoryIcon(alertCategory(alert.alert_type as AlertType))}
                      </span>
                    </div>

                    {/* Alert content */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs font-medium truncate"
                        style={{ color: alert.read ? "#94a3b8" : "white" }}
                      >
                        {alert.title}
                      </div>
                      <div
                        className="text-[11px] mt-0.5 line-clamp-2"
                        style={{ color: "#64748b" }}
                      >
                        {alert.message}
                      </div>
                      <div
                        className="text-[10px] mt-1"
                        style={{ color: "#475569" }}
                      >
                        {timeAgo(alert.created_at)}
                      </div>
                    </div>

                    {/* Unread indicator */}
                    {!alert.read && (
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: "#22d3ee" }}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {walletAddress && (
            <div
              className="px-4 py-2.5 border-t text-center"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <button
                onClick={() => { setIsBellOpen(false); router.push("/alerts"); }}
                className="text-[11px] font-medium transition-colors"
                style={{ color: "#22d3ee" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#67e8f9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#22d3ee";
                }}
              >
                View all alerts & settings →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Wallet modals */}
      <WalletConnectModal />
      <WalletApprovalDialog />
    </>
  );
}
