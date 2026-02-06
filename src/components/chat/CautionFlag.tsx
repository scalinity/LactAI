import { AlertTriangle } from "lucide-react";

export default function CautionFlag() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 max-w-[85%]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <p className="text-xs text-amber-700">
        This information is for reference only. Please consult your healthcare
        provider for medical advice.
      </p>
    </div>
  );
}
