import { useState } from "react";
import { useChatActions } from "@/hooks/useChatMessages";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Trash2 } from "lucide-react";

export default function DeleteHistoryButton() {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { deleteAllHistory } = useChatActions();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAllHistory();
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-red-500 hover:text-red-600"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete Chat History
      </Button>

      <ConfirmDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title="Delete All Chats"
        message="This will permanently delete all chat threads and messages. This cannot be undone."
        confirmLabel="Delete All"
        danger
        loading={deleting}
      />
    </>
  );
}
