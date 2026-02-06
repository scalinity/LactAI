import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import OnboardingStep from "./OnboardingStep";
import OnboardingProgress from "./OnboardingProgress";
import UnitStep from "./UnitStep";
import Button from "@/components/ui/Button";
import { ChevronLeft } from "lucide-react";

interface OnboardingOverlayProps {
  onComplete: () => void;
}

interface StepData {
  title: string;
  description: string;
}

const STEPS: StepData[] = [
  {
    title: "Welcome to ClaudiaFlow",
    description:
      "Your personal calendar companion with AI-powered insights",
  },
  {
    title: "Add Your Photos",
    description:
      "Capture or upload your calendar photos",
  },
  {
    title: "Ask Questions",
    description:
      "Chat with AI to get insights about your schedule",
  },
  {
    title: "Customize Settings",
    description:
      "Adjust your preferences and export your data",
  },
];

const TOTAL_STEPS = STEPS.length;

export default function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

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
  const isUnitStep = currentStep === 5;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-cream"
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial de bienvenida"
    >
      {/* Top bar with skip */}
      <div className="flex justify-end px-5 pt-5">
        <button
          type="button"
          onClick={onComplete}
          className="text-sm font-medium text-plum/40 transition-colors hover:text-plum/70"
          aria-label="Omitir tutorial"
        >
          Omitir
        </button>
      </div>

      {/* Step content — centered */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div
          key={currentStep}
          className="animate-in fade-in slide-in-from-right-4 duration-300"
        >
          {isUnitStep ? (
            <UnitStep />
          ) : (
            <OnboardingStep
              stepIndex={currentStep}
              title={STEPS[currentStep].title}
              description={STEPS[currentStep].description}
            />
          )}
        </div>
      </div>

      {/* Bottom: progress + navigation */}
      <div className="mx-auto w-full max-w-sm px-6 pb-10">
        <OnboardingProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        <div className="mt-6 flex items-center gap-3">
          {currentStep > 0 ? (
            <Button
              variant="ghost"
              onClick={goBack}
              className="shrink-0"
              aria-label="Atrás"
            >
              <ChevronLeft className="h-5 w-5" />
              Atrás
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
            {isLastStep ? "Comenzar" : "Siguiente"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
