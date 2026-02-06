import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import SessionForm from "./SessionForm";
import { db } from "@/db";
import { useSessionFormStore } from "@/stores/useSessionFormStore";
import { useAppStore } from "@/stores/useAppStore";

vi.mock("@/hooks/useSessions", () => ({
  useSessionActions: () => ({
    createSession: vi.fn().mockResolvedValue(1),
    updateSession: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("SessionForm", () => {
  beforeEach(() => {
    useSessionFormStore.getState().reset();
    useAppStore.setState({ preferredUnit: "mL" });
  });

  describe("Form Validation", () => {
    it("should not submit without amount", async () => {
      const onSaved = vi.fn();
      render(<SessionForm onSaved={onSaved} />);

      const submitButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSaved).not.toHaveBeenCalled();
      });
    });

    it("should not submit with invalid amount", async () => {
      const onSaved = vi.fn();
      render(<SessionForm onSaved={onSaved} />);

      const amountInput = screen.getByRole("textbox", { name: /amount/i });
      await userEvent.type(amountInput, "abc");

      const submitButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSaved).not.toHaveBeenCalled();
      });
    });

    it("should accept valid numeric amount", async () => {
      const onSaved = vi.fn();
      render(<SessionForm onSaved={onSaved} />);

      const amountInput = screen.getByRole("textbox", { name: /amount/i });
      await userEvent.type(amountInput, "120");

      const submitButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalled();
      });
    });

    it("should accept decimal amount", async () => {
      const onSaved = vi.fn();
      render(<SessionForm onSaved={onSaved} />);

      const amountInput = screen.getByRole("textbox", { name: /amount/i });
      await userEvent.type(amountInput, "120.5");

      const submitButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalled();
      });
    });
  });

  describe("Form Submission", () => {
    it("should create new session on submit", async () => {
      const onSaved = vi.fn();
      const { useSessionActions } = await import("@/hooks/useSessions");
      const createSession = vi.fn().mockResolvedValue(1);
      vi.mocked(useSessionActions).mockReturnValue({
        createSession,
        updateSession: vi.fn(),
      } as any);

      render(<SessionForm onSaved={onSaved} />);

      const amountInput = screen.getByRole("textbox", { name: /amount/i });
      await userEvent.type(amountInput, "150");

      const submitButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(createSession).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: "150",
            unit: "mL",
          }),
        );
        expect(onSaved).toHaveBeenCalled();
      });
    });

    it("should update existing session", async () => {
      const sessionId = await db.sessions.add({
        timestamp: new Date(),
        amount_entered: 100,
        unit_entered: "ml",
        amount_ml: 100,
      });

      const { useSessionActions } = await import("@/hooks/useSessions");
      const updateSession = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useSessionActions).mockReturnValue({
        createSession: vi.fn(),
        updateSession,
      } as any);

      const onSaved = vi.fn();
      render(<SessionForm sessionId={sessionId as number} onSaved={onSaved} />);

      await waitFor(() => {
        const amountInput = screen.getByRole("textbox", { name: /amount/i });
        expect(amountInput).toHaveValue("100");
      });

      const amountInput = screen.getByRole("textbox", { name: /amount/i });
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, "200");

      const submitButton = screen.getByRole("button", { name: /update/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(updateSession).toHaveBeenCalledWith(
          sessionId,
          expect.objectContaining({
            amount: "200",
          }),
        );
      });
    });

    it("should show success toast after save", async () => {
      render(<SessionForm />);

      const amountInput = screen.getByRole("textbox", { name: /amount/i });
      await userEvent.type(amountInput, "100");

      const submitButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Session saved")).toBeInTheDocument();
      });
    });

    it("should show update toast after update", async () => {
      const sessionId = await db.sessions.add({
        timestamp: new Date(),
        amount_entered: 100,
        unit_entered: "ml",
        amount_ml: 100,
      });

      render(<SessionForm sessionId={sessionId as number} />);

      await waitFor(() => {
        const amountInput = screen.getByRole("textbox", { name: /amount/i });
        expect(amountInput).toHaveValue("100");
      });

      const submitButton = screen.getByRole("button", { name: /update/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Session updated")).toBeInTheDocument();
      });
    });

    it("should reset form after successful creation", async () => {
      render(<SessionForm />);

      const amountInput = screen.getByRole("textbox", { name: /amount/i });
      await userEvent.type(amountInput, "150");

      const notesInput = screen.getByPlaceholderText(/optional notes/i);
      await userEvent.type(notesInput, "Test notes");

      const submitButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(amountInput).toHaveValue("");
        expect(notesInput).toHaveValue("");
      });
    });

    it("should call onSaved callback", async () => {
      const onSaved = vi.fn();
      render(<SessionForm onSaved={onSaved} />);

      const amountInput = screen.getByRole("textbox", { name: /amount/i });
      await userEvent.type(amountInput, "100");

      const submitButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should submit on Enter key", async () => {
      const onSaved = vi.fn();
      render(<SessionForm onSaved={onSaved} />);

      const amountInput = screen.getByRole("textbox", { name: /amount/i });
      await userEvent.type(amountInput, "100{enter}");

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalled();
      });
    });

    it("should not submit on Shift+Enter", async () => {
      const onSaved = vi.fn();
      render(<SessionForm onSaved={onSaved} />);

      const amountInput = screen.getByRole("textbox", { name: /amount/i });
      await userEvent.type(amountInput, "100");

      fireEvent.keyDown(amountInput, {
        key: "Enter",
        shiftKey: true,
      });

      await waitFor(
        () => {
          expect(onSaved).not.toHaveBeenCalled();
        },
        { timeout: 500 },
      );
    });
  });

  describe("Loading State", () => {
    it("should show loading state during submission", async () => {
      const { useSessionActions } = await import("@/hooks/useSessions");
      const createSession = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100)),
        );
      vi.mocked(useSessionActions).mockReturnValue({
        createSession,
        updateSession: vi.fn(),
      } as any);

      render(<SessionForm />);

      const amountInput = screen.getByRole("textbox", { name: /amount/i });
      await userEvent.type(amountInput, "100");

      const submitButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(submitButton);

      // Button should be disabled during save
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Existing Session Loading", () => {
    it("should populate form with existing session data", async () => {
      const timestamp = new Date("2024-01-15T10:30:00");
      const sessionId = await db.sessions.add({
        timestamp,
        amount_entered: 150,
        unit_entered: "oz",
        amount_ml: 4436.1,
        side: "left",
        duration_min: 15,
        notes: "Test notes",
      });

      render(<SessionForm sessionId={sessionId as number} />);

      await waitFor(() => {
        const amountInput = screen.getByRole("textbox", { name: /amount/i });
        expect(amountInput).toHaveValue("150");
      });

      const notesInput = screen.getByPlaceholderText(/optional notes/i);
      expect(notesInput).toHaveValue("Test notes");
    });

    it("should use preferred unit for new sessions", async () => {
      useAppStore.setState({ preferredUnit: "oz" });

      render(<SessionForm />);

      // Should initialize with preferred unit
      await waitFor(() => {
        expect(useSessionFormStore.getState().unit).toBe("oz");
      });
    });
  });

  describe("Optional Fields", () => {
    it("should submit with only required fields", async () => {
      const onSaved = vi.fn();
      render(<SessionForm onSaved={onSaved} />);

      const amountInput = screen.getByRole("textbox", { name: /amount/i });
      await userEvent.type(amountInput, "100");

      const submitButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalled();
      });
    });

    it("should submit with notes", async () => {
      const { useSessionActions } = await import("@/hooks/useSessions");
      const createSession = vi.fn().mockResolvedValue(1);
      vi.mocked(useSessionActions).mockReturnValue({
        createSession,
        updateSession: vi.fn(),
      } as any);

      render(<SessionForm />);

      const amountInput = screen.getByRole("textbox", { name: /amount/i });
      await userEvent.type(amountInput, "100");

      const notesInput = screen.getByPlaceholderText(/optional notes/i);
      await userEvent.type(notesInput, "Left side, morning feed");

      const submitButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(createSession).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: "Left side, morning feed",
          }),
        );
      });
    });

    it("should submit with duration", async () => {
      const { useSessionActions } = await import("@/hooks/useSessions");
      const createSession = vi.fn().mockResolvedValue(1);
      vi.mocked(useSessionActions).mockReturnValue({
        createSession,
        updateSession: vi.fn(),
      } as any);

      render(<SessionForm />);

      const amountInput = screen.getByRole("textbox", { name: /amount/i });
      await userEvent.type(amountInput, "100");

      const durationInput = screen.getByRole("textbox", { name: /duration/i });
      await userEvent.type(durationInput, "20");

      const submitButton = screen.getByRole("button", { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(createSession).toHaveBeenCalledWith(
          expect.objectContaining({
            duration_min: "20",
          }),
        );
      });
    });
  });
});
