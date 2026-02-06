import { useState } from "react";
import { useSessions } from "@/db/hooks";
import type { SessionFilter } from "@/types/session";
import HistoryFilters from "@/components/history/HistoryFilters";
import HistoryList from "@/components/history/HistoryList";
import ExportImportBar from "@/components/history/ExportImportBar";
import EmptyState from "@/components/ui/EmptyState";
import { List } from "lucide-react";

export default function HistoryPage() {
  const [filter, setFilter] = useState<SessionFilter>({});
  const sessions = useSessions(filter);
  const isLoading = sessions === undefined;

  return (
    <div className="animate-page-enter mx-auto max-w-lg px-4 pt-6 pb-8">
      {/* Header */}
      <h1 className="mb-4 font-[Nunito] text-2xl font-bold text-plum">
        History
      </h1>

      {/* Filters */}
      <HistoryFilters filter={filter} onChange={setFilter} />

      {/* Export / Import */}
      <div className="mt-3 mb-4">
        <ExportImportBar />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-primary border-t-transparent" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<List className="h-12 w-12 text-plum-light" />}
          title="No sessions yet"
          description="Start logging to see your history here."
        />
      ) : (
        <HistoryList sessions={sessions} />
      )}
    </div>
  );
}
