import Link from "next/link";
import { Home, ArrowLeft, Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="tyvera-landing relative flex min-h-screen flex-col items-center justify-center px-6 text-center aurora-bg noise"
      style={{ background: "var(--aurora-cream)", color: "var(--aurora-ink)" }}
    >
      {/* Brand mark */}
      <Link
        href="/"
        className="absolute left-6 top-6 flex items-center gap-2.5 md:left-8 md:top-8"
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{
            background:
              "linear-gradient(135deg, #C9B8FF 0%, #FFD7BA 50%, #A7F0D2 100%)",
          }}
        >
          <Zap
            className="h-4 w-4"
            style={{ color: "var(--aurora-ink)" }}
            strokeWidth={2.5}
          />
        </div>
        <span
          className="font-semibold"
          style={{ color: "var(--aurora-ink)", letterSpacing: "-0.02em" }}
        >
          Tyvera
        </span>
      </Link>

      {/* 404 display */}
      <div className="relative mb-8">
        <div
          className="select-none font-semibold leading-none tracking-tighter"
          style={{
            fontSize: "clamp(96px, 18vw, 160px)",
            color: "var(--aurora-sub)",
            opacity: 0.28,
            letterSpacing: "-0.05em",
          }}
        >
          404
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className="serif"
            style={{
              fontSize: "clamp(40px, 6vw, 64px)",
              color: "#5B3FBF",
              opacity: 0.45,
            }}
          >
            τ
          </span>
        </div>
      </div>

      <h1
        className="mb-3 font-semibold"
        style={{
          fontSize: "clamp(22px, 3vw, 28px)",
          letterSpacing: "-0.02em",
          color: "var(--aurora-ink)",
        }}
      >
        Page not found
      </h1>
      <p
        className="mb-10 max-w-md text-[14px] leading-relaxed"
        style={{ color: "var(--aurora-sub)" }}
      >
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have been
        moved. Check the URL, or head back to the subnet rankings.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <button className="btn-primary text-[14px]" style={{ padding: "12px 24px" }}>
            <Home className="h-4 w-4" />
            Home
          </button>
        </Link>

        <Link href="/subnets">
          <button className="btn-secondary text-[14px]" style={{ padding: "12px 24px" }}>
            <ArrowLeft className="h-4 w-4" />
            Subnet rankings
          </button>
        </Link>
      </div>
    </div>
  );
}
