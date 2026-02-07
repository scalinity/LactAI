import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "@/stores/useAppStore";
import { Heart } from "lucide-react";
import { UnitToggle } from "@/components/ui/UnitToggle";

export default function WelcomeLetter() {
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);
  const setHasCompletedOnboarding = useAppStore(
    (s) => s.setHasCompletedOnboarding,
  );
  const preferredUnit = useAppStore((s) => s.preferredUnit);
  const setPreferredUnit = useAppStore((s) => s.setPreferredUnit);
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // ?reset brings the welcome letter back (resets onboarding state)
    if (params.has("reset")) {
      setHasCompletedOnboarding(false);
      localStorage.removeItem("claudiaflow-tutorial-seen");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (!hasCompletedOnboarding) {
      // ?setup param skips the letter (for importing data before gifting)
      // Does NOT mark onboarding complete, so the letter shows on the next normal visit
      if (params.has("setup")) {
        return;
      }
      // Small delay so the app shell renders first
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    }
  }, [hasCompletedOnboarding, setHasCompletedOnboarding]);

  // Lock body scroll while overlay is visible
  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  const dismiss = useCallback(() => {
    setFadeOut(true);
    setTimeout(() => {
      setHasCompletedOnboarding(true);
      setVisible(false);
    }, 500);
  }, [setHasCompletedOnboarding]);

  // Escape key handler
  useEffect(() => {
    if (!visible || fadeOut) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [visible, fadeOut, dismiss]);

  if (hasCompletedOnboarding || !visible) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome letter from Daniel"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-plum/60 transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        className={`relative mx-3 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-2xl transition-all duration-700 ${
          fadeOut ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        style={{
          background:
            "linear-gradient(170deg, var(--color-cream) 0%, var(--color-cream-dark) 40%, var(--color-cream-dark) 100%)",
        }}
      >
        {/* Decorative top accent */}
        <div
          className="h-1.5 w-full shrink-0"
          style={{
            background:
              "linear-gradient(90deg, var(--color-rose-primary) 0%, var(--color-rose-dark) 50%, var(--color-rose-primary) 100%)",
          }}
        />

        {/* Scrollable letter body */}
        <div className="overflow-y-auto overscroll-contain px-7 pt-8 pb-4">
          <p
            className="mb-6 text-3xl text-plum"
            style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
          >
            Claudia,
          </p>

          <div
            className="space-y-4 leading-[1.75] text-plum/90"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: "1.25rem",
              fontWeight: 500,
            }}
          >
            <p>
              I wanted you to open this and feel something very real right away:{" "}
              <span className="font-semibold text-plum">
                You are deeply loved, and you're doing something extraordinary.
              </span>
            </p>

            <p>
              When you chose to begin a new life in the United States, you
              didn't just change your address — you changed your entire world.
              New language, new systems, new rhythms, new loneliness at times.
              The kind of your courage doesn't always look dramatic from the
              outside, but asks for bravery every single day. I've watched you
              carry that weight with a strength that is quiet and steady and
              real. And I need you to know how much I admire you for it.
            </p>

            <p>
              And then you became Luka's Mom — and somehow your beauty grew even
              bigger.
            </p>

            <p>
              Because Motherhood isn't only the beautiful moments people take
              pictures of. It's the invisible work: the planning, the worrying,
              the sleepless nights, the patience, the constant giving. It's
              showing up when you are tired. It's loving with your whole body
              and mind and soul. It's creating belonging again and again and
              Luka is so incredibly lucky to have you. The way you care, the way
              you nurture, the way you protect and shelter... It's the kind of
              love that will become his foundation. One day he will feel it in
              himself — the steadfast love — because you built it into him.
            </p>

            <p>
              I also want to say thank you. Not just for what you do, but for
              who you are. For your kindness, your presence, your patience, the
              way you light up a room, the way you keep going even when it's
              hard. I am grateful for you in a way that is difficult to put into
              words, but I am trying anyway because you deserve to hear it.
            </p>

            <p>
              So this is a special thing, but it comes with a big intention: a
              corner of calm that belongs to you. For notes, for prayer, for
              resting, for whatever helps your day feel lighter. For the moments
              you want to remember. For the moments you need to release. And for
              proof — in the daily diary — that you are not "just getting
              through." You're building a life. You're building a home. You're
              building a childhood Luka will always return to in his memory.
            </p>

            <p>
              I am proud of you Claudia. I am proud of the woman you have been,
              as you started over. I am proud of the mother you are to Luka. And
              I am genuinely happy — honored really — to have you in our family.
            </p>

            <p className="mt-6">With all my love,</p>
            <p className="text-2xl" style={{ fontWeight: 700 }}>
              Daniel
            </p>
          </div>
        </div>

        {/* Unit picker + Dismiss button pinned at bottom */}
        <div className="shrink-0 border-t border-plum/5 bg-cream/80 px-7 py-5 backdrop-blur-sm">
          {/* Unit preference picker */}
          <div className="mb-4 flex flex-col items-center">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-plum-light">
              Preferred unit
            </p>
            <UnitToggle value={preferredUnit} onChange={setPreferredUnit} />
          </div>

          <button
            onClick={dismiss}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-rose-primary px-6 py-3.5 font-[Nunito] text-base font-bold text-white shadow-md transition-all active:scale-[0.97] hover:bg-rose-dark"
          >
            <Heart className="h-5 w-5" fill="currentColor" />
            <span>Continue to ClaudiaFlow</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
