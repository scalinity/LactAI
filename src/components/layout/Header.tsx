import { Link } from "react-router-dom";
import { Settings } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-plum/[0.06] bg-cream/90 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="group flex items-center gap-1.5">
          <span
            className="font-[Nunito] text-xl font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(135deg, var(--color-plum) 0%, var(--color-rose-dark) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            ClaudiaFlow
          </span>
        </Link>
        <Link
          to="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full text-plum/40 transition-all hover:bg-rose-primary/10 hover:text-rose-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-primary/50 focus-visible:ring-offset-2"
        >
          <Settings className="h-[18px] w-[18px]" />
        </Link>
      </div>
      <div
        className="h-[1px] w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--color-rose-primary) 50%, transparent 100%)",
          opacity: 0.3,
        }}
      />
    </header>
  );
}
