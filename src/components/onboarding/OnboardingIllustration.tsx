import {
  Heart,
  Plus,
  Clock,
  TrendingUp,
  List,
  Camera,
  Sparkles,
  MessageCircle,
  Scale,
} from "lucide-react";

interface OnboardingIllustrationProps {
  stepIndex: number;
}

export default function OnboardingIllustration({
  stepIndex,
}: OnboardingIllustrationProps) {
  return (
    <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-rose-primary/10">
      {stepIndex === 0 && (
        <>
          <Heart className="h-16 w-16 text-rose-primary" fill="currentColor" />
          <Sparkles className="absolute top-3 right-5 h-5 w-5 text-amber-warn" />
          <Sparkles className="absolute bottom-6 left-4 h-4 w-4 text-rose-light" />
        </>
      )}
      {stepIndex === 1 && (
        <>
          <Plus className="h-14 w-14 text-rose-primary" strokeWidth={2.5} />
          <Clock className="absolute bottom-5 right-5 h-8 w-8 text-plum-light" />
        </>
      )}
      {stepIndex === 2 && (
        <>
          <TrendingUp className="h-14 w-14 text-sage" />
          <List className="absolute bottom-5 right-5 h-7 w-7 text-plum-light" />
        </>
      )}
      {stepIndex === 3 && (
        <>
          <Camera className="h-14 w-14 text-rose-primary" />
          <Sparkles className="absolute top-4 right-6 h-7 w-7 text-amber-warn" />
        </>
      )}
      {stepIndex === 4 && (
        <>
          <MessageCircle className="h-14 w-14 text-rose-dark" />
          <Sparkles className="absolute top-3 right-5 h-6 w-6 text-rose-primary" />
        </>
      )}
      {stepIndex === 5 && (
        <>
          <Scale className="h-14 w-14 text-rose-primary" />
          <div className="absolute bottom-4 flex gap-1">
            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-bold text-plum shadow-sm">
              ml
            </span>
            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-bold text-plum shadow-sm">
              oz
            </span>
          </div>
        </>
      )}
    </div>
  );
}
