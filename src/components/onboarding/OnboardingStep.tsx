import OnboardingIllustration from "./OnboardingIllustration";

interface OnboardingStepProps {
  stepIndex: number;
  title: string;
  description: string;
}

export default function OnboardingStep({
  stepIndex,
  title,
  description,
}: OnboardingStepProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <OnboardingIllustration stepIndex={stepIndex} />
      <h2 className="mt-8 font-[Nunito] text-2xl font-bold text-plum">
        {title}
      </h2>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-plum-light">
        {description}
      </p>
    </div>
  );
}
