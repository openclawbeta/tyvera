import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_24%),linear-gradient(180deg,#05070b_0%,#070913_48%,#05070b_100%)] text-white flex flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8">
        <div className="text-[120px] font-black leading-none tracking-tighter bg-gradient-to-b from-white/20 to-white/[0.03] bg-clip-text text-transparent select-none">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-cyan-400/60">τ</span>
        </div>
      </div>

      <h1 className="text-xl font-semibold text-white mb-2">Page not found</h1>
      <p className="text-sm text-slate-400 max-w-md mb-8">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        Check the URL or head back to the dashboard.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
          style={{
            background: "rgba(34,211,238,0.12)",
            border: "1px solid rgba(34,211,238,0.22)",
            color: "#22d3ee",
          }}
        >
          <Home className="w-4 h-4" />
          Dashboard
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#94a3b8",
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
      </div>
    </div>
  );
}
