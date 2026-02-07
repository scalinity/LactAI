import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import {
  getRandomStarters,
  PROMPT_STARTERS,
  CATEGORY_META,
  type PromptStarter,
  type PromptCategory,
} from "@/data/prompt-starters";
import Modal from "@/components/ui/Modal";
import { useTranslation, type TranslationKey } from "@/i18n";

// Static — depends only on module-level constants
const GROUPED_PROMPTS = (Object.keys(CATEGORY_META) as PromptCategory[]).map(
  (cat) => ({
    category: cat,
    meta: CATEGORY_META[cat],
    prompts: PROMPT_STARTERS.filter((p) => p.category === cat),
  }),
);

interface PromptStartersProps {
  onSelect: (prompt: string) => void;
}

const starterI18n: Record<
  string,
  { label: TranslationKey; full: TranslationKey }
> = {
  "md-today": {
    label: "promptStarters.mdToday",
    full: "promptStarters.mdTodayFull",
  },
  "md-trend": {
    label: "promptStarters.mdTrend",
    full: "promptStarters.mdTrendFull",
  },
  "md-pattern": {
    label: "promptStarters.mdPattern",
    full: "promptStarters.mdPatternFull",
  },
  "md-week": {
    label: "promptStarters.mdWeek",
    full: "promptStarters.mdWeekFull",
  },
  "bc-sleep": {
    label: "promptStarters.bcSleep",
    full: "promptStarters.bcSleepFull",
  },
  "bc-solids": {
    label: "promptStarters.bcSolids",
    full: "promptStarters.bcSolidsFull",
  },
  "bc-normal": {
    label: "promptStarters.bcNormal",
    full: "promptStarters.bcNormalFull",
  },
  "pf-schedule": {
    label: "promptStarters.pfSchedule",
    full: "promptStarters.pfScheduleFull",
  },
  "pf-supply": {
    label: "promptStarters.pfSupply",
    full: "promptStarters.pfSupplyFull",
  },
  "pf-storage": {
    label: "promptStarters.pfStorage",
    full: "promptStarters.pfStorageFull",
  },
  "qh-explain": {
    label: "promptStarters.qhExplain",
    full: "promptStarters.qhExplainFull",
  },
  "qh-thankyou": {
    label: "promptStarters.qhThankyou",
    full: "promptStarters.qhThankyouFull",
  },
  "qh-recipe": {
    label: "promptStarters.qhRecipe",
    full: "promptStarters.qhRecipeFull",
  },
  "sc-overwhelmed": {
    label: "promptStarters.scOverwhelmed",
    full: "promptStarters.scOverwhelmedFull",
  },
  "sc-relax": {
    label: "promptStarters.scRelax",
    full: "promptStarters.scRelaxFull",
  },
  "bc-checkup": {
    label: "promptStarters.bcCheckup",
    full: "promptStarters.bcCheckupFull",
  },
  "bc-milestone": {
    label: "promptStarters.bcMilestone",
    full: "promptStarters.bcMilestoneFull",
  },
  "qh-boss": {
    label: "promptStarters.qhBoss",
    full: "promptStarters.qhBossFull",
  },
  "qh-quickmeal": {
    label: "promptStarters.qhQuickmeal",
    full: "promptStarters.qhQuickmealFull",
  },
};

const categoryI18n: Record<PromptCategory, TranslationKey> = {
  "my-data": "promptStarters.categories.myData",
  "baby-care": "promptStarters.categories.babyCare",
  feeding: "promptStarters.categories.feeding",
  "quick-help": "promptStarters.categories.quickHelp",
  "self-care": "promptStarters.categories.selfCare",
};

export default function PromptStarters({ onSelect }: PromptStartersProps) {
  const { t } = useTranslation();
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [starters, setStarters] = useState<PromptStarter[]>(() =>
    getRandomStarters(5),
  );
  const [showAll, setShowAll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getTranslatedStarter = useCallback(
    (starter: PromptStarter) => {
      const keys = starterI18n[starter.id];
      if (!keys) return starter;
      return {
        ...starter,
        shortLabel: t(keys.label),
        fullPrompt: t(keys.full),
      };
    },
    [t],
  );

  // Rotate starters when one is used
  const handleChipTap = useCallback(
    (starter: PromptStarter) => {
      const translated = getTranslatedStarter(starter);
      onSelect(translated.fullPrompt);
      setUsedIds((prev) => {
        const next = [...prev, starter.id];
        // Reset when all prompts have been used so they cycle back
        return next.length >= PROMPT_STARTERS.length ? [] : next;
      });
    },
    [onSelect, getTranslatedStarter],
  );

  // Refresh starters when usedIds changes (after a prompt is sent)
  useEffect(() => {
    if (usedIds.length > 0) {
      setStarters(getRandomStarters(5, usedIds));
    }
  }, [usedIds]);

  const handleAllPromptSelect = useCallback(
    (starter: PromptStarter) => {
      const translated = getTranslatedStarter(starter);
      onSelect(translated.fullPrompt);
      setUsedIds((prev) => {
        const next = [...prev, starter.id];
        return next.length >= PROMPT_STARTERS.length ? [] : next;
      });
      setShowAll(false);
    },
    [onSelect, getTranslatedStarter],
  );

  return (
    <>
      <div className="px-3 pb-2">
        {/* Section label */}
        <p className="mb-2 text-xs font-medium text-plum/40 px-1">
          {t("chat.tryAsking")}
        </p>

        {/* Horizontally scrollable chips */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
          {starters.map((starter, idx) => (
            <button
              key={starter.id}
              type="button"
              onClick={() => handleChipTap(starter)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 rounded-full border border-rose-primary/20 bg-surface px-3.5 py-2 text-sm font-medium text-plum/80 shadow-sm transition-all",
                "hover:border-rose-primary/40 hover:bg-rose-primary/5 hover:shadow-md hover:text-plum",
                "active:scale-[0.97] active:shadow-none",
                "animate-card-enter",
              )}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <span className="text-base leading-none">{starter.icon}</span>
              <span className="whitespace-nowrap">
                {getTranslatedStarter(starter).shortLabel}
              </span>
            </button>
          ))}

          {/* See all button */}
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={cn(
              "shrink-0 flex items-center gap-1 rounded-full border border-plum/10 bg-plum/[0.03] px-3.5 py-2 text-sm font-medium text-plum/50 transition-all",
              "hover:border-plum/20 hover:bg-plum/[0.06] hover:text-plum/70",
              "active:scale-[0.97]",
            )}
          >
            <span className="whitespace-nowrap">{t("chat.seeAll")}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* All prompts modal */}
      <Modal
        isOpen={showAll}
        onClose={() => setShowAll(false)}
        title={t("chat.promptIdeas")}
        className="max-h-[80vh] overflow-hidden"
      >
        <div className="overflow-y-auto max-h-[60vh] -mx-4 px-4 space-y-5">
          {GROUPED_PROMPTS.map(({ category, meta, prompts }) => (
            <div key={category}>
              <h3 className="flex items-center gap-2 text-sm font-bold text-plum/70 mb-2">
                <span>{meta.icon}</span>
                {t(categoryI18n[category])}
              </h3>
              <div className="space-y-1.5">
                {prompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    type="button"
                    onClick={() => handleAllPromptSelect(prompt)}
                    aria-label={prompt.fullPrompt}
                    className={cn(
                      "w-full text-left rounded-xl px-3.5 py-2.5 text-sm text-plum/80 transition-all",
                      "hover:bg-rose-primary/5 hover:text-plum",
                      "active:bg-rose-primary/10",
                    )}
                  >
                    <span className="mr-2">{prompt.icon}</span>
                    {getTranslatedStarter(prompt).shortLabel}
                    <span className="mt-0.5 block text-xs text-plum/40 leading-relaxed line-clamp-2">
                      {getTranslatedStarter(prompt).fullPrompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
