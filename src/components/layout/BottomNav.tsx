import { NavLink } from "react-router-dom";
import { House, Plus, List, TrendingUp, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

const tabs = [
  { to: "/", icon: House },
  { to: "/log", icon: Plus },
  { to: "/history", icon: List },
  { to: "/trends", icon: TrendingUp },
  { to: "/chat", icon: MessageCircle },
] as const;

export default function BottomNav() {
  const { t } = useTranslation();

  const labels: Record<string, string> = {
    "/": t("nav.home"),
    "/log": t("nav.log"),
    "/history": t("nav.history"),
    "/trends": t("nav.trends"),
    "/chat": t("nav.chat"),
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-plum/[0.06] bg-surface/95 backdrop-blur-lg safe-area-bottom">
      <div className="mx-auto flex max-w-3xl items-stretch">
        {tabs.map(({ to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-primary/50",
                isActive
                  ? "text-rose-primary"
                  : "text-plum/30 hover:text-plum/50",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span>{labels[to]}</span>
                {isActive && (
                  <div className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-rose-primary" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
