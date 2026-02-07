import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import {
  Plus,
  Camera,
  TrendingUp,
  MessageCircle,
  List,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useTranslation } from "@/i18n";

interface TutorialStepData {
  id: string;
  icon: React.ReactNode;
  highlightSelector?: string;
  position: "top" | "bottom" | "center";
  route?: string;
}

const TUTORIAL_STEPS: TutorialStepData[] = [
  {
    id: "welcome",
    icon: <span className="text-3xl">👋</span>,
    position: "center",
  },
  {
    id: "log-session",
    icon: <Plus className="h-6 w-6 text-white" />,
    highlightSelector: '[href="/log"]',
    position: "bottom",
    route: "/",
  },
  {
    id: "photo-import",
    icon: <Camera className="h-5 w-5 text-rose-primary" />,
    highlightSelector: '[href="/photos"]',
    position: "top",
    route: "/",
  },
  {
    id: "trends",
    icon: <TrendingUp className="h-5 w-5 text-sage-dark" />,
    highlightSelector: '[href="/trends"]',
    position: "top",
    route: "/",
  },
  {
    id: "chat",
    icon: <MessageCircle className="h-5 w-5 text-rose-dark" />,
    highlightSelector: '[href="/chat"]',
    position: "top",
    route: "/",
  },
  {
    id: "history",
    icon: <List className="h-5 w-5 text-plum-light" />,
    highlightSelector: '[href="/history"]',
    position: "top",
    route: "/",
  },
  {
    id: "complete",
    icon: <span className="text-3xl">✨</span>,
    position: "center",
  },
];

export default function OnboardingTutorial() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] =
    useState<HTMLElement | null>(null);
  const [elementRect, setElementRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);

  const stepTexts = [
    {
      title: t("tutorial.welcomeTitle"),
      description: t("tutorial.welcomeDesc"),
    },
    { title: t("tutorial.logTitle"), description: t("tutorial.logDesc") },
    { title: t("tutorial.photoTitle"), description: t("tutorial.photoDesc") },
    { title: t("tutorial.trendsTitle"), description: t("tutorial.trendsDesc") },
    { title: t("tutorial.chatTitle"), description: t("tutorial.chatDesc") },
    {
      title: t("tutorial.historyTitle"),
      description: t("tutorial.historyDesc"),
    },
    {
      title: t("tutorial.completeTitle"),
      description: t("tutorial.completeDesc"),
    },
  ];

  useEffect(() => {
    // Only start the tutorial after the welcome letter has been dismissed
    if (!hasCompletedOnboarding) return;

    const hasSeenTutorial = localStorage.getItem("claudiaflow-tutorial-seen");
    if (!hasSeenTutorial) {
      // Delay to let the page render first
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding]);

  useEffect(() => {
    if (!isOpen) return;

    const step = TUTORIAL_STEPS[currentStep];
    let rectTimer: ReturnType<typeof setTimeout>;
    let scrollEndCleanup: (() => void) | null = null;

    if (step.highlightSelector) {
      // Clear stale rect from previous step
      setElementRect(null);

      const findElement = () => {
        const element = document.querySelector(
          step.highlightSelector!,
        ) as HTMLElement;
        if (element) {
          setHighlightedElement(element);

          // Scroll element into view if needed
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });

          // Use scrollend event with timeout fallback for reliable rect capture
          const captureRect = () => {
            setElementRect(element.getBoundingClientRect());
          };

          const onScrollEnd = () => {
            captureRect();
            window.removeEventListener("scrollend", onScrollEnd);
            clearTimeout(rectTimer);
          };

          window.addEventListener("scrollend", onScrollEnd, { once: true });
          // Fallback for browsers without scrollend support
          rectTimer = setTimeout(() => {
            window.removeEventListener("scrollend", onScrollEnd);
            captureRect();
          }, 600);

          scrollEndCleanup = () => {
            window.removeEventListener("scrollend", onScrollEnd);
          };

          return true;
        }
        return false;
      };

      // Try immediately
      if (!findElement()) {
        // If not found, retry after a delay for lazy-loaded content
        const retryTimer = setTimeout(() => {
          findElement();
        }, 600);
        return () => {
          clearTimeout(retryTimer);
          clearTimeout(rectTimer);
          scrollEndCleanup?.();
        };
      }
    } else {
      setHighlightedElement(null);
      setElementRect(null);
    }

    // Navigate to route if needed
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }

    return () => {
      clearTimeout(rectTimer);
      scrollEndCleanup?.();
    };
  }, [currentStep, isOpen, navigate, location.pathname]);

  // Update highlight position on resize
  useEffect(() => {
    if (!isOpen || !highlightedElement) return;

    const handleResize = () => {
      // Update the cached rect on resize
      setElementRect(highlightedElement.getBoundingClientRect());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, highlightedElement]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem("claudiaflow-tutorial-seen", "true");
    } catch {
      // Silently fail in private browsing mode
    }
    setHighlightedElement(null);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  }, [currentStep, handleClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    handleClose();
  }, [handleClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose, handleNext, handlePrev]);

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const texts = stepTexts[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  // Calculate position for the tutorial card
  let cardStyle: React.CSSProperties = {};
  let arrowStyle: React.CSSProperties = {};

  if (step.highlightSelector && highlightedElement && elementRect) {
    const rect = elementRect;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    if (step.position === "top") {
      const spaceBelow = viewportHeight - rect.bottom;
      const hasRoom = spaceBelow > 300;

      cardStyle = {
        position: "fixed",
        left: Math.min(
          Math.max(rect.left + rect.width / 2, 216),
          viewportWidth - 216,
        ),
        transform: "translateX(-50%)",
        top: hasRoom ? `${rect.bottom + 16}px` : "auto",
        bottom: hasRoom ? "auto" : "16px",
        maxWidth: "calc(100vw - 32px)",
        width: "400px",
      };
      arrowStyle = {
        position: "absolute",
        top: "-8px",
        bottom: "auto",
        left: "50%",
        transform: `translateX(-50%) rotate(45deg)`,
        width: "16px",
        height: "16px",
        background: "white",
      };
    } else if (step.position === "bottom") {
      const spaceAbove = rect.top;
      const hasRoom = spaceAbove > 300;

      cardStyle = {
        position: "fixed",
        left: Math.min(
          Math.max(rect.left + rect.width / 2, 216),
          viewportWidth - 216,
        ),
        transform: "translateX(-50%)",
        bottom: hasRoom ? `${viewportHeight - rect.top + 16}px` : "auto",
        top: hasRoom ? "auto" : "16px",
        maxWidth: "calc(100vw - 32px)",
        width: "400px",
      };
      arrowStyle = {
        position: "absolute",
        bottom: "-8px",
        top: "auto",
        left: "50%",
        transform: "translateX(-50%) rotate(45deg)",
        width: "16px",
        height: "16px",
        background: "white",
      };
    }
  } else {
    // Center position (default or when element not found)
    cardStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "calc(100vw - 32px)",
      width: "400px",
    };
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-[9998] bg-plum/60 backdrop-blur-sm"
        style={{ animation: "fadeIn 0.3s ease-out" }}
      />

      {/* Highlight spotlight */}
      {highlightedElement && elementRect && (
        <div
          className="fixed z-[9999] rounded-2xl ring-4 ring-white/30 pointer-events-none"
          style={{
            top: elementRect.top,
            left: elementRect.left,
            width: elementRect.width,
            height: elementRect.height,
            animation: "pulse 2s ease-in-out infinite",
          }}
        />
      )}

      {/* Tutorial card */}
      <div
        className="fixed z-[10000] rounded-2xl bg-surface shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        aria-describedby="tutorial-description"
        style={{
          ...cardStyle,
          animation: "slideUp 0.3s ease-out",
        }}
      >
        {step.highlightSelector && highlightedElement && elementRect && (
          <div style={arrowStyle} className="shadow-lg" />
        )}

        {/* Progress bar */}
        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-2xl bg-plum/10">
          <div
            className="h-full bg-gradient-to-r from-rose-primary to-sage transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-plum/5 text-plum/60 transition-all hover:bg-plum/10 hover:text-plum active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="px-6 pt-6 pb-4">
          {/* Icon */}
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-primary/10 to-sage/10">
            {step.icon}
          </div>

          {/* Title */}
          <h2
            className="mb-2 font-[Nunito] text-xl font-bold text-plum"
            id="tutorial-title"
          >
            {texts.title}
          </h2>

          {/* Description */}
          <p
            className="mb-6 text-sm leading-relaxed text-plum-light"
            id="tutorial-description"
          >
            {texts.description}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-plum/60 transition-all hover:bg-plum/5 disabled:opacity-0 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("common.back")}
            </button>

            {/* Step indicator */}
            <div className="flex items-center gap-1.5">
              {TUTORIAL_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStep
                      ? "w-6 bg-rose-primary"
                      : "w-1.5 bg-plum/20"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-primary to-rose-dark px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
            >
              {currentStep === TUTORIAL_STEPS.length - 1 ? (
                t("common.getStarted")
              ) : (
                <>
                  {t("common.next")}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Skip button */}
        {currentStep < TUTORIAL_STEPS.length - 1 && (
          <button
            onClick={handleSkip}
            className="w-full border-t border-plum/10 py-3 text-xs font-medium text-plum/50 transition-all hover:bg-plum/5 hover:text-plum/70"
          >
            {t("common.skipTutorial")}
          </button>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(232, 160, 191, 0.7);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(232, 160, 191, 0);
          }
        }
      `}</style>
    </>
  );
}
