import { useAppStore } from "@/stores/useAppStore";
import OnboardingIllustration from "./OnboardingIllustration";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export default function UnitStep() {
  const { t } = useTranslation();
  const { preferredUnit, setPreferredUnit } = useAppStore();

  return (
    <div className="flex flex-col items-center text-center">
      <OnboardingIllustration stepIndex={5} />
      <h2 className="mt-8 font-[Nunito] text-2xl font-bold text-plum">
        {t("unitStep.chooseUnit")}
      </h2>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-plum-light">
        {t("unitStep.chooseUnitDesc")}
      </p>

      <div className="mt-8 flex items-center rounded-xl bg-surface p-1.5 shadow-md">
        <button
          type="button"
          onClick={() => setPreferredUnit("ml")}
          className={cn(
            "rounded-lg px-8 py-3 text-base font-bold transition-all duration-200",
            preferredUnit === "ml"
              ? "bg-rose-primary text-white shadow-sm"
              : "text-plum/50 hover:text-plum",
          )}
        >
          ml
        </button>
        <button
          type="button"
          onClick={() => setPreferredUnit("oz")}
          className={cn(
            "rounded-lg px-8 py-3 text-base font-bold transition-all duration-200",
            preferredUnit === "oz"
              ? "bg-rose-primary text-white shadow-sm"
              : "text-plum/50 hover:text-plum",
          )}
        >
          oz
        </button>
      </div>

      <p className="mt-3 text-xs text-plum/30">
        {preferredUnit === "ml"
          ? t("unitStep.milliliters")
          : t("unitStep.fluidOunces")}
      </p>
    </div>
  );
}
