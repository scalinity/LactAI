export function useChatActions() {
  // ... existing state ...

  const sendMessage = async (content: string, image?: ChatImageData): Promise<void> => {
    if (!activeThreadId) return;

    // ... create user message ...

    const abortController = new AbortController();
    setStreaming(true);
    setStreamingContent("");
    try {
      const history = await db.chat_messages
        .where("thread_id")
        .equals(activeThreadId)
        .sortBy("created_at");

      const messages = history.map((m: ChatMessage) => {
        // ... existing message mapping ...
      });

      await streamChatMessage(
        messages,
        {
          onChunk: (fullText) => {
            setStreamingContent(stripThinkTags(fullText));
          },
          onDone: async (fullText) => {
            // ... existing onDone logic ...
          },
          onError: (error) => {
            toast.error(error.message);
          },
        },
        undefined,
        abortController.signal
      );
    } catch (err) {
      // ... existing error handling ...
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  };

  // ... existing methods ...
}