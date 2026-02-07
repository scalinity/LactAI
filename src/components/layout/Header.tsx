import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Settings, Timer } from "lucide-react";
import { useTimerStore } from "@/stores/useTimerStore";

function TimerIndicator() {
  const { isRunning, startedAt } = useTimerStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning || !startedAt) return;

    setElapsed(Date.now() - startedAt);
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, startedAt]);

  if (!isRunning) return null;

  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <Link
      to="/log"
      className="flex items-center gap-1.5 rounded-full bg-rose-primary/10 px-2.5 py-1 text-xs font-semibold text-rose-primary transition-all hover:bg-rose-primary/20 active:scale-95"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-rose-primary animate-pulse" />
      <Timer className="h-3.5 w-3.5" />
      <span className="tabular-nums">{display}</span>
    </Link>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-plum/[0.06] bg-cream/90 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="group flex items-center gap-1.5">
          <span
            className="font-[Nunito] text-xl font-extrabold tracking-tight"
            style={{
              background:
                "linear-gradient(135deg, var(--color-plum) 0%, var(--color-rose-dark) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            ClaudiaFlow
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <TimerIndicator />
          <Link
            to="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full text-plum/40 transition-all hover:bg-rose-primary/10 hover:text-rose-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-primary/50 focus-visible:ring-offset-2"
          >
            <Settings className="h-[18px] w-[18px]" />
          </Link>
        </div>
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
