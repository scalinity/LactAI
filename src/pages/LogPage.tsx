import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import SessionForm from "@/components/session/SessionForm";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function LogPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const isEditMode = !!sessionId;

  const existingSession = useLiveQuery(
    () =>
      sessionId
        ? db.sessions.get(Number(sessionId))
        : Promise.resolve(undefined),
    [sessionId],
  );

  const isLoading = isEditMode && existingSession === undefined;

  const handleSuccess = () => {
    navigate("/history", { replace: true });
  };

  return (
    <div className="animate-page-enter mx-auto max-w-lg px-4 pt-6 pb-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          to={isEditMode ? "/history" : "/"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-plum/60 shadow-sm transition-all hover:bg-plum/5 hover:text-plum active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-[Nunito] text-2xl font-bold text-plum">
          {isEditMode ? "Edit Session" : "Log Session"}
        </h1>
      </div>

      {/* Form */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-primary border-t-transparent" />
        </div>
      ) : (
        <SessionForm
          sessionId={sessionId ? Number(sessionId) : undefined}
          onSaved={handleSuccess}
        />
      )}
    </div>
  );
}
