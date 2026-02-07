import { useState, useRef, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import TypeToggle from "@/components/session/TypeToggle";
import AmountInput from "@/components/session/AmountInput";
import { useAppStore } from "@/stores/useAppStore";
import { useSessionActions } from "@/hooks/useSessions";
import { useTranslation } from "@/i18n";
import { Check, Loader2 } from "lucide-react";
import type { SessionType } from "@/types/common";

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickLogModal({ isOpen, onClose }: QuickLogModalProps) {
  const { t } = useTranslation();
  const preferredUnit = useAppStore((s) => s.preferredUnit);
  const { createSession } = useSessionActions();

  const [sessionType, setSessionType] = useState<SessionType>("feeding");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSessionType("feeding");
      setAmount("");
      setSaving(false);
      setToast(false);
    }
  }, [isOpen]);

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleLog = async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0 || saving) return;

    setSaving(true);
    try {
      await createSession({
        amount,
        unit: preferredUnit,
        timestamp: new Date(),
        side: sessionType === "pumping" ? "both" : null,
        session_type: sessionType,
        duration_min: "",
        notes: "",
      });

      setToast(true);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = setTimeout(() => {
        setToast(false);
        onClose();
      }, 800);
    } finally {
      setSaving(false);
    }
  };

  const parsed = parseFloat(amount);
  const isValid = !isNaN(parsed) && parsed > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("home.quickLog")}>
      <div className="space-y-5">
        <TypeToggle value={sessionType} onChange={setSessionType} />

        <AmountInput value={amount} onChange={setAmount} unit={preferredUnit} />

        <button
          type="button"
          onClick={handleLog}
          disabled={!isValid || saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-primary px-6 py-3 font-[Nunito] text-base font-bold text-white shadow-md transition-all hover:bg-rose-dark active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
          style={{
            background:
              isValid && !saving
                ? "linear-gradient(135deg, var(--color-rose-primary) 0%, var(--color-rose-dark) 100%)"
                : undefined,
          }}
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : toast ? (
            <>
              <Check className="h-5 w-5" />
              {t("home.quickLogSaved")}
            </>
          ) : (
            <>
              <Check className="h-5 w-5" />
              {t("home.log")}
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
