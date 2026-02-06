import { useState } from "react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SessionForm from "@/components/session/SessionForm";
import Button from "@/components/ui/Button";
import { useSessionActions } from "@/hooks/useSessions";
import { Trash2 } from "lucide-react";

interface SessionEditModalProps {
  sessionId: number | null;
  onClose: () => void;
}

export default function SessionEditModal({
  sessionId,
  onClose,
}: SessionEditModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { deleteSession } = useSessionActions();

  const handleDelete = async () => {
    if (!sessionId) return;
    setDeleting(true);
    try {
      await deleteSession(sessionId);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal isOpen={sessionId !== null} onClose={onClose} title="Edit Session">
        {sessionId !== null && (
          <div className="space-y-4">
            <SessionForm sessionId={sessionId} onSaved={onClose} />
            <div className="border-t border-plum/10 pt-4">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4" />
                Delete Session
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Session"
        message="Are you sure you want to delete this session? This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </>
  );
}
