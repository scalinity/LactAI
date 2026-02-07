import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import OnboardingStep from "./OnboardingStep";
import OnboardingProgress from "./OnboardingProgress";
import Button from "@/components/ui/Button";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "@/i18n";

interface OnboardingOverlayProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 4;

export default function OnboardingOverlay({
  onComplete,
}: OnboardingOverlayProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: t("onboarding.welcomeTitle"),
      description: t("onboarding.welcomeDesc"),
    },
    {
      title: t("onboarding.addPhotosTitle"),
      description: t("onboarding.addPhotosDesc"),
    },
    {
      title: t("onboarding.askQuestionsTitle"),
      description: t("onboarding.askQuestionsDesc"),
    },
    {
      title: t("onboarding.customizeTitle"),
      description: t("onboarding.customizeDesc"),
    },
  ];

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const goNext = useCallback(() => {
    if (currentStep === TOTAL_STEPS - 1) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, onComplete]);

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-cream"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tutorial"
    >
      {/* Top bar with skip */}
      <div className="flex justify-end px-5 pt-5">
        <button
          type="button"
          onClick={onComplete}
          className="text-sm font-medium text-plum/40 transition-colors hover:text-plum/70"
          aria-label="Skip tutorial"
        >
          {t("common.skip")}
        </button>
      </div>

      {/* Step content — centered */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div
          key={currentStep}
          className="animate-in fade-in slide-in-from-right-4 duration-300"
        >
          <OnboardingStep
            stepIndex={currentStep}
            title={steps[currentStep].title}
            description={steps[currentStep].description}
          />
        </div>
      </div>

      {/* Bottom: progress + navigation */}
      <div className="mx-auto w-full max-w-sm px-6 pb-10">
        <OnboardingProgress
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
        />

        <div className="mt-6 flex items-center gap-3">
          {currentStep > 0 ? (
            <Button
              variant="ghost"
              onClick={goBack}
              className="shrink-0"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
              {t("common.back")}
            </Button>
          ) : (
            <div />
          )}

          <Button
            variant="primary"
            onClick={goNext}
            className="flex-1"
            size="lg"
          >
            {isLastStep ? t("common.getStarted") : t("common.next")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
