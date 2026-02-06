import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { useSessionFormStore } from "@/stores/useSessionFormStore";
import { useAppStore } from "@/stores/useAppStore";
import { useSessionActions } from "@/hooks/useSessions";
import AmountInput from "./AmountInput";
import UnitToggle from "./UnitToggle";
import TypeToggle from "./TypeToggle";
import TimestampPicker from "./TimestampPicker";
import SideSelector from "./SideSelector";
import DurationInput from "./DurationInput";
import Button from "@/components/ui/Button";
import { Check } from "lucide-react";

interface SessionFormProps {
  sessionId?: number;
  onSaved?: () => void;
}

export default function SessionForm({ sessionId, onSaved }: SessionFormProps) {
  const { amount, unit, timestamp, side, sessionType, durationMin, notes, setField, reset } =
    useSessionFormStore();
  const { preferredUnit } = useAppStore();
  const { createSession, updateSession } = useSessionActions();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const existing = useLiveQuery(
    () => (sessionId ? db.sessions.get(sessionId) : undefined),
    [sessionId],
  );

  useEffect(() => {
    if (existing) {
      setField("amount", String(existing.amount_entered));
      setField("unit", existing.unit_entered);
      setField("timestamp", existing.timestamp);
      setField("side", existing.side || null);
      setField("sessionType", existing.session_type || "feeding");
      setField(
        "durationMin",
        existing.duration_min ? String(existing.duration_min) : "",
      );
      setField("notes", existing.notes || "");
    } else if (!sessionId) {
      reset();
      setField("unit", preferredUnit);
    }
  }, [existing, sessionId, preferredUnit, setField, reset]);

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || saving) return;

    setSaving(true);
    try {
      if (sessionId) {
        await updateSession(sessionId, {
          amount,
          unit,
          timestamp,
          side,
          session_type: sessionType,
          duration_min: durationMin,
          notes,
        });
        setToast("Session updated");
      } else {
        await createSession({
          amount,
          unit,
          timestamp,
          side,
          session_type: sessionType,
          duration_min: durationMin,
          notes,
        });
        setToast("Session saved");
        reset();
        setField("unit", preferredUnit);
      }
      onSaved?.();
    } finally {
      setSaving(false);
    }

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2000);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="space-y-6"
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-plum">Type</p>
        <TypeToggle
          value={sessionType}
          onChange={(v) => setField("sessionType", v)}
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <AmountInput
          value={amount}
          onChange={(v) => setField("amount", v)}
          unit={unit}
        />
        <UnitToggle currentAmount={amount} />
      </div>

      <TimestampPicker
        value={timestamp}
        onChange={(v) => setField("timestamp", v)}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-plum">Side</p>
        <SideSelector value={side} onChange={(v) => setField("side", v)} />
      </div>

      <DurationInput
        value={durationMin}
        onChange={(v) => setField("durationMin", v)}
      />

      <div className="space-y-1">
        <label className="text-sm font-medium text-plum">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setField("notes", e.target.value)}
          placeholder="Optional notes..."
          rows={2}
          className="w-full rounded-xl bg-cream px-3 py-2 text-sm text-plum placeholder:text-plum/40 outline-none border border-plum/10 focus:ring-2 focus:ring-rose-primary/50 resize-none"
        />
      </div>

      <Button type="submit" loading={saving} className="w-full" size="lg">
        <Check className="h-5 w-5" />
        {sessionId ? "Update" : "Save"}
      </Button>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-xl bg-plum px-4 py-2 text-sm text-white shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </form>
  );
}
