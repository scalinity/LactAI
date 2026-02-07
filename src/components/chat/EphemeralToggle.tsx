import { useChatStore } from "@/stores/useChatStore";
import { Ghost } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export default function EphemeralToggle() {
  const { t } = useTranslation();
  const { ephemeralMode, toggleEphemeral } = useChatStore();

  return (
    <button
      type="button"
      onClick={toggleEphemeral}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
        ephemeralMode
          ? "bg-plum/10 text-plum"
          : "bg-transparent text-plum/40 hover:text-plum/60",
      )}
    >
      <Ghost className="h-3.5 w-3.5" />
      {t("chat.dontSaveChat")}
      {ephemeralMode && (
        <span className="h-1.5 w-1.5 rounded-full bg-rose-primary" />
      )}
    </button>
  );
}
