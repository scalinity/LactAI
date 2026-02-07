import { useState } from "react";
import { Plus } from "lucide-react";
import QuickLogModal from "./QuickLogModal";

export default function QuickLogFAB() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Quick log session"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-rose-primary text-white shadow-lg transition-all hover:bg-rose-dark active:scale-90"
        style={{
          background:
            "linear-gradient(135deg, var(--color-rose-primary) 0%, var(--color-rose-dark) 100%)",
        }}
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      <QuickLogModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
